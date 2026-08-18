  function randAbilityRoll(){ return Math.floor(Math.random()*25)+1; }
  function randD4(){ return Math.floor(Math.random()*4)+1; }

  function resetRoundStats(){
    roundStats=players.map(()=>({
      damage:0,
      maxTurnDamage:0,
      ones:0,
      sixes:0,
      healed:0,
      selfDamage:0,
      damageTaken:0,
      voluntaryHp:0,
      kills:0,
      snakeEyesUsesThisTurn:0,
      twelveTriggers:0,
      highStakesWins:0,
      highStakesLosses:0,
      loadedSixToFive:0
    }));
    turnDamageThisTurn=players.map(()=>0);
  }

  function recordD6(index,value){
    if(index==null || !roundStats[index]) return;
    if(value===1) roundStats[index].ones++;
    if(value===6){
      roundStats[index].sixes++;
      if(roundStats[index].sixes>=24)window.WDMastery?.unlockL2ForPlayer?.(index,22);
    }
  }

  function recordSelfDamage(index,amount,source=""){
    if(index==null || !roundStats[index] || amount<=0) return;
    roundStats[index].selfDamage+=amount;
    window.WDMastery?.noteSelfDamage?.(index,amount,source);
    if(players[index] && hasMasteryUpgrade(23,1,index)) players[index].masterySelfDamageSinceLastOwnTurn=true;
  }

  function rollTrackedD6(index=current){
    const value=randDieForPlayer(index);
    recordD6(index,value);
    window.WDMastery?.noteAnyD6?.(index);
    return value;
  }

  function rollTrackedD6Excluding(index=current,excludedValue=1){
    let value=excludedValue;
    while(value===excludedValue) value=randDieForPlayer(index);
    recordD6(index,value);
    window.WDMastery?.noteAnyD6?.(index);
    return value;
  }

  function applyTwelveHeal(index,values,source="Wurf"){
    if(!hasAbility(22,index) || !Array.isArray(values)) return 0;
    const sixes=values.filter(v=>v===6).length;
    if(sixes<2) return 0;
    markCampaignAbilityUse(index,22);

    if(roundStats[index]){
      roundStats[index].twelveTriggers++;
      if(roundStats[index].twelveTriggers>=3) unlockAchievementForPlayer(index,"twelve_x3");
    }

    const p=players[index];
    const masteryTwelve=hasMasteryUpgrade(22,1,index) && sixes>=3;
    const healAmount=encounterHealAmount(index,masteryTwelve?2:1);
    const healed=applyHealingToPlayer(index,healAmount);

    if(healed>0){
      recordHealing(index,healed);
      if(!pendingHeal) pendingHeal={target:index,amount:healed};
      else pendingExtraHealFx.push({target:index,amount:healed});
      const over=p.hp>maxHpForPlayer(p)?` · ${p.hp}/${maxHpForPlayer(p)} HP`:"";
      addLog(`🎲 12: ${p.name} würfelt ${sixes} Sechser in einem ${source} und heilt ${healed} HP${over}.`);
    }else{
      addLog(`🎲 12: ${p.name} würfelt ${sixes} Sechser, ist aber bereits auf maximalen HP.`);
    }
    return healed;
  }

  function isUniqueUnderdog(index){
    if(index==null || !players[index] || players[index].hp<=0) return false;
    const p=players[index];
    if(hasMasteryUpgrade(25,1,index) && p.masteryUnderdogTurnActive) return true;
    const alive=players.map((pl,i)=>pl.hp>0?i:null).filter(i=>i!=null);
    if(alive.length<2) return false;
    const hp=p.hp;
    return hasMasteryUpgrade(25,1,index)
      ? alive.every(i=>i===index || hp<=players[i].hp)
      : alive.every(i=>i===index || hp<players[i].hp);
  }

  function prepareBloodRushForTurn(index){
    const p=players[index];
    if(!p) return;
    if(hasAbility(14,index)&&hasMasteryUpgrade(14,2,index)&&Number(p.masteryLastStandCooldown)>0){
      p.masteryLastStandCooldown=Math.max(0,Number(p.masteryLastStandCooldown)-1);
      if(p.masteryLastStandCooldown===0){p.lastStandUsed=false;addLog(`🛡️ I Can Do This All Day: ${p.name} kann Last Stand wieder triggern.`);}
    }
    window.WDMastery?.noteTurnStart?.(index);
    p.bloodRushPrimed=!!p.damageSinceLastOwnTurn || (hasMasteryUpgrade(23,1,index)&&!!p.masterySelfDamageSinceLastOwnTurn);
    p.damageSinceLastOwnTurn=false;
    p.masterySelfDamageSinceLastOwnTurn=false;
    p.voluntaryHpPaidThisTurn=false;

    // Underdog L1 locks the condition for the whole own turn if it is true now.
    p.masteryUnderdogTurnActive=false;
    if(hasAbility(25,index)&&hasMasteryUpgrade(25,1,index)&&p.hp>0){
      const alive=players.map((pl,i)=>pl.hp>0?i:null).filter(i=>i!=null);
      if(alive.length>=2) p.masteryUnderdogTurnActive=alive.every(i=>i===index||p.hp<=players[i].hp);
    }
  }

  function activateBloodRushForMainAttack(){
    const p=players[current];
    bloodRushActiveThisAttack=false;
    if(!p || !hasAbility(23)) return;

    if(p.bloodRushPrimed || p.voluntaryHpPaidThisTurn){
      bloodRushActiveThisAttack=true;
      markCampaignAbilityUse(current,23);
      p.bloodRushPrimed=false;
      p.voluntaryHpPaidThisTurn=false;
      addLog(`🩸 Blood Rush ist aktiv: +1 Schaden pro Treffer in diesem Angriff.`);
    }
  }

  function activateBloodRushMidAttackIfEligible(index=current){
    if(index!==current || bloodRushActiveThisAttack || !hasAbility(23,index)) return false;
    const p=players[index];
    if(!p || !(p.bloodRushPrimed || p.voluntaryHpPaidThisTurn)) return false;

    bloodRushActiveThisAttack=true;
    markCampaignAbilityUse(index,23);
    p.bloodRushPrimed=false;
    p.voluntaryHpPaidThisTurn=false;

    // Falls Blutpreis erst nach bereits gelockten Treffern bezahlt wurde,
    // erhalten diese Treffer den Blood-Rush-Bonus rückwirkend.
    if(attackHits>0) attackDamage+=attackHits;

    addLog(`🩸 Blood Rush zündet im laufenden Angriff: +1 Schaden pro Treffer.`);
    return true;
  }

  function consumeBloodRushForCounter(index){
    const p=players[index];
    if(!p || !hasAbility(23,index)) return false;
    const active=!!(p.damageSinceLastOwnTurn || p.bloodRushPrimed || p.voluntaryHpPaidThisTurn);
    if(active){
      p.damageSinceLastOwnTurn=false;
      p.bloodRushPrimed=false;
      p.voluntaryHpPaidThisTurn=false;
    }
    return active;
  }

  function recordDamageDealt(index,amount,countForOwnTurn=true){
    if(index==null || !roundStats[index] || amount<=0) return;
    roundStats[index].damage+=amount;

    if(countForOwnTurn && index===current){
      turnDamageThisTurn[index]=(turnDamageThisTurn[index]||0)+amount;
      roundStats[index].maxTurnDamage=Math.max(
        roundStats[index].maxTurnDamage,
        turnDamageThisTurn[index]
      );
    }
  }

  function recordCampaignRawDamage(index,amount,targetIndex=attackTarget){
    if(!campaignMode || index==null || amount<=0 || index!==current) return;
    if(players[index]?.campaignTeam!=="hero") return;
    campaignMetrics.currentRawTurnDamage=(campaignMetrics.currentRawTurnDamage||0)+amount;
    campaignMetrics.maxRawTurnDamage=Math.max(campaignMetrics.maxRawTurnDamage||0,campaignMetrics.currentRawTurnDamage);
    const key=String(index);
    campaignMetrics.rawDamageByHero[key]=(campaignMetrics.rawDamageByHero[key]||0)+amount;
    campaignMetrics.currentRawTurnDamageByHero[key]=(campaignMetrics.currentRawTurnDamageByHero[key]||0)+amount;
    campaignMetrics.maxRawTurnDamageByHero[key]=Math.max(campaignMetrics.maxRawTurnDamageByHero[key]||0,campaignMetrics.currentRawTurnDamageByHero[key]);
    if(targetIndex!=null && players[targetIndex]?.campaignTeam==="enemy"){const t=String(targetIndex);campaignMetrics.rawDamageByTarget[t]=(campaignMetrics.rawDamageByTarget[t]||0)+amount;}
  }
  function recordCampaignAttackResult(index,hits){
    if(!campaignMode || players[index]?.campaignTeam!=="hero") return;
    const h=Math.max(0,Number(hits)||0),key=String(index);
    campaignMetrics.maxAttackHits=Math.max(campaignMetrics.maxAttackHits||0,h);
    campaignMetrics.maxAttackHitsByHero[key]=Math.max(campaignMetrics.maxAttackHitsByHero[key]||0,h);
  }
  function recordCampaignEnemyElimination(targetIndex,killerIndex=null){
    if(!campaignMode || players[targetIndex]?.campaignTeam!=="enemy") return;
    if(!campaignMetrics.killOrder.length) campaignMetrics.firstKillDistinctTargets=Object.values(campaignMetrics.rawDamageByTarget||{}).filter(v=>(Number(v)||0)>0).length;
    campaignMetrics.killOrder.push(players[targetIndex].name);
    const heroKill=killerIndex!=null && players[killerIndex]?.campaignTeam==="hero";
    campaignMetrics.killHeroes.push(heroKill?String(killerIndex):null);
    if(heroKill){const key=String(killerIndex);campaignMetrics.killsByHero[key]=(campaignMetrics.killsByHero[key]||0)+1;}
  }
  function recordCampaignKill(killerIndex,targetIndex){
    if(!campaignMode || players[killerIndex]?.campaignTeam!=="hero" || players[targetIndex]?.campaignTeam!=="enemy") return;
    recordCampaignEnemyElimination(targetIndex,killerIndex);
    window.WDMastery?.noteKill?.(killerIndex,targetIndex);
  }

  function recordHealing(index,amount){
    if(index==null || !roundStats[index] || amount<=0) return;
    roundStats[index].healed+=amount;
    window.WDMastery?.noteHealing?.(index,amount);
    if(roundStats[index].healed>=8) unlockAchievementForPlayer(index,"back_from_dead");
  }

  function statLeader(field){
    if(!players.length || !roundStats.length) return {names:"–",value:0};
    const best=Math.max(...roundStats.map(s=>s[field]||0));
    if(best<=0) return {names:"–",value:0};
    const names=roundStats
      .map((s,i)=>(s[field]||0)===best?players[i].name:null)
      .filter(Boolean)
      .join(" & ");
    return {names,value:best};
  }

  function renderRoundStats(){
    const damage=statLeader("damage");
    const turn=statLeader("maxTurnDamage");
    const sixes=statLeader("sixes");
    const healed=statLeader("healed");
    const selfDamage=statLeader("selfDamage");
    const damageTaken=statLeader("damageTaken");

    roundStatsBox.innerHTML=`
      <div class="round-stat">
        <div class="round-stat-label">🔥 Schadenskönig</div>
        <div class="round-stat-value">${escapeHtml(damage.names)} · ${damage.value} HP</div>
      </div>
      <div class="round-stat">
        <div class="round-stat-label">💥 Härtester Zug</div>
        <div class="round-stat-value">${escapeHtml(turn.names)} · ${turn.value} HP</div>
      </div>
      <div class="round-stat">
        <div class="round-stat-label">🎲 Sechserkönig</div>
        <div class="round-stat-value">${escapeHtml(sixes.names)} · ${sixes.value}×6</div>
      </div>
      <div class="round-stat">
        <div class="round-stat-label">❤️ Vampir</div>
        <div class="round-stat-value">${escapeHtml(healed.names)} · ${healed.value} HP</div>
      </div>
      <div class="round-stat">
        <div class="round-stat-label">🤡 Eigentor</div>
        <div class="round-stat-value">${escapeHtml(selfDamage.names)} · ${selfDamage.value} HP selbst</div>
      </div>
      <div class="round-stat">
        <div class="round-stat-label">🧲 Schadensmagnet</div>
        <div class="round-stat-value">${escapeHtml(damageTaken.names)} · ${damageTaken.value} HP kassiert</div>
      </div>
    `;
  }

