  function animateIndices(indices,finalizer,rollOptions={}){
    if(!indices.length){finalizer();return;}
    const previewRoll=typeof rollOptions.preview==="function"?rollOptions.preview:()=>randDie();
    const finalRoll=typeof rollOptions.final==="function"?rollOptions.final:()=>rollTrackedD6(current);
    isAnimating=true;
    indices.forEach(i=>dice[i].rolling=true);
    renderAll();

    let ticks=0;
    const timer=setInterval(()=>{
      indices.forEach(i=>dice[i].value=previewRoll(i));
      renderDice();
      if(++ticks>=6) clearInterval(timer);
    },55);

    setTimeout(()=>{
      clearInterval(timer);
      indices.forEach(i=>{dice[i].value=finalRoll(i);dice[i].rolling=false;});
      applyTwelveHeal(current,indices.map(i=>dice[i].value),phase.startsWith("attack")?"Angriffswurf":"Basiswurf");
      isAnimating=false;
      finalizer();
    },ROLL_ANIM_MS);
  }

  function rollBase(){
    const indices=[];
    dice.forEach((d,i)=>{if(!d.locked){d.selected=false;indices.push(i);}});
    lastBaseRollIndices=[...indices];
    
    animateIndices(indices,()=>{
      phase="base_select";
      renderAll();
      tutorialAfterBaseRoll();
    });
  }

  function useBaseReroll(){
    if(!hasAbility(3)||baseRerollUsed||isAnimating) return;
    const idx=dice.findIndex(d=>!d.locked&&d.value===1);
    if(idx===-1) return;
    baseRerollUsed=true;
    markCampaignAbilityUse(current,3);
    const old=dice[idx].value;
    animateIndices([idx],()=>{
      addLog(`⚡ ${players[current].name} nutzt Glückswurf: ${old} → ${dice[idx].value}. Eine neue 1 ist ausgeschlossen.`);
      phase="base_select";renderAll();
    },{
      preview:()=>{let value=1;while(value===1)value=randDieForPlayer(current);return value;},
      final:()=>rollTrackedD6Excluding(current,1)
    });
  }


  function useLoadedDice(){
    if(!hasAbility(18) || loadedDiceUsed || isAnimating || phase!=="base_select" || players[current].hp<=encounterVoluntaryCost(2)) return;

    const eligible=dice
      .map((d,i)=>({d,i}))
      .filter(x=>x.d.selected && !x.d.locked && x.d.value!=null && x.d.value!==5);

    if(eligible.length!==1) return;

    const {d,i}=eligible[0];
    const beforeValue=d.value;
    loadedDiceUsed=true;
    d.value=5;
    markCampaignAbilityUse(current,18);

    const loadedCost=encounterVoluntaryCost(2);
    const damageResult=applyDamageToPlayer(current,loadedCost,"voluntary");
    players[current].voluntaryHpPaidThisTurn=true;
    recordSelfDamage(current,damageResult.lost);
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
    if(!hasAbility(20) || isAnimating || phase!=="base_select") return;

    const group=snakeEyesGroup();
    if(!group) return;
    const rerollIndices=group.indices;
    markCampaignAbilityUse(current,20);

    if(roundStats[current]){
      roundStats[current].snakeEyesUsesThisTurn++;
      if(roundStats[current].snakeEyesUsesThisTurn>=2) unlockAchievementForPlayer(current,"snake_charmer");
    }

    animateIndices(rerollIndices,()=>{
      const results=rerollIndices.map(i=>dice[i].value).join(" / ");
      addLog(`🐍 Snake Eyes: ${players[current].name} würfelt ${rerollIndices.length} gleichzeitig gewürfelte ${group.face}er gratis neu → ${results}.`);
      phase="base_select";
      renderAll();
    });
  }

  function lockSelected(){
    if(isAnimating) return;
    const selected=dice.filter(d=>d.selected&&!d.locked);
    if(!selected.length) return;
    selected.forEach(d=>{d.locked=true;d.selected=false;});
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
    const allowed=(duoCampaignMode && players[index]?.campaignTeam==="hero")
      ? REAL_ABILITY_IDS
      : (campaignMode && players[index]?.campaignTeam==="hero")
        ? campaignUnlockedSecondAbilities(getProfile(players[index]?.profileId)||getProfile(campaignProfileId))
        : REAL_ABILITY_IDS;
    const pool=allowed.filter(a=>!owned.has(a));

    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    return pool.slice(0,2);
  }

  function bonusAbilityRuleFor(index){
    const p=players[index];
    if(!p) return null;
    if(campaignMode) return {threshold:SECOND_ABILITY_HP,slot:2,label:"2. Fähigkeit"};
    if(localModeId==="classic") return {threshold:SECOND_ABILITY_HP,slot:2,label:"2. Fähigkeit"};
    if(localModeId==="endurance50") return {threshold:30,slot:3,label:"3. Fähigkeit"};
    return null;
  }

  function maybeTriggerSecondAbility(index,oldHp,newHp){
    if(tutorialMode) return false;
    const p=players[index];
    const rule=bonusAbilityRuleFor(index);
    if(!p || !rule || p.hp<=0) return false;
    const already=rule.slot===3?p.thirdAbilityUnlocked:p.secondAbilityUnlocked;
    if(already) return false;
    if(newHp<=rule.threshold){
      if(rule.slot===3) p.thirdAbilityUnlocked=true; else p.secondAbilityUnlocked=true;
      openSecondAbilityDraft(index);
      return true;
    }
    return false;
  }

  function openSecondAbilityDraft(index){
    const p=players[index];
    const rule=bonusAbilityRuleFor(index);
    if(!p || !rule || p.hp<=0) return;
    if(rule.slot===2 && p.secondAbility!=null) return;
    if(rule.slot===3 && p.thirdAbility!=null) return;

    if(secondAbilityDraftBusy){
      if(!secondAbilityDraftQueue.includes(index)) secondAbilityDraftQueue.push(index);
      return;
    }

    secondAbilityDraftBusy=true;
    secondAbilityDraftIndex=index;
    secondAbilityDraftSlot=rule.slot;
    const options=randomSecondAbilityChoices(index);
    secondAbilityDraftChoices=[...options];

    secondAbilityTitle.textContent=`${p.name}: Wähle deine ${rule.label}`;
    secondAbilityOptions.innerHTML="";

    options.forEach(id=>{
      const btn=document.createElement("button");
      btn.className="second-ability-card"+(id===7?" luck":"");
      btn.innerHTML=`<div class="num">${id}</div><div class="name">${escapeHtml(ABILITIES[id].name)}</div><div class="desc">${escapeHtml(ABILITIES[id].desc)}</div>`;
      btn.onclick=()=>{if(!isBotPlayer(index))chooseSecondAbility(id);};
      secondAbilityOptions.appendChild(btn);
    });

    secondAbilityModal.classList.remove("hidden");
    addLog(`✨ ${p.name} ist auf ${p.hp} HP gefallen und darf zwischen zwei zufälligen Optionen für die ${rule.label} wählen.`);
    scheduleBotAction(120);
  }

  function chooseSecondAbility(id){
    const index=secondAbilityDraftIndex;
    const p=players[index];
    if(!p || !REAL_ABILITY_IDS.includes(id)) return;

    const slot=secondAbilityDraftSlot;
    if(slot===3){p.thirdAbility=id;p.thirdAbilityWasChosen=true;}
    else{p.secondAbility=id;p.secondAbilityWasChosen=true;}
    secondAbilityModal.classList.add("hidden");
    secondAbilityDraftBusy=false;
    secondAbilityDraftIndex=null;
    secondAbilityDraftChoices=[];
    secondAbilityDraftSlot=2;

    addLog(`✨ ${p.name} wählt als ${slot===3?"3.":"2."} Fähigkeit: ${ABILITIES[id].name}.`);

    if(id===23 && index===current && (phase.startsWith("attack") || phase==="counterattack")){
      activateBloodRushMidAttackIfEligible(index);
    }

    renderAll();

    if(secondAbilityDraftQueue.length){
      const nextDraft=secondAbilityDraftQueue.shift();
      setTimeout(()=>openSecondAbilityDraft(nextDraft),120);
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
      after=1;
      p.lastStandUsed=true;
      p.roundLastStandTriggered=true;
      lastStand=true;
      markCampaignAbilityUse(index,14);
      addLog(`🛡️ LAST STAND: ${p.name} überlebt tödlichen Schaden mit 1 HP!`);
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

  function markEliminated(index){
    if(index==null || roundEliminationOrder.includes(index)) return;
    roundEliminationOrder.push(index);
    if(lastPlaceIndex==null) lastPlaceIndex=index;
    queueEventPopup(`${players[index].name} Died!`,"death");
  }


  function beginAttackWithFace(face,total,source="normal"){
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
    if(campaignMode && players[current]?.campaignTeam==="hero"){
      const key=String(current),targetKey=String(attackTarget);
      campaignMetrics.heroAttacks[key]=(campaignMetrics.heroAttacks[key]||0)+1;
      if(!campaignMetrics.attackTargetsByHero[key]) campaignMetrics.attackTargetsByHero[key]={};
      campaignMetrics.attackTargetsByHero[key][targetKey]=(campaignMetrics.attackTargetsByHero[key][targetKey]||0)+1;
      campaignMetrics.attackSequence.push({hero:key,target:targetKey,name:players[attackTarget]?.name||""});
    }

    attackHits=0;attackDamage=0;firstAttackRoll=true;currentAttackRollNewHits=0;
    precisionUses=0;bloodPriceNeighbors=[];momentumBonus=0;
    highStakesDecisionThisAttack=false;doubleTapApplied=false;
    players[current].botBloodUsesThisAttack=0;
    activateBloodRushForMainAttack();
    wildcardFace=hasAbility(17)?rollTrackedD6(current):null;
    if(hasAbility(10)){players[current].momentumStreak=(players[current].momentumStreak||0)+1;momentumBonus=Math.min(Math.max(players[current].momentumStreak-1,0),2);}
    dice=freshDice();phase="attack_ready";

    let extra="";
    if(attackFace===1&&hasAbility(1)) extra+=" Brutale Einsen aktiv: 1er UND 2er treffen, beide machen 3 Grundschaden.";
    if(source==="advance") extra+=` Fähigkeit 5 aktiv: ${total} entspricht Angriff auf ${attackFace}er.`;
    if(source==="gambling") extra+=` 🎰 Gambling Man: D6 = ${attackFace}.`;
    if(hasAbility(9)&&players[current].hp<=10) extra+=` Rache aktiv: +2 Schaden pro Treffer.`;
    if(hasAbility(10)) extra+=` Momentum-Serie ${players[current].momentumStreak}: +${momentumBonus} Schaden pro Treffer.`;
    if(bloodRushActiveThisAttack) extra+=` Blood Rush: +1 Schaden pro Treffer.`;
    if(hasAbility(25)&&isUniqueUnderdog(current)) extra+=` Underdog: +1 Schaden pro Treffer.`;
    if(wildcardFace!=null){extra+=wildcardFace===attackFace?` 🃏 Wildcard = ${wildcardFace} (identisch mit Zielzahl – kein Extra).`:` 🃏 Wildcard = ${wildcardFace}: im ersten Angriffswurf zählen ${attackFace}er und ${wildcardFace}er.`;}
    addLog(`↳ Angriff auf ${players[attackTarget].name}: Ziel sind ${attackFace}er.${extra}`);
    renderAll();tutorialExplainAttackStart(total,attackFace);
  }

  function openGamblingMan(total){
    gamblingBaseTotal=total;
    gamblingRolling=false;
    phase="gamble_attack";

    const designKey=players[current]?.diceDesign||"classic";
    gamblingDie.className=`gambling-die ${DICE_DESIGNS[designKey]?.className||"theme-classic"}`;
    gamblingDie.textContent="?";
    gamblingResult.textContent="Tippe den D6";
    gamblingDie.disabled=false;
    gamblingModal.classList.remove("hidden");

    addLog(`🎰 Gambling Man: ${players[current].name} hat ${total} gewürfelt und muss die Angriffszahl ausgamblen.`);
    renderAll();
  }

  function rollGamblingMan(){
    if(gamblingRolling || phase!=="gamble_attack") return;
    gamblingRolling=true;
    gamblingDie.disabled=true;
    gamblingDie.classList.add("rolling");
    gamblingResult.textContent="...";

    let ticks=0;
    const timer=setInterval(()=>{
      gamblingDie.textContent=dieSymbol(randDie());
      ticks++;
      if(ticks>=8) clearInterval(timer);
    },60);

    setTimeout(()=>{
      clearInterval(timer);
      const result=rollTrackedD6(current);
      gamblingDie.classList.remove("rolling");
      gamblingDie.textContent=dieSymbol(result);
      gamblingResult.textContent=`D6 = ${result} → Angriff auf ${result}er`;
      addLog(`🎰 Gambling Man würfelt ${result}: Angriff auf ${result}er.`);

      setTimeout(()=>{
        gamblingModal.classList.add("hidden");
        gamblingRolling=false;
        const total=gamblingBaseTotal;
        gamblingBaseTotal=null;
        beginAttackWithFace(result,total,"gambling");
      },650);
    },560);
  }


  function openPerfect25(total){
    markCampaignAbilityUse(current,15);
    phase="perfect25";
    perfect25BaseTotal=total;
    perfect25Rolling=false;
    const designKey=players[current]?.diceDesign||"classic";
    perfect25Die.className=`special-big-die ${DICE_DESIGNS[designKey]?.className||"theme-classic"}`;
    perfect25Die.textContent="?";
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
    if(perfect25Rolling || phase!=="perfect25") return;
    perfect25Rolling=true;
    perfect25Die.disabled=true;
    perfect25Die.classList.add("rolling");
    perfect25Result.textContent="...";

    let ticks=0;
    const timer=setInterval(()=>{
      perfect25Die.textContent=dieSymbol(randDie());
      if(++ticks>=8) clearInterval(timer);
    },60);

    setTimeout(()=>{
      clearInterval(timer);
      const result=rollTrackedD6(current);
      perfect25Die.classList.remove("rolling");
      perfect25Die.textContent=dieSymbol(result);

      if(result>=4){
        markCampaignAbilitySuccess(current,15);
        perfect25Result.textContent=`D6 = ${result} → Angriff erlaubt!`;
        addLog(`✨ Perfect 25 würfelt ${result}: Angriff erlaubt. Jetzt entscheidet der D4 die Angriffszahl.`);
        setTimeout(()=>{
          perfect25Modal.classList.add("hidden");
          perfect25Rolling=false;
          openPerfect25D4();
        },520);
      }else{
        perfect25Result.textContent=`D6 = ${result} → kein Angriff`;
        addLog(`✨ Perfect 25 würfelt ${result}: kein Angriff.`);
        if(hasAbility(10)) players[current].momentumStreak=0;
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
    perfect25D4Die.textContent="?";
    perfect25D4Die.disabled=false;
    perfect25D4Result.textContent="D4 würfeln";
    perfect25D4Modal.classList.remove("hidden");
    renderAll();
  }

  function rollPerfect25D4(){
    if(perfect25D4Rolling || phase!=="perfect25_d4") return;
    perfect25D4Rolling=true;
    perfect25D4Die.disabled=true;
    perfect25D4Die.classList.add("rolling");
    perfect25D4Result.textContent="...";

    let ticks=0;
    const timer=setInterval(()=>{
      perfect25D4Die.textContent=String(randD4());
      if(++ticks>=8) clearInterval(timer);
    },60);

    setTimeout(()=>{
      clearInterval(timer);
      const result=randD4();
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
    highStakesRolling=false;
    highStakesDecisionThisAttack=true;
    const base=totalAttackDamage();
    const designKey=players[current]?.diceDesign||"classic";
    highStakesDie.className=`special-big-die ${DICE_DESIGNS[designKey]?.className||"theme-classic"}`;
    highStakesDie.textContent="?";
    highStakesDie.disabled=false;
    highStakesSkip.disabled=false;
    highStakesResult.textContent="1–3: −50 % · 4–6: +50 %";
    highStakesSub.textContent=`Aktueller Schaden: ${base}. Du kannst ihn sicher nehmen oder jetzt gamblen.`;
    highStakesModal.classList.remove("hidden");
    scheduleBotAction(120);
  }

  function skipHighStakes(){
    if(highStakesRolling) return;
    highStakesModal.classList.add("hidden");
    finalizeAttackDamage();
  }

  function rollHighStakes(){
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
      highStakesDie.textContent=dieSymbol(randDie());
      if(++ticks>=8) clearInterval(timer);
    },60);

    setTimeout(()=>{
      clearInterval(timer);
      const result=rollTrackedD6(current);
      highStakesDie.classList.remove("rolling");
      highStakesDie.textContent=dieSymbol(result);

      if(result<=3){
        attackDamage=Math.floor(before*0.5);
        highStakesResult.textContent=`D6 = ${result} → ${before} → ${attackDamage} Schaden`;
        addLog(`🎲 High Stakes: ${result}. Angriffsschaden halbiert: ${before} → ${attackDamage}.`);
      }else{
        attackDamage=Math.floor(before*1.5);
        markCampaignAbilitySuccess(current,13);
        if(roundStats[current]){
          roundStats[current].highStakesWins++;
          if(roundStats[current].highStakesWins>=3) unlockAchievementForPlayer(current,"degenerate_gambler");
        }
        highStakesResult.textContent=`D6 = ${result} → ${before} → ${attackDamage} Schaden`;
        addLog(`🎲 High Stakes: ${result}. Angriffsschaden +50 %: ${before} → ${attackDamage}.`);
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
    insuranceDie.textContent="?";
    insuranceDie.disabled=false;
    insuranceResult.textContent="5–6 = Eigenschaden halbiert";
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
    if(result.lost>0) pendingDamage={target:current,amount:result.lost};

    if(insuranceRoll!=null){
      addLog(`🛡️ Insurance D6 = ${insuranceRoll}: ${players[current].name} verliert ${result.lost} Leben.`);
    }else{
      addLog(`↳ ${players[current].name} verliert ${result.lost} Leben.`);
    }

    if(players[current].hp<=0){
      markEliminated(current);
      addLog(`💀 ${players[current].name} ist ausgeschieden.`);
      finishBaseTurn(950);
      return;
    }

    if(afterMode==="perfect25"){
      queuePerfect25(total);
    }else{
      finishBaseTurn(result.lost>0?950:320);
    }
  }

  function rollInsurance(){
    if(insuranceRolling || phase!=="insurance" || !insuranceContext) return;
    insuranceRolling=true;
    insuranceDie.disabled=true;
    insuranceDie.classList.add("rolling");
    insuranceResult.textContent="...";

    let ticks=0;
    const timer=setInterval(()=>{
      insuranceDie.textContent=dieSymbol(randDie());
      if(++ticks>=8) clearInterval(timer);
    },60);

    setTimeout(()=>{
      clearInterval(timer);
      const roll=rollTrackedD6(current);
      const ctx=insuranceContext;
      const reduced=roll>=5;
      const finalDamage=reduced ? Math.floor(ctx.rawDamage/2) : ctx.rawDamage;

      insuranceDie.classList.remove("rolling");
      insuranceDie.textContent=dieSymbol(roll);
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

  function resolveBase(){
    const total=currentSum();
    if(campaignMode && players[current]?.campaignTeam==="hero" && total>25) campaignMetrics.baseOver25=true;
    addLog(`${players[current].name}: Basiswurf = ${total}.`);
    tutorialExplainBaseResult(total);
    const hasAdvance=hasAbility(5);
    const attackThreshold=hasAdvance?25:26;

    if(total<25){
      if(hasAbility(10)) players[current].momentumStreak=0;
      momentumBonus=0;
      const dmg=25-total;
      resolveBaseSelfDamage(total,dmg,"finish");
      return;
    }

    if(total===25 && !hasAdvance && hasAbility(15)){
      queuePerfect25(total);
      return;
    }

    if(total<attackThreshold){
      if(hasAbility(10)) players[current].momentumStreak=0;
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

    const normalFace=hasAdvance?total-24:total-25;
    beginAttackWithFace(normalFace,total,hasAdvance?"advance":"normal");
  }

  function useBloodPrice(){
    if(!hasAbility(11) || isAnimating || bloodPriceNeighbors.length) return;
    if(phase!=="attack_ready" && phase!=="attack_continue") return;
    if(players[current].hp<=encounterVoluntaryCost(3)) return;

    const neighbors=[];
    if(attackFace>1) neighbors.push(attackFace-1);
    if(attackFace<6) neighbors.push(attackFace+1);
    if(!neighbors.length) return;

    const bloodCost=encounterVoluntaryCost(3);
    const damageResult=applyDamageToPlayer(current,bloodCost,"voluntary");
    markCampaignAbilityUse(current,11);
    players[current].voluntaryHpPaidThisTurn=true;
    recordSelfDamage(current,damageResult.lost);
    recordVoluntaryHp(current,damageResult.lost);
    bloodPriceNeighbors=neighbors;
    pendingDamage={target:current,amount:damageResult.lost};

    // Blood Rush darf durch Blutpreis auch mitten im laufenden Angriff zünden.
    activateBloodRushMidAttackIfEligible(current);

    addLog(`🩸 ${players[current].name} zahlt ${damageResult.lost} HP für Blutpreis: ${[attackFace,...neighbors].sort((a,b)=>a-b).join(", ")} treffen im nächsten Angriffswurf.`);
    renderAll();
  }

  function rollAttack(){
    if(isAnimating) return;
    const indices=[];
    dice.forEach((d,i)=>{if(!d.locked)indices.push(i);});
    const bloodNeighborsForRoll=[...bloodPriceNeighbors];

    animateIndices(indices,()=>{
      currentAttackRollNewHits=0;
      let bloodHits=0;

      indices.forEach(i=>{
        const isNormal=isNormalAttackHitValue(dice[i].value);
        const isBlood=bloodNeighborsForRoll.includes(dice[i].value);
        const isWildcard=firstAttackRoll && wildcardFace!=null && dice[i].value===wildcardFace;
        if(isNormal || isBlood || isWildcard){
          dice[i].locked=true;
          attackHits++;
          currentAttackRollNewHits++;
          // Wildcard macht absichtlich den normalen Schaden der eigentlichen Zielzahl.
          attackDamage+=damagePerAttackHit();
          if(isBlood&&!isNormal&&!isWildcard) bloodHits++;
        }
      });

      bloodPriceNeighbors=[];

      const bloodText=bloodHits>0 ? ` Davon ${bloodHits} Blutpreis-Treffer.` : "";
      addLog(`↳ Angriffswurf: ${currentAttackRollNewHits} neuer Treffer. Gesamt: ${attackHits} Treffer = ${totalAttackDamage()} Schaden.${bloodText}`);
      phase="attack_after_roll";
      renderAll();
      tutorialExplainAttackRoll();
    });
  }

  function useAttackPower(){
    if(!hasAbility(4)||attackPowerUsed||phase!=="attack_after_roll"||isAnimating) return;
    const indices=[];
    dice.forEach((d,i)=>{if(!d.locked)indices.push(i);});
    if(!indices.length) return;

    attackPowerUsed=true;
    markCampaignAbilityUse(current,4);
    addLog(`⚡ ${players[current].name} nutzt Zweite Chance: alle Nicht-Treffer werden neu gewürfelt.`);
    animateIndices(indices,()=>{
      let bonusHits=0;
      indices.forEach(i=>{
        const isNormal=isNormalAttackHitValue(dice[i].value);
        const isWildcard=firstAttackRoll && wildcardFace!=null && dice[i].value===wildcardFace;
        if(isNormal || isWildcard){
          dice[i].locked=true;attackHits++;bonusHits++;
          attackDamage+=damagePerAttackHit();
        }
      });
      currentAttackRollNewHits+=bonusHits;
      addLog(`↳ Zweite Chance: ${bonusHits} zusätzlicher Treffer. Gesamt: ${attackHits} Treffer = ${totalAttackDamage()} Schaden.`);
      phase="attack_after_roll";renderAll();
    });
  }

  function resolveCurrentAttackRoll(){
    if(isAnimating||phase!=="attack_after_roll") return;

    if(currentAttackRollNewHits===0){
      // Präzision ist die LETZTE Rettung eines Angriffswurfs:
      // Erst normal würfeln, ggf. Zweite Chance benutzen, und erst wenn der
      // endgültige Wurf immer noch 0 Treffer hat, darf ein Nachbarwürfel treffen.
      if(hasAbility(8) && precisionUses<2){
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
          wildcardFace=null;

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

      wildcardFace=null;
      if(firstAttackRoll) addLog(`↳ Angriff fehlgeschlagen: kein ${attackFace}er.`);
      else addLog(`↳ Kein neuer Treffer. Angriff endet mit ${attackHits} Treffern = ${totalAttackDamage()} Schaden.`);

      if(attackHits>0) dealAttackDamage();
      else endTurn();
      return;
    }

    firstAttackRoll=false;
    wildcardFace=null;
    if(dice.every(d=>d.locked)){
      addLog(`🔥 Alle 5 Würfel sind Treffer. Gesamtschaden: ${totalAttackDamage()}.`);
      dealAttackDamage();
      return;
    }
    phase="attack_continue";renderAll();
  }

  function dealAttackDamage(){
    if(attackHits===5) unlockAchievementForPlayer(current,"grande");

    if(hasAbility(24) && attackHits===2 && !doubleTapApplied){
      doubleTapApplied=true;
      markCampaignAbilitySuccess(current,24);
      attackDamage+=4;
      addLog(`🔫 Double Tap: exakt 2 Treffer → +4 Gesamtschaden. Neuer Schaden: ${attackDamage}.`);
    }

    if(hasAbility(13) && !highStakesDecisionThisAttack && totalAttackDamage()>0){
      openHighStakes();
      return;
    }
    finalizeAttackDamage();
  }



  function counterattackDamagePerHit(index){
    let dmg=hasAbility(1,index) ? 3 : 1;
    if(hasAbility(9,index) && players[index].hp<=10) dmg+=2;
    if(hasAbility(10,index)){
      const streak=players[index].momentumStreak||0;
      dmg+=Math.min(Math.max(streak-1,0),2);
    }
    if(counterContext?.bloodRushActive && hasAbility(23,index)) dmg+=1;
    if(hasAbility(25,index) && isUniqueUnderdog(index)) dmg+=1;
    return dmg;
  }

  function queueCounterattack(defenderIndex,attackerIndex){
    pendingCounterattack={defenderIndex,attackerIndex};

    if(secondAbilityDraftBusy){
      return;
    }

    const ctx=pendingCounterattack;
    pendingCounterattack=null;
    openCounterattack(ctx.defenderIndex,ctx.attackerIndex);
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
      render3DDieNode(el,d.value);
    });
  }

  function openCounterattack(defenderIndex,attackerIndex){
    const defender=players[defenderIndex];
    const attacker=players[attackerIndex];

    if(!defender || !attacker || defender.hp<=0 || attacker.hp<=0 || !hasAbility(21,defenderIndex)){
      finishAttackAfterCounter();
      return;
    }

    counterContext={
      defenderIndex,
      attackerIndex,
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

    if(counterHits===5) unlockAchievementForPlayer(defenderIndex,"grande");

    const perHit=counterattackDamagePerHit(defenderIndex);
    const baseCounterDamage=counterHits*perHit;
    let rawCounterDamage=baseCounterDamage;
    let counterDoubleTapBonus=0;

    if(hasAbility(24,defenderIndex) && counterHits===2){
      counterDoubleTapBonus=4;
      rawCounterDamage+=counterDoubleTapBonus;
      addLog(`🔫 Double Tap im Counterattack: exakt 2 Treffer → +4 Schaden.`);
    }

    let actualDamage=0;

    if(rawCounterDamage>0 && attacker?.hp>0){
      const attackerHpBefore=attacker.hp;
      if(rawCounterDamage>=attackerHpBefore+10) unlockAchievementForPlayer(defenderIndex,"overkill");
      recordCampaignAttackResult(defenderIndex,counterHits);
      const result=applyDamageToPlayer(attackerIndex,rawCounterDamage,"opponent");
      checkBossPhase(attackerIndex,attackerHpBefore,attacker.hp);
      actualDamage=result.lost;
      recordDamageDealt(defenderIndex,actualDamage,false);
      if(actualDamage>0) pendingExtraDamageFx.push({target:attackerIndex,amount:actualDamage});

      const counterFormula=counterDoubleTapBonus
        ? `${counterHits} Treffer × ${perHit} + ${counterDoubleTapBonus} Double Tap`
        : `${counterHits} Treffer × ${perHit}`;
      addLog(`⚔️ Counterattack endet: ${counterFormula} = ${actualDamage} Schaden an ${attacker.name}.`);

      if(hasAbility(2,defenderIndex) && actualDamage>0){
        const heal=encounterHealAmount(defenderIndex,Math.floor(actualDamage/2));
        const actualHeal=applyHealingToPlayer(defenderIndex,heal);
        recordHealing(defenderIndex,actualHeal);
        if(actualHeal>0){
          pendingExtraHealFx.push({target:defenderIndex,amount:actualHeal});
          addLog(`🩸 Counter-Lifesteal: ${defender.name} heilt ${actualHeal} Leben${defender.hp>maxHpForPlayer(defender)?` · ${defender.hp}/${maxHpForPlayer(defender)} HP`:""}.`);
        }
      }

      if(attacker.hp<=0){
        if(roundStats[defenderIndex]) roundStats[defenderIndex].kills++;
        if(counterDoubleTapBonus>0) unlockAchievementForPlayer(defenderIndex,"double_trouble");
        recordCampaignKill(defenderIndex,attackerIndex);
        markEliminated(attackerIndex);
        addLog(`💀 ${attacker.name} ist durch Counterattack ausgeschieden.`);
      }
    }else{
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

      if(secondAbilityDraftBusy){
        deferredAttackFinish=true;
        return;
      }
      finishAttackAfterCounter();
    },650);
  }

  function rollCounterattack(){
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

    let ticks=0;
    const timer=setInterval(()=>{
      rollIndices.forEach(i=>counterDiceState[i].value=randDieForPlayer(defenderIndex));
      renderCounterDice();
      if(++ticks>=7) clearInterval(timer);
    },55);

    setTimeout(()=>{
      clearInterval(timer);

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
    let rawDamage=totalAttackDamage();
    recordCampaignAttackResult(current,attackHits);
    const aliveSnapshot=players.map((p,i)=>p.hp>0?i:null).filter(i=>i!=null);
    const target=players[attackTarget];
    const targetHpBefore=target?.hp||0;
    if(campaignMode&&players[current]?.campaignTeam==="hero"&&rawDamage>0&&encounterRuleActive("first_strike")&&!encounterRuntime.firstStrikeUsed.has(String(current))){rawDamage+=2;encounterRuntime.firstStrikeUsed.add(String(current));addLog(`⚡ First Strike: +2 Rohschaden.`);}
    if(campaignMode&&players[current]?.campaignTeam==="hero"&&rawDamage>0&&encounterRuleActive("overcharge")){rawDamage+=2;addLog(`⚡ Overcharge: +2 Rohschaden.`);}
    if(campaignMode&&players[current]?.campaignTeam==="hero"&&rawDamage>0&&encounterRuleActive("armor_shell")&&!encounterRuntime.armorUsed.has(String(attackTarget))){rawDamage=Math.max(0,rawDamage-2);encounterRuntime.armorUsed.add(String(attackTarget));addLog(`🛡 Armor Shell: der erste Angriff auf ${target.name} verliert 2 Rohschaden.`);}
    if(rawDamage>=targetHpBefore+10) unlockAchievementForPlayer(current,"overkill");

    recordCampaignRawDamage(current,rawDamage);
    const mainResult=applyDamageToPlayer(attackTarget,rawDamage,"opponent");
    checkBossPhase(attackTarget,targetHpBefore,target.hp);
    const actualDamage=mainResult.lost;
    recordDamageDealt(current,actualDamage,true);
    pendingDamage={target:attackTarget,amount:actualDamage};

    addLog(`⚔️ ${target.name} verliert ${actualDamage} Leben${rawDamage>actualDamage?` (${rawDamage} Schaden wären möglich gewesen).`:"."}`);

    if(target.hp<=0){
      if(roundStats[current]) roundStats[current].kills++;
      if(doubleTapApplied) unlockAchievementForPlayer(current,"double_trouble");
      recordCampaignKill(current,attackTarget);
      markEliminated(attackTarget);
      addLog(`💀 ${target.name} ist ausgeschieden.`);
    }

    // Ricochet: JEDER tatsächlich gesammelte Würfeltreffer = 1 Splash-Schaden.
    // Kein Mindestwert an Treffern. Nur im echten Multiplayer mit mindestens 3 Lebenden.
    // Ziel ist der nächste andere Spieler NACH dem Hauptziel im Uhrzeigersinn.
    let ricochetActual=0;
    if(hasAbility(16) && attackHits>0 && aliveSnapshot.length>=3){
      const ricochetTarget=nextRicochetTarget(attackTarget,aliveSnapshot);
      if(ricochetTarget!==-1){
        const ricochetDamage=attackHits;
        recordCampaignRawDamage(current,ricochetDamage,ricochetTarget);
        const ricBefore=players[ricochetTarget]?.hp||0;
        const ricResult=applyDamageToPlayer(ricochetTarget,ricochetDamage,"opponent");
        checkBossPhase(ricochetTarget,ricBefore,players[ricochetTarget]?.hp||0);
        ricochetActual=ricResult.lost;
        recordDamageDealt(current,ricochetActual,true);
        if(ricochetActual>0) pendingExtraDamageFx.push({target:ricochetTarget,amount:ricochetActual});
        addLog(`🪃 Ricochet: ${attackHits} Würfeltreffer → ${players[ricochetTarget].name} erhält ${ricochetActual} Schaden.`);
        if(players[ricochetTarget].hp<=0){
          if(roundStats[current]) roundStats[current].kills++;
          recordCampaignKill(current,ricochetTarget);
          markEliminated(ricochetTarget);
          addLog(`💀 ${players[ricochetTarget].name} ist ausgeschieden.`);
        }
      }
    }

    if(hasAbility(2) && (actualDamage+ricochetActual)>0){
      const heal=encounterHealAmount(current,Math.floor((actualDamage+ricochetActual)/2));
      const actualHeal=applyHealingToPlayer(current,heal);
      recordHealing(current,actualHeal);
      if(actualHeal>0) pendingHeal={target:current,amount:actualHeal};
      const p=players[current];
      const over=p.hp>maxHpForPlayer(p)?` · jetzt ${p.hp}/${maxHpForPlayer(p)} HP`:"";
      addLog(`🩸 Lifesteal: ${p.name} heilt ${actualHeal} Leben${over}.`);
    }

    if(campaignMode&&players[current]?.campaignTeam==="hero"&&rawDamage>0&&encounterRuleActive("overcharge")&&players[current].hp>1){const result=applyDamageToPlayer(current,1,"self");const lost=result.lost;if(lost>0){recordSelfDamage(current,lost);players[current].damageSinceLastOwnTurn=true;pendingExtraDamageFx.push({target:current,amount:lost});addLog(`⚡ Overcharge-Rückstoß: ${players[current].name} verliert ${lost} HP.`);}}

    // Counterattack prüft den rohen Hauptangriffsschaden, damit auch Last Stand + Counterattack funktioniert.
    // Ricochet-Schaden zählt NICHT als Auslöser.
    const counterEligible=rawDamage>=5 && target.hp>0 && players[current].hp>0 && hasAbility(21,attackTarget);

    if(counterEligible){
      queueCounterattack(attackTarget,current);
      return;
    }

    if(secondAbilityDraftBusy){
      deferredAttackFinish=true;
      return;
    }
    finishAttackAfterCounter();
  }

  function finishBaseTurn(delay=500){
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
    if(checkWinner()){
      renderPlayers();flushPendingFx();return;
    }
    phase="turn_done";
    dice.forEach(d=>d.selected=false);
    renderAll();
  }

  function advanceTurn(){
    clearBotAutomation();
    const n=nextAlive(current);
    if(n===-1){checkWinner();return;}
    current=n;
    if(campaignMode && players[current]?.campaignTeam==="hero"){campaignMetrics.currentRawTurnDamage=0;campaignMetrics.currentRawTurnDamageByHero[String(current)]=0;}
    prepareBloodRushForTurn(current);
    applyEncounterTurnStartRule(current);
    if(turnDamageThisTurn[current]!=null) turnDamageThisTurn[current]=0;
    if(roundStats[current]) roundStats[current].snakeEyesUsesThisTurn=0;
    dice=freshDice();phase="idle";
    attackFace=null;attackTarget=null;pendingCampaignAttackStart=null;attackHits=0;attackDamage=0;firstAttackRoll=true;currentAttackRollNewHits=0;
    baseRerollUsed=false;loadedDiceUsed=false;lastBaseRollIndices=[];attackPowerUsed=false;precisionUses=0;momentumBonus=0;bloodPriceNeighbors=[];bloodRushActiveThisAttack=false;doubleTapApplied=false;
    highStakesDecisionThisAttack=false;wildcardFace=null;
    gamblingRolling=false;gamblingBaseTotal=null;gamblingModal.classList.add("hidden");highStakesRolling=false;highStakesDecisionThisAttack=false;highStakesModal.classList.add("hidden");perfect25Rolling=false;perfect25D4Rolling=false;perfect25BaseTotal=null;pendingPerfect25Total=null;perfect25Modal.classList.add("hidden");perfect25D4Modal.classList.add("hidden");insuranceRolling=false;insuranceContext=null;insuranceModal.classList.add("hidden");counterRolling=false;counterContext=null;counterDiceState=[];counterHits=0;counterFirstRoll=true;pendingCounterattack=null;deferredAttackFinish=false;counterModal.classList.add("hidden");wildcardFace=null;secondAbilityDraftQueue=[];
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
            <div class="round-score-name">${escapeHtml(p.name)}${p.battleTag?` <span class="battle-tag">${escapeHtml(p.battleTag)}</span>`:""}</div>
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
      winnerText.innerHTML=`🏆 ${escapeHtml(winner.name)}${winner.battleTag?` <span class="battle-tag">${escapeHtml(winner.battleTag)}</span>`:""} gewinnt Runde ${roundNumber}!`;
      roundResultText.innerHTML=`Siegstand: <strong>${winner.wins}</strong> für ${escapeHtml(winner.name)}.<br>`+
        `<span class="last-place-note">${escapeHtml(loserName)}</span> wurde Letzter, startet Runde ${roundNumber+1} und darf die nächste Fähigkeit frei wählen.`;

      roundStandings.innerHTML=players.map((p,i)=>{
        const flags=[
          i===winnerIndex ? "🏆 Rundensieger" : "",
          i===lastPlaceIndex ? "🏁 Letzter" : ""
        ].filter(Boolean).join(" · ");
        const cls=`round-score-row${i===winnerIndex?" winner-row":""}${i===lastPlaceIndex?" last-row":""}`;
        return `<div class="${cls}">
          <div class="round-score-name">${escapeHtml(p.name)}${p.battleTag?` <span class="battle-tag">${escapeHtml(p.battleTag)}</span>`:""}</div>
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

