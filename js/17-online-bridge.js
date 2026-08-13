(function(){
  "use strict";

  let onlineSession={active:false,uid:"",roomCode:"",isHost:false,lastStateSeq:0,actionPending:false,pendingActionId:""};
  let onlineInputHooksInstalled=false;

  const ONLINE_ACTION_BUTTONS=[
    [primaryBtn,"primary"],
    [lockBtn,"lock"],
    [baseRerollBtn,"base_reroll"],
    [loadedDiceBtn,"loaded_dice"],
    [snakeEyesBtn,"snake_eyes"],
    [attackPowerBtn,"attack_power"],
    [bloodLowerBtn,"blood_price"],
    [bloodHigherBtn,"blood_price"],
    [resolveAttackBtn,"resolve_attack"],
    [nextBtn,"next_turn"],
    [gamblingDie,"gambling_roll"],
    [perfect25Die,"perfect25_roll"],
    [perfect25D4Die,"perfect25_d4_roll"],
    [highStakesDie,"high_stakes_roll"],
    [highStakesSkip,"high_stakes_skip"],
    [insuranceDie,"insurance_roll"],
    [counterRollBtn,"counter_roll"]
  ];

  const MAIN_ROLL_ACTIONS=new Set(["primary","base_reroll","snake_eyes","attack_power"]);

  function isOnlineMatch(){
    return onlineSession.active && gameContext?.mode==="online-1v1";
  }

  function cloneJson(value,fallback=null){
    try{return JSON.parse(JSON.stringify(value));}catch(_){return fallback;}
  }

  function uidForIndex(index){
    return String(players[index]?.onlineUid||"");
  }

  function interactionOwnerUid(){
    if(!isOnlineMatch()) return "";
    if(!winnerBox.classList.contains("hidden")) return "";
    if(secondAbilityDraftBusy && secondAbilityDraftIndex!=null) return uidForIndex(secondAbilityDraftIndex);
    if(phase==="counterattack" && counterContext?.defenderIndex!=null) return uidForIndex(counterContext.defenderIndex);
    return uidForIndex(current);
  }

  function localOwnsInteraction(){
    return isOnlineMatch() && interactionOwnerUid()===String(onlineSession.uid||"");
  }

  function clearPendingAction(){
    onlineSession.actionPending=false;
    onlineSession.pendingActionId="";
  }

  function setStatusForOnline(){
    if(!isOnlineMatch()) return;
    if(!winnerBox.classList.contains("hidden")) return;
    const owner=interactionOwnerUid();
    if(onlineSession.actionPending){
      statusEl.textContent="🌐 Aktion wird synchronisiert …";
      return;
    }
    if(owner && owner!==onlineSession.uid){
      const index=players.findIndex(p=>String(p?.onlineUid||"")===owner);
      const name=index>=0?players[index]?.name:"Gegner";
      if(secondAbilityDraftBusy) statusEl.textContent=`🌐 ${name} wählt eine Fähigkeit …`;
      else if(phase==="counterattack") statusEl.textContent=`🌐 ${name} führt die Counterattack aus …`;
      else statusEl.textContent=`🌐 ${name} ist dran.`;
    }
  }

  function enforceOnlineControls(message=""){
    if(!isOnlineMatch()) return;
    const canInteract=localOwnsInteraction() && !onlineSession.actionPending && !isAnimating;

    // renderAll()/updateButtons entscheidet weiterhin, WELCHE Controls regeltechnisch
    // sichtbar bzw. deaktiviert sind. Online ergänzt nur die Besitz-/Pending-Sperre.
    const controls=[primaryBtn,lockBtn,baseRerollBtn,loadedDiceBtn,snakeEyesBtn,attackPowerBtn,bloodLowerBtn,bloodHigherBtn,resolveAttackBtn,nextBtn];
    controls.forEach(btn=>{
      if(!btn || btn.classList.contains("hidden")) return;
      if(!canInteract) btn.disabled=true;
    });

    const modalButtons=[gamblingDie,perfect25Die,perfect25D4Die,highStakesDie,highStakesSkip,insuranceDie,counterRollBtn];
    modalButtons.forEach(btn=>{
      if(!btn) return;
      const modal=btn.closest?.(".modal");
      if(modal && modal.classList.contains("hidden")) return;
      if(!canInteract) btn.disabled=true;
    });

    if(secondAbilityDraftBusy){
      secondAbilityOptions.querySelectorAll("button").forEach(btn=>btn.disabled=!canInteract);
    }

    if(message) statusEl.textContent=message;
    else setStatusForOnline();
  }

  function requestOnlineAction(type,payload={}){
    if(!isOnlineMatch() || onlineSession.actionPending || !localOwnsInteraction()) return;
    onlineSession.actionPending=true;
    enforceOnlineControls();
    const promise=window.WDOnlineTransport?.requestAction?.(type,payload,onlineSession.lastStateSeq);
    if(!promise || typeof promise.catch!=="function"){
      clearPendingAction();
      enforceOnlineControls("🌐 Online-Aktion konnte nicht gesendet werden.");
      return;
    }
    promise.then(result=>{
      if(result?.requestId) onlineSession.pendingActionId=String(result.requestId);
    }).catch(err=>{
      console.error("Online action request",type,err);
      clearPendingAction();
      enforceOnlineControls("🌐 Aktion fehlgeschlagen. Bitte erneut versuchen.");
    });
  }

  function installOnlineInputHooks(){
    if(onlineInputHooksInstalled) return;
    onlineInputHooksInstalled=true;

    ONLINE_ACTION_BUTTONS.forEach(([btn,type])=>{
      if(!btn) return;
      btn.addEventListener("click",event=>{
        if(!isOnlineMatch()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        requestOnlineAction(type,{});
      },true);
    });

    // Die normalen Würfel sind im Basis-Lock-Schritt die einzige direkte Auswahl.
    diceEl?.addEventListener("click",event=>{
      if(!isOnlineMatch()) return;
      const dieNode=event.target?.closest?.(".die");
      if(!dieNode || !diceEl.contains(dieNode)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if(phase!=="base_select" || isAnimating || !localOwnsInteraction()) return;
      const index=Array.prototype.indexOf.call(diceEl.children,dieNode);
      if(index<0 || index>=dice.length || dice[index]?.locked) return;
      requestOnlineAction("dice_select",{index});
    },true);

    // Die Fähigkeitskarten werden vom bestehenden Code dynamisch erzeugt. Der
    // Capture-Listener hält auch diese Auswahl server-/host-autoritativ.
    secondAbilityOptions?.addEventListener("click",event=>{
      if(!isOnlineMatch()) return;
      const card=event.target?.closest?.("button");
      if(!card || !secondAbilityOptions.contains(card)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if(!secondAbilityDraftBusy || !localOwnsInteraction()) return;
      const cardIndex=Array.prototype.indexOf.call(secondAbilityOptions.children,card);
      const abilityId=Number(card.dataset.onlineAbilityId || secondAbilityDraftChoices[cardIndex]);
      if(!REAL_ABILITY_IDS.includes(abilityId)) return;
      requestOnlineAction("ability_choice",{abilityId});
    },true);
  }

  function modalSnapshot(modal,die,result,sub=null,extra={}){
    return {
      open:!!modal && !modal.classList.contains("hidden"),
      dieText:die?.textContent||"",
      dieClass:die?.className||"",
      dieDisabled:!!die?.disabled,
      result:result?.textContent||"",
      sub:sub?.textContent||"",
      ...extra
    };
  }

  function exportUiSnapshot(){
    return {
      log:Array.from(logEl.children).slice(0,100).map(el=>el.textContent||""),
      winner:{
        open:!winnerBox.classList.contains("hidden"),
        winnerHtml:winnerText.innerHTML,
        resultHtml:roundResultText.innerHTML,
        standingsHtml:roundStandings.innerHTML,
        statsHtml:roundStatsBox.innerHTML
      },
      draft:{
        open:!secondAbilityModal.classList.contains("hidden"),
        title:secondAbilityTitle.textContent||"",
        choices:[...secondAbilityDraftChoices]
      },
      gambling:modalSnapshot(gamblingModal,gamblingDie,gamblingResult),
      perfect25:modalSnapshot(perfect25Modal,perfect25Die,perfect25Result),
      perfect25d4:modalSnapshot(perfect25D4Modal,perfect25D4Die,perfect25D4Result),
      highStakes:modalSnapshot(highStakesModal,highStakesDie,highStakesResult,highStakesSub,{skipDisabled:!!highStakesSkip.disabled}),
      insurance:modalSnapshot(insuranceModal,insuranceDie,insuranceResult,insuranceSub),
      counter:{
        open:!counterModal.classList.contains("hidden"),
        title:counterTitle.textContent||"",
        result:counterResult.textContent||"",
        buttonText:counterRollBtn.textContent||"",
        buttonDisabled:!!counterRollBtn.disabled
      }
    };
  }

  function exportOnlineState(actionId="",actionType=""){
    return {
      schema:4,
      seq:onlineSession.lastStateSeq+1,
      actionId:String(actionId||""),
      actionType:String(actionType||""),
      phase:String(phase||"idle"),
      currentPlayerUid:uidForIndex(current),
      interactionOwnerUid:interactionOwnerUid(),
      dice:cloneJson(dice,[]),
      players:players.map(p=>{
        const copy=cloneJson(p,{})||{};
        delete copy.profileId;
        return copy;
      }),
      battle:{
        attackFace,attackTarget,attackHits,attackDamage,firstAttackRoll,currentAttackRollNewHits,
        baseRerollUsed,loadedDiceUsed,lastBaseRollIndices:[...lastBaseRollIndices],attackPowerUsed,precisionUses,momentumBonus,
        bloodPriceNeighbors:[...bloodPriceNeighbors],bloodRushActiveThisAttack,doubleTapApplied,
        roundNumber,roundEliminationOrder:[...roundEliminationOrder],lastPlaceIndex,roundWinnerHandled,roundWinnerIndex,
        nextRoundAbilityRolls:cloneJson(nextRoundAbilityRolls,[]),roundStats:cloneJson(roundStats,[]),turnDamageThisTurn:cloneJson(turnDamageThisTurn,[]),
        secondAbilityDraftBusy,secondAbilityDraftIndex,secondAbilityDraftSlot,secondAbilityDraftChoices:[...secondAbilityDraftChoices],
        secondAbilityDraftQueue:cloneJson(secondAbilityDraftQueue,[]),deferredBaseAdvance,
        gamblingBaseTotal,highStakesDecisionThisAttack,perfect25BaseTotal,pendingPerfect25Total,wildcardFace,
        insuranceContext:cloneJson(insuranceContext,null),counterContext:cloneJson(counterContext,null),counterDiceState:cloneJson(counterDiceState,[]),
        counterHits,counterFirstRoll,pendingCounterattack:cloneJson(pendingCounterattack,null),deferredAttackFinish
      },
      ui:exportUiSnapshot(),
      updatedAt:Date.now()
    };
  }

  function applyPlayers(statePlayers){
    if(!Array.isArray(statePlayers)) return;
    statePlayers.forEach(entry=>{
      const idx=players.findIndex(p=>String(p?.onlineUid||"")===String(entry?.onlineUid||entry?.uid||""));
      if(idx<0) return;
      const localProfileId=players[idx]?.profileId||null;
      Object.assign(players[idx],cloneJson(entry,{})||{});
      if(localProfileId) players[idx].profileId=localProfileId;
    });
  }

  function applyBattleSnapshot(b={}){
    attackFace=b.attackFace??null;
    attackTarget=b.attackTarget??null;
    attackHits=Number(b.attackHits)||0;
    attackDamage=Number(b.attackDamage)||0;
    firstAttackRoll=b.firstAttackRoll!==false;
    currentAttackRollNewHits=Number(b.currentAttackRollNewHits)||0;
    baseRerollUsed=!!b.baseRerollUsed;
    loadedDiceUsed=!!b.loadedDiceUsed;
    lastBaseRollIndices=Array.isArray(b.lastBaseRollIndices)?[...b.lastBaseRollIndices]:[];
    attackPowerUsed=!!b.attackPowerUsed;
    precisionUses=Number(b.precisionUses)||0;
    momentumBonus=Number(b.momentumBonus)||0;
    bloodPriceNeighbors=Array.isArray(b.bloodPriceNeighbors)?[...b.bloodPriceNeighbors]:[];
    bloodRushActiveThisAttack=!!b.bloodRushActiveThisAttack;
    doubleTapApplied=!!b.doubleTapApplied;
    roundNumber=Number(b.roundNumber)||1;
    roundEliminationOrder=Array.isArray(b.roundEliminationOrder)?[...b.roundEliminationOrder]:[];
    lastPlaceIndex=b.lastPlaceIndex==null?null:Number(b.lastPlaceIndex);
    roundWinnerHandled=!!b.roundWinnerHandled;
    roundWinnerIndex=b.roundWinnerIndex==null?null:Number(b.roundWinnerIndex);
    nextRoundAbilityRolls=cloneJson(b.nextRoundAbilityRolls,[])||[];
    roundStats=cloneJson(b.roundStats,[])||[];
    turnDamageThisTurn=cloneJson(b.turnDamageThisTurn,[])||[];
    secondAbilityDraftBusy=!!b.secondAbilityDraftBusy;
    secondAbilityDraftIndex=b.secondAbilityDraftIndex==null?null:Number(b.secondAbilityDraftIndex);
    secondAbilityDraftSlot=Number(b.secondAbilityDraftSlot)||2;
    secondAbilityDraftChoices=Array.isArray(b.secondAbilityDraftChoices)?b.secondAbilityDraftChoices.map(Number):[];
    secondAbilityDraftQueue=cloneJson(b.secondAbilityDraftQueue,[])||[];
    deferredBaseAdvance=!!b.deferredBaseAdvance;
    gamblingBaseTotal=b.gamblingBaseTotal==null?null:Number(b.gamblingBaseTotal);
    highStakesDecisionThisAttack=!!b.highStakesDecisionThisAttack;
    perfect25BaseTotal=b.perfect25BaseTotal==null?null:Number(b.perfect25BaseTotal);
    pendingPerfect25Total=b.pendingPerfect25Total==null?null:Number(b.pendingPerfect25Total);
    wildcardFace=b.wildcardFace==null?null:Number(b.wildcardFace);
    insuranceContext=cloneJson(b.insuranceContext,null);
    counterContext=cloneJson(b.counterContext,null);
    counterDiceState=cloneJson(b.counterDiceState,[])||[];
    counterHits=Number(b.counterHits)||0;
    counterFirstRoll=b.counterFirstRoll!==false;
    pendingCounterattack=cloneJson(b.pendingCounterattack,null);
    deferredAttackFinish=!!b.deferredAttackFinish;

    // Netzwerk-Snapshots werden immer in einem stabilen Zustand veröffentlicht.
    isAnimating=false;
    gamblingRolling=false;
    perfect25Rolling=false;
    perfect25D4Rolling=false;
    highStakesRolling=false;
    insuranceRolling=false;
    counterRolling=false;
  }

  function restoreLog(entries){
    if(!Array.isArray(entries)) return;
    logEl.innerHTML="";
    entries.slice().reverse().forEach(text=>addLog(String(text||"")));
  }

  function restoreSpecialModal(snapshot,modal,die,result,sub=null){
    if(!snapshot){modal.classList.add("hidden");return;}
    modal.classList.toggle("hidden",!snapshot.open);
    if(die){
      if(snapshot.dieClass) die.className=String(snapshot.dieClass);
      die.textContent=String(snapshot.dieText||"");
      die.disabled=!!snapshot.dieDisabled;
    }
    if(result) result.textContent=String(snapshot.result||"");
    if(sub) sub.textContent=String(snapshot.sub||"");
  }

  function restoreUiSnapshot(ui={}){
    restoreLog(ui.log);

    const draft=ui.draft||{};
    secondAbilityModal.classList.toggle("hidden",!draft.open);
    if(draft.open){
      secondAbilityTitle.textContent=String(draft.title||`${players[secondAbilityDraftIndex]?.name||"Spieler"}: Fähigkeit wählen`);
      secondAbilityOptions.innerHTML="";
      const choices=Array.isArray(draft.choices)?draft.choices:secondAbilityDraftChoices;
      choices.forEach(id=>{
        const abilityId=Number(id);
        const btn=document.createElement("button");
        btn.className="second-ability-card"+(abilityId===7?" luck":"");
        btn.dataset.onlineAbilityId=String(abilityId);
        btn.innerHTML=`<div class="num">${abilityId}</div><div class="name">${escapeHtml(ABILITIES[abilityId]?.name||"Fähigkeit")}</div><div class="desc">${escapeHtml(ABILITIES[abilityId]?.desc||"")}</div>`;
        secondAbilityOptions.appendChild(btn);
      });
    }else secondAbilityOptions.innerHTML="";

    restoreSpecialModal(ui.gambling,gamblingModal,gamblingDie,gamblingResult);
    restoreSpecialModal(ui.perfect25,perfect25Modal,perfect25Die,perfect25Result);
    restoreSpecialModal(ui.perfect25d4,perfect25D4Modal,perfect25D4Die,perfect25D4Result);
    restoreSpecialModal(ui.highStakes,highStakesModal,highStakesDie,highStakesResult,highStakesSub);
    if(ui.highStakes) highStakesSkip.disabled=!!ui.highStakes.skipDisabled;
    restoreSpecialModal(ui.insurance,insuranceModal,insuranceDie,insuranceResult,insuranceSub);

    const counter=ui.counter||{};
    counterModal.classList.toggle("hidden",!counter.open);
    if(counter.open){
      counterTitle.textContent=String(counter.title||"");
      counterResult.textContent=String(counter.result||"");
      counterRollBtn.textContent=String(counter.buttonText||"⚔️ Würfeln");
      counterRollBtn.disabled=!!counter.buttonDisabled;
      renderCounterDice();
    }

    const winner=ui.winner||{};
    winnerBox.classList.toggle("hidden",!winner.open);
    if(winner.open){
      winnerText.innerHTML=String(winner.winnerHtml||"");
      roundResultText.innerHTML=String(winner.resultHtml||"");
      roundStandings.innerHTML=String(winner.standingsHtml||"");
      roundStatsBox.innerHTML=String(winner.statsHtml||"");
      nextRoundBox.classList.add("hidden");
      nextRoundPrepBtn.classList.add("hidden");
      // V27.3.0: Online ist vorerst ein einzelnes Match. Kein lokaler Restart,
      // der die beiden Clients nach dem Sieg auseinanderlaufen lassen könnte.
      restartBtn.classList.add("hidden");
      hideAllControls();
      turnLine.textContent="Online-Match beendet";
      statusEl.textContent="";
      abilityState.innerHTML="";
    }else{
      restartBtn.classList.remove("hidden");
    }
  }

  function rollActionNeedsAnimation(state){
    if(!state || onlineSession.isHost) return false;
    if(!MAIN_ROLL_ACTIONS.has(String(state.actionType||""))) return false;
    return Array.isArray(state.dice) && state.dice.length===dice.length;
  }

  function applyStateNow(state,previousHp){
    const turnUid=String(state.currentPlayerUid||"");
    const turnIndex=players.findIndex(p=>String(p?.onlineUid||"")===turnUid);
    if(turnIndex>=0) current=turnIndex;
    applyPlayers(state.players);
    applyBattleSnapshot(state.battle||{});
    if(Array.isArray(state.dice)) dice=cloneJson(state.dice,[])||[];
    phase=String(state.phase||phase||"idle");

    renderAll();
    restoreUiSnapshot(state.ui||{});

    // HP-FX auf Spiegelclients aus der Differenz des autoritativen Snapshots ableiten.
    if(previousHp){
      players.forEach((p,i)=>{
        const before=previousHp.get(String(p.onlineUid||""));
        if(!Number.isFinite(before)) return;
        const after=Number(p.hp)||0;
        if(after<before) setTimeout(()=>playDamageAnimation(i,before-after),20);
        else if(after>before) setTimeout(()=>playHealAnimation(i,after-before),20);
      });
    }

    clearPendingAction();
    enforceOnlineControls();
  }

  function applyAuthoritativeState(state){
    if(!isOnlineMatch() || !state) return false;
    const seq=Number(state.seq)||0;
    if(seq<=onlineSession.lastStateSeq) return false;
    onlineSession.lastStateSeq=seq;

    const previousHp=new Map(players.map(p=>[String(p.onlineUid||""),Number(p.hp)||0]));

    if(rollActionNeedsAnimation(state)){
      isAnimating=true;
      const incoming=Array.isArray(state.dice)?state.dice:[];
      dice.forEach((d,i)=>{
        const next=incoming[i];
        if(next && (d.value!==next.value || d.locked!==next.locked)) d.rolling=true;
      });
      renderAll();
      enforceOnlineControls("🌐 Gemeinsamer Würfelwurf …");
      setTimeout(()=>applyStateNow(state,previousHp),ROLL_ANIM_MS);
      return true;
    }

    applyStateNow(state,previousHp);
    return true;
  }

  function actionOwnerMatches(request){
    return interactionOwnerUid()===String(request?.actorUid||"");
  }

  function executePrimaryAction(){
    if(phase==="idle"||phase==="base_ready") rollBase();
    else if(phase==="attack_ready"||phase==="attack_continue") rollAttack();
    else if(phase==="attack_after_roll"&&hasAbility(24)&&attackHits===2&&currentAttackRollNewHits>0) continueDoubleTapAttack();
  }

  function executeOnlineAction(request){
    const type=String(request?.type||"");
    const payload=request?.payload||{};
    switch(type){
      case "primary": executePrimaryAction(); break;
      case "dice_select": {
        const index=Number(payload.index);
        if(phase!=="base_select" || !Number.isInteger(index) || index<0 || index>=dice.length || dice[index].locked) throw new Error("BAD_DICE_SELECT");
        dice[index].selected=!dice[index].selected;
        renderDice();updateButtons();
        break;
      }
      case "lock": lockSelected(); break;
      case "base_reroll": useBaseReroll(); break;
      case "loaded_dice": useLoadedDice(); break;
      case "snake_eyes": useSnakeEyes(); break;
      case "attack_power": useAttackPower(); break;
      case "blood_price": useBloodPrice(); break;
      case "resolve_attack": resolveCurrentAttackRoll(); break;
      case "next_turn": advanceTurn(); break;
      case "gambling_roll": rollGamblingMan(); break;
      case "perfect25_roll": rollPerfect25(); break;
      case "perfect25_d4_roll": rollPerfect25D4(); break;
      case "high_stakes_roll": rollHighStakes(); break;
      case "high_stakes_skip": skipHighStakes(); break;
      case "insurance_roll": rollInsurance(); break;
      case "counter_roll": rollCounterattack(); break;
      case "ability_choice": {
        const id=Number(payload.abilityId);
        if(!secondAbilityDraftBusy || !secondAbilityDraftChoices.includes(id)) throw new Error("BAD_ABILITY_CHOICE");
        chooseSecondAbility(id);
        break;
      }
      default: throw new Error("UNSUPPORTED_ACTION");
    }
  }

  function engineBusy(){
    return !!(isAnimating||gamblingRolling||perfect25Rolling||perfect25D4Rolling||highStakesRolling||insuranceRolling||counterRolling);
  }

  async function waitForEngineSettled(actionType){
    const started=Date.now();
    let stableSince=0;
    while(Date.now()-started<4200){
      let busy=engineBusy();
      // Basis-Eigenschaden wechselt nach kurzer Auto-Pause selbst zum nächsten Zug.
      if(phase==="base_auto_end" && !secondAbilityDraftBusy) busy=true;
      // Beendete Counterattack hat noch einen 650-ms-Abschluss-Timer.
      if(phase==="counterattack" && counterContext && counterRollBtn.disabled && !counterRolling) busy=true;
      if(!busy){
        if(!stableSince) stableSince=Date.now();
        if(Date.now()-stableSince>=110) break;
      }else stableSince=0;
      await new Promise(resolve=>setTimeout(resolve,35));
    }
    // Draft-Auswahl kann unmittelbar danach einen vorgemerkten Counter/Perfect25 öffnen.
    if(actionType==="ability_choice") await new Promise(resolve=>setTimeout(resolve,170));
  }

  async function hostExecuteAction(request){
    if(!isOnlineMatch() || !onlineSession.isHost || !request) throw new Error("ONLINE_NOT_HOST");
    if(!actionOwnerMatches(request)) throw new Error("WRONG_INTERACTION_OWNER");
    executeOnlineAction(request);
    await waitForEngineSettled(String(request.type||""));
    enforceOnlineControls();
    return exportOnlineState(request.id,request.type);
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
      hp:START_HP,maxHp:START_HP,
      ability:validAbility(entry?.ability),secondAbility:null,thirdAbility:null,fourthAbility:null,
      secondAbilityUnlocked:false,thirdAbilityUnlocked:false,fourthAbilityUnlocked:false,
      rolledAbility:rolled,primaryWasChosen:rolled===6,secondAbilityWasChosen:false,thirdAbilityWasChosen:false,fourthAbilityWasChosen:false,
      seat:0,diceDesign:String(entry?.diceDesign||localProfile?.selectedDice||"classic"),cosmeticTitle,cosmeticFrame,wins:0,
      momentumStreak:0,lastStandUsed:false,roundLastStandTriggered:false,damageSinceLastOwnTurn:false,bloodRushPrimed:false,
      voluntaryHpPaidThisTurn:false,botBloodUsesThisAttack:0
    };
  }

  function startOnlineMatch(match,localUid,localProfileId,isHost=false){
    const matchPlayers=Array.isArray(match?.players)?match.players:[];
    onlineSession={active:true,uid:String(localUid||""),roomCode:String(match?.roomCode||""),isHost:!!isHost,lastStateSeq:Number(match?.state?.seq)||0,actionPending:false,pendingActionId:""};
    installOnlineInputHooks();
    if(matchPlayers.length!==2 || !localUid) return false;
    if(!matchPlayers.some(p=>String(p?.uid||"")===String(localUid))) return false;

    tutorialMode=false;campaignMode=false;duoCampaignMode=false;trioCampaignMode=false;localModeId="classic";
    campaignEncounterId=null;campaignProfileId=null;campaignMetrics=freshCampaignMetrics();
    encounterRuntime={ruleIds:[],phaseRuleIds:[],phaseTriggered:false,firstStrikeUsed:new Set(),armorUsed:new Set(),turnStarts:{}};
    gameContext={mode:"online-1v1",returnScreen:"menu",profileId:localProfileId||null,encounterId:null,roomCode:String(match.roomCode||"")};

    resetTutorialUi();
    nextRoundPrepBtn.classList.add("hidden");
    restartBtn.classList.add("hidden");
    clearBotAutomation();

    players=matchPlayers.map(entry=>onlinePlayerFromMatch(entry,localUid,localProfileId));
    resetRoundStats();
    const authoritativeTurnUid=String(match?.currentPlayerUid||match?.firstPlayerUid||matchPlayers[0]?.uid||"");
    const authoritativeIndex=players.findIndex(p=>String(p?.onlineUid||"")===authoritativeTurnUid);
    current=authoritativeIndex>=0?authoritativeIndex:0;
    prepareBloodRushForTurn(current);
    dice=freshDice();phase="idle";isAnimating=false;
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

    logEl.innerHTML="";winnerBox.classList.add("hidden");nextRoundBox.classList.add("hidden");
    document.getElementById("onlineScreen")?.classList.add("hidden");hideFrontScreens();game.classList.remove("hidden","campaign-game","trio-game");
    document.body.classList.add("playing");document.body.classList.remove("bot-acting");window.scrollTo?.(0,0);

    addLog(`🌐 Online 1v1 gestartet. ${players[current].name} beginnt.`);
    players.forEach(p=>{
      const roll=p.rolledAbility;
      const abilityText=roll===6?`W25 = 6 → automatische freie Wahl → ${ABILITIES[p.ability].name}`:`W25 = ${roll} → ${ABILITIES[p.ability].name}`;
      addLog(`${p.name}: ${abilityText} · 🎲 ${DICE_DESIGNS[p.diceDesign]?.name||"Classic"}.`);
    });
    renderAll();enforceOnlineControls();
    addLog(`🌐 V27.3.0: Kompletter 1v1-Fight läuft host-autoritativ über Firebase.`);
    return true;
  }

  window.WDOnlineBridge=Object.freeze({
    getProfiles(){try{return (saveData?.profiles||[]).map(publicProfile).filter(Boolean);}catch(err){console.warn("Online-Profilliste konnte nicht gelesen werden",err);return []; }},
    getVersion(){try{return String(GAME_VERSION||"");}catch(_){return "";}},
    getOnlineChoicePool(){return REAL_ABILITY_IDS.filter(id=>id!==7);},
    startMatch:startOnlineMatch,
    hostExecuteAction,
    applyState:applyAuthoritativeState,
    enforceControls:enforceOnlineControls
  });
})();
