  function resetTutorialUi(){
    tutorialOpen=false;
    tutorialSeen=new Set();
    tutorialQueue=[];
    tutorialStepCount=0;
    tutorialModal.classList.add("hidden");
  }

  function queueTutorialStep(key,title,html){
    if(!tutorialMode || tutorialSeen.has(key) || tutorialQueue.some(s=>s.key===key)) return;
    tutorialSeen.add(key);
    tutorialQueue.push({key,title,html});
    showNextTutorialStep();
  }

  function showNextTutorialStep(){
    if(!tutorialMode || tutorialOpen || !tutorialQueue.length) return;
    const step=tutorialQueue.shift();
    tutorialOpen=true;
    tutorialStepCount++;
    clearBotAutomation();
    tutorialTitle.textContent=step.title;
    tutorialText.innerHTML=step.html;
    tutorialProgress.textContent=`Tutorial · Schritt ${tutorialStepCount}`;
    tutorialModal.classList.remove("hidden");
  }

  function closeTutorialStep(){
    tutorialModal.classList.add("hidden");
    tutorialOpen=false;

    if(tutorialQueue.length){
      setTimeout(showNextTutorialStep,80);
      return;
    }

    if(deferredBaseAdvance && phase==="base_auto_end" && !secondAbilityDraftBusy){
      deferredBaseAdvance=false;
      setTimeout(()=>advanceTurn(),140);
      return;
    }

    scheduleBotAction(100);
  }

  function tutorialAfterBaseRoll(){
    if(!tutorialMode || current!==0 || phase!=="base_select") return;
    const hasOne=dice.some(d=>!d.locked&&d.value===1);
    const abilityTip=hasOne
      ? `<br><br>Du hast gerade mindestens eine <strong>1</strong>. Deine Tutorial-Fähigkeit <strong>Glückswurf</strong> kann einmal pro Basiszug einen ungelockten 1er gratis neu würfeln.`
      : `<br><br>Deine Tutorial-Fähigkeit ist <strong>Glückswurf</strong>: Falls später ein ungelockter 1er fällt, kannst du ihn einmal in diesem Basiszug gratis neu würfeln.`;

    queueTutorialStep(
      "first-base-roll",
      "Dein erster Basiswurf",
      `Nach jedem Basiswurf musst du <strong>mindestens einen Würfel auswählen und einlocken</strong>. Eingelockte Würfel bleiben liegen; nur der Rest wird erneut gewürfelt.${abilityTip}`
    );
  }

  function tutorialExplainBaseResult(total){
    if(!tutorialMode || current!==0) return;

    if(total<25){
      queueTutorialStep(
        "under-25",
        `${total} – unter 25`,
        `Dein fertiger Basiswurf liegt unter 25. Du verlierst deshalb <strong>${25-total} HP</strong> – genau die Differenz zu 25. Danach ist der Bot dran.`
      );
    }else if(total===25){
      queueTutorialStep(
        "exact-25",
        "Exakt 25",
        `Exakt <strong>25</strong> ist sicher: Du verlierst keine HP, greifst ohne besondere Fähigkeit aber auch nicht an. Danach wechselt der Zug.`
      );
    }
  }

  function tutorialExplainAttackStart(total,face){
    if(!tutorialMode || current!==0) return;
    queueTutorialStep(
      "first-attack",
      "Du darfst angreifen!",
      `Dein Basiswurf ist <strong>${total}</strong>. Dadurch greifst du auf <strong>${face}er</strong> an. Jetzt würfelst du alle 5 Würfel; jeder ${face}er ist ein Treffer und wird automatisch gelockt.`
    );
  }

  function tutorialExplainAttackRoll(){
    if(!tutorialMode || current!==0 || phase!=="attack_after_roll") return;
    const result=currentAttackRollNewHits===0
      ? `Dieser Wurf hatte <strong>keinen neuen Treffer</strong>. Ohne Rettungsfähigkeit endet der Angriff jetzt.`
      : `Du hast <strong>${currentAttackRollNewHits} neue Treffer</strong>. Treffer bleiben liegen; die übrigen Würfel kannst du nach der Auswertung weiterwürfeln.`;
    queueTutorialStep(
      "first-attack-roll",
      "So funktionieren Angriffe",
      `${result}<br><br>Ein Angriff läuft so lange weiter, bis ein Angriffswurf <strong>0 neue Treffer</strong> bringt oder alle 5 Würfel Treffer sind.`
    );
  }

  function startTutorial(){
    clearBotAutomation();
    resetTutorialUi();
    tutorialMode=true;
    campaignMode=false;
    gameContext={mode:"tutorial",returnScreen:"menu",profileId:null,encounterId:null};

    players=[
      {
        name:"Du", battleTag:"", profileId:null, botLevel:"human", hp:START_HP, ability:3, secondAbility:null,
        secondAbilityUnlocked:true, rolledAbility:"TUTORIAL", seat:0, diceDesign:"classic",
        wins:0, momentumStreak:0, lastStandUsed:false, damageSinceLastOwnTurn:false,
        bloodRushPrimed:false, voluntaryHpPaidThisTurn:false, botBloodUsesThisAttack:0
      },
      {
        name:"Tutorial-Bot", battleTag:"", profileId:null, botLevel:"easy", hp:START_HP, ability:0, secondAbility:null,
        secondAbilityUnlocked:true, rolledAbility:"TUTORIAL", seat:0, diceDesign:"classic",
        wins:0, momentumStreak:0, lastStandUsed:false, damageSinceLastOwnTurn:false,
        bloodRushPrimed:false, voluntaryHpPaidThisTurn:false, botBloodUsesThisAttack:0
      }
    ];

    resetRoundStats();
    current=0;
    prepareBloodRushForTurn(current);
    dice=freshDice();
    phase="idle";
    isAnimating=false;
    attackFace=null;attackTarget=null;pendingCampaignAttackStart=null;attackHits=0;attackDamage=0;firstAttackRoll=true;currentAttackRollNewHits=0;
    baseRerollUsed=false;luckRerollIndex=null;luckRerollSecondUsed=false;loadedDiceUsed=false;loadedDiceUses=0;lastBaseRollIndices=[];attackPowerUsed=false;attackPowerUses=0;precisionUses=0;
    momentumBonus=0;bloodPriceNeighbors=[];bloodRushActiveThisAttack=false;doubleTapApplied=false;
    pendingDamage=null;pendingHeal=null;pendingExtraDamageFx=[];pendingExtraHealFx=[];
    roundNumber=1;roundEliminationOrder=[];lastPlaceIndex=null;roundWinnerHandled=false;roundWinnerIndex=null;nextRoundAbilityRolls=[];
    eventPopupQueue=[];eventPopupBusy=false;secondAbilityDraftBusy=false;secondAbilityDraftIndex=null;deferredBaseAdvance=false;
    gamblingRolling=false;gamblingBaseTotal=null;gamblingModal.classList.add("hidden");
    highStakesRolling=false;highStakesDecisionThisAttack=false;highStakesModal.classList.add("hidden");
    perfect25Rolling=false;perfect25D4Rolling=false;perfect25BaseTotal=null;pendingPerfect25Total=null;perfect25Modal.classList.add("hidden");perfect25D4Modal.classList.add("hidden");
    insuranceRolling=false;insuranceContext=null;insuranceModal.classList.add("hidden");
    counterRolling=false;counterContext=null;counterDiceState=[];counterHits=0;counterFirstRoll=true;pendingCounterattack=null;deferredAttackFinish=false;counterModal.classList.add("hidden");
    wildcardFace=null;secondAbilityDraftQueue=[];secondAbilityModal.classList.add("hidden");
    logEl.innerHTML="";
    winnerBox.classList.add("hidden");nextRoundBox.classList.add("hidden");
    nextRoundPrepBtn.classList.add("hidden");
    restartBtn.textContent="Hauptmenü";

    hideFrontScreens();
    game.classList.remove("hidden");
    document.body.classList.add("playing");

    addLog("🎓 Tutorial gestartet: Du gegen einen leichten Bot. Du besitzt Glückswurf; der Bot hat keine Fähigkeit.");
    renderAll();

    queueTutorialStep(
      "intro",
      "Willkommen bei DiceDuel",
      `Du spielst eine kurze normale Runde gegen einen <strong>leichten Bot</strong>. Du startest mit <strong>25 HP</strong> und der einfachen Fähigkeit <strong>Glückswurf</strong>; der Bot hat im Tutorial keine Fähigkeit.<br><br>Dein Ziel: <strong>als Letzter am Leben bleiben</strong>. Starte danach einfach mit „Basiswurf“.`
    );
  }


