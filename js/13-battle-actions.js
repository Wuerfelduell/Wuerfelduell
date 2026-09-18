  function animateIndices(indices,finalizer,rollOptions={}){
    if(!indices.length){finalizer();return;}
    const previewRoll=typeof rollOptions.preview==="function"?rollOptions.preview:()=>randDie();
    const finalRoll=typeof rollOptions.final==="function"?rollOptions.final:()=>rollTrackedD6(current);
    isAnimating=true;
    // Das Ergebnis muss bereits im Online-Zwischenstand stehen. Sichtbar wird
    // es lokal erst beim Aufdecken; rolling schirmt Augen und Summe ab.
    indices.forEach(i=>{dice[i].value=finalRoll(i);dice[i].rolling=true;});
    renderAll();

    // 3D-Cube (CSS und Art-Flächen) zeigt beim Spin alle sechs Seiten.
    // Keine 55-ms-Neurenders: Animation bleibt auf dem Compositor.
    setTimeout(()=>{
      indices.forEach(i=>{dice[i].rolling=false;});
      // Heilung und Log bleiben wie bisher am Ende der Animation.
      applyTwelveHeal(current,indices.map(i=>dice[i].value),phase.startsWith("attack")?"Angriffswurf":"Basiswurf");
      isAnimating=false;
      renderAll();
      finalizer();
    },ROLL_ANIM_MS);
  }

  // Waehrend eines Spezialwurfs blinken die Flaechen durch. Das galt bis
  // V28.12.22 nur fuer Designs OHNE Artwork: der fruehe Ausstieg liess jedes
  // Art-Design ohne Flaechenwechsel, und weil .theme-art-die.rolling
  // zusaetzlich die Sprite ausblendet, war der grosse Wuerfel waehrend des
  // ganzen Wurfs leer - nur Rahmen und weisse Flaeche. Genau das war als
  // "fehlende Wuerfelanimation, der Wuerfel ist immer weiss" gemeldet.
  function tickSpecialDie(el){
    const key=players[current]?.diceDesign||"classic";
    renderSpecialDieFace(el,key,window.WDRng.visual(()=>randDie()));
  }

  function localEngineEligible(){
    const mode=String(gameContext?.mode||"");
    return ENGINE_LOKALES_DUELL===true && localModeId==="classic" && players.length===2 &&
      !campaignMode && !tutorialMode && mode==="local-classic" &&
      !document.body.classList.contains("test-lab-active");
  }
  function localEngineActive(){return localEngineEligible() && window.WDEngineAdapter?.hasLive?.();}
  // Der Browser-Sitz beschreibt nur die Position am gemeinsamen Gerät und darf
  // mehrfach gewählt werden. Im Reducer ist der Sitz dagegen die eindeutige
  // Spieler-ID. Jeder Spieler traegt sie als engineSeat; der Browser-Index ist
  // nicht stabil, weil der Rundenstart die Reihenfolge mischt (V28.14.20: davor
  // wurden ab Runde 2 HP, Faehigkeiten und Zugrecht ueber Kreuz gespiegelt).
  function localEnginePlayerIndex(seat){
    const wanted=Number(seat);
    return players.findIndex(player=>player.engineSeat===wanted);
  }
  function localEngineSnapshot(){
    return {phase,currentSeat:current,
      attackTargetSeat:attackTarget==null||attackTarget<0?null:attackTarget,
      dice:dice.map(die=>({value:die.value,locked:!!die.locked,selected:!!die.selected}))};
  }
  function startLocalDuelEngine(){
    window.WDEngineAdapter?.stopLive?.();
    if(!localEngineEligible()) return false;
    players.forEach((player,index)=>{player.engineSeat=index;});
    const setup={modeId:"classic",startingSeat:current,roundNumber,
      players:players.map((player,index)=>({seat:index,abilities:playerAbilities(index)}))};
    const state=window.WDEngineAdapter.startLive(setup);
    mirrorLocalEngineState(state);
    return true;
  }
  function mirrorLocalEngineState(state){
    if(!state) return;
    const browserPlayers=players.slice();
    players=state.players.map(enginePlayer=>{
      const player=browserPlayers.find(candidate=>candidate.engineSeat===enginePlayer.seat);
      if(!player) throw new Error("local_engine_player_missing:"+enginePlayer.seat);
      player.hp=enginePlayer.hp;player.maxHp=enginePlayer.maxHp;player.wins=enginePlayer.roundsWon;
      player.ability=enginePlayer.abilities[0]??1;player.secondAbility=enginePlayer.abilities[1]??null;
      player.thirdAbility=enginePlayer.abilities[2]??null;
      player.secondAbilityUnlocked=enginePlayer.abilities.length>=2;player.thirdAbilityUnlocked=enginePlayer.abilities.length>=3;
      player.momentumStreak=enginePlayer.effects.momentumStreak;player.lastStandUsed=enginePlayer.effects.lastStandUsed;
      player.masteryLastStandCooldown=enginePlayer.effects.lastStandCooldown;
      player.damageSinceLastOwnTurn=enginePlayer.effects.damageSinceLastOwnTurn;
      player.bloodRushPrimed=enginePlayer.effects.bloodRushPrimed;
      player.voluntaryHpPaidThisTurn=enginePlayer.effects.voluntaryHpPaidThisTurn;
      player.masterySelfDamageSinceLastOwnTurn=enginePlayer.effects.selfDamageSinceLastOwnTurn;
      player.masteryUnderdogTurnActive=enginePlayer.effects.underdogTurnActive;
      player.masteryPoisonTurns=enginePlayer.effects.poisonTurns;
      player.masteryPoisonSource=enginePlayer.effects.poisonSourceSeat==null?null:localEnginePlayerIndex(enginePlayer.effects.poisonSourceSeat);
      return player;
    });
    current=Math.max(0,localEnginePlayerIndex(state.turn.currentSeat));
    dice=state.dice.map(die=>({...die,rolling:false}));phase=state.turn.phase;
    baseRerollUsed=state.base.rerollUsed;luckRerollIndex=state.base.luckRerollIndex;
    luckRerollSecondUsed=state.base.luckRerollSecondUsed;luckRerollUses=state.base.luckRerollUses;
    loadedDiceUsed=state.base.loadedDiceUsed;loadedDiceUses=state.base.loadedDiceUses;lastBaseRollIndices=[...state.base.lastRollIndices];
    attackFace=state.attack.face;attackTarget=state.attack.targetSeat==null?null:localEnginePlayerIndex(state.attack.targetSeat);
    attackHits=state.attack.hits;attackDamage=state.attack.damage;firstAttackRoll=state.attack.firstRoll;
    currentAttackRollNewHits=state.attack.currentRollNewHits;attackRollCount=state.attack.rollCount;
    attackMasteryRollCount=state.attack.masteryRollCount;normalAttackHitsThisAttack=state.attack.normalHits;
    exactFaceHitsThisAttack=state.attack.exactFaceHits;wildcardAttackHitsThisAttack=state.attack.wildcardHits;
    lastAttackRollIndices=[...state.attack.lastRollIndices];attackPowerUsed=state.attack.powerUsed;attackPowerUses=state.attack.powerUses;
    precisionUses=state.attack.precisionUses;momentumBonus=state.attack.momentumBonus;
    bloodPriceNeighbors=[...state.attack.bloodPriceNeighbors];bloodPricePaidThisRoll=state.attack.bloodPricePaidThisRoll;
    bloodPriceWasPreActivatedThisRoll=state.attack.bloodPriceWasPreActivatedThisRoll;
    bloodRushActiveThisAttack=state.attack.bloodRushActive;doubleTapApplied=state.attack.doubleTapApplied;
    wildcardFace=state.attack.wildcardFace;wildcardSecondRollArmed=state.attack.wildcardSecondRollArmed;
    wildcardTriggeredThisAttack=state.attack.wildcardTriggered;masteryL2AttackBonusesApplied=state.attack.masteryL2BonusesApplied;
    currentAttackSource=state.attack.source;currentAttackBaseTotal=state.attack.baseTotal;
    gamblingBaseTotal=state.special.gambling.baseTotal;gamblingRetryUsed=state.special.gambling.retryUsed;
    gamblingRetryPending=state.special.gambling.retryPending;perfect25BaseTotal=state.special.perfect25.baseTotal;
    pendingPerfect25Total=state.special.perfect25.pendingTotal;highStakesDecisionThisAttack=state.special.highStakes.decisionMade;
    insuranceContext=state.special.insurance?{...state.special.insurance}:null;
    counterContext=state.counter.context?{
      defenderIndex:localEnginePlayerIndex(state.counter.context.defenderSeat),
      attackerIndex:localEnginePlayerIndex(state.counter.context.attackerSeat),
      restoreHp:state.counter.context.restoreHp,incomingDamage:state.counter.context.incomingDamage,
      lastStandTriggered:state.counter.context.lastStandTriggered,bloodRushActive:state.counter.context.bloodRushActive}:null;
    counterDiceState=state.counter.dice.map(die=>({...die,rolling:false}));counterHits=state.counter.hits;counterFirstRoll=state.counter.firstRoll;
    secondAbilityDraftBusy=!!state.draft.active;secondAbilityDraftIndex=state.draft.active?localEnginePlayerIndex(state.draft.active.seat):null;
    secondAbilityDraftSlot=state.draft.active?.slot??2;secondAbilityDraftChoices=state.draft.active?.choices?.slice()||[];
    roundNumber=state.round.number;roundEliminationOrder=state.round.eliminationOrder.map(localEnginePlayerIndex).filter(index=>index>=0);
    lastPlaceIndex=state.round.lastPlaceSeat==null?null:localEnginePlayerIndex(state.round.lastPlaceSeat);
    roundWinnerIndex=state.round.winnerSeat==null?null:localEnginePlayerIndex(state.round.winnerSeat);
  }
  function engineRecordRolls(events){
    for(const event of events){
      const values=(event.type==="DiceRolled"||event.type==="AttackRolled")?event.values:
        event.type==="SpecialDieRolled"&&event.sides===6?[event.value]:
        event.type==="AttackReadied"&&event.wildcardFace!=null?[event.wildcardFace]:[];
      const index=localEnginePlayerIndex(event.seat);
      values.forEach(value=>{recordD6(index,value);window.WDMastery?.noteAnyD6?.(index);});
    }
  }
  function engineApplyAchievements(result){
    const before=result.before,after=result.state,events=result.events;
    for(const event of events){
      const index=localEnginePlayerIndex(event.seat);
      if(event.type==="BaseResolved"){
        const active=before.players.find(player=>player.seat===event.seat),hasAdvance=active?.abilities?.includes(5),hasPerfect25=active?.abilities?.includes(15);
        if(event.total<25||(event.total===25&&!hasAdvance&&!hasPerfect25)) resetFirstClassStreak(index);
      }
      if(event.type==="AttackReadied"&&players[index]){
        players[index].botBloodUsesThisAttack=0;
        if(event.source!=="perfect25") players[index].perfect25AttackArmed=false;
        const enginePlayer=after.players.find(player=>player.seat===event.seat);
        if(enginePlayer?.effects?.momentumStreak>=5) unlockAchievementForPlayer(index,"momentum_mori");
      }
      if(event.type==="SpecialDieRolled"&&event.kind==="perfect25_permit"&&players[index]){
        players[index].perfect25AttackArmed=after.turn.phase==="perfect25_d4";
        if(!players[index].perfect25AttackArmed) resetFirstClassStreak(index);
      }
      if(event.type==="LastStandTriggered"&&players[index]) players[index].roundLastStandTriggered=true;
      if(event.type==="DiceRolled"&&event.kind==="base"&&event.values.length===5){
        const player=players[index];player.machineBaseArmed=event.values.every(value=>value===6);
        player.dumbassBaseArmed=event.values.every(value=>value===1);
        if(player.machineBaseArmed) unlockAchievementForPlayer(index,"full_send");
      }
      if(event.type==="DiceLocked"){
        const active=after.players.find(player=>player.seat===event.seat),values=after.dice.filter(die=>die.locked).map(die=>die.value);
        if(players[index]?.dumbassBaseArmed&&event.indices.length===5&&values.every(value=>value===1)) unlockAchievementForPlayer(index,"dumbass");
        if(values.length===5&&isStraightFive(values)) unlockAchievementForPlayer(index,"straight");
      }
      if(event.type==="DiceRolled"&&event.kind==="snake_eyes"&&roundStats[index]){
        roundStats[index].snakeEyesUsesThisTurn++;
        if(roundStats[index].snakeEyesUsesThisTurn>=2) unlockAchievementForPlayer(index,"snake_charmer");
        if(roundStats[index].snakeEyesUsesThisTurn>=4) unlockAchievementForPlayer(index,"snake_oil");
      }
      if((event.type==="DiceRolled"||event.type==="AttackRolled")&&roundStats[index]&&
        before.players.find(player=>player.seat===event.seat)?.abilities?.includes(22)&&
        event.values.filter(value=>value===6).length>=2){
        roundStats[index].twelveTriggers++;
        if(roundStats[index].twelveTriggers>=3) unlockAchievementForPlayer(index,"twelve_x3");
      }
      if(event.type==="AttackRolled"&&event.kind==="main"&&event.values.length===5){
        if(isStraightFive(event.values)) unlockAchievementForPlayer(index,"royal_flush_attack");
        if(isFullHouseFive(event.values)) unlockAchievementForPlayer(index,"full_house_attack");
        if(event.values.every(value=>value===before.attack.face)) unlockAchievementForPlayer(index,"laser_guided");
        if(players[index]?.machineBaseArmed&&before.attack.face===5&&event.values.every(value=>value===5)) unlockAchievementForPlayer(index,"machine");
        if(players[index]) players[index].machineBaseArmed=false;
      }
      if(event.type==="HighStakesResolved"&&!event.skipped&&roundStats[index]){
        if(event.damage<event.before) roundStats[index].highStakesLosses++;
        else if(event.roll>=4){roundStats[index].highStakesWins++;if(roundStats[index].highStakesWins>=3)unlockAchievementForPlayer(index,"degenerate_gambler");}
      }
      if(event.type==="InsuranceResolved"){
        const total=Number(before.special.insurance?.total);
        if(total===20&&event.roll===1) unlockAchievementForPlayer(index,"nat20_nat1");
        if(total===24&&event.damage===0) unlockAchievementForPlayer(index,"insurance_fraud");
      }
      if(event.type==="Healed"&&event.amount>=10) unlockAchievementForPlayer(index,"blood_bank");
      if(event.type==="Healed"&&event.source==="counter_lifesteal"&&event.amount>0) unlockAchievementForPlayer(index,"vampiric_touch");
    }
    const damageEvent=events.find(event=>event.type==="DamageApplied"&&event.source==="attack");
    if(damageEvent){
      const attacker=localEnginePlayerIndex(damageEvent.sourceSeat),targetBefore=before.players.find(player=>player.seat===damageEvent.targetSeat)?.hp||0;
      if(after.attack.hits===5) unlockAchievementForPlayer(attacker,"grande");
      if(after.attack.damage>=targetBefore+10) unlockAchievementForPlayer(attacker,"overkill");
      if(damageEvent.amount===21) unlockAchievementForPlayer(attacker,"critical_hit");
      if(after.attack.face===1&&damageEvent.amount>=15) unlockAchievementForPlayer(attacker,"one_or_three");
      if(after.attack.doubleTapApplied&&after.players.find(player=>player.seat===damageEvent.targetSeat)?.hp<=0)unlockAchievementForPlayer(attacker,"double_trouble");
    }
    const endedAttack=events.find(event=>event.type==="TurnEnded"&&["attack_complete","attack_missed"].includes(event.reason));
    if(damageEvent||endedAttack){
      const seat=damageEvent?.sourceSeat??endedAttack.seat,index=localEnginePlayerIndex(seat);
      const total=events.filter(event=>event.type==="DamageApplied"&&event.sourceSeat===seat&&["attack","ricochet","ricochet_chain"].includes(event.source))
        .reduce((sum,event)=>sum+event.amount,0);
      recordAttackDamageForAchievements(index,total);
    }
    const counter=events.find(event=>event.type==="CounterattackResolved");
    if(counter){
      const defender=localEnginePlayerIndex(counter.defenderSeat);
      if(counter.hits===5) unlockAchievementForPlayer(defender,"grande");
      if(counter.damage>=15) unlockAchievementForPlayer(defender,"backstab");
    }
  }
  function engineApplySideEffects(result){
    engineRecordRolls(result.events);engineApplyAchievements(result);
    const lastSource=new Map();
    for(const event of result.events){
      if(event.type==="DamageApplied"){
        const sourceIndex=localEnginePlayerIndex(event.sourceSeat),targetIndex=localEnginePlayerIndex(event.targetSeat);
        lastSource.set(event.targetSeat,event.sourceSeat);
        if(event.sourceSeat===event.targetSeat){
          recordSelfDamage(targetIndex,event.amount,event.source);
          if(["loaded_dice","blood_price","blood_credit","blood_rush_self_harm"].includes(event.source)) recordVoluntaryHp(targetIndex,event.amount);
        }else{
          if(roundStats[targetIndex]) roundStats[targetIndex].damageTaken+=event.amount;
          recordDamageDealt(sourceIndex,event.amount,sourceIndex===current);
          const kind=event.source==="counterattack"?"counter":(event.source.startsWith("ricochet")?"ricochet":((result.before.attack.face===4||result.before.attack.face===6)?"lightning":"laser"));
          window.WDAttackFx?.emit?.(sourceIndex,targetIndex,kind,event.amount,result.before.attack.face);
          pendingDamage={target:targetIndex,amount:event.amount};
        }
      }else if(event.type==="Healed"){
        const index=localEnginePlayerIndex(event.seat);recordHealing(index,event.amount);pendingHeal={target:index,amount:event.amount};
        if(event.source==="perfect_parry"&&roundStats[index]){
          const incoming=Number(result.before.counter.context?.incomingDamage)||0;
          roundStats[index].damageTaken=Math.max(0,roundStats[index].damageTaken-incoming);
        }
      }else if(event.type==="PlayerEliminated"){
        const targetIndex=localEnginePlayerIndex(event.seat),sourceSeat=lastSource.get(event.seat),sourceIndex=localEnginePlayerIndex(sourceSeat);
        if(sourceSeat!==event.seat&&sourceIndex>=0&&roundStats[sourceIndex]){roundStats[sourceIndex].kills++;window.WDAttackFx?.kill?.(sourceIndex,targetIndex);}
        queueEventPopup(`${players[targetIndex].name} Died!`,"death");
      }else if(event.type==="AbilityChosen"){
        const index=localEnginePlayerIndex(event.seat),player=players[index];
        if(event.slot===3) player.thirdAbilityWasChosen=true;
        else player.secondAbilityWasChosen=true;
        addLog(`✨ ${player.name} wählt als ${event.slot}. Fähigkeit: ${ABILITIES[event.abilityId].name}.`);
      }else if(event.type==="TurnStarted"){
        const index=localEnginePlayerIndex(event.seat);
        if(turnDamageThisTurn[index]!=null) turnDamageThisTurn[index]=0;
        if(roundStats[index]) roundStats[index].snakeEyesUsesThisTurn=0;
      }
    }
  }
  function showLocalEngineDraft(){
    const state=window.WDEngineAdapter.getLiveState(),active=state?.draft?.active;
    if(!active) return;
    const index=localEnginePlayerIndex(active.seat),player=players[index];
    secondAbilityDraftBusy=true;secondAbilityDraftIndex=index;secondAbilityDraftSlot=active.slot;secondAbilityDraftChoices=active.choices.slice();
    secondAbilityTitle.textContent=`${player.name}: Wähle deine ${active.slot}. Fähigkeit`;
    secondAbilityOptions.innerHTML="";
    active.choices.forEach(id=>{const btn=document.createElement("button");btn.className="second-ability-card"+(id===7?" luck":"");
      btn.innerHTML=`<div class="num">${id}</div><div class="name">${escapeHtml(ABILITIES[id].name)}</div><div class="desc">${escapeHtml(ABILITIES[id].desc)}</div>`;
      btn.onclick=()=>{if(!isBotPlayer(index))chooseSecondAbility(id);};secondAbilityOptions.appendChild(btn);});
    secondAbilityModal.classList.remove("hidden");scheduleBotAction(120);
  }
  function presentLocalEngineState(){
    const state=window.WDEngineAdapter.getLiveState();if(!state) return;
    if(state.turn.phase!=="gamble_attack"&&state.turn.phase!=="gamble_retry") gamblingModal.classList.add("hidden");
    if(state.turn.phase!=="perfect25") perfect25Modal.classList.add("hidden");
    if(state.turn.phase!=="perfect25_d4") perfect25D4Modal.classList.add("hidden");
    if(state.turn.phase!=="high_stakes") highStakesModal.classList.add("hidden");
    if(state.turn.phase!=="insurance") insuranceModal.classList.add("hidden");
    if(state.turn.phase!=="counterattack") counterModal.classList.add("hidden");
    if(state.turn.phase!=="draft_pending"){secondAbilityModal.classList.add("hidden");secondAbilityDraftBusy=false;}
    if(state.turn.phase==="gamble_attack"||state.turn.phase==="gamble_retry"){
      const designKey=players[current]?.diceDesign||"classic";gamblingDie.className=`gambling-die ${DICE_DESIGNS[designKey]?.className||"theme-classic"}`;
      renderSpecialDieFace(gamblingDie,designKey,null);gamblingResult.textContent="Tippe den D6";gamblingDie.disabled=false;
      gamblingRetryActions?.classList.toggle("hidden",state.turn.phase!=="gamble_retry");gamblingModal.classList.remove("hidden");
    }else if(state.turn.phase==="perfect25"){
      const designKey=players[current]?.diceDesign||"classic";perfect25Die.className=`special-big-die ${DICE_DESIGNS[designKey]?.className||"theme-classic"}`;
      renderSpecialDieFace(perfect25Die,designKey,null);perfect25Die.disabled=false;perfect25Result.textContent="D6 würfeln";perfect25Modal.classList.remove("hidden");
    }else if(state.turn.phase==="perfect25_d4"){
      perfect25D4Die.disabled=false;perfect25D4Result.textContent="D4 würfeln";perfect25D4Modal.classList.remove("hidden");
    }else if(state.turn.phase==="high_stakes"){
      const designKey=players[current]?.diceDesign||"classic";highStakesDie.className=`special-big-die ${DICE_DESIGNS[designKey]?.className||"theme-classic"}`;
      renderSpecialDieFace(highStakesDie,designKey,null);highStakesDie.disabled=false;highStakesSkip.disabled=false;
      highStakesSub.textContent=`Aktueller Schaden: ${state.special.highStakes.rawDamage}. Du kannst ihn sicher nehmen oder jetzt gamblen.`;highStakesModal.classList.remove("hidden");scheduleBotAction(120);
    }else if(state.turn.phase==="insurance"){
      insuranceRolling=false;insuranceDie.disabled=false;insuranceResult.textContent="D6 würfeln";insuranceModal.classList.remove("hidden");
    }else if(state.turn.phase==="counterattack"&&counterContext){
      counterTitle.textContent=`${players[counterContext.defenderIndex].name} schlägt zurück!`;counterRollBtn.disabled=false;
      counterResult.textContent=`${counterHits}/5 Treffer`;counterModal.classList.remove("hidden");renderCounterDice();scheduleBotAction(80);
    }else if(state.turn.phase==="draft_pending") showLocalEngineDraft();
  }
  function finishLocalEngineResult(result){
    engineApplySideEffects(result);mirrorLocalEngineState(result.state);presentLocalEngineState();renderAll();
    if(result.state.round.result){
      if(!roundWinnerHandled&&roundWinnerIndex!=null) players[roundWinnerIndex].wins=Math.max(0,players[roundWinnerIndex].wins-1);
      checkWinner();
    }
    const ended=result.events.find(event=>event.type==="TurnEnded");
    if(ended&&!result.state.round.result&&["attack_complete","counterattack_complete"].includes(ended.reason)) advanceTurn();
    else if(ended&&["base_self_damage","exact_25","perfect25_denied"].includes(ended.reason))
      setTimeout(()=>{if(localEngineActive()&&phase==="turn_done")advanceTurn();},220);
    return true;
  }
  function animateLocalEngineDice(result,event){
    isAnimating=true;
    event.indices.forEach((index,offset)=>{dice[index].value=event.values[offset];dice[index].rolling=true;});renderAll();
    setTimeout(()=>{event.indices.forEach(index=>{if(dice[index])dice[index].rolling=false;});isAnimating=false;finishLocalEngineResult(result);},ROLL_ANIM_MS);
    return true;
  }
  function animateLocalEngineCounter(result,event){
    counterRolling=true;
    event.indices.forEach((index,offset)=>{counterDiceState[index].value=event.values[offset];counterDiceState[index].rolling=true;});renderCounterDice();
    setTimeout(()=>{counterRolling=false;finishLocalEngineResult(result);},ROLL_ANIM_MS);return true;
  }
  function animateLocalEngineSpecial(result,event){
    const configs={gambling:[gamblingDie,gamblingResult,"gamblingRolling"],gambling_retry:[gamblingDie,gamblingResult,"gamblingRolling"],
      perfect25_permit:[perfect25Die,perfect25Result,"perfect25Rolling"],perfect25_attack:[perfect25D4Die,perfect25D4Result,"perfect25D4Rolling"],
      high_stakes:[highStakesDie,highStakesResult,"highStakesRolling"],insurance:[insuranceDie,insuranceResult,"insuranceRolling"]};
    const config=configs[event.kind];if(!config) return finishLocalEngineResult(result);
    if(config[2]==="gamblingRolling")gamblingRolling=true;else if(config[2]==="perfect25Rolling")perfect25Rolling=true;
    else if(config[2]==="perfect25D4Rolling")perfect25D4Rolling=true;else if(config[2]==="highStakesRolling")highStakesRolling=true;else insuranceRolling=true;
    config[0].classList.add("rolling");config[0].disabled=true;config[1].textContent="...";
    setTimeout(()=>{config[0].classList.remove("rolling");renderSpecialDieFace(config[0],players[current]?.diceDesign||"classic",event.value);
      config[1].textContent=`${event.sides===4?"D4":"D6"} = ${event.value}`;
      setTimeout(()=>{gamblingRolling=false;perfect25Rolling=false;perfect25D4Rolling=false;highStakesRolling=false;insuranceRolling=false;finishLocalEngineResult(result);},260);
    },560);return true;
  }
  function runLocalEngineMove(name,args=[]){
    if(!localEngineActive()) return false;
    const result=window.WDEngineAdapter.dispatchLiveMove(name,args,localEngineSnapshot(),window.WDRng.random);
    const counterRoll=result.events.find(event=>event.type==="AttackRolled"&&event.kind==="counterattack");
    if(counterRoll) return animateLocalEngineCounter(result,counterRoll);
    const special=result.events.find(event=>event.type==="SpecialDieRolled")||
      result.events.find(event=>event.type==="DiceRolled"&&event.kind==="insurance");
    if(special){if(special.kind==="insurance")special.sides=6,special.value=special.values[0];return animateLocalEngineSpecial(result,special);}
    const roll=result.events.find(event=>event.type==="DiceRolled"||event.type==="AttackRolled");
    if(roll) return animateLocalEngineDice(result,roll);
    return finishLocalEngineResult(result);
  }

  function isStraightFive(values){
    if(!Array.isArray(values)||values.length!==5) return false;
    return [...values].map(Number).sort((a,b)=>a-b).every((v,i)=>v===i+1);
  }

  function isFullHouseFive(values){
    if(!Array.isArray(values)||values.length!==5) return false;
    const counts=new Map();
    values.forEach(v=>counts.set(Number(v),(counts.get(Number(v))||0)+1));
    return [...counts.values()].sort((a,b)=>a-b).join(",")==="2,3";
  }

  function resetFirstClassStreak(index=current){
    if(players[index]) players[index].firstClassStreak=0;
  }

  function recordAttackDamageForAchievements(index,totalActualDamage){
    const p=players[index];
    if(!p) return;
    const damage=Math.max(0,Number(totalActualDamage)||0);
    if(damage===0){
      p.firstClassStreak=(p.firstClassStreak||0)+1;
      if(p.firstClassStreak>=3) unlockAchievementForPlayer(index,"first_class");
    }else p.firstClassStreak=0;
    if(p.perfect25AttackArmed){
      if(damage===0) unlockAchievementForPlayer(index,"perfectly_useless");
      p.perfect25AttackArmed=false;
    }
  }

  function rollBase(){
    if(localEngineActive()) return runLocalEngineMove("rollBase");
    const indices=[];
    dice.forEach((d,i)=>{if(!d.locked){d.selected=false;indices.push(i);}});
    lastBaseRollIndices=[...indices];
    
    animateIndices(indices,()=>{
      // V27.5 Achievements zählen nur den echten ersten 5W6-Basiswurf eines Zuges.
      if(indices.length===5){
        const values=indices.map(i=>dice[i].value);
        const allSixes=values.every(v=>v===6);
        players[current].machineBaseArmed=allSixes;
        players[current].dumbassBaseArmed=values.every(v=>v===1);
        if(allSixes) unlockAchievementForPlayer(current,"full_send");
      }
      phase="base_select";
      renderAll();
      tutorialAfterBaseRoll();
    });
  }

  function useBaseReroll(){
    if(localEngineActive()) return runLocalEngineMove("useBaseReroll");
    if(!hasAbility(3)||isAnimating) return;
    const masteryL1=hasMasteryUpgrade(3,1,current);
    const masteryL2=hasMasteryUpgrade(3,2,current);
    const maxUses=masteryL2?2:1;
    const canRerollReroll=masteryL1&&luckRerollUses>0&&!luckRerollSecondUsed&&luckRerollIndex!=null&&dice[luckRerollIndex]&&!dice[luckRerollIndex].locked;
    const isSecond=canRerollReroll;
    const idx=isSecond?luckRerollIndex:dice.findIndex(d=>!d.locked&&d.value===1);
    if(idx===-1||idx==null) return;
    if(!isSecond&&luckRerollUses>=maxUses)return;

    if(isSecond){
      luckRerollSecondUsed=true;
    }else{
      luckRerollUses++;
      baseRerollUsed=luckRerollUses>0;
      luckRerollIndex=idx;
      luckRerollSecondUsed=false;
      markCampaignAbilityUse(current,3);
    }

    const old=dice[idx].value;
    animateIndices([idx],()=>{
      addLog(isSecond
        ?`🍀 Reroll the Reroll: ${players[current].name} würfelt ${old} erneut → ${dice[idx].value}.`
        :`⚡ ${players[current].name} nutzt Glückswurf ${luckRerollUses}/${maxUses}: ${old} → ${dice[idx].value}. Eine neue 1 ist ausgeschlossen.`);
      phase="base_select";renderAll();
    },{
      preview:()=>{let value=1;while(value===1)value=randDieForPlayer(current);return value;},
      final:()=>rollTrackedD6Excluding(current,1)
    });
  }


  function useLoadedDice(){
    if(localEngineActive()) return runLocalEngineMove("useLoadedDice");
    const loadedMax=hasMasteryUpgrade(18,1,current)?2:1;
    const nextLoadedBaseCost=(hasMasteryUpgrade(18,2,current)&&loadedDiceUses===1)?1:2;
    if(!hasAbility(18) || loadedDiceUses>=loadedMax || isAnimating || phase!=="base_select" || players[current].hp<=encounterVoluntaryCost(nextLoadedBaseCost)) return;

    const eligible=dice
      .map((d,i)=>({d,i}))
      .filter(x=>x.d.selected && !x.d.locked && x.d.value!=null && x.d.value!==5);

    if(eligible.length!==1) return;

    const {d,i}=eligible[0];
    const beforeValue=d.value;
    const loadedUseNumber=loadedDiceUses+1;
    loadedDiceUses++;
    loadedDiceUsed=loadedDiceUses>=loadedMax;
    d.value=5;
    if(beforeValue===6 && roundStats[current]){
      roundStats[current].loadedSixToFive=(roundStats[current].loadedSixToFive||0)+1;
      if(roundStats[current].loadedSixToFive>=3) unlockAchievementForPlayer(current,"loaded_question");
    }
    markCampaignAbilityUse(current,18);

    const baseLoadedCost=(hasMasteryUpgrade(18,2,current)&&loadedUseNumber===2)?1:2;
    const loadedCost=encounterVoluntaryCost(baseLoadedCost);
    const damageResult=applyDamageToPlayer(current,loadedCost,"voluntary");
    players[current].voluntaryHpPaidThisTurn=true;
    recordSelfDamage(current,damageResult.lost,"loaded");
    recordVoluntaryHp(current,damageResult.lost);
    if(damageResult.lost>0) pendingDamage={target:current,amount:damageResult.lost};

    addLog(`🎲 Loaded Dice: ${players[current].name} zahlt ${damageResult.lost} HP und dreht Würfel ${i+1}: ${beforeValue} → 5.`);

    if(players[current].hp<=0){
      markEliminated(current);
      addLog(`💀 ${players[current].name} ist durch Loaded Dice ausgeschieden.`);
      finishBaseTurn(900);
      return;
    }

    renderAll();
  }

  function useSnakeEyes(){
    if(localEngineActive()) return runLocalEngineMove("useSnakeEyes");
    const attackUse=phase==="attack_after_roll"&&hasMasteryUpgrade(20,1,current);
    if(!hasAbility(20) || isAnimating || (phase!=="base_select"&&!attackUse)) return;

    const group=snakeEyesGroup();
    if(!group) return;
    const rerollIndices=group.indices;
    markCampaignAbilityUse(current,20);

    if(roundStats[current]){
      roundStats[current].snakeEyesUsesThisTurn++;
      if(roundStats[current].snakeEyesUsesThisTurn>=2) unlockAchievementForPlayer(current,"snake_charmer");
      if(roundStats[current].snakeEyesUsesThisTurn>=4) unlockAchievementForPlayer(current,"snake_oil");
    }

    animateIndices(rerollIndices,()=>{
      const results=rerollIndices.map(i=>dice[i].value).join(" / ");
      if(attackUse){
        let bonusHits=0;
        rerollIndices.forEach(i=>{
          const isNormal=isNormalAttackHitValue(dice[i].value);
          const isWildcard=wildcardFace!=null&&(attackRollCount===1||(attackRollCount===2&&hasMasteryUpgrade(17,1,current)))&&dice[i].value===wildcardFace;
          if(isNormal||isWildcard){dice[i].locked=true;attackHits++;bonusHits++;attackDamage+=damagePerAttackHit();}
        });
        currentAttackRollNewHits+=bonusHits;
        addLog(`🐍 Snake Bite: ${results} → ${bonusHits} zusätzliche Treffer im Angriff.`);
        phase="attack_after_roll";
      }else{
        addLog(`🐍 Snake Eyes: ${players[current].name} würfelt ${rerollIndices.length} gleichzeitig gewürfelte ${group.face}er gratis neu → ${results}.`);
        phase="base_select";
      }
      renderAll();
    });
  }

  function lockSelected(){
    if(localEngineActive()) return runLocalEngineMove("lockSelected");
    if(isAnimating) return;
    const selected=dice.filter(d=>d.selected&&!d.locked);
    if(!selected.length) return;
    if(players[current].dumbassBaseArmed && selected.length===5 && dice.every(d=>!d.locked && d.selected && d.value===1)){
      unlockAchievementForPlayer(current,"dumbass");
      players[current].dumbassBaseArmed=false;
    }
    selected.forEach(d=>{d.locked=true;d.selected=false;});
    const lockedValues=dice.filter(d=>d.locked&&d.value!=null).map(d=>d.value);
    if(lockedValues.length===5 && isStraightFive(lockedValues)) unlockAchievementForPlayer(current,"straight");
    if(dice.every(d=>d.locked)){resolveBase();return;}
    phase="base_ready";
    renderAll();
    if(tutorialMode && current===0){
      queueTutorialStep(
        "first-lock",
        "Locken & weiterwürfeln",
        `Gut. Die eingelockten Würfel bleiben jetzt fest. Mit <strong>„Rest würfeln“</strong> würfelst du nur die übrigen Würfel neu. Wiederhole das, bis alle 5 Würfel gelockt sind.`
      );
    }
  }


  function randomSecondAbilityChoices(index){
    const owned=new Set(playerAbilities(index));
    const allowed=((duoCampaignMode||trioCampaignMode) && players[index]?.campaignTeam==="hero")
      ? REAL_ABILITY_IDS
      : (campaignMode && players[index]?.campaignTeam==="hero")
        ? campaignUnlockedSecondAbilities(getProfile(players[index]?.profileId)||getProfile(campaignProfileId))
        : REAL_ABILITY_IDS;
    const pool=allowed.filter(a=>!owned.has(a) && a!==7);

    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(window.WDRng.random()*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    return pool.slice(0,2);
  }

  function campaignBonusDraftSlot(index){
    const p=players[index];
    if(!p || !campaignMode || p.campaignTeam!=="hero") return null;
    const encounter=currentEncounterObject();
    const maxSlots=Math.max(2,Math.min(4,Number(encounter?.maxAbilitySlots)||3));
    if(maxSlots>=2 && p.secondAbility==null && !p.secondAbilityUnlocked) return 2;
    if(maxSlots>=3 && p.thirdAbility==null && !p.thirdAbilityUnlocked) return 3;
    if(maxSlots>=4 && p.fourthAbility==null && !p.fourthAbilityUnlocked) return 4;
    return null;
  }

  function maybeTriggerCampaignStandardBonusDraft(index,trigger="hp"){
    const p=players[index];
    const encounter=currentEncounterObject();
    if(encounter?.disableBonusDraft) return false;
    if(!campaignMode || !p || p.campaignTeam!=="hero" || p.hp<=0 || p.campaignBonusDraftUsed) return false;
    const slot=campaignBonusDraftSlot(index);
    if(slot==null) return false;
    p.campaignBonusDraftUsed=true;
    if(slot===2) p.secondAbilityUnlocked=true;
    else if(slot===3) p.thirdAbilityUnlocked=true;
    else p.fourthAbilityUnlocked=true;
    const label=`${slot}. Fähigkeit`;
    const reason=trigger==="kill"
      ? `💀 Kill-Bonus: ${p.name} erzielt den ersten eigenen Gegner-Kill und darf die ${label} wählen.`
      : `❤️ HP-Bonus: ${p.name} fällt auf ${p.hp} HP und darf die ${label} wählen.`;
    openAbilityDraftForSlot(index,slot,label,reason);
    return true;
  }

  function bonusAbilityRuleFor(index){
    const p=players[index];
    if(!p) return null;
    if(campaignMode){
      if(p.campaignTeam!=="hero") return null;
      const threshold=window.WDMastery?.abilityThresholdForPlayer?.(index)??15;
      const slot=campaignBonusDraftSlot(index)||2;
      return {threshold,slot,label:`${slot}. Fähigkeit`};
    }
    const rules=typeof localModeRules==="function"?localModeRules():null;
    if(rules?.bonusSlot&&rules.bonusThreshold!=null) return {threshold:rules.bonusThreshold,slot:rules.bonusSlot,label:`${rules.bonusSlot}. Fähigkeit`};
    return null;
  }

  function maybeTriggerLocalBonusDraft(index,trigger="hp"){
    if(campaignMode||tutorialMode) return false;
    const rules=typeof localModeRules==="function"?localModeRules():null;
    if(!rules?.bonusSlot||rules.bonusThreshold==null) return false;
    if(trigger==="kill"&&!rules.bonusOnKill) return false;
    const p=players[index];
    if(!p||p.hp<=0) return false;
    const slot=Number(rules.bonusSlot);
    if(![2,3,4].includes(slot)) return false;
    if(slot===2&&(p.secondAbility!=null||p.secondAbilityUnlocked)) return false;
    if(slot===3&&(p.thirdAbility!=null||p.thirdAbilityUnlocked)) return false;
    if(slot===4&&(p.fourthAbility!=null||p.fourthAbilityUnlocked)) return false;
    if(slot===2) p.secondAbilityUnlocked=true;
    else if(slot===3) p.thirdAbilityUnlocked=true;
    else p.fourthAbilityUnlocked=true;
    const label=`${slot}. Fähigkeit`;
    const reason=trigger==="kill"
      ? `💀 Kill-Bonus: ${p.name} darf die ${label} wählen.`
      : `❤️ HP-Bonus: ${p.name} fällt auf ${p.hp} HP und darf die ${label} wählen.`;
    openAbilityDraftForSlot(index,slot,label,reason);
    return true;
  }

  function maybeTriggerSecondAbility(index,oldHp,newHp){
    if(tutorialMode) return false;
    const p=players[index];
    if(!p || p.hp<=0) return false;
    if(campaignMode && p.campaignTeam==="hero"){
      const threshold=window.WDMastery?.abilityThresholdForPlayer?.(index)??15;
      if(newHp<=threshold) return maybeTriggerCampaignStandardBonusDraft(index,"hp");
      return false;
    }
    const rule=bonusAbilityRuleFor(index);
    if(!rule) return false;
    const already=rule.slot===3?p.thirdAbilityUnlocked:p.secondAbilityUnlocked;
    if(already) return false;
    if(newHp<=rule.threshold){
      if(campaignMode) return maybeTriggerCampaignStandardBonusDraft(index,"hp");
      return maybeTriggerLocalBonusDraft(index,"hp");
    }
    return false;
  }

  function openAbilityDraftForSlot(index,slot,label,reasonText=""){
    if(localEngineActive()){showLocalEngineDraft();return;}
    const p=players[index];
    if(!p || p.hp<=0 || ![2,3,4].includes(slot)) return;
    if(slot===2 && p.secondAbility!=null) return;
    if(slot===3 && p.thirdAbility!=null) return;
    if(slot===4 && p.fourthAbility!=null) return;

    const queued={index,slot,label,reasonText};
    if(secondAbilityDraftBusy){
      const exists=secondAbilityDraftQueue.some(item=>typeof item==="object"&&item.index===index&&item.slot===slot);
      if(!exists) secondAbilityDraftQueue.push(queued);
      return;
    }

    secondAbilityDraftBusy=true;
    secondAbilityDraftIndex=index;
    secondAbilityDraftSlot=slot;
    const options=randomSecondAbilityChoices(index);
    secondAbilityDraftChoices=[...options];

    secondAbilityTitle.textContent=`${p.name}: Wähle deine ${label}`;
    secondAbilityOptions.innerHTML="";

    options.forEach(id=>{
      const btn=document.createElement("button");
      btn.className="second-ability-card"+(id===7?" luck":"");
      btn.innerHTML=`<div class="num">${id}</div><div class="name">${escapeHtml(ABILITIES[id].name)}</div><div class="desc">${escapeHtml(ABILITIES[id].desc)}</div>`;
      btn.onclick=()=>{if(!isBotPlayer(index))chooseSecondAbility(id);};
      secondAbilityOptions.appendChild(btn);
    });

    secondAbilityModal.classList.remove("hidden");
    addLog(reasonText||`✨ ${p.name} darf zwischen zwei zufälligen Optionen für die ${label} wählen.`);
    scheduleBotAction(120);
  }

  function openSecondAbilityDraft(index){
    const p=players[index];
    const rule=bonusAbilityRuleFor(index);
    if(!p || !rule || p.hp<=0) return;
    const reason=`✨ ${p.name} ist auf ${p.hp} HP gefallen und darf zwischen zwei zufälligen Optionen für die ${rule.label} wählen.`;
    openAbilityDraftForSlot(index,rule.slot,rule.label,reason);
  }

  // Encounter-Hook: Bestimmte Solo-Kämpfe belohnen jeden Kill mit einem
  // Fähigkeits-Draft. Die Slots werden sofort reserviert, damit auch mehrere
  // Eliminierungen im selben Angriff (z. B. durch Ricochet) sauber bis zum
  // encounter-spezifischen Slot-Limit in die Draft-Queue gelegt werden können.
  function maybeTriggerCampaignKillAbilityDraft(index){
    if(!campaignMode || duoCampaignMode || trioCampaignMode) return false;
    const encounter=currentEncounterObject();
    const p=players[index];
    if(!encounter?.draftAfterKill || !p || p.campaignTeam!=="hero" || p.hp<=0) return false;

    const maxSlots=Math.max(2,Math.min(4,Number(encounter.maxAbilitySlots)||3));
    let slot=null;
    if(maxSlots>=2 && p.secondAbility==null && !p.secondAbilityUnlocked) slot=2;
    else if(maxSlots>=3 && p.thirdAbility==null && !p.thirdAbilityUnlocked) slot=3;
    else if(maxSlots>=4 && p.fourthAbility==null && !p.fourthAbilityUnlocked) slot=4;
    else return false;

    if(slot===2) p.secondAbilityUnlocked=true;
    else if(slot===3) p.thirdAbilityUnlocked=true;
    else p.fourthAbilityUnlocked=true;

    const label=`${slot}. Fähigkeit`;
    openAbilityDraftForSlot(index,slot,label,`💀 Kill-Bonus: ${p.name} darf nach der Eliminierung eine ${label} wählen.`);
    return true;
  }

  function maybeTriggerKillBonusDraft(index){
    const roundDecided=campaignMode
      ? !players.some(p=>p.campaignTeam==="hero"&&p.hp>0) || !players.some(p=>p.campaignTeam==="enemy"&&p.hp>0)
      : players.filter(p=>p.hp>0).length<=1;
    if(roundDecided) return false;
    if(maybeTriggerCampaignStandardBonusDraft(index,"kill")) return true;
    if(maybeTriggerLocalBonusDraft(index,"kill")) return true;
    return maybeTriggerCampaignKillAbilityDraft(index);
  }

  function chooseSecondAbility(id){
    if(localEngineActive()) return runLocalEngineMove("chooseSecondAbility",[id]);
    const index=secondAbilityDraftIndex;
    const p=players[index];
    if(!p || !REAL_ABILITY_IDS.includes(id)) return;

    const slot=secondAbilityDraftSlot;
    if(slot===4){p.fourthAbility=id;p.fourthAbilityWasChosen=true;}
    else if(slot===3){p.thirdAbility=id;p.thirdAbilityWasChosen=true;}
    else{p.secondAbility=id;p.secondAbilityWasChosen=true;}
    secondAbilityModal.classList.add("hidden");
    secondAbilityDraftBusy=false;
    secondAbilityDraftIndex=null;
    secondAbilityDraftChoices=[];
    secondAbilityDraftSlot=2;

    addLog(`✨ ${p.name} wählt als ${slot}. Fähigkeit: ${ABILITIES[id].name}.`);

    if(id===23){
      p.damageSinceLastOwnTurn=false;
      p.masterySelfDamageSinceLastOwnTurn=false;
      p.bloodRushPrimed=false;
      p.voluntaryHpPaidThisTurn=false;
    }

    renderAll();

    if(secondAbilityDraftQueue.length){
      const nextDraft=secondAbilityDraftQueue.shift();
      setTimeout(()=>{
        if(typeof nextDraft==="object") openAbilityDraftForSlot(nextDraft.index,nextDraft.slot,nextDraft.label,nextDraft.reasonText||"");
        else openSecondAbilityDraft(nextDraft);
      },120);
      return;
    }

    // V26.1.2: Wenn eingehender Schaden gleichzeitig den HP-Fähigkeitsdraft
    // UND Counterattack auslöst, muss der vorgemerkte Gegenangriff zuerst
    // abgearbeitet werden. Sonst würde der Bot seinen bereits ausgewerteten
    // Hauptangriff nach dem Draft weiterwürfeln und Schaden doppelt anwenden.
    if(pendingCounterattack){
      const ctx=pendingCounterattack;
      pendingCounterattack=null;
      setTimeout(()=>openCounterattack(ctx.defenderIndex,ctx.attackerIndex,ctx.restoreHp,ctx.incomingDamage,ctx.lastStandTriggered),120);
      return;
    }

    if(pendingPerfect25Total!=null){
      const total=pendingPerfect25Total;
      pendingPerfect25Total=null;
      setTimeout(()=>openPerfect25(total),120);
      return;
    }

    if(deferredAttackFinish){
      deferredAttackFinish=false;
      setTimeout(()=>finishAttackAfterCounter(),120);
      return;
    }

    if(deferredBaseAdvance && phase==="base_auto_end"){
      deferredBaseAdvance=false;
      setTimeout(()=>advanceTurn(),140);
      return;
    }

    scheduleBotAction(120);
  }

  function applyDamageToPlayer(index,amount,source="self"){
    const p=players[index];
    if(!p || amount<=0) return {before:p?.hp||0,after:p?.hp||0,lost:0,lastStand:false};

    const before=p.hp;
    let after=Math.max(0,before-amount);
    let lastStand=false;

    if(after<=0 && hasAbility(14,index) && !p.lastStandUsed){
      after=hasMasteryUpgrade(14,1,index)?6:1;
      p.lastStandUsed=true;
      if(hasMasteryUpgrade(14,2,index))p.masteryLastStandCooldown=3;
      p.roundLastStandTriggered=true;
      lastStand=true;
      markCampaignAbilityUse(index,14);
      addLog(`🛡️ LAST STAND: ${p.name} überlebt tödlichen Schaden mit ${after} HP!`);
      queueEventPopup(`${p.name} LAST STAND!`,"survive");
    }

    p.hp=after;
    const lost=Math.max(0,before-after);

    if(source==="opponent" && lost>0){
      p.damageSinceLastOwnTurn=true;
      if(roundStats[index]) roundStats[index].damageTaken+=lost;
    }

    maybeTriggerSecondAbility(index,before,after);
    return {before,after,lost,lastStand};
  }

  function nextRicochetTarget(from,snapshotAlive){
    const aliveSet=new Set(snapshotAlive);
    for(let step=1;step<=players.length;step++){
      const i=(from+step)%players.length;
      if(i!==current && i!==from && aliveSet.has(i)){
        if(campaignMode && players[i]?.campaignTeam===players[current]?.campaignTeam) continue;
        return i;
      }
    }
    return -1;
  }

  function nextRicochetTargetExcluding(from,snapshotAlive,excluded=[]){
    const aliveSet=new Set(snapshotAlive),blocked=new Set(excluded.map(Number));
    for(let step=1;step<=players.length;step++){
      const i=(from+step)%players.length;
      if(i===current||i===from||blocked.has(i)||!aliveSet.has(i))continue;
      if(campaignMode&&players[i]?.campaignTeam===players[current]?.campaignTeam)continue;
      return i;
    }
    return -1;
  }

  function triggerToxicBomb(deadIndex){
    const dead=players[deadIndex];
    const source=Number(dead?.masteryPoisonSource);
    if(!dead||!(dead.masteryPoisonTurns>0)||!Number.isInteger(source)||!players[source]||!hasMasteryUpgrade(1,2,source))return 0;
    dead.masteryPoisonTurns=0;
    const adjacent=[(deadIndex-1+players.length)%players.length,(deadIndex+1)%players.length];
    let total=0;
    adjacent.forEach(i=>{
      const target=players[i];
      if(!target||target.hp<=0||i===source)return;
      if(campaignMode&&target.campaignTeam===players[source]?.campaignTeam)return;
      const before=target.hp;
      const result=applyDamageToPlayer(i,3,"opponent");
      checkBossPhase(i,before,target.hp);
      total+=result.lost;
      if(result.lost>0){
        noteCampaignHeroAttack(source,i);
        recordDamageDealt(source,result.lost,false);
        pendingExtraDamageFx.push({target:i,amount:result.lost});
        window.WDAttackFx?.emit?.(source,i,"poison",result.lost,1);
        addLog(`💥 Toxic Bomb: ${target.name} erhält ${result.lost} Giftschaden.`);
      }
      if(before>0&&target.hp<=0){
        window.WDAttackFx?.kill?.(source,i);
        if(roundStats[source])roundStats[source].kills++;
        recordCampaignKill(source,i);
        maybeTriggerKillBonusDraft(source);
        markEliminated(i);
        addLog(`💀 ${target.name} fällt durch Toxic Bomb.`);
      }
    });
    if(total>0)addLog(`☠️ Toxic Bomb explodiert bei ${dead.name}: ${total} Gesamtschaden.`);
    return total;
  }

  function markEliminated(index){
    if(index==null || roundEliminationOrder.includes(index)) return;
    campaignHandleDeathReaction(index);
    roundEliminationOrder.push(index);
    if(lastPlaceIndex==null) lastPlaceIndex=index;
    queueEventPopup(`${players[index].name} Died!`,"death");
  }


  function beginAttackWithFace(face,total,source="normal"){
    if(localEngineActive()){presentLocalEngineState();renderAll();return;}
    attackFace=face;
    const targets=campaignEnemyTargets(current);
    if(campaignMode && players[current]?.campaignTeam==="hero" && !isBotPlayer(current) && targets.length>1){
      pendingCampaignAttackStart={face,total,source};
      attackTarget=null;
      phase="campaign_target";
      dice=freshDice();
      addLog(`🎯 ${players[current].name} darf das Angriffsziel wählen.`);
      renderAll();
      return;
    }
    attackTarget=nextAttackTarget(current);
    if(attackTarget===-1){checkWinner();return;}
    initializeAttackAfterTarget(total,source);
  }

  function initializeAttackAfterTarget(total,source="normal"){
    if(attackTarget==null || players[attackTarget]?.hp<=0) attackTarget=nextAttackTarget(current);
    if(attackTarget===-1 || attackTarget==null){checkWinner();return;}
    if(campaignMode && players[current]?.campaignTeam==="enemy"){
      commitCampaignEnemyAttackTarget(current,attackTarget);
    }
    if(campaignMode && players[current]?.campaignTeam==="hero"){
      encounterRuntime.lastHeroAttacker=current;
      noteCampaignHeroAttack(current,attackTarget);
      const key=String(current),targetKey=String(attackTarget);
      campaignMetrics.heroAttacks[key]=(campaignMetrics.heroAttacks[key]||0)+1;
      if(!campaignMetrics.attackTargetsByHero[key]) campaignMetrics.attackTargetsByHero[key]={};
      campaignMetrics.attackTargetsByHero[key][targetKey]=(campaignMetrics.attackTargetsByHero[key][targetKey]||0)+1;
      campaignMetrics.attackSequence.push({hero:key,target:targetKey,name:players[attackTarget]?.name||""});
    }

    // V27.6.2: Hot Dice zählt aufeinanderfolgende ANGRIFFE, nicht Würfe im Angriff.
    players[current].hotDiceStreak=(Number(players[current].hotDiceStreak)||0)+1;
    attackHits=0;attackDamage=0;firstAttackRoll=true;currentAttackRollNewHits=0;
    attackRollCount=0;attackMasteryRollCount=0;normalAttackHitsThisAttack=0;exactFaceHitsThisAttack=0;wildcardAttackHitsThisAttack=0;lastAttackRollIndices=[];wildcardSecondRollArmed=false;wildcardTriggeredThisAttack=false;masteryL2AttackBonusesApplied=false;
    currentAttackSource=source;currentAttackBaseTotal=total;gamblingRetryUsed=false;gamblingRetryPending=false;
    precisionUses=0;bloodPriceNeighbors=[];bloodPricePaidThisRoll=0;momentumBonus=0;
    highStakesDecisionThisAttack=false;doubleTapApplied=false;
    players[current].botBloodUsesThisAttack=0;
    activateBloodRushForMainAttack();
    wildcardFace=hasAbility(17)?rollTrackedD6(current):null;
    if(hasAbility(10)){
      players[current].momentumStreak=(players[current].momentumStreak||0)+1;
      momentumBonus=Math.min(Math.max(players[current].momentumStreak-1,0),hasMasteryUpgrade(10,2,current)?3:2);
      if(players[current].momentumStreak>=5) unlockAchievementForPlayer(current,"momentum_mori");
    }
    if(source!=="perfect25") players[current].perfect25AttackArmed=false;
    window.WDMastery?.noteAttackStart?.(current,source);
    dice=freshDice();phase="attack_ready";

    let extra="";
    if(attackFace===1&&hasAbility(1)) extra+=" Brutale Einsen aktiv: 1er UND 2er treffen, beide machen 3 Grundschaden.";
    if(source==="advance") extra+=` Fähigkeit 5 aktiv: ${total} entspricht Angriff auf ${attackFace}er.`;
    if(source==="gambling") extra+=` 🎰 Gambling Man: D6 = ${attackFace}.`;
    if(hasAbility(9)&&players[current].hp<=(hasMasteryUpgrade(9,1,current)?15:10)) extra+=` Rache aktiv: +2 Schaden pro Treffer.`;
    if(hasAbility(10)) extra+=` Momentum-Serie ${players[current].momentumStreak}: +${momentumBonus} Schaden pro Treffer.`;
    if(bloodRushActiveThisAttack) extra+=` Blood Rush: +1 Schaden pro Treffer.`;
    if(hasAbility(25)&&isUniqueUnderdog(current)) extra+=` Underdog: +1 Schaden pro Treffer.`;
    if(wildcardFace!=null){extra+=wildcardFace===attackFace?` 🃏 Wildcard = ${wildcardFace} (identisch mit Zielzahl – kein Extra).`:` 🃏 Wildcard = ${wildcardFace}: im ersten Angriffswurf zählen ${attackFace}er und ${wildcardFace}er.`;}
    addLog(`↳ Angriff auf ${players[attackTarget].name}: Ziel sind ${attackFace}er.${extra}`);
    renderAll();tutorialExplainAttackStart(total,attackFace);
  }

  function openGamblingMan(total){
    if(localEngineActive()){presentLocalEngineState();renderAll();return;}
    gamblingBaseTotal=total;
    gamblingRolling=false;
    phase="gamble_attack";

    const designKey=players[current]?.diceDesign||"classic";
    gamblingDie.className=`gambling-die ${DICE_DESIGNS[designKey]?.className||"theme-classic"}`;
    renderSpecialDieFace(gamblingDie,designKey,null);
    gamblingResult.textContent="Tippe den D6";
    gamblingDie.disabled=false;
    gamblingRetryActions?.classList.add("hidden");
    gamblingModal.classList.remove("hidden");

    addLog(`🎰 Gambling Man: ${players[current].name} hat ${total} gewürfelt und muss die Angriffszahl ausgamblen.`);
    renderAll();
  }

  function rollGamblingMan(){
    if(localEngineActive()) return runLocalEngineMove("rollGamblingMan");
    if(gamblingRolling || (phase!=="gamble_attack"&&phase!=="gamble_retry")) return;
    const retryRoll=phase==="gamble_retry";
    gamblingRolling=true;
    gamblingDie.disabled=true;
    gamblingDie.classList.add("rolling");
    gamblingResult.textContent="...";

    let ticks=0;
    const timer=setInterval(()=>{
      tickSpecialDie(gamblingDie);
      ticks++;
      if(ticks>=8) clearInterval(timer);
    },60);

    setTimeout(()=>{
      clearInterval(timer);
      const result=hasMasteryUpgrade(12,2,current)?rollTrackedD6Excluding(current,1):rollTrackedD6(current);
      gamblingDie.classList.remove("rolling");
      renderSpecialDieFace(gamblingDie,players[current]?.diceDesign||"classic",result);
      gamblingResult.textContent=`D6 = ${result} → Angriff auf ${result}er`;
      addLog(`🎰 Gambling Man würfelt ${result}: Angriff auf ${result}er.`);

      setTimeout(()=>{
        gamblingModal.classList.add("hidden");
        gamblingRolling=false;
        const total=gamblingBaseTotal;
        gamblingBaseTotal=null;
        if(retryRoll){
          attackFace=result;attackHits=0;attackDamage=0;firstAttackRoll=true;currentAttackRollNewHits=0;attackRollCount=0;attackMasteryRollCount=0;normalAttackHitsThisAttack=0;exactFaceHitsThisAttack=0;wildcardAttackHitsThisAttack=0;wildcardTriggeredThisAttack=false;masteryL2AttackBonusesApplied=false;lastAttackRollIndices=[];precisionUses=0;bloodPriceNeighbors=[];bloodPricePaidThisRoll=0;bloodPriceWasPreActivatedThisRoll=false;wildcardFace=hasAbility(17)?rollTrackedD6(current):null;dice=freshDice();phase="attack_ready";gamblingRetryPending=false;gamblingRetryUsed=true;addLog(`🎰 Gambling Twice: neuer Angriff auf ${result}er.`);renderAll();
        }else beginAttackWithFace(result,total,"gambling");
      },650);
    },560);
  }


  function offerGamblingRetry(){
    if(!hasAbility(12)||!hasMasteryUpgrade(12,1,current)||gamblingRetryUsed||currentAttackSource!=="gambling") return false;
    phase="gamble_retry_offer";gamblingRolling=false;gamblingRetryPending=true;
    gamblingDie.disabled=true;renderSpecialDieFace(gamblingDie,players[current]?.diceDesign||"classic",null);gamblingResult.textContent="0 Treffer – Gambling Twice nutzen?";
    gamblingRetryActions?.classList.remove("hidden");gamblingModal.classList.remove("hidden");renderAll();return true;
  }
  function startGamblingRetry(){
    if(localEngineActive()) return runLocalEngineMove("startGamblingRetry");
    if(phase!=="gamble_retry_offer"||!gamblingRetryPending)return;
    phase="gamble_retry";gamblingDie.disabled=false;gamblingResult.textContent="Tippe den D6 für deine neue Angriffszahl";gamblingRetryActions?.classList.add("hidden");
  }
  function declineGamblingRetry(){
    if(localEngineActive()) return runLocalEngineMove("declineGamblingRetry");
    if(phase!=="gamble_retry_offer")return;gamblingRetryPending=false;gamblingRetryUsed=true;gamblingRetryActions?.classList.add("hidden");gamblingModal.classList.add("hidden");endTurn();
  }

  function openPerfect25(total){
    if(localEngineActive()){presentLocalEngineState();renderAll();return;}
    markCampaignAbilityUse(current,15);
    phase="perfect25";
    perfect25BaseTotal=total;
    perfect25Rolling=false;
    const designKey=players[current]?.diceDesign||"classic";
    perfect25Die.className=`special-big-die ${DICE_DESIGNS[designKey]?.className||"theme-classic"}`;
    renderSpecialDieFace(perfect25Die,designKey,null);
    perfect25Die.disabled=false;
    perfect25Result.textContent="D6 würfeln";
    perfect25Modal.classList.remove("hidden");
    addLog(`✨ Perfect 25: ${players[current].name} hat exakt 25 und würfelt zuerst um die Angriffserlaubnis.`);
    renderAll();
  }

  function queuePerfect25(total){
    if(secondAbilityDraftBusy){
      pendingPerfect25Total=total;
      return;
    }
    openPerfect25(total);
  }

  function rollPerfect25(){
    if(localEngineActive()) return runLocalEngineMove("rollPerfect25");
    if(perfect25Rolling || phase!=="perfect25") return;
    perfect25Rolling=true;
    perfect25Die.disabled=true;
    perfect25Die.classList.add("rolling");
    perfect25Result.textContent="...";

    let ticks=0;
    const timer=setInterval(()=>{
      tickSpecialDie(perfect25Die);
      if(++ticks>=8) clearInterval(timer);
    },60);

    setTimeout(()=>{
      clearInterval(timer);
      const result=rollTrackedD6(current);
      perfect25Die.classList.remove("rolling");
      renderSpecialDieFace(perfect25Die,players[current]?.diceDesign||"classic",result);

      if(result>=(hasMasteryUpgrade(15,2,current)?2:(hasMasteryUpgrade(15,1,current)?3:4))){
        window.WDMastery?.notePerfect25Permit?.(current,true);
        players[current].perfect25AttackArmed=true;
        markCampaignAbilitySuccess(current,15);
        perfect25Result.textContent=`D6 = ${result} → Angriff erlaubt!`;
        addLog(`✨ Perfect 25 würfelt ${result}: Angriff erlaubt. Jetzt entscheidet der D4 die Angriffszahl.`);
        setTimeout(()=>{
          perfect25Modal.classList.add("hidden");
          perfect25Rolling=false;
          openPerfect25D4();
        },520);
      }else{
        window.WDMastery?.notePerfect25Permit?.(current,false);
        players[current].perfect25AttackArmed=false;
        resetFirstClassStreak(current);
        perfect25Result.textContent=`D6 = ${result} → kein Angriff`;
        addLog(`✨ Perfect 25 würfelt ${result}: kein Angriff.`);
        masteryMomentumFail(current);
        momentumBonus=0;
        setTimeout(()=>{
          perfect25Modal.classList.add("hidden");
          perfect25Rolling=false;
          perfect25BaseTotal=null;
          finishBaseTurn(220);
        },600);
      }
    },560);
  }

  function openPerfect25D4(){
    phase="perfect25_d4";
    perfect25D4Rolling=false;
    const designKey=players[current]?.diceDesign||"classic";
    perfect25D4Die.className=`special-big-die d4 ${DICE_DESIGNS[designKey]?.className||"theme-classic"}`;
    clearDiceArtwork(perfect25D4Die);
    perfect25D4Die.textContent="?";
    perfect25D4Die.disabled=false;
    perfect25D4Result.textContent="D4 würfeln";
    perfect25D4Modal.classList.remove("hidden");
    renderAll();
  }

  function rollPerfect25D4(){
    if(localEngineActive()) return runLocalEngineMove("rollPerfect25D4");
    if(perfect25D4Rolling || phase!=="perfect25_d4") return;
    perfect25D4Rolling=true;
    perfect25D4Die.disabled=true;
    perfect25D4Die.classList.add("rolling");
    perfect25D4Result.textContent="...";

    let ticks=0;
    const timer=setInterval(()=>{
      perfect25D4Die.textContent=String(window.WDRng.visual(()=>randD4()));
      if(++ticks>=8) clearInterval(timer);
    },60);

    setTimeout(()=>{
      clearInterval(timer);
      const result=randD4();
      window.WDMastery?.notePerfect25D4?.(current,result);
      perfect25D4Die.classList.remove("rolling");
      perfect25D4Die.textContent=String(result);
      perfect25D4Result.textContent=`D4 = ${result} → Angriff auf ${result}er`;
      addLog(`✨ Perfect 25 D4 = ${result}: Angriff auf ${result}er.`);

      setTimeout(()=>{
        perfect25D4Modal.classList.add("hidden");
        perfect25D4Rolling=false;
        const total=perfect25BaseTotal;
        perfect25BaseTotal=null;
        beginAttackWithFace(result,total,"perfect25");
      },620);
    },560);
  }

  function openHighStakes(){
    if(localEngineActive()){presentLocalEngineState();renderAll();return;}
    highStakesRolling=false;
    highStakesDecisionThisAttack=true;
    const base=totalAttackDamage();
    const designKey=players[current]?.diceDesign||"classic";
    highStakesDie.className=`special-big-die ${DICE_DESIGNS[designKey]?.className||"theme-classic"}`;
    renderSpecialDieFace(highStakesDie,designKey,null);
    highStakesDie.disabled=false;
    highStakesSkip.disabled=false;
    highStakesResult.textContent=hasMasteryUpgrade(13,2,current)?"1–2: −50 % · 3: normal · 4–5: +50 % · 6: +75 %":(hasMasteryUpgrade(13,1,current)?"1–2: −50 % · 3: normal · 4–6: +50 %":"1–3: −50 % · 4–6: +50 %");
    highStakesSub.textContent=`Aktueller Schaden: ${base}. Du kannst ihn sicher nehmen oder jetzt gamblen.`;
    highStakesModal.classList.remove("hidden");
    scheduleBotAction(120);
  }

  function skipHighStakes(){
    if(localEngineActive()) return runLocalEngineMove("skipHighStakes");
    if(highStakesRolling) return;
    highStakesModal.classList.add("hidden");
    finalizeAttackDamage();
  }

  function rollHighStakes(){
    if(localEngineActive()) return runLocalEngineMove("rollHighStakes");
    if(highStakesRolling) return;
    markCampaignAbilityUse(current,13);
    highStakesRolling=true;
    highStakesDie.disabled=true;
    highStakesSkip.disabled=true;
    highStakesDie.classList.add("rolling");
    highStakesResult.textContent="...";

    const before=attackDamage;
    let ticks=0;
    const timer=setInterval(()=>{
      tickSpecialDie(highStakesDie);
      if(++ticks>=8) clearInterval(timer);
    },60);

    setTimeout(()=>{
      clearInterval(timer);
      const result=rollTrackedD6(current);
      highStakesDie.classList.remove("rolling");
      renderSpecialDieFace(highStakesDie,players[current]?.diceDesign||"classic",result);

      if(result<=2 || (result===3&&!hasMasteryUpgrade(13,1,current))){
        attackDamage=Math.floor(before*0.5);
        if(roundStats[current]) roundStats[current].highStakesLosses=(roundStats[current].highStakesLosses||0)+1;
        highStakesResult.textContent=`D6 = ${result} → ${before} → ${attackDamage} Schaden`;
        addLog(`🎲 High Stakes: ${result}. Angriffsschaden halbiert: ${before} → ${attackDamage}.`);
      }else if(result===3){
        attackDamage=before;
        highStakesResult.textContent=`D6 = 3 → normaler Schaden: ${attackDamage}`;
        addLog(`🎲 Raise the Stakes: 3 zählt als neutral – ${attackDamage} Schaden bleiben.`);
      }else{
        const highMultiplier=(result===6&&hasMasteryUpgrade(13,2,current))?1.75:1.5;
        attackDamage=Math.floor(before*highMultiplier);
        markCampaignAbilitySuccess(current,13);
        if(roundStats[current]){
          roundStats[current].highStakesWins++;
          if(roundStats[current].highStakesWins>=3) unlockAchievementForPlayer(current,"degenerate_gambler");
        }
        highStakesResult.textContent=`D6 = ${result} → ${before} → ${attackDamage} Schaden`;
        addLog(`🎲 High Stakes: ${result}. Angriffsschaden +${result===6&&hasMasteryUpgrade(13,2,current)?75:50} %: ${before} → ${attackDamage}.`);
      }

      setTimeout(()=>{
        highStakesModal.classList.add("hidden");
        highStakesRolling=false;
        finalizeAttackDamage();
      },650);
    },560);
  }


  function openInsurance(total,rawDamage,afterMode){
    insuranceContext={total,rawDamage,afterMode};
    insuranceRolling=false;
    phase="insurance";

    const designKey=players[current]?.diceDesign||"classic";
    insuranceDie.className=`special-big-die ${DICE_DESIGNS[designKey]?.className||"theme-classic"}`;
    renderSpecialDieFace(insuranceDie,designKey,null);
    insuranceDie.disabled=false;
    insuranceResult.textContent=hasMasteryUpgrade(19,2,current)?"4–5 = halbiert · 6 = 100 % geblockt":(hasMasteryUpgrade(19,1,current)?"4–6 = Eigenschaden halbiert":"5–6 = Eigenschaden halbiert");
    insuranceSub.textContent=`Normaler Eigenschaden: ${rawDamage}. Würfle jetzt deinen Insurance-D6.`;
    insuranceModal.classList.remove("hidden");
    addLog(`🛡️ Insurance: ${players[current].name} würfelt vor ${rawDamage} Eigenschaden.`);
    renderAll();
  }

  function resolveBaseSelfDamage(total,rawDamage,afterMode="finish"){
    if(hasAbility(19)){
      openInsurance(total,rawDamage,afterMode);
      return;
    }
    applyBaseSelfDamage(total,rawDamage,afterMode,null);
  }

  function applyBaseSelfDamage(total,damage,afterMode,insuranceRoll){
    const result=applyDamageToPlayer(current,damage);
    recordSelfDamage(current,result.lost);
    if(Number(total)===5&&result.lost>=20&&dice.length===5&&dice.every(d=>d.locked&&d.value===1)){
      window.WDMastery?.unlockL2ForPlayer?.(current,12);
    }
    if(result.lost>0) pendingDamage={target:current,amount:result.lost};

    if(insuranceRoll!=null){
      addLog(`🛡️ Insurance D6 = ${insuranceRoll}: ${players[current].name} verliert ${result.lost} Leben.`);
    }else{
      addLog(`↳ ${players[current].name} verliert ${result.lost} Leben.`);
    }

    if(players[current].hp<=0){
      if(campaignMode && players[current]?.campaignTeam==="enemy"){
        const heroIndex=campaignLastHeroAttacker(current);
        if(heroIndex!=null){
          if(roundStats[heroIndex]) roundStats[heroIndex].kills++;
          recordCampaignKill(heroIndex,current);
          maybeTriggerKillBonusDraft(heroIndex);
          addLog(`💀 ${players[current].name} scheidet durch eigenen Basisschaden aus – der Kill zählt für ${players[heroIndex].name}.`);
        }else{
          recordCampaignEnemyElimination(current,null);
          addLog(`💀 ${players[current].name} scheidet durch eigenen Basisschaden aus – noch kein Spieler hatte diesen Gegner angegriffen.`);
        }
      }else{
        addLog(`💀 ${players[current].name} ist ausgeschieden.`);
      }
      markEliminated(current);
      finishBaseTurn(950);
      return;
    }

    if(afterMode==="perfect25"){
      queuePerfect25(total);
    }else if(afterMode==="advance24"){
      if(players[current].hp>0) setTimeout(()=>beginAttackWithFace(1,total,"advance"),result.lost>0?520:180);
    }else{
      finishBaseTurn(result.lost>0?950:320);
    }
  }

  function rollInsurance(){
    if(localEngineActive()) return runLocalEngineMove("rollInsurance");
    if(insuranceRolling || phase!=="insurance" || !insuranceContext) return;
    insuranceRolling=true;
    insuranceDie.disabled=true;
    insuranceDie.classList.add("rolling");
    insuranceResult.textContent="...";

    let ticks=0;
    const timer=setInterval(()=>{
      tickSpecialDie(insuranceDie);
      if(++ticks>=8) clearInterval(timer);
    },60);

    setTimeout(()=>{
      clearInterval(timer);
      const roll=rollTrackedD6(current);
      const ctx=insuranceContext;
      const reduced=roll>=(hasMasteryUpgrade(19,1,current)?4:5);
      const fullCoverage=roll===6&&hasMasteryUpgrade(19,2,current);
      const finalDamage=fullCoverage?0:(reduced ? Math.floor(ctx.rawDamage/2) : ctx.rawDamage);
      window.WDMastery?.noteInsurance?.(current,reduced);
      if(Number(ctx.total)===20 && roll===1) unlockAchievementForPlayer(current,"nat20_nat1");
      if(Number(ctx.total)===24 && reduced && finalDamage===0) unlockAchievementForPlayer(current,"insurance_fraud");

      insuranceDie.classList.remove("rolling");
      renderSpecialDieFace(insuranceDie,players[current]?.diceDesign||"classic",roll);
      insuranceResult.textContent=reduced
        ? `D6 = ${roll} → ${ctx.rawDamage} → ${finalDamage} Schaden`
        : `D6 = ${roll} → voller Schaden: ${finalDamage}`;

      addLog(reduced
        ? `🛡️ Insurance trifft mit ${roll}: Eigenschaden ${ctx.rawDamage} → ${finalDamage}.`
        : `🛡️ Insurance verfehlt mit ${roll}: ${ctx.rawDamage} Eigenschaden bleiben.`);

      setTimeout(()=>{
        insuranceModal.classList.add("hidden");
        insuranceRolling=false;
        insuranceContext=null;
        applyBaseSelfDamage(ctx.total,finalDamage,ctx.afterMode,roll);
      },600);
    },560);
  }

  function masteryMomentumFail(index=current){
    if(!hasAbility(10,index)) return;
    const p=players[index];
    p.momentumStreak=hasMasteryUpgrade(10,1,index)?Math.max(0,(p.momentumStreak||0)-1):0;
  }

  function resolveBase(){
    const total=currentSum();
    if(campaignMode && players[current]?.campaignTeam==="hero" && total>25) campaignMetrics.baseOver25=true;
    addLog(`${players[current].name}: Basiswurf = ${total}.`);
    tutorialExplainBaseResult(total);
    const hasAdvance=hasAbility(5);
    const attackThreshold=hasAdvance?25:26;

    if(total===24 && hasAdvance && hasMasteryUpgrade(5,1,current)){
      resetFirstClassStreak(current);
      players[current].perfect25AttackArmed=false;
      addLog(`⚡ Jump Ahead: 24 zählt als 1er-Angriff, aber 1 Self-DMG bleibt bestehen.`);
      resolveBaseSelfDamage(total,1,"advance24");
      return;
    }

    if(total<25){
      window.WDMastery?.notePerfect25Break?.(current);
      resetFirstClassStreak(current);
      players[current].hotDiceStreak=0;
      players[current].perfect25AttackArmed=false;
      masteryMomentumFail(current);
      momentumBonus=0;
      const dmg=25-total;
      resolveBaseSelfDamage(total,dmg,"finish");
      return;
    }

    if(total===25 && !hasAdvance && hasAbility(15)){
      window.WDMastery?.notePerfect25Base?.(current);
      queuePerfect25(total);
      return;
    }

    if(total<attackThreshold){
      resetFirstClassStreak(current);
      players[current].hotDiceStreak=0;
      players[current].perfect25AttackArmed=false;
      masteryMomentumFail(current);
      momentumBonus=0;
      addLog("↳ Genau 25 – kein Schaden, kein Angriff.");
      finishBaseTurn(320);
      return;
    }

    // Gambling Man überschreibt bei >25 die normale Angriffszahl vollständig.
    // Bei exakt 25 kann Angriffsvorsprung weiterhin normal auf 1er angreifen.
    if(hasAbility(12) && total>25){
      openGamblingMan(total);
      return;
    }

    window.WDMastery?.notePerfect25Break?.(current);
    const normalFace=hasAdvance?total-24:total-25;
    beginAttackWithFace(normalFace,total,hasAdvance?"advance":"normal");
  }

  function useBloodPrice(){
    if(localEngineActive()) return runLocalEngineMove("useBloodPrice");
    if(!hasAbility(11) || isAnimating || bloodPriceNeighbors.length) return;
    const postRoll=phase==="attack_after_roll"&&hasMasteryUpgrade(11,2,current)&&!bloodPriceWasPreActivatedThisRoll;
    const preRoll=phase==="attack_ready"||phase==="attack_continue";
    if(!postRoll&&!preRoll)return;

    const neighbors=[];
    if(attackFace>1) neighbors.push(attackFace-1);
    if(attackFace<6) neighbors.push(attackFace+1);
    if(!neighbors.length) return;

    const baseCost=postRoll?5:3;
    const bloodCost=encounterVoluntaryCost(baseCost);
    if(players[current].hp<=bloodCost)return;

    const damageResult=applyDamageToPlayer(current,bloodCost,"voluntary");
    markCampaignAbilityUse(current,11);
    players[current].voluntaryHpPaidThisTurn=true;
    recordSelfDamage(current,damageResult.lost);
    recordVoluntaryHp(current,damageResult.lost);
    pendingDamage={target:current,amount:damageResult.lost};

    if(postRoll){
      let added=0;
      (lastAttackRollIndices||[]).forEach(i=>{
        const d=dice[i];
        if(!d||d.locked||!neighbors.includes(d.value))return;
        d.locked=true;
        attackHits++;
        currentAttackRollNewHits++;
        attackDamage+=damagePerAttackHit();
        added++;
      });
      activateBloodRushMidAttackIfEligible(current);
      addLog(`🩸 Blood Credit: ${players[current].name} zahlt ${damageResult.lost} HP nach dem Wurf → ${added} Nachbartreffer werden nachträglich gesichert.`);
      renderAll();
      return;
    }

    bloodPriceNeighbors=neighbors;
    bloodPricePaidThisRoll=damageResult.lost;
    activateBloodRushMidAttackIfEligible(current);
    addLog(`🩸 ${players[current].name} zahlt ${damageResult.lost} HP für Blutpreis: ${[attackFace,...neighbors].sort((a,b)=>a-b).join(", ")} treffen im nächsten Angriffswurf.`);
    renderAll();
  }

  function useBloodRushSelfHarm(){
    if(localEngineActive()) return runLocalEngineMove("useBloodRushSelfHarm");
    if(isAnimating||phase!=="attack_after_roll"||!hasAbility(23)||!hasMasteryUpgrade(23,2,current)||bloodRushActiveThisAttack)return;
    const cost=encounterVoluntaryCost(1);
    if(players[current].hp<=cost)return;
    const result=applyDamageToPlayer(current,cost,"voluntary");
    if(result.lost<=0)return;
    recordSelfDamage(current,result.lost);
    recordVoluntaryHp(current,result.lost);
    players[current].voluntaryHpPaidThisTurn=true;
    pendingDamage={target:current,amount:result.lost};
    activateBloodRushMidAttackIfEligible(current);
    addLog(`🩸 Self Harm: ${players[current].name} opfert ${result.lost} HP und aktiviert Blood Rush.`);
    renderAll();
  }

  function rollAttack(){
    if(localEngineActive()) return runLocalEngineMove("rollAttack");
    if(isAnimating) return;
    const indices=[];
    dice.forEach((d,i)=>{if(!d.locked)indices.push(i);});
    const bloodNeighborsForRoll=[...bloodPriceNeighbors];
    bloodPriceWasPreActivatedThisRoll=bloodNeighborsForRoll.length>0;
    attackRollCount++;
    attackMasteryRollCount++;
    lastAttackRollIndices=[...indices];

    animateIndices(indices,()=>{
      const wasFirstAttackRoll=firstAttackRoll;
      if(wasFirstAttackRoll&&currentAttackSource==="advance"&&hasMasteryUpgrade(5,2,current)){
        const alreadyHit=indices.some(i=>isNormalAttackHitValue(dice[i].value)||bloodNeighborsForRoll.includes(dice[i].value)||(wildcardFace!=null&&dice[i].value===wildcardFace));
        if(!alreadyHit&&indices.length){
          dice[indices[0]].value=attackFace;
          addLog(`⚡ First Strike: der erste Angriffswurf erhält automatisch 1 Treffer.`);
        }
      }
      const attackRollValues=indices.map(i=>dice[i].value);
      /* L2 checks need the full board (locked + new), not only unlocked dice */
      window.WDMastery?.noteAttackRoll?.(current,dice.map(d=>d.value),attackFace);
      if(indices.length===5){
        if(isStraightFive(attackRollValues)) unlockAchievementForPlayer(current,"royal_flush_attack");
        if(isFullHouseFive(attackRollValues)) unlockAchievementForPlayer(current,"full_house_attack");
      }
      if(wasFirstAttackRoll && indices.length===5){
        const exactTarget=attackRollValues.every(v=>v===attackFace);
        if(exactTarget) unlockAchievementForPlayer(current,"laser_guided");
        if(players[current].machineBaseArmed && attackFace===5 && attackRollValues.every(v=>v===5)){
          unlockAchievementForPlayer(current,"machine");
        }
        players[current].machineBaseArmed=false;
      }
      currentAttackRollNewHits=0;
      let bloodHits=0;

      indices.forEach(i=>{
        const isNormal=isNormalAttackHitValue(dice[i].value);
        const isBlood=bloodNeighborsForRoll.includes(dice[i].value);
        const isWildcard=wildcardFace!=null && (attackRollCount===1 || (attackRollCount===2&&hasMasteryUpgrade(17,1,current))) && dice[i].value===wildcardFace;
        if(isNormal || isBlood || isWildcard){
          dice[i].locked=true;
          attackHits++;
          currentAttackRollNewHits++;
          if(isNormal){normalAttackHitsThisAttack++;if(dice[i].value===attackFace)exactFaceHitsThisAttack++;}
          if(isWildcard){wildcardTriggeredThisAttack=true;if(!isNormal)wildcardAttackHitsThisAttack++;}
          // Wildcard macht absichtlich den normalen Schaden der eigentlichen Zielzahl.
          attackDamage+=damagePerAttackHit();
          if(isBlood&&!isNormal&&!isWildcard) bloodHits++;
        }
      });

      if(bloodNeighborsForRoll.length>0 && currentAttackRollNewHits===0 && bloodPricePaidThisRoll>0 && hasMasteryUpgrade(11,1,current)){
        const refund=Math.min(2,bloodPricePaidThisRoll);players[current].hp+=refund;addLog(`🩸 Blood Pact: 0 Treffer → ${refund} HP zurück.`);
      }
      bloodPricePaidThisRoll=0;
      bloodPriceNeighbors=[];

      const bloodText=bloodHits>0 ? ` Davon ${bloodHits} Blutpreis-Treffer.` : "";
      addLog(`↳ Angriffswurf: ${currentAttackRollNewHits} neuer Treffer. Gesamt: ${attackHits} Treffer = ${totalAttackDamage()} Schaden.${bloodText}`);
      phase="attack_after_roll";
      renderAll();
      tutorialExplainAttackRoll();
    });
  }

  function useAttackPower(){
    if(localEngineActive()) return runLocalEngineMove("useAttackPower");
    const maxUses=hasMasteryUpgrade(4,1,current)?2:1;
    if(!hasAbility(4)||attackPowerUses>=maxUses||phase!=="attack_after_roll"||isAnimating) return;
    const indices=[];
    dice.forEach((d,i)=>{if(!d.locked)indices.push(i);});
    if(!indices.length) return;

    attackPowerUses++;
    attackMasteryRollCount++;
    attackPowerUsed=attackPowerUses>=maxUses;
    markCampaignAbilityUse(current,4);
    addLog(`⚡ ${players[current].name} nutzt Zweite Chance: alle Nicht-Treffer werden neu gewürfelt.`);
    animateIndices(indices,()=>{
      window.WDMastery?.noteAttackRoll?.(current,dice.map(d=>d.value),attackFace);
      let bonusHits=0;
      indices.forEach(i=>{
        const isNormal=isNormalAttackHitValue(dice[i].value);
        const isWildcard=wildcardFace!=null && (attackRollCount===1 || (attackRollCount===2&&hasMasteryUpgrade(17,1,current))) && dice[i].value===wildcardFace;
        if(isNormal || isWildcard){
          dice[i].locked=true;attackHits++;bonusHits++;
          if(isNormal){normalAttackHitsThisAttack++;if(dice[i].value===attackFace)exactFaceHitsThisAttack++;}
          if(isWildcard){wildcardTriggeredThisAttack=true;if(!isNormal)wildcardAttackHitsThisAttack++;}
          attackDamage+=damagePerAttackHit();
        }
      });
      currentAttackRollNewHits+=bonusHits;
      addLog(`↳ Zweite Chance: ${bonusHits} zusätzlicher Treffer. Gesamt: ${attackHits} Treffer = ${totalAttackDamage()} Schaden.`);
      phase="attack_after_roll";renderAll();
    });
  }

  function retireWildcardAfterRoll(){
    if(!(hasMasteryUpgrade(17,1,current)&&attackRollCount<2)) wildcardFace=null;
  }

  function continueDoubleTapAttack(){
    if(localEngineActive()) return runLocalEngineMove("continueDoubleTapAttack");
    if(isAnimating||phase!=="attack_after_roll") return;
    if(!(hasAbility(24)&&attackHits===2&&currentAttackRollNewHits>0)) return;

    firstAttackRoll=false;
    retireWildcardAfterRoll();
    addLog(`🔫 Double Tap nicht gesichert: ${players[current].name} würfelt mit den übrigen Würfeln weiter.`);
    phase="attack_continue";
    renderAll();
    rollAttack();
  }

  function resolveCurrentAttackRoll(){
    if(localEngineActive()) return runLocalEngineMove("resolveCurrentAttackRoll");
    if(isAnimating||phase!=="attack_after_roll") return;

    // Double Tap QoL: Bei exakt 2 Treffern darf der Spieler den Angriff bewusst
    // sofort beenden, statt einen bereits perfekten Double-Tap-Stand weiterwürfeln
    // zu müssen. Der Bonus wird anschließend ganz normal in dealAttackDamage() gesetzt.
    if(hasAbility(24) && attackHits===2 && currentAttackRollNewHits>0){
      firstAttackRoll=false;
      retireWildcardAfterRoll();
      addLog(`🔫 Double Tap gesichert: Angriff wird bewusst bei exakt 2 Treffern beendet.`);
      dealAttackDamage();
      return;
    }

    if(currentAttackRollNewHits===0){
      // Präzision ist die LETZTE Rettung eines Angriffswurfs:
      // Erst normal würfeln, ggf. Zweite Chance benutzen, und erst wenn der
      // endgültige Wurf immer noch 0 Treffer hat, darf ein Nachbarwürfel treffen.
      if(hasAbility(8) && precisionUses<(hasMasteryUpgrade(8,1,current)?3:2)){
        const precisionIndex=dice.findIndex(d=>!d.locked && d.value!=null && Math.abs(d.value-attackFace)===1);

        if(precisionIndex!==-1){
          const precisionDamage=precisionHitDamage();
          dice[precisionIndex].locked=true;
          attackHits++;
          currentAttackRollNewHits=1;
          attackDamage+=precisionDamage;
          precisionUses++;
          markCampaignAbilityUse(current,8);
          firstAttackRoll=false;
          retireWildcardAfterRoll();

          addLog(`🎯 Präzision rettet den finalen Angriffswurf: ${dice[precisionIndex].value} zählt als Nachbartreffer für ${precisionDamage} Schaden.`);

          if(dice.every(d=>d.locked)){
            addLog(`🔥 Alle 5 Würfel sind Treffer. Gesamtschaden: ${totalAttackDamage()}.`);
            dealAttackDamage();
          }else{
            phase="attack_continue";
            renderAll();
          }
          return;
        }
      }

      retireWildcardAfterRoll();
      if(firstAttackRoll) addLog(`↳ Angriff fehlgeschlagen: kein ${attackFace}er.`);
      else addLog(`↳ Kein neuer Treffer. Angriff endet mit ${attackHits} Treffern = ${totalAttackDamage()} Schaden.`);

      if(attackHits>0) dealAttackDamage();
      else{
        recordAttackDamageForAchievements(current,0);
        if(hasAbility(2)&&hasMasteryUpgrade(2,1,current)){
          const heal=applyHealingToPlayer(current,encounterHealAmount(current,2));recordHealing(current,heal);if(heal>0)pendingHeal={target:current,amount:heal};addLog(`🩸 Borrowing Life: 0 Treffer → ${heal} HP geheilt.`);
        }
        if(offerGamblingRetry()) return;
        window.WDMastery?.noteAttackResolved?.(current,0,currentAttackSource,normalAttackHitsThisAttack,wildcardAttackHitsThisAttack);
        endTurn();
      }
      return;
    }

    firstAttackRoll=false;
    retireWildcardAfterRoll();
    if(dice.every(d=>d.locked)){
      addLog(`🔥 Alle 5 Würfel sind Treffer. Gesamtschaden: ${totalAttackDamage()}.`);
      dealAttackDamage();
      return;
    }
    phase="attack_continue";renderAll();
  }

  function dealAttackDamage(){
    if(localEngineActive()){presentLocalEngineState();renderAll();return;}
    if(attackHits===5) unlockAchievementForPlayer(current,"grande");

    if(hasAbility(24) && !doubleTapApplied){
      if(attackHits===2){
        doubleTapApplied=true;markCampaignAbilitySuccess(current,24);attackDamage+=4;addLog(`🔫 Double Tap: exakt 2 Treffer → +4 Gesamtschaden. Neuer Schaden: ${attackDamage}.`);
      }else if(attackHits===1&&hasMasteryUpgrade(24,1,current)){
        const oneTapBonus=hasMasteryUpgrade(24,2,current)?3:2;
        doubleTapApplied=true;markCampaignAbilitySuccess(current,24);attackDamage+=oneTapBonus;addLog(`🔫 ${hasMasteryUpgrade(24,2,current)?"Two Piece":"One Tap"}: exakt 1 Treffer → +${oneTapBonus} Gesamtschaden. Neuer Schaden: ${attackDamage}.`);
      }
    }

    if(!masteryL2AttackBonusesApplied){
      masteryL2AttackBonusesApplied=true;
      if(hasAbility(4)&&hasMasteryUpgrade(4,2,current)&&attackHits>0){
        const bonus=Math.min(5,Math.max(0,attackMasteryRollCount));
        if(bonus>0){attackDamage+=bonus;addLog(`⚡ Reroll for Damage: ${attackMasteryRollCount} Würfe → +${bonus} Gesamtschaden.`);}
      }
      if(hasAbility(8)&&hasMasteryUpgrade(8,2,current)&&exactFaceHitsThisAttack>0){
        attackDamage+=1;addLog(`🎯 Bullseye: exakte Trefferzahl → +1 Gesamtschaden.`);
      }
      if(hasAbility(9)&&hasMasteryUpgrade(9,2,current)&&players[current].hp<=5&&players[current].hp>0){
        const bonus=6-players[current].hp;attackDamage+=bonus;addLog(`😡 Vendetta: ${players[current].hp} HP → +${bonus} Gesamtschaden.`);
      }
      if(hasAbility(20)&&hasMasteryUpgrade(20,2,current)){
        const uses=Math.max(0,Number(roundStats[current]?.snakeEyesUsesThisTurn)||0);
        if(uses>0){attackDamage+=uses;addLog(`🐍 Python Entangle: ${uses} Snake-Eyes-Use${uses===1?"":"s"} → +${uses} Gesamtschaden.`);}
      }
      if(hasAbility(25)&&hasMasteryUpgrade(25,2,current)&&isUniqueUnderdog(current)&&attackHits>0){
        const desired=Math.floor(attackHits*1.5),already=attackHits,extra=Math.max(0,desired-already);
        if(extra>0){attackDamage+=extra;addLog(`🐕 Top Dog: Underdog-Bonus ${already} → ${desired} (+${extra} extra).`);}
      }
      if(hasAbility(17)&&hasMasteryUpgrade(17,2,current)&&!wildcardTriggeredThisAttack&&attackHits>0){
        const bonus=attackHits*2;attackDamage+=bonus;addLog(`🃏 Joker: Wildcard nicht getroffen → +${bonus} Schaden (${attackHits} × 2).`);
      }
    }

    if(hasAbility(13) && !highStakesDecisionThisAttack && totalAttackDamage()>0){
      openHighStakes();
      return;
    }
    finalizeAttackDamage();
  }



  function counterattackDamagePerHit(index){
    let dmg=hasAbility(1,index) ? 3 : 1;
    if(hasAbility(9,index) && players[index].hp<=(hasMasteryUpgrade(9,1,index)?15:10)) dmg+=2;
    if(hasAbility(10,index)){
      const streak=players[index].momentumStreak||0;
      dmg+=Math.min(Math.max(streak-1,0),hasMasteryUpgrade(10,2,index)?3:2);
    }
    if(counterContext?.bloodRushActive && hasAbility(23,index)) dmg+=1;
    if(hasAbility(25,index) && isUniqueUnderdog(index)) dmg+=1;
    return dmg;
  }

  function queueCounterattack(defenderIndex,attackerIndex,restoreHp=null,incomingDamage=0,lastStandTriggered=false){
    pendingCounterattack={defenderIndex,attackerIndex,restoreHp,incomingDamage,lastStandTriggered};

    if(secondAbilityDraftBusy){
      return;
    }

    const ctx=pendingCounterattack;
    pendingCounterattack=null;
    openCounterattack(ctx.defenderIndex,ctx.attackerIndex,ctx.restoreHp,ctx.incomingDamage,ctx.lastStandTriggered);
  }

  function renderCounterDice(){
    if(!counterContext) return;
    const defender=players[counterContext.defenderIndex];
    const designKey=defender?.diceDesign||"classic";
    const theme=DICE_DESIGNS[designKey]?.className||"theme-classic";

    while(counterDiceEl.children.length<counterDiceState.length){
      const el=document.createElement("div");
      el.className=`die ${theme}`;
      counterDiceEl.appendChild(el);
    }
    while(counterDiceEl.children.length>counterDiceState.length) counterDiceEl.lastElementChild.remove();
    counterDiceState.forEach((d,i)=>{
      const el=counterDiceEl.children[i];
      let cls=`die ${theme}`;
      if(d.locked) cls+=" attack-hit locked";
      if(d.rolling) cls+=" rolling";
      el.className=cls;
      render3DDieNode(el,d.value,designKey);
    });
  }

  function openCounterattack(defenderIndex,attackerIndex,restoreHp=null,incomingDamage=0,lastStandTriggered=false){
    if(localEngineActive()){presentLocalEngineState();renderAll();return;}
    const defender=players[defenderIndex];
    const attacker=players[attackerIndex];

    if(!defender || !attacker || defender.hp<=0 || attacker.hp<=0 || !hasAbility(21,defenderIndex)){
      finishAttackAfterCounter();
      return;
    }

    counterContext={
      defenderIndex,
      attackerIndex,
      restoreHp,
      incomingDamage,
      lastStandTriggered,
      bloodRushActive:consumeBloodRushForCounter(defenderIndex)
    };
    markCampaignAbilityUse(defenderIndex,21);
    if(!isBotPlayer(defenderIndex)) document.body.classList.remove("bot-acting");
    counterRolling=false;
    counterHits=0;
    counterFirstRoll=true;
    counterDiceState=Array.from({length:5},()=>({value:null,locked:false,rolling:false}));
    phase="counterattack";

    counterResult.textContent=hasAbility(1,defenderIndex)?"5 Würfel bereit · 1er & 2er treffen":"5 Würfel bereit";
    counterRollBtn.textContent=hasAbility(1,defenderIndex)?"⚔️ Auf 1er/2er würfeln":"⚔️ Auf 1er würfeln";
    counterRollBtn.disabled=false;
    counterTitle.textContent=`${defender.name} schlägt zurück!`;
    counterModal.classList.remove("hidden");
    renderCounterDice();

    addLog(`⚔️ Counterattack: ${defender.name} hat mindestens 5 Hauptangriffsschaden überlebt und startet einen 5W6-Angriff auf 1er gegen ${attacker.name}.`);
    renderAll();
  }

  function finishCounterattackDamage(){
    if(!counterContext) return;

    const defenderIndex=counterContext.defenderIndex;
    const attackerIndex=counterContext.attackerIndex;
    const defender=players[defenderIndex];
    const attacker=players[attackerIndex];
    noteCampaignHeroAttack(defenderIndex,attackerIndex);

    const perfectParry=hasMasteryUpgrade(21,2,defenderIndex)&&counterDiceState.length===5&&counterDiceState.every(d=>d.value===1);
    if(perfectParry){
      const restoreTo=Math.max(defender.hp,Number(counterContext.restoreHp)||defender.hp);
      const restored=Math.max(0,restoreTo-defender.hp);
      defender.hp=restoreTo;
      if(counterContext.lastStandTriggered){
        defender.lastStandUsed=false;defender.roundLastStandTriggered=false;defender.masteryLastStandCooldown=0;
      }
      if(roundStats[defenderIndex])roundStats[defenderIndex].damageTaken=Math.max(0,(roundStats[defenderIndex].damageTaken||0)-(Number(counterContext.incomingDamage)||0));
      addLog(`🛡️ Parry: 5 Einser! Der ursprüngliche Angriff wird vollständig abgewehrt${restored?` · ${restored} HP wiederhergestellt`:""}.`);
    }

    if(counterHits===5) unlockAchievementForPlayer(defenderIndex,"grande");

    const perHit=counterattackDamagePerHit(defenderIndex);
    const baseCounterDamage=counterHits*perHit;
    let rawCounterDamage=baseCounterDamage;
    let counterDoubleTapBonus=0;

    if(hasAbility(24,defenderIndex)){
      if(counterHits===2){
        counterDoubleTapBonus=4;
        rawCounterDamage+=counterDoubleTapBonus;
        markCampaignAbilitySuccess(defenderIndex,24);
        addLog(`🔫 Double Tap im Counterattack: exakt 2 Treffer → +4 Schaden.`);
      }else if(counterHits===1&&hasMasteryUpgrade(24,1,defenderIndex)){
        counterDoubleTapBonus=hasMasteryUpgrade(24,2,defenderIndex)?3:2;
        rawCounterDamage+=counterDoubleTapBonus;
        markCampaignAbilitySuccess(defenderIndex,24);
        addLog(`🔫 ${hasMasteryUpgrade(24,2,defenderIndex)?"Two Piece":"One Tap"} im Counterattack: +${counterDoubleTapBonus} Schaden.`);
      }
    }
    if(hasAbility(9,defenderIndex)&&hasMasteryUpgrade(9,2,defenderIndex)&&defender.hp<=5&&defender.hp>0){
      rawCounterDamage+=6-defender.hp;
    }
    if(hasAbility(25,defenderIndex)&&hasMasteryUpgrade(25,2,defenderIndex)&&isUniqueUnderdog(defenderIndex)&&counterHits>0){
      rawCounterDamage+=Math.max(0,Math.floor(counterHits*1.5)-counterHits);
    }

    let actualDamage=0;
    let counterKillDraftHeroIndex=null;

    if(rawCounterDamage>0 && attacker?.hp>0){
      const attackerHpBefore=attacker.hp;
      if(rawCounterDamage>=attackerHpBefore+10) unlockAchievementForPlayer(defenderIndex,"overkill");
      recordCampaignAttackResult(defenderIndex,counterHits);
      const result=applyDamageToPlayer(attackerIndex,rawCounterDamage,"opponent");
      checkBossPhase(attackerIndex,attackerHpBefore,attacker.hp);
      actualDamage=result.lost;
      window.WDMastery?.noteCounterDamage?.(defenderIndex,actualDamage);
      recordDamageDealt(defenderIndex,actualDamage,false);
      if(actualDamage>=15) unlockAchievementForPlayer(defenderIndex,"backstab");
      if(actualDamage>0){
        pendingExtraDamageFx.push({target:attackerIndex,amount:actualDamage});
        window.WDAttackFx?.emit?.(defenderIndex,attackerIndex,"counter",actualDamage,1);
      }

      const counterFormula=counterDoubleTapBonus
        ? `${counterHits} Treffer × ${perHit} + ${counterDoubleTapBonus} Double Tap`
        : `${counterHits} Treffer × ${perHit}`;
      addLog(`⚔️ Counterattack endet: ${counterFormula} = ${actualDamage} Schaden an ${attacker.name}.`);

      if(hasAbility(2,defenderIndex) && actualDamage>0){
        let heal=encounterHealAmount(defenderIndex,Math.floor(actualDamage/2));
        if(hasMasteryUpgrade(2,2,defenderIndex))heal+=3;
        const actualHeal=applyHealingToPlayer(defenderIndex,heal);
        recordHealing(defenderIndex,actualHeal);
        if(actualHeal>0){
          unlockAchievementForPlayer(defenderIndex,"vampiric_touch");
          if(actualHeal>=10) unlockAchievementForPlayer(defenderIndex,"blood_bank");
          pendingExtraHealFx.push({target:defenderIndex,amount:actualHeal});
          addLog(`🩸 Counter-Lifesteal: ${defender.name} heilt ${actualHeal} Leben${defender.hp>maxHpForPlayer(defender)?` · ${defender.hp}/${maxHpForPlayer(defender)} HP`:""}.`);
        }
      }

      if(attacker.hp<=0){
        window.WDAttackFx?.kill?.(defenderIndex,attackerIndex);
        if(roundStats[defenderIndex]) roundStats[defenderIndex].kills++;
        if(counterDoubleTapBonus>0) unlockAchievementForPlayer(defenderIndex,"double_trouble");
        recordCampaignKill(defenderIndex,attackerIndex);
        if(campaignMode && players[defenderIndex]?.campaignTeam==="hero") counterKillDraftHeroIndex=defenderIndex;
        markEliminated(attackerIndex);
        addLog(`💀 ${attacker.name} ist durch Counterattack ausgeschieden.`);
      }
    }else{
      window.WDMastery?.noteCounterDamage?.(defenderIndex,0);
      addLog(`⚔️ Counterattack endet ohne Treffer.`);
    }

    counterResult.textContent=counterHits>0
      ? `${counterHits} Treffer = ${actualDamage} Schaden`
      : `Kein Treffer`;

    setTimeout(()=>{
      counterModal.classList.add("hidden");
      counterRolling=false;
      counterContext=null;
      counterDiceState=[];
      counterHits=0;

      if(counterKillDraftHeroIndex!=null){
        deferredAttackFinish=true;
        if(maybeTriggerKillBonusDraft(counterKillDraftHeroIndex)) return;
        deferredAttackFinish=false;
      }

      if(secondAbilityDraftBusy){
        deferredAttackFinish=true;
        return;
      }
      finishAttackAfterCounter();
    },650);
  }

  function rollCounterattack(){
    if(localEngineActive()) return runLocalEngineMove("rollCounterattack");
    if(counterRolling || phase!=="counterattack" || !counterContext) return;

    const defenderIndex=counterContext.defenderIndex;
    const rollIndices=[];
    counterDiceState.forEach((d,i)=>{
      if(!d.locked){
        d.rolling=true;
        rollIndices.push(i);
      }
    });

    if(!rollIndices.length){
      finishCounterattackDamage();
      return;
    }

    counterRolling=true;
    counterRollBtn.disabled=true;
    renderCounterDice();
    counterResult.textContent="...";

    // V25.6: Wie beim normalen Wurf keine Zwischen-Renderloops mehr.
    // Die echten 3D-Seiten liefern die sichtbaren Zwischenframes.
    setTimeout(()=>{
      let newHits=0;
      rollIndices.forEach(i=>{
        const d=counterDiceState[i];
        d.value=rollTrackedD6(defenderIndex);
        d.rolling=false;
        const brutalCounterHit=hasAbility(1,defenderIndex) && d.value===2;
        if(d.value===1 || brutalCounterHit){
          d.locked=true;
          counterHits++;
          newHits++;
        }
      });

      applyTwelveHeal(defenderIndex,rollIndices.map(i=>counterDiceState[i].value),"Counterattack-Wurf");

      counterRolling=false;
      renderCounterDice();

      addLog(`⚔️ Counterattack-Wurf: ${newHits} neue 1er. Gesamt: ${counterHits} Treffer.`);
      counterResult.textContent=`${newHits} neue Treffer · ${counterHits} gesamt`;

      if(newHits===0){
        counterRollBtn.disabled=true;
        counterRollBtn.textContent="Gegenangriff beendet";
        finishCounterattackDamage();
        return;
      }

      counterFirstRoll=false;

      if(counterDiceState.every(d=>d.locked)){
        counterRollBtn.disabled=true;
        counterRollBtn.textContent="5/5 Treffer!";
        finishCounterattackDamage();
        return;
      }

      counterRollBtn.textContent="⚔️ Rest weiterwürfeln";
      counterRollBtn.disabled=false;
      scheduleBotAction(80);
    },ROLL_ANIM_MS);
  }

  function finishAttackAfterCounter(){
    if(checkWinner()){
      renderPlayers();
      flushPendingFx();
      return;
    }

    // V15 QoL: Nach einem Angriff mit Schaden ist kein zusätzlicher
    // "Nächster Zug"-Klick mehr nötig. Nach Schaden/Counter/Draft geht es weiter.
    advanceTurn();
  }

  function finalizeAttackDamage(){
    if(localEngineActive()){presentLocalEngineState();renderAll();return;}
    let rawDamage=totalAttackDamage();
    rawDamage=Math.max(0,rawDamage+campaignOutgoingDamageModifier(current,rawDamage));
    recordCampaignAttackResult(current,attackHits);
    const aliveSnapshot=players.map((p,i)=>p.hp>0?i:null).filter(i=>i!=null);
    const ricochetWillTrigger=hasAbility(16)&&attackHits>0&&aliveSnapshot.length>=3;
    if(ricochetWillTrigger)markCampaignAbilityUse(current,16);
    const target=players[attackTarget];
    const targetHpBefore=target?.hp||0;
    if(campaignMode&&players[current]?.campaignTeam==="hero"&&rawDamage>0&&encounterRuleActive("first_strike")&&!encounterRuntime.firstStrikeUsed.has(String(current))){rawDamage+=2;encounterRuntime.firstStrikeUsed.add(String(current));addLog(`⚡ First Strike: +2 Rohschaden.`);}
    if(campaignMode&&players[current]?.campaignTeam==="hero"&&rawDamage>0&&encounterRuleActive("overcharge")){rawDamage+=2;addLog(`⚡ Overcharge: +2 Rohschaden.`);}
    if(campaignMode&&players[current]?.campaignTeam==="hero"&&rawDamage>0&&encounterRuleActive("armor_shell")&&!encounterRuntime.armorUsed.has(String(attackTarget))){rawDamage=Math.max(0,rawDamage-2);encounterRuntime.armorUsed.add(String(attackTarget));addLog(`🛡 Armor Shell: der erste Angriff auf ${target.name} verliert 2 Rohschaden.`);}
    const masteryDamageBonus=rawDamage>0?(window.WDMastery?.damageBonusForPlayer?.(current)||0):0;
    if(masteryDamageBonus>0){
      rawDamage+=masteryDamageBonus;
      addLog(`⚔️ Mastery · Force: +${masteryDamageBonus} Gesamtschaden.`);
    }
    const rushDamageBonus=rawDamage>0?window.WDBossRush?.attackDamageBonus?.(current,attackTarget):null;
    if((rushDamageBonus?.amount||0)>0){
      rawDamage+=rushDamageBonus.amount;
      addLog(`Boss Rush: ${rushDamageBonus.parts.join(" · ")}.`);
    }
    if(rawDamage>=targetHpBefore+10) unlockAchievementForPlayer(current,"overkill");

    recordCampaignRawDamage(current,rawDamage);
    rawDamage=Math.max(0,rawDamage+campaignIncomingDamageModifier(attackTarget,rawDamage));
    if(campaignMode&&players[current]?.campaignTeam==="enemy"&&(encounterRuntime?.escalationLevel||0)>0)rawDamage+=encounterRuntime.escalationLevel;
    const mainResult=applyDamageToPlayer(attackTarget,rawDamage,"opponent");
    checkBossPhase(attackTarget,targetHpBefore,target.hp);
    const actualDamage=mainResult.lost;
    commitOneShotDamageBonuses(current,actualDamage);
    recordDamageDealt(current,actualDamage,true);
    if(actualDamage===21) unlockAchievementForPlayer(current,"critical_hit");
    if(Number(attackFace)===1 && actualDamage>=15) unlockAchievementForPlayer(current,"one_or_three");
    pendingDamage={target:attackTarget,amount:actualDamage};
    if(actualDamage>0){
      const fxKind=(attackFace===4||attackFace===6)?"lightning":"laser";
      window.WDAttackFx?.emit?.(current,attackTarget,fxKind,actualDamage,attackFace);
    }

    addLog(`⚔️ ${target.name} verliert ${actualDamage} Leben${rawDamage>actualDamage?` (${rawDamage} Schaden wären möglich gewesen).`:"."}`);

    const mainTargetKilled=target.hp<=0;
    if(!mainTargetKilled && attackFace===1 && attackHits>0 && hasAbility(1) && hasMasteryUpgrade(1,1,current)){
      target.masteryPoisonTurns=2;target.masteryPoisonSource=current;window.WDMastery?.notePoison?.(current,attackTarget);addLog(`☠️ 1 for Poison: ${target.name} ist für die nächsten 2 eigenen Züge vergiftet (3 HP/Zug).`);
    }
    if(mainTargetKilled){
      triggerToxicBomb(attackTarget);
      window.WDAttackFx?.kill?.(current,attackTarget);
      if(roundStats[current]) roundStats[current].kills++;
      if(doubleTapApplied) unlockAchievementForPlayer(current,"double_trouble");
      recordCampaignKill(current,attackTarget);
      maybeTriggerKillBonusDraft(current);
      markEliminated(attackTarget);
      addLog(`💀 ${target.name} ist ausgeschieden.`);
    }

    // Ricochet: JEDER tatsächlich gesammelte Würfeltreffer = 1 Splash-Schaden.
    // Kein Mindestwert an Treffern. Nur im echten Multiplayer mit mindestens 3 Lebenden.
    // Ziel ist der nächste andere Spieler NACH dem Hauptziel im Uhrzeigersinn.
    let ricochetActual=0;
    let ricochetTargetKilled=false;
    if(ricochetWillTrigger){
      const ricochetTarget=nextRicochetTarget(attackTarget,aliveSnapshot);
      if(ricochetTarget!==-1){
        const ricochetDamage=attackHits*(hasMasteryUpgrade(16,1,current)?2:1);
        recordCampaignRawDamage(current,ricochetDamage,ricochetTarget);
        const ricBefore=players[ricochetTarget]?.hp||0;
        const ricResult=applyDamageToPlayer(ricochetTarget,ricochetDamage,"opponent");
        checkBossPhase(ricochetTarget,ricBefore,players[ricochetTarget]?.hp||0);
        ricochetActual=ricResult.lost;
        recordDamageDealt(current,ricochetActual,true);
        if(ricochetActual>0){
          pendingExtraDamageFx.push({target:ricochetTarget,amount:ricochetActual});
          window.WDAttackFx?.emit?.(current,ricochetTarget,"ricochet",ricochetActual,attackFace);
        }
        addLog(`🪃 Ricochet${hasMasteryUpgrade(16,1,current)?" · Rebound":""}: ${attackHits} Würfeltreffer → ${players[ricochetTarget].name} erhält ${ricochetActual} Schaden.`);
        if(players[ricochetTarget].hp<=0){
          triggerToxicBomb(ricochetTarget);
          window.WDAttackFx?.kill?.(current,ricochetTarget);
          ricochetTargetKilled=true;
          if(roundStats[current]) roundStats[current].kills++;
          recordCampaignKill(current,ricochetTarget);
          maybeTriggerKillBonusDraft(current);
          markEliminated(ricochetTarget);
          addLog(`💀 ${players[ricochetTarget].name} ist ausgeschieden.`);
        }
      }
    }

    let ricochetSecondActual=0;
    if(hasAbility(16)&&hasMasteryUpgrade(16,2,current)&&attackHits>0&&aliveSnapshot.length>=4){
      const firstTarget=nextRicochetTarget(attackTarget,aliveSnapshot);
      const secondTarget=firstTarget!==-1?nextRicochetTargetExcluding(firstTarget,aliveSnapshot,[attackTarget,firstTarget]):-1;
      if(secondTarget!==-1&&players[secondTarget]?.hp>0){
        const ric2Damage=attackHits;
        const before=players[secondTarget].hp;
        const res=applyDamageToPlayer(secondTarget,ric2Damage,"opponent");
        checkBossPhase(secondTarget,before,players[secondTarget]?.hp||0);
        ricochetSecondActual=res.lost;
        if(ricochetSecondActual>0) noteCampaignHeroAttack(current,secondTarget);
        recordDamageDealt(current,ricochetSecondActual,true);
        if(ricochetSecondActual>0){
          pendingExtraDamageFx.push({target:secondTarget,amount:ricochetSecondActual});
          window.WDAttackFx?.emit?.(current,secondTarget,"ricochet",ricochetSecondActual,attackFace);
        }
        addLog(`🪃 Chain Reaction: ${players[secondTarget].name} erhält ${ricochetSecondActual} Schaden.`);
        if(before>0&&players[secondTarget].hp<=0){
          triggerToxicBomb(secondTarget);
          window.WDAttackFx?.kill?.(current,secondTarget);
          if(roundStats[current])roundStats[current].kills++;
          recordCampaignKill(current,secondTarget);
          maybeTriggerKillBonusDraft(current);
          markEliminated(secondTarget);
          addLog(`💀 ${players[secondTarget].name} ist durch Chain Reaction ausgeschieden.`);
        }
      }
    }

    if(mainTargetKilled && ricochetTargetKilled) unlockAchievementForPlayer(current,"collateral_damage");
    recordAttackDamageForAchievements(current,actualDamage+ricochetActual+ricochetSecondActual);
    window.WDMastery?.noteAttackResolved?.(current,actualDamage,currentAttackSource,normalAttackHitsThisAttack,wildcardAttackHitsThisAttack);

    if(hasAbility(2) && (actualDamage+ricochetActual+ricochetSecondActual)>0){
      let heal=encounterHealAmount(current,Math.floor((actualDamage+ricochetActual+ricochetSecondActual)/2));
      if(hasMasteryUpgrade(2,2,current))heal+=3;
      const actualHeal=applyHealingToPlayer(current,heal);
      recordHealing(current,actualHeal);
      if(actualHeal>=10) unlockAchievementForPlayer(current,"blood_bank");
      if(actualHeal>0) pendingHeal={target:current,amount:actualHeal};
      const p=players[current];
      const over=p.hp>maxHpForPlayer(p)?` · jetzt ${p.hp}/${maxHpForPlayer(p)} HP`:"";
      addLog(`🩸 Lifesteal: ${p.name} heilt ${actualHeal} Leben${over}.`);
    }

    window.WDBossRush?.afterHeroAttack?.(current,actualDamage+ricochetActual+ricochetSecondActual);
    campaignAfterSuccessfulAttack(current,actualDamage+ricochetActual+ricochetSecondActual);

    if(campaignMode&&players[current]?.campaignTeam==="hero"&&rawDamage>0&&encounterRuleActive("overcharge")&&players[current].hp>1){const result=applyDamageToPlayer(current,1,"self");const lost=result.lost;if(lost>0){recordSelfDamage(current,lost);players[current].damageSinceLastOwnTurn=true;pendingExtraDamageFx.push({target:current,amount:lost});addLog(`⚡ Overcharge-Rückstoß: ${players[current].name} verliert ${lost} HP.`);}}

    // Counterattack prüft den rohen Hauptangriffsschaden, damit auch Last Stand + Counterattack funktioniert.
    // Ricochet-Schaden zählt NICHT als Auslöser.
    const counterThreshold=hasMasteryUpgrade(21,1,attackTarget)?4:5;
    const counterEligible=rawDamage>=counterThreshold && target.hp>0 && players[current].hp>0 && hasAbility(21,attackTarget);

    if(counterEligible){
      queueCounterattack(attackTarget,current,targetHpBefore,actualDamage,!!mainResult.lastStand);
      return;
    }

    if(secondAbilityDraftBusy){
      deferredAttackFinish=true;
      return;
    }
    finishAttackAfterCounter();
  }

  function finishBaseTurn(delay=500){
    if(localEngineActive()){
      renderAll();setTimeout(()=>{if(localEngineActive()&&phase==="turn_done")advanceTurn();},delay);return;
    }
    if(checkWinner()){
      renderPlayers();
      flushPendingFx();
      return;
    }
    phase="base_auto_end";
    dice.forEach(d=>d.selected=false);
    renderAll();
    setTimeout(()=>{
      if(phase!=="base_auto_end") return;
      if(secondAbilityDraftBusy || (tutorialMode && tutorialOpen)){
        deferredBaseAdvance=true;
        return;
      }
      advanceTurn();
    },delay);
  }

  function endTurn(){
    if(localEngineActive()){renderAll();return;}
    if(checkWinner()){
      renderPlayers();flushPendingFx();return;
    }
    phase="turn_done";
    dice.forEach(d=>d.selected=false);
    renderAll();
  }

  function applyMasteryPoisonTurnStart(index){
    const p=players[index];if(!p||p.hp<=0||!(p.masteryPoisonTurns>0))return true;
    const source=Number(p.masteryPoisonSource);const before=p.hp;const result=applyDamageToPlayer(index,3,"opponent");if(result.lost>0)noteCampaignHeroAttack(source,index);p.masteryPoisonTurns=Math.max(0,p.masteryPoisonTurns-1);addLog(`☠️ Poison: ${p.name} verliert ${result.lost} HP (${p.masteryPoisonTurns} Tick${p.masteryPoisonTurns===1?"":"s"} übrig).`);
    if(p.hp<=0){triggerToxicBomb(index);if(Number.isInteger(source)&&players[source]){if(roundStats[source])roundStats[source].kills++;recordCampaignKill(source,index);maybeTriggerKillBonusDraft(source);}markEliminated(index);addLog(`💀 ${p.name} stirbt am Gift.`);return false;}return true;
  }

  function advanceTurn(){
    if(localEngineActive()){clearBotAutomation();return runLocalEngineMove("advanceTurn");}
    clearBotAutomation();
    const n=nextAlive(current);
    if(n===-1){checkWinner();return;}
    current=n;
    if(!applyMasteryPoisonTurnStart(current)){
      if(checkWinner()){renderPlayers();flushPendingFx();return;}
      setTimeout(()=>advanceTurn(),180);return;
    }
    if(campaignMode && players[current]?.campaignTeam==="hero"){campaignMetrics.currentRawTurnDamage=0;campaignMetrics.currentRawTurnDamageByHero[String(current)]=0;}
    prepareBloodRushForTurn(current);
    applyEncounterTurnStartRule(current);
    if(turnDamageThisTurn[current]!=null) turnDamageThisTurn[current]=0;
    if(roundStats[current]) roundStats[current].snakeEyesUsesThisTurn=0;
    dice=freshDice();phase="idle";
    attackFace=null;attackTarget=null;pendingCampaignAttackStart=null;attackHits=0;attackDamage=0;firstAttackRoll=true;currentAttackRollNewHits=0;
    baseRerollUsed=false;luckRerollIndex=null;luckRerollSecondUsed=false;luckRerollUses=0;loadedDiceUsed=false;loadedDiceUses=0;lastBaseRollIndices=[];attackPowerUsed=false;attackPowerUses=0;precisionUses=0;momentumBonus=0;bloodPriceNeighbors=[];bloodPricePaidThisRoll=0;bloodPriceWasPreActivatedThisRoll=false;bloodRushActiveThisAttack=false;doubleTapApplied=false;lastAttackRollIndices=[];attackRollCount=0;attackMasteryRollCount=0;normalAttackHitsThisAttack=0;exactFaceHitsThisAttack=0;wildcardAttackHitsThisAttack=0;wildcardTriggeredThisAttack=false;masteryL2AttackBonusesApplied=false;wildcardSecondRollArmed=false;currentAttackSource="normal";currentAttackBaseTotal=null;gamblingRetryUsed=false;gamblingRetryPending=false;
    highStakesDecisionThisAttack=false;wildcardFace=null;
    gamblingRolling=false;gamblingBaseTotal=null;gamblingRetryActions?.classList.add("hidden");gamblingModal.classList.add("hidden");highStakesRolling=false;highStakesDecisionThisAttack=false;highStakesModal.classList.add("hidden");perfect25Rolling=false;perfect25D4Rolling=false;perfect25BaseTotal=null;pendingPerfect25Total=null;perfect25Modal.classList.add("hidden");perfect25D4Modal.classList.add("hidden");insuranceRolling=false;insuranceContext=null;insuranceModal.classList.add("hidden");counterRolling=false;counterContext=null;counterDiceState=[];counterHits=0;counterFirstRoll=true;pendingCounterattack=null;deferredAttackFinish=false;counterModal.classList.add("hidden");wildcardFace=null;secondAbilityDraftQueue=[];
    highStakesModal.classList.add("hidden");perfect25Modal.classList.add("hidden");perfect25D4Modal.classList.add("hidden");
    renderAll();

    if(tutorialMode && current===1){
      queueTutorialStep(
        "bot-turn",
        "Jetzt ist der Bot dran",
        `Bots spielen automatisch mit denselben Würfeln und Regeln wie Menschen. Dieser Bot ist auf <strong>Leicht</strong> gestellt und bekommt im Tutorial keine Fähigkeit. Schau ihm kurz beim Zug zu.`
      );
    }else if(tutorialMode && current===0 && tutorialSeen.has("bot-turn")){
      queueTutorialStep(
        "play-on",
        "Du hast das Grundprinzip",
        `Ab jetzt spielst du die Runde normal zu Ende. Denk an die drei Kernpunkte: <strong>Würfel locken</strong>, möglichst <strong>25 oder mehr</strong> erreichen und bei einem Angriff deine Zielzahl treffen.<br><br>Über „☰ Hauptmenü“ kannst du das Tutorial jederzeit verlassen.`
      );
    }
  }

  function checkWinner(){
    if(localEngineActive()&&!window.WDEngineAdapter.getLiveState()?.round?.result) return false;
    if(campaignMode) return checkCampaignWinner();
    const aliveIndices=players.map((p,i)=>p.hp>0?i:null).filter(i=>i!=null);
    if(aliveIndices.length===1){
      const winnerIndex=aliveIndices[0];
      const winner=players[winnerIndex];
      roundWinnerIndex=winnerIndex;

      if(tutorialMode){
        if(!roundWinnerHandled){
          roundWinnerHandled=true;
          winner.wins=(winner.wins||0)+1;
          queueEventPopup(winnerIndex===0?"Tutorial geschafft!":"Tutorial beendet","win");
        }

        winnerText.textContent=winnerIndex===0
          ? "🎓 Tutorial geschafft!"
          : "🤖 Tutorial-Bot gewinnt";
        roundResultText.innerHTML=winnerIndex===0
          ? `Du hast die Tutorial-Runde gewonnen. <strong>Damit kennst du die Grundregeln.</strong><br>Im normalen Spiel kommen dann der komplette Fähigkeitspool, weitere Spieler und schwierigere Bots dazu.`
          : `Kein Problem – die Grundregeln hast du trotzdem gesehen. Du kannst das Tutorial jederzeit erneut starten oder direkt eine normale Partie spielen.`;

        roundStandings.innerHTML=players.map((p,i)=>`
          <div class="round-score-row${i===winnerIndex?" winner-row":""}">
            <div class="round-score-name">${escapeHtml(p.name)}</div>
            <div class="round-score-meta">${i===winnerIndex?"🏆 Tutorial-Sieger":"Runde beendet"}</div>
          </div>
        `).join("");

        renderRoundStats();
        nextRoundPrepBtn.classList.add("hidden");
        restartBtn.textContent="Hauptmenü";
        clearBotAutomation();
        winnerBox.classList.remove("hidden");
        nextRoundBox.classList.add("hidden");
        turnLine.textContent="Tutorial beendet";
        statusEl.textContent="";
        abilityState.innerHTML="";
        hideAllControls();
        renderPlayers();
        roundNumberEl.textContent=roundNumber;
        return true;
      }

      if(!roundWinnerHandled){
        roundWinnerHandled=true;
        winner.wins=(winner.wins||0)+1;
        checkRoundWinnerAchievements(winnerIndex);
        commitRoundToStorage(winnerIndex);

        // Der Rundensieger darf niemals den Letztplatzierten-Bonus bekommen.
        if(lastPlaceIndex==null || lastPlaceIndex===winnerIndex){
          const eliminatedLoser=roundEliminationOrder.find(i=>i!==winnerIndex);
          if(eliminatedLoser!=null){
            lastPlaceIndex=eliminatedLoser;
          }else{
            const losers=players.map((p,i)=>(p.hp<=0 && i!==winnerIndex)?i:null).filter(i=>i!=null);
            if(losers.length) lastPlaceIndex=losers[0];
          }
        }

        addLog(`🏆 ${winner.name} gewinnt Runde ${roundNumber} und hat jetzt ${winner.wins} Sieg${winner.wins===1?"":"e"}!`);
        queueEventPopup(`${winner.name} Gewinnt!`,"win");
      }

      const loserName=lastPlaceIndex!=null ? players[lastPlaceIndex].name : "–";
      winnerText.innerHTML=`🏆 ${escapeHtml(winner.name)} gewinnt Runde ${roundNumber}!`;
      roundResultText.innerHTML=`Siegstand: <strong>${winner.wins}</strong> für ${escapeHtml(winner.name)}.<br>`+
        `<span class="last-place-note">${escapeHtml(loserName)}</span> wurde Letzter, startet Runde ${roundNumber+1} und darf die nächste Fähigkeit frei wählen.`+
        (window.WDShop?.gutschriftText?.(escapeHtml)||"");

      roundStandings.innerHTML=players.map((p,i)=>{
        const flags=[
          i===winnerIndex ? "Rundensieger" : "",
          i===lastPlaceIndex ? "🏁 Letzter" : ""
        ].filter(Boolean).join(" · ");
        const cls=`round-score-row${i===winnerIndex?" winner-row":""}${i===lastPlaceIndex?" last-row":""}`;
        return `<div class="${cls}">
          <div class="round-score-name">${escapeHtml(p.name)}</div>
          <div class="round-score-meta">🏆 ${p.wins||0} · ${flags||"Runde beendet"}</div>
        </div>`;
      }).join("");

      renderRoundStats();

      clearBotAutomation();
      winnerBox.classList.remove("hidden");
      nextRoundBox.classList.add("hidden");
      turnLine.textContent="Runde beendet";statusEl.textContent="";abilityState.innerHTML="";
      hideAllControls();
      renderPlayers();
      roundNumberEl.textContent=roundNumber;
      return true;
    }
    return false;
  }
