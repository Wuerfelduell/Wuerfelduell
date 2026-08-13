(function(){
  "use strict";

  let onlineSession={active:false,uid:"",roomCode:"",isHost:false,lastStateSeq:0,actionPending:false};
  let originalPrimaryHandler=null;
  let onlineInputHooksInstalled=false;

  function isOnlineMatch(){
    return onlineSession.active && gameContext?.mode==="online-1v1";
  }

  function localIsCurrentPlayer(){
    return isOnlineMatch() && String(players[current]?.onlineUid||"")===String(onlineSession.uid||"");
  }

  function enforceOnlineControls(message=""){
    if(!isOnlineMatch()) return;
    const myTurn=localIsCurrentPlayer();
    const canBaseRoll=myTurn && phase==="idle" && !isAnimating && !onlineSession.actionPending;

    // V27.2.5 synchronisiert bewusst zuerst nur den Basiswurf. Alle weiteren
    // Battle-Aktionen bleiben gesperrt, bis ihr jeweiliger Online-Adapter folgt.
    primaryBtn.disabled=!canBaseRoll;
    [lockBtn,baseRerollBtn,loadedDiceBtn,snakeEyesBtn,attackPowerBtn,bloodLowerBtn,bloodHigherBtn,resolveAttackBtn,nextBtn].forEach(btn=>{
      if(btn) btn.disabled=true;
    });

    if(message){statusEl.textContent=message;return;}
    if(onlineSession.actionPending){
      statusEl.textContent="🌐 Wurf an Host gesendet …";
    }else if(phase==="idle"){
      statusEl.textContent=myTurn
        ? "🌐 Du bist dran · Basiswurf ist online freigegeben."
        : `🌐 ${players[current]?.name||"Gegner"} ist dran · warte auf den Basiswurf.`;
    }else if(phase==="base_select"){
      statusEl.textContent="🌐 Basiswurf synchronisiert ✓ · Lock-/Restwurf-Sync folgt als nächster Schritt.";
    }else{
      statusEl.textContent="🌐 Online-State synchronisiert · diese Aktion ist in der Beta noch gesperrt.";
    }
  }

  function installOnlineInputHooks(){
    if(onlineInputHooksInstalled) return;
    onlineInputHooksInstalled=true;
    originalPrimaryHandler=primaryBtn.onclick;
    primaryBtn.onclick=(event)=>{
      if(!isOnlineMatch()){
        if(typeof originalPrimaryHandler==="function") originalPrimaryHandler.call(primaryBtn,event);
        return;
      }
      if(phase!=="idle" || !localIsCurrentPlayer() || onlineSession.actionPending || isAnimating) return;
      onlineSession.actionPending=true;
      enforceOnlineControls();
      const sent=window.WDOnlineTransport?.requestBaseRoll?.();
      if(sent && typeof sent.catch==="function"){
        sent.catch(err=>{
          console.error("Online base-roll request",err);
          onlineSession.actionPending=false;
          enforceOnlineControls("🌐 Basiswurf konnte nicht gesendet werden. Bitte erneut versuchen.");
        });
      }
    };

    // Auswahl/Locken ist noch nicht synchronisiert. Verhindert, dass nach dem
    // ersten gemeinsamen Wurf ein Gerät lokal Würfel markiert und auseinanderläuft.
    diceEl?.addEventListener("click",event=>{
      if(!isOnlineMatch()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },true);
  }

  function exportOnlineState(actionId=""){
    return {
      seq:onlineSession.lastStateSeq+1,
      actionId:String(actionId||""),
      phase:String(phase||"idle"),
      currentPlayerUid:String(players[current]?.onlineUid||""),
      dice:dice.map(d=>({value:d.value==null?null:Number(d.value),locked:!!d.locked,selected:!!d.selected})),
      players:players.map(p=>({uid:String(p.onlineUid||""),hp:Number(p.hp)||0})),
      updatedAt:Date.now()
    };
  }

  function applyPlayerHp(statePlayers){
    if(!Array.isArray(statePlayers)) return;
    statePlayers.forEach(entry=>{
      const idx=players.findIndex(p=>String(p?.onlineUid||"")===String(entry?.uid||""));
      if(idx>=0 && Number.isFinite(Number(entry?.hp))) players[idx].hp=Number(entry.hp);
    });
  }

  function applyAuthoritativeState(state){
    if(!isOnlineMatch() || !state) return false;
    const seq=Number(state.seq)||0;
    if(seq<=onlineSession.lastStateSeq) return false;
    onlineSession.lastStateSeq=seq;
    onlineSession.actionPending=false;

    const turnUid=String(state.currentPlayerUid||"");
    const turnIndex=players.findIndex(p=>String(p?.onlineUid||"")===turnUid);
    if(turnIndex>=0) current=turnIndex;
    applyPlayerHp(state.players);

    const incomingDice=Array.isArray(state.dice)?state.dice:[];
    const shouldAnimate=!onlineSession.isHost && phase==="idle" && state.phase==="base_select" && incomingDice.length===dice.length;

    if(shouldAnimate){
      isAnimating=true;
      dice.forEach((d,i)=>{if(incomingDice[i]?.value!=null)d.rolling=true;});
      renderAll();
      enforceOnlineControls("🌐 Gemeinsamer Basiswurf …");
      setTimeout(()=>{
        dice=dice.map((d,i)=>({
          ...d,
          value:incomingDice[i]?.value==null?null:Number(incomingDice[i].value),
          locked:!!incomingDice[i]?.locked,
          selected:!!incomingDice[i]?.selected,
          rolling:false
        }));
        phase=String(state.phase||"base_select");
        isAnimating=false;
        renderAll();
        enforceOnlineControls();
      },ROLL_ANIM_MS);
      return true;
    }

    if(incomingDice.length===dice.length){
      dice=dice.map((d,i)=>({
        ...d,
        value:incomingDice[i]?.value==null?null:Number(incomingDice[i].value),
        locked:!!incomingDice[i]?.locked,
        selected:!!incomingDice[i]?.selected,
        rolling:false
      }));
    }
    phase=String(state.phase||phase);
    isAnimating=false;
    renderAll();
    enforceOnlineControls();
    return true;
  }

  async function hostExecuteAction(request){
    if(!isOnlineMatch() || !onlineSession.isHost || !request) throw new Error("ONLINE_NOT_HOST");
    const actorUid=String(request.actorUid||"");
    if(String(players[current]?.onlineUid||"")!==actorUid) throw new Error("WRONG_TURN");
    if(request.type!=="base_roll" || phase!=="idle") throw new Error("UNSUPPORTED_ACTION");

    // Bestehende Battle-Engine bleibt die Recheninstanz: der Host führt exakt den
    // normalen rollBase()-Pfad aus und veröffentlicht erst danach den Zustand.
    rollBase();
    await new Promise(resolve=>setTimeout(resolve,ROLL_ANIM_MS+40));
    if(phase!=="base_select") throw new Error("BASE_ROLL_DID_NOT_FINISH");
    enforceOnlineControls();
    return exportOnlineState(request.id);
  }

  function publicProfile(profile){
    if(!profile) return null;
    let cosmeticTitle="",cosmeticFrame="";
    try{cosmeticTitle=profileCosmeticTitle(profile)||"";}catch(_){}
    try{cosmeticFrame=profileCosmeticFrame(profile)||"";}catch(_){}
    return {
      id:String(profile.id||""),
      name:String(profile.name||"Spieler").slice(0,24),
      tagNumber:String(profile.tagNumber||"0000").padStart(4,"0").slice(-4),
      selectedDice:String(profile.selectedDice||"classic"),
      cosmeticTitle:String(cosmeticTitle||""),
      cosmeticFrame:String(cosmeticFrame||"")
    };
  }

  function validAbility(id){
    const n=Number(id);
    return REAL_ABILITY_IDS.includes(n)?n:1;
  }

  function onlinePlayerFromMatch(entry,localUid,localProfileId){
    const isLocal=String(entry?.uid||"")===String(localUid||"");
    const localProfile=isLocal?getProfile(localProfileId):null;
    const rolled=Number(entry?.rolledAbility)||validAbility(entry?.ability);
    let cosmeticTitle=String(entry?.cosmeticTitle||"");
    let cosmeticFrame=String(entry?.cosmeticFrame||"");
    if(localProfile){
      try{cosmeticTitle=profileCosmeticTitle(localProfile)||cosmeticTitle;}catch(_){}
      try{cosmeticFrame=profileCosmeticFrame(localProfile)||cosmeticFrame;}catch(_){}
    }
    return {
      name:String(entry?.name||"Spieler").slice(0,24),
      battleTag:`#${String(entry?.tagNumber||"0000").padStart(4,"0").slice(-4)}`,
      profileId:localProfile?.id||null,
      onlineUid:String(entry?.uid||""),
      botLevel:"human",
      hp:START_HP,
      maxHp:START_HP,
      ability:validAbility(entry?.ability),
      secondAbility:null,
      thirdAbility:null,
      fourthAbility:null,
      secondAbilityUnlocked:false,
      thirdAbilityUnlocked:false,
      fourthAbilityUnlocked:false,
      rolledAbility:rolled,
      primaryWasChosen:rolled===6,
      secondAbilityWasChosen:false,
      thirdAbilityWasChosen:false,
      fourthAbilityWasChosen:false,
      seat:0,
      diceDesign:String(entry?.diceDesign||localProfile?.selectedDice||"classic"),
      cosmeticTitle,
      cosmeticFrame,
      wins:0,
      momentumStreak:0,
      lastStandUsed:false,
      roundLastStandTriggered:false,
      damageSinceLastOwnTurn:false,
      bloodRushPrimed:false,
      voluntaryHpPaidThisTurn:false,
      botBloodUsesThisAttack:0
    };
  }

  function startOnlineMatch(match,localUid,localProfileId,isHost=false){
    const matchPlayers=Array.isArray(match?.players)?match.players:[];
    onlineSession={
      active:true,
      uid:String(localUid||""),
      roomCode:String(match?.roomCode||""),
      isHost:!!isHost,
      lastStateSeq:Number(match?.state?.seq)||0,
      actionPending:false
    };
    installOnlineInputHooks();
    if(matchPlayers.length!==2 || !localUid) return false;
    if(!matchPlayers.some(p=>String(p?.uid||"")===String(localUid))) return false;

    tutorialMode=false;
    campaignMode=false;
    duoCampaignMode=false;
    trioCampaignMode=false;
    localModeId="classic";
    campaignEncounterId=null;
    campaignProfileId=null;
    campaignMetrics=freshCampaignMetrics();
    encounterRuntime={ruleIds:[],phaseRuleIds:[],phaseTriggered:false,firstStrikeUsed:new Set(),armorUsed:new Set(),turnStarts:{}};
    gameContext={mode:"online-1v1",returnScreen:"menu",profileId:localProfileId||null,encounterId:null,roomCode:String(match.roomCode||"")};

    resetTutorialUi();
    nextRoundPrepBtn.classList.remove("hidden");
    restartBtn.textContent="Neue Partie";
    clearBotAutomation();

    players=matchPlayers.map(entry=>onlinePlayerFromMatch(entry,localUid,localProfileId));
    resetRoundStats();
    const authoritativeTurnUid=String(match?.currentPlayerUid||match?.firstPlayerUid||matchPlayers[0]?.uid||"");
    const authoritativeIndex=players.findIndex(p=>String(p?.onlineUid||"")===authoritativeTurnUid);
    current=authoritativeIndex>=0?authoritativeIndex:0;
    prepareBloodRushForTurn(current);
    dice=freshDice();
    phase="idle";
    isAnimating=false;
    attackFace=null;attackTarget=null;pendingCampaignAttackStart=null;attackHits=0;attackDamage=0;firstAttackRoll=true;currentAttackRollNewHits=0;
    baseRerollUsed=false;loadedDiceUsed=false;lastBaseRollIndices=[];attackPowerUsed=false;precisionUses=0;momentumBonus=0;bloodPriceNeighbors=[];bloodRushActiveThisAttack=false;doubleTapApplied=false;pendingDamage=null;pendingHeal=null;pendingExtraDamageFx=[];pendingExtraHealFx=[];
    roundNumber=1;roundEliminationOrder=[];lastPlaceIndex=null;roundWinnerHandled=false;roundWinnerIndex=null;nextRoundAbilityRolls=[];
    eventPopupQueue=[];eventPopupBusy=false;secondAbilityDraftBusy=false;secondAbilityDraftIndex=null;secondAbilityDraftSlot=2;deferredBaseAdvance=false;
    gamblingRolling=false;gamblingBaseTotal=null;gamblingModal.classList.add("hidden");
    highStakesRolling=false;highStakesDecisionThisAttack=false;highStakesModal.classList.add("hidden");
    perfect25Rolling=false;perfect25D4Rolling=false;perfect25BaseTotal=null;pendingPerfect25Total=null;perfect25Modal.classList.add("hidden");perfect25D4Modal.classList.add("hidden");
    insuranceRolling=false;insuranceContext=null;insuranceModal.classList.add("hidden");
    counterRolling=false;counterContext=null;counterDiceState=[];counterHits=0;counterFirstRoll=true;pendingCounterattack=null;deferredAttackFinish=false;counterModal.classList.add("hidden");
    wildcardFace=null;secondAbilityDraftQueue=[];secondAbilityDraftChoices=[];secondAbilityModal.classList.add("hidden");

    logEl.innerHTML="";
    winnerBox.classList.add("hidden");
    nextRoundBox.classList.add("hidden");
    document.getElementById("onlineScreen")?.classList.add("hidden");
    hideFrontScreens();
    game.classList.remove("hidden","campaign-game","trio-game");
    document.body.classList.add("playing");
    document.body.classList.remove("bot-acting");
    window.scrollTo?.(0,0);

    addLog(`🌐 Online 1v1 gestartet. ${players[current].name} beginnt.`);
    players.forEach(p=>{
      const roll=p.rolledAbility;
      const abilityText=roll===6?`W25 = 6 → automatische freie Wahl → ${ABILITIES[p.ability].name}`:`W25 = ${roll} → ${ABILITIES[p.ability].name}`;
      addLog(`${p.name}: ${abilityText} · 🎲 ${DICE_DESIGNS[p.diceDesign]?.name||"Classic"}.`);
    });
    renderAll();
    enforceOnlineControls();
    addLog(`🌐 Turn-Sync aktiv: Firebase sagt, ${players[current].name} ist dran.`);
    addLog(`🧪 V27.2.5: Der Basiswurf läuft jetzt host-autoritativ über Firebase; Locken und Folgeaktionen bleiben vorerst gesperrt.`);
    return true;
  }

  window.WDOnlineBridge=Object.freeze({
    getProfiles(){
      try{return (saveData?.profiles||[]).map(publicProfile).filter(Boolean);}
      catch(err){console.warn("Online-Profilliste konnte nicht gelesen werden",err);return [];}
    },
    getVersion(){
      try{return String(GAME_VERSION||"");}
      catch(_){return "";}
    },
    startMatch:startOnlineMatch,
    hostExecuteAction,
    applyState:applyAuthoritativeState,
    enforceControls:enforceOnlineControls
  });
})();
