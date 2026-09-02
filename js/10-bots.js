  function randDieForPlayer(index){
    // Fähigkeit 7 (BETA): +6 Prozentpunkte auf die 6.
    // Funktioniert auch für Würfe außerhalb des aktiven Spielers, z.B. Counterattack.
    if(hasAbility(7,index)){
      const sixChance=(1/6)+0.06+(hasMasteryUpgrade(7,1,index)?0.01:0)+(hasMasteryUpgrade(7,2,index)?0.01:0);
      const r=Math.random();
      if(r<sixChance) return 6;
      const normalized=(r-sixChance)/(1-sixChance);
      return Math.min(5,Math.floor(normalized*5)+1);
    }
    return Math.floor(Math.random()*6)+1;
  }

  function randDie(){
    return randDieForPlayer(current);
  }

  function freshDice(){
    return Array.from({length:DICE_COUNT},()=>({value:null,locked:false,selected:false,rolling:false}));
  }
  function escapeHtml(s){
    return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }

  function defaultSeatFor(i,n){
    return 0;
  }


  function isBotPlayer(index){
    return !!players[index] && players[index].botLevel && players[index].botLevel!=="human";
  }

  function setupBotLevel(index){
    return $("botChoice"+index)?.value || "human";
  }

  function botLevelLabel(level){
    return BOT_LEVELS[level]?.name || "Mensch";
  }

  function botAbilitySynergyScore(id,owned=[]){
    let score=BOT_ABILITY_RATING[id]||6;
    const set=new Set(owned);

    if(id===23 && (set.has(11)||set.has(18))) score+=2.2; // Blood Rush + HP payment
    if((id===11||id===18) && set.has(23)) score+=2.2;

    if(id===10 && (set.has(18)||set.has(3)||set.has(5))) score+=1.4; // Momentum consistency
    if((id===18||id===3||id===5) && set.has(10)) score+=1.4;

    if(id===22 && set.has(7)) score+=2.8; // 12 + Glück
    if(id===7 && set.has(22)) score+=2.8;

    if(id===21 && set.has(1)) score+=1.5; // Counterattack + Brutale Einsen
    if(id===1 && set.has(21)) score+=1.5;

    if(id===2 && (set.has(9)||set.has(10)||set.has(11)||set.has(23))) score+=0.8;
    if(id===9 && set.has(10)) score+=1.0;
    if(id===10 && set.has(9)) score+=1.0;
    if(id===14 && set.has(9)) score+=0.7;
    if(id===24 && (set.has(9)||set.has(10)||set.has(23)||set.has(25))) score+=0.6;

    return score;
  }

  function botPickAbility(options,level="normal",owned=[]){
    if(!options?.length) return 1;

    const noise =
      level==="easy" ? 0.90 :
      level==="normal" ? 0.22 :
      0.035;

    const scored=options.map(id=>({
      id,
      score:botAbilitySynergyScore(id,owned)+(Math.random()*noise)
    })).sort((a,b)=>b.score-a.score);

    // Leicht ist absichtlich nicht perfekt, aber nie mehr komplett zufällig:
    // Aus den drei besten Optionen wird gelegentlich nicht Platz 1 genommen.
    if(level==="easy" && scored.length>1){
      const r=Math.random();
      if(r<0.18) return scored[Math.min(1,scored.length-1)].id;
      if(r<0.23) return scored[Math.min(2,scored.length-1)].id;
    }

    return scored[0].id;
  }

  function syncSetupBotChoice(index){
    const level=setupBotLevel(index);
    const profileChoice=$("profileChoice"+index);
    const diceReadout=$("diceReadout"+index);

    if(profileChoice){
      profileChoice.disabled=level!=="human";
      profileChoice.classList.toggle("hidden",level!=="human");
    }

    if(diceReadout){
      if(level==="human"){
        const profile=getProfile(profileChoice?.value);
        diceReadout.textContent=profile?`🎲 ${DICE_DESIGNS[profile.selectedDice]?.name||"Classic"}`:"🎲 Profil wählen";
      }else{
        diceReadout.textContent="🎲 Classic";
      }
    }

    const choice=$("abilityChoice"+index);
    if(choice && setupAbilityRolls[index]===6){
      if(level!=="human"){
        choice.value=botPickAbility(CHOOSABLE_ABILITY_IDS,level,[]);
        choice.disabled=true;
      }else{
        choice.disabled=false;
      }
    }
    updateStartAvailability();
  }

  function clearBotAutomation(){
    botSequence++;
    if(botTimer){
      clearTimeout(botTimer);
      botTimer=null;
    }
    document.body.classList.remove("bot-acting");
  }

  function botActionOwner(){
    if(game.classList.contains("hidden") || !winnerBox.classList.contains("hidden") || !nextRoundBox.classList.contains("hidden")){
      return -1;
    }

    if(secondAbilityDraftBusy){
      return isBotPlayer(secondAbilityDraftIndex) ? secondAbilityDraftIndex : -1;
    }

    // V26.1.2 Safety: Ein vorgemerkter Counterattack wartet nach einem
    // Fähigkeitsdraft auf seine Auflösung. Der aktive Bot darf in diesem
    // Zwischenzustand niemals den alten Angriff weiterführen.
    if(pendingCounterattack) return -1;

    if(phase==="counterattack" && counterContext){
      return isBotPlayer(counterContext.defenderIndex) ? counterContext.defenderIndex : -1;
    }

    return isBotPlayer(current) ? current : -1;
  }

  function scheduleBotAction(extraDelay=0){
    if(botTimer || isAnimating || eventPopupBusy || tutorialOpen || !quitModal.classList.contains("hidden")) return;
    const owner=botActionOwner();
    if(owner===-1){
      document.body.classList.remove("bot-acting");
      return;
    }

    const level=players[owner]?.botLevel || "normal";
    document.body.classList.add("bot-acting");
    const token=botSequence;
    botTimer=setTimeout(()=>{
      botTimer=null;
      if(token!==botSequence) return;
      performBotAction();
    },Math.max(90,((BOT_DELAY[level]||620)*BOT_SPEED_MULTIPLIER[botSpeedMode])+extraDelay));
  }

  function botBaseFinalUtility(index,total){
    const p=players[index];
    const profile=ENEMY_AI_PROFILES[p?.aiProfile]||ENEMY_AI_PROFILES.standard;
    const targetIndex=nextAttackTarget(index);
    const targetHp=targetIndex>=0 ? players[targetIndex].hp : 25;

    // Unter 25: echter Eigenschaden. Hard bewertet jeden verlorenen HP deutlich negativ.
    if(total<25) return -(25-total)*(3.4-(profile.risk*.45));

    // Angriffsvorsprung macht bereits 25 zu einem echten Angriff.
    if(total===25){
      if(hasAbility(5,index)) return 17;
      if(hasAbility(15,index)) return 7.5; // Perfect 25: 50% Chance auf D4-Angriff
      return 1.5; // sicher, aber kein Angriff
    }

    // Gambling Man: jede Summe >25 löst denselben zufälligen Angriff aus.
    if(hasAbility(12,index)){
      return 24;
    }

    const face=hasAbility(5,index) ? total-24 : total-25;
    if(face<1 || face>6) return 0;

    let perHitBonus=0;
    if(hasAbility(9,index) && p.hp<=10) perHitBonus+=2;
    if(hasAbility(10,index)){
      const streak=p.momentumStreak||0;
      perHitBonus+=Math.min(Math.max(streak-1,0),2);
    }
    if(hasAbility(23,index) && (p.bloodRushPrimed||p.voluntaryHpPaidThisTurn)) perHitBonus+=1;
    if(hasAbility(25,index) && isUniqueUnderdog(index)) perHitBonus+=1;

    const expectedFirstRollDamage=(5/6)*(face+perHitBonus);
    const killPressure=expectedFirstRollDamage>=targetHp ? 4.5 : 0;

    // Angriff auslösen ist bereits viel wert; höhere Zielzahlen werden danach belohnt.
    return 18 + face*(4.2+profile.risk*.25) + perHitBonus*2.2 + killPressure;
  }

  function botDieProb(index,value){
    if(hasAbility(7,index)){
      if(value===6) return 0.2266666667;
      return 0.15466666666;
    }
    return 1/6;
  }

  function botPopCount(mask){
    let count=0;
    while(mask){
      mask&=mask-1;
      count++;
    }
    return count;
  }

  function botHardBestLocks(index){
    const unlockedIndices=dice.map((d,i)=>!d.locked?i:-1).filter(i=>i>=0);
    if(!unlockedIndices.length) return [];

    const lockedSum=dice.filter(d=>d.locked).reduce((s,d)=>s+(d.value||0),0);
    const memo=new Map();

    // Erwartungswert ab dem NÄCHSTEN zufälligen Wurf.
    // Weil pro Wurf mindestens ein Würfel gelockt werden muss, wird remaining
    // in jeder Rekursionsstufe kleiner und der Baum ist bei max. 5 Würfeln winzig.
    function futureValue(sum,remaining){
      if(remaining===0) return botBaseFinalUtility(index,sum);

      const key=sum+"|"+remaining;
      if(memo.has(key)) return memo.get(key);

      let expected=0;
      const values=Array(remaining).fill(1);

      function enumerate(pos,prob){
        if(pos===remaining){
          let best=-Infinity;
          const limit=1<<remaining;

          for(let mask=1;mask<limit;mask++){
            let add=0;
            let lockedCount=0;
            for(let j=0;j<remaining;j++){
              if(mask&(1<<j)){
                add+=values[j];
                lockedCount++;
              }
            }

            const nextRemaining=remaining-lockedCount;
            const val=nextRemaining===0
              ? botBaseFinalUtility(index,sum+add)
              : futureValue(sum+add,nextRemaining);

            if(val>best) best=val;
          }

          expected+=prob*best;
          return;
        }

        for(let v=1;v<=6;v++){
          values[pos]=v;
          enumerate(pos+1,prob*botDieProb(index,v));
        }
      }

      enumerate(0,1);
      memo.set(key,expected);
      return expected;
    }

    const currentValues=unlockedIndices.map(i=>dice[i].value||1);
    const limit=1<<currentValues.length;
    let bestMask=1;
    let bestScore=-Infinity;

    for(let mask=1;mask<limit;mask++){
      let add=0;
      let lockedCount=0;
      let sixesLocked=0;
      let lowLocked=0;

      for(let j=0;j<currentValues.length;j++){
        if(mask&(1<<j)){
          const v=currentValues[j];
          add+=v;
          lockedCount++;
          if(v===6) sixesLocked++;
          if(v<=3) lowLocked++;
        }
      }

      const remaining=currentValues.length-lockedCount;
      let score=remaining===0
        ? botBaseFinalUtility(index,lockedSum+add)
        : futureValue(lockedSum+add,remaining);

      // Winzige Tie-Breaker: 6er nicht sinnlos liegen lassen und bei praktisch
      // gleichwertigen Linien weniger schlechte Würfel festnageln.
      score+=sixesLocked*0.015;
      score-=lowLocked*0.004;

      if(score>bestScore){
        bestScore=score;
        bestMask=mask;
      }
    }

    const chosen=[];
    for(let j=0;j<unlockedIndices.length;j++){
      if(bestMask&(1<<j)) chosen.push(unlockedIndices[j]);
    }
    return chosen;
  }

  function botChooseBaseLocks(index,level){
    const unlocked=dice.map((d,i)=>({d,i})).filter(x=>!x.d.locked);
    if(!unlocked.length) return [];

    if(level==="hard"){
      return botHardBestLocks(index);
    }

    // Leicht ist jetzt der frühere solide Normal-Bot:
    // 4/5/6 werden bevorzugt, niemals mehr einen 3er nehmen während eine 6 liegt.
    if(level==="easy"){
      let chosen=unlocked.filter(x=>x.d.value>=4);
      if(!chosen.length){
        const best=Math.max(...unlocked.map(x=>x.d.value));
        chosen=unlocked.filter(x=>x.d.value===best);
        // Easy nimmt bei Gleichstand nur einen, damit er etwas weniger effizient bleibt.
        chosen=[chosen[0]];
      }
      return chosen.map(x=>x.i);
    }

    // Normal entspricht ungefähr dem alten Schwer:
    // 5/6 werden früh genommen; 4er nur, wenn sie gegen Ende sinnvoll werden.
    let chosen=unlocked.filter(x=>x.d.value>=5);

    if(!chosen.length){
      const sorted=unlocked.slice().sort((a,b)=>b.d.value-a.d.value);
      chosen=[sorted[0]];
    }

    if(unlocked.length<=2){
      const lockedSum=dice.filter(d=>d.locked).reduce((s,d)=>s+(d.value||0),0);
      const fours=unlocked.filter(x=>x.d.value===4 && !chosen.includes(x));
      fours.forEach(x=>{
        const tentative=lockedSum+chosen.reduce((s,c)=>s+(c.d.value||0),0)+x.d.value;
        const stillOpen=unlocked.length-chosen.length-1;
        if(tentative+stillOpen*4>=25) chosen.push(x);
      });
    }

    return [...new Set(chosen.map(x=>x.i))];
  }

  function botShouldUseLoaded(index,level){
    if(!hasAbility(18,index)||loadedDiceUsed||players[index].hp<=2) return -1;

    const candidates=dice
      .map((d,i)=>({d,i}))
      .filter(x=>!x.d.locked && x.d.value!=null && x.d.value!==5)
      .sort((a,b)=>a.d.value-b.d.value);

    if(!candidates.length) return -1;

    const p=players[index];
    const c=candidates[0];
    const lockedSum=dice.filter(d=>d.locked).reduce((s,d)=>s+(d.value||0),0);
    const currentProjection=lockedSum+dice.filter(d=>!d.locked).reduce((s,d)=>s+(d.value||0),0);

    // Easy = ehemaliges Normal: nur klare Value-Spots.
    if(level==="easy"){
      if(p.hp<=9) return -1;
      if(c.d.value===1) return c.i;
      if(c.d.value===2 && currentProjection<27) return c.i;
      return -1;
    }

    // Normal = ehemaliges Hard.
    if(level==="normal"){
      if(p.hp<=6) return -1;
      if(c.d.value<=2) return c.i;
      if(c.d.value===3 && (currentProjection<26 || hasAbility(10,index))) return c.i;
      return -1;
    }

    // Hard kennt den enormen Wert von Loaded Dice:
    // Basis-Eigenschaden vermeiden + Angriff erzwingen + Momentum halten.
    if(p.hp<=4) return -1;
    if(c.d.value<=2) return c.i;

    if(c.d.value===3){
      if(p.hp>=7) return c.i;
      if(hasAbility(10,index) && (p.momentumStreak||0)>=1) return c.i;
    }

    if(c.d.value===4){
      // Die +1-Manipulation nur, wenn sie unmittelbar eine relevante Schwelle
      // überquert oder eine wertvolle Angriffskette absichert.
      const improved=currentProjection+1;
      if(currentProjection<26 && improved>=26 && p.hp>=7) return c.i;
      if(hasAbility(5,index) && currentProjection<25 && improved>=25 && p.hp>=7) return c.i;
    }

    return -1;
  }

  function botShouldUseBloodPrice(index,level){
    if(!hasAbility(11,index) || bloodPriceNeighbors.length || players[index].hp<=3) return false;

    const p=players[index];
    const targetHp=players[attackTarget]?.hp ?? 25;
    const uses=p.botBloodUsesThisAttack||0;

    // Easy = früheres Normal: einmal, aber nur wenn es vernünftig aussieht.
    if(level==="easy"){
      return uses===0 && p.hp>=12 && (attackFace>=3 || targetHp<=8);
    }

    // Normal = ungefähr früheres Hard.
    if(level==="normal"){
      if(uses===0) return p.hp>=9 || (targetHp<=6 && p.hp>=7);
      if(uses===1) return p.hp>=15 && attackHits<3 && targetHp>0;
      return false;
    }

    // Hard: aggressiv, aber nicht suizidal. Blutpreis ist besonders wertvoll auf
    // mittleren Zielzahlen (3/4/5), bei Kill-Chancen und mit Blood Rush.
    const synergy=hasAbility(23,index) || hasAbility(2,index) || hasAbility(16,index);
    if(uses===0){
      if(targetHp<=8 && p.hp>=7) return true;
      if(attackFace>=3 && attackFace<=5 && p.hp>=8) return true;
      if(synergy && p.hp>=7) return true;
      return p.hp>=11;
    }

    if(uses===1){
      if(targetHp<=7 && p.hp>=7) return true;
      if(synergy && p.hp>=10 && attackHits<3) return true;
      return p.hp>=14 && attackHits<2;
    }

    if(uses===2){
      return targetHp<=6 && p.hp>=10;
    }

    return false;
  }

  function botShouldUseSecondChance(index,level){
    if(!hasAbility(4,index)||attackPowerUsed||currentAttackRollNewHits!==0||!dice.some(d=>!d.locked)) return false;
    return true;
  }

  function botShouldGambleHighStakes(index,level){
    const base=totalAttackDamage();
    const targetHp=players[attackTarget]?.hp ?? 99;

    if(base>=targetHp) return false; // sicheren Kill niemals weg-gamblen

    // Easy = früheres Normal.
    if(level==="easy"){
      return base<=6 || (Math.floor(base*1.5)>=targetHp && Math.random()<.72);
    }

    // Normal = früheres Hard.
    if(level==="normal"){
      if(Math.floor(base*1.5)>=targetHp) return true;
      return base<=5;
    }

    // Hard: High Stakes hat neutralen Erwartungswert, also primär als Kill-/Comeback-Tool.
    if(Math.floor(base*1.5)>=targetHp) return true;
    if(base<=4) return true;

    const p=players[index];
    const target=players[attackTarget];
    if(p.hp<target.hp && base<=6) return true;

    return false;
  }

  function snakeEyesGroup(){
    const groups=new Map();
    const masteryAttackSnake=phase==="attack_after_roll" && hasMasteryUpgrade(20,1,current);
    const sourceIndices=masteryAttackSnake?lastAttackRollIndices:lastBaseRollIndices;
    sourceIndices.forEach(i=>{
      const d=dice[i];
      if(!d || d.locked || d.value==null) return;
      if(!groups.has(d.value)) groups.set(d.value,[]);
      groups.get(d.value).push(i);
    });
    const snakeNeed=encounterRuleActive("serpent_floor")?2:3;
    const eligible=[...groups.entries()].filter(([,indices])=>indices.length>=snakeNeed).sort((a,b)=>b[1].length-a[1].length || a[0]-b[0]);
    if(!eligible.length) return null;
    return {face:eligible[0][0],indices:eligible[0][1]};
  }

  function botHandleBaseSelect(index,level){
    const snakeGroup=snakeEyesGroup();
    if(hasAbility(20,index) && snakeGroup){
      useSnakeEyes();
      return;
    }

    if(hasAbility(3,index) && !baseRerollUsed && dice.some(d=>!d.locked&&d.value===1)){
      useBaseReroll();
      return;
    }

    const loadedIndex=botShouldUseLoaded(index,level);
    if(loadedIndex!==-1){
      dice.forEach(d=>d.selected=false);
      dice[loadedIndex].selected=true;
      renderDice();
      useLoadedDice();
      return;
    }

    const locks=botChooseBaseLocks(index,level);
    dice.forEach(d=>d.selected=false);
    locks.forEach(i=>{if(dice[i]&&!dice[i].locked)dice[i].selected=true;});
    renderAll();
    setTimeout(()=>{
      if(current===index && phase==="base_select" && isBotPlayer(index)) lockSelected();
    },180);
  }

  function botHandleAttackReady(index,level){
    const p=players[index];
    if(botShouldUseBloodPrice(index,level)){
      p.botBloodUsesThisAttack=(p.botBloodUsesThisAttack||0)+1;
      useBloodPrice();
      return;
    }
    rollAttack();
  }

  function botPickSecondAbility(index,level){
    const owned=playerAbilities(index);
    return botPickAbility(secondAbilityDraftChoices,level,owned);
  }

  function performBotAction(){
    if(isAnimating || eventPopupBusy){
      scheduleBotAction(180);
      return;
    }

    if(secondAbilityDraftBusy){
      const index=secondAbilityDraftIndex;
      if(!isBotPlayer(index)) return;
      const level=players[index].botLevel;
      const choice=botPickSecondAbility(index,level);
      chooseSecondAbility(choice);
      return;
    }

    if(phase==="counterattack" && counterContext){
      const defender=counterContext.defenderIndex;
      if(isBotPlayer(defender)){
        rollCounterattack();
      }
      return;
    }

    const index=current;
    if(!isBotPlayer(index)){
      document.body.classList.remove("bot-acting");
      return;
    }
    const level=players[index].botLevel;

    if(!highStakesModal.classList.contains("hidden")){
      if(botShouldGambleHighStakes(index,level)) rollHighStakes();
      else skipHighStakes();
      return;
    }

    if(phase==="idle" || phase==="base_ready"){ rollBase(); return; }
    if(phase==="base_select"){ botHandleBaseSelect(index,level); return; }
    if(phase==="gamble_attack"){ rollGamblingMan(); return; }
    if(phase==="perfect25"){ rollPerfect25(); return; }
    if(phase==="perfect25_d4"){ rollPerfect25D4(); return; }
    if(phase==="insurance"){ rollInsurance(); return; }

    if(phase==="attack_ready" || phase==="attack_continue"){
      botHandleAttackReady(index,level);
      return;
    }

    if(phase==="attack_after_roll"){
      if(botShouldUseSecondChance(index,level)){
        useAttackPower();
      }else{
        resolveCurrentAttackRoll();
      }
      return;
    }

    if(phase==="turn_done"){ advanceTurn(); return; }

    // base_auto_end advances itself after its normal animation delay.
    scheduleBotAction(200);
  }
