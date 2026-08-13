(function(){
  "use strict";

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

  function startOnlineMatch(match,localUid,localProfileId){
    const matchPlayers=Array.isArray(match?.players)?match.players:[];
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
    current=0;
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

    addLog(`🌐 Online 1v1 gestartet. ${players[0].name} beginnt.`);
    players.forEach(p=>{
      const roll=p.rolledAbility;
      const abilityText=roll===6?`W25 = 6 → automatische freie Wahl → ${ABILITIES[p.ability].name}`:`W25 = ${roll} → ${ABILITIES[p.ability].name}`;
      addLog(`${p.name}: ${abilityText} · 🎲 ${DICE_DESIGNS[p.diceDesign]?.name||"Classic"}.`);
    });
    renderAll();
    // V27.2.2 synchronisiert absichtlich nur den gemeinsamen Matchstart.
    // Bis der Action-Sync folgt, verhindern wir lokale Würfe, die die Geräte auseinanderlaufen lassen würden.
    primaryBtn.disabled=true;
    statusEl.textContent="🌐 Matchstart synchronisiert · Würfel- und Zugsync folgt im nächsten Online-Patch.";
    addLog("🧪 Matchstart-Sync aktiv. Würfel und Aktionen sind in V27.2.2 noch gesperrt, damit beide Geräte denselben Zustand behalten.");
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
    startMatch:startOnlineMatch
  });
})();
