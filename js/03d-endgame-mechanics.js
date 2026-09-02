/* V28.9: opt-in endgame mechanics. Undefined fields intentionally preserve legacy behavior. */
const ENEMY_ROLES=Object.freeze(["bruiser","assassin","tank","support","controller","blood","counter","gambler","dice_manipulator","finisher","boss_add"]);
const ENEMY_AI_PROFILES=Object.freeze({
  standard:{target:"legacy",risk:0},aggressive:{target:"legacy",risk:2},defensive:{target:"highest_hp",risk:-1},
  finisher:{target:"lowest_hp",risk:1},opportunist:{target:"lowest_hp",risk:0},support:{target:"last_attacker",risk:-1},
  chaotic:{target:"random_valid",risk:1},boss:{target:"marked_player",risk:1}
});
const ELITE_MUTATORS=Object.freeze({
  enraged:{name:"Enraged",nameEn:"Enraged",desc:"Mehr Angriffsdruck, aber 10 % weniger Start-HP.",descEn:"More attack pressure, but 10% less starting HP.",hp:.9,outgoing:1},
  armored:{name:"Armored",nameEn:"Armored",desc:"15 % mehr Start-HP; Hauptangriffe verursachen 1 weniger Schaden.",descEn:"15% more starting HP; main attacks deal 1 less damage.",hp:1.15,incoming:-1},
  vampiric:{name:"Vampiric",nameEn:"Vampiric",desc:"Heilt nach erfolgreichen Hauptangriffen 2 HP.",descEn:"Heals 2 HP after successful main attacks.",healOnHit:2},
  berserker:{name:"Berserker",nameEn:"Berserker",desc:"Unter 40 % HP verursacht der Gegner 2 zusätzlichen Schaden.",descEn:"Below 40% HP the enemy deals 2 additional damage.",lowHpOutgoing:2},
  unstable:{name:"Unstable",nameEn:"Unstable",desc:"Verursacht +2 Schaden, verliert danach bei einem Treffer 1 HP.",descEn:"Deals +2 damage, then loses 1 HP after a hit.",outgoing:2,selfOnHit:1},
  countertrained:{name:"Countertrained",nameEn:"Countertrained",desc:"Auf Counterattack abgestimmtes Loadout und 1 weniger eingehender Schaden.",descEn:"A Counterattack-focused loadout and 1 less incoming damage.",incoming:-1},
  lucky:{name:"Lucky",nameEn:"Lucky",desc:"Kontrollierte Würfelmanipulation durch Glück als Zusatzfähigkeit.",descEn:"Controlled dice manipulation through Luck as an extra ability.",grantAbility:7},
  relentless:{name:"Relentless",nameEn:"Relentless",desc:"Erfolgreiche Angriffe bauen bis zu +3 Druck auf.",descEn:"Successful attacks build up to +3 pressure.",relentless:true}
});
const ENCOUNTER_MODIFIERS=Object.freeze({
  no_recovery:{name:"No Recovery",nameEn:"No Recovery",desc:"Heilung der Helden ist auf 50 % reduziert.",descEn:"Hero healing is reduced to 50%."},
  blood_debt:{name:"Blood Debt",nameEn:"Blood Debt",desc:"Freiwillige HP-Kosten erzeugen beim nächsten Angriff +1 Schaden.",descEn:"Voluntary HP costs grant +1 damage on the next attack."},
  hunted:{name:"Hunted",nameEn:"Hunted",desc:"Ein Held startet für zwei gegnerische Züge markiert.",descEn:"One hero starts marked for two enemy turns."},
  rapid_escalation:{name:"Rapid Escalation",nameEn:"Rapid Escalation",desc:"Ab gegnerischem Zug 4 steigt der Druck; Zug 7 verstärkt ihn erneut.",descEn:"Pressure rises at enemy turn 4 and again at turn 7."},
  glass_cannon:{name:"Glass Cannon",nameEn:"Glass Cannon",desc:"Hauptangriffe beider Teams verursachen +2 Rohschaden.",descEn:"Main attacks from both teams deal +2 raw damage."},
  last_breath:{name:"Last Breath",nameEn:"Last Breath",desc:"Unter 30 % HP verursachen Teilnehmer +1 Schaden.",descEn:"Below 30% HP combatants deal +1 damage."},
  precision_trial:{name:"Precision Trial",nameEn:"Precision Trial",desc:"Der erste erfolgreiche Hauptangriff jedes Helden erhält +1 Schaden.",descEn:"Each hero's first successful main attack gains +1 damage."}
});
const ENDGAME_WORLD_RULES=Object.freeze({
  astral:{id:"hunters_mark",name:"Hunter's Mark",nameEn:"Hunter's Mark",desc:"Der verwundbarste Held wird zwei gegnerische Züge priorisiert; im Solo erleidet er dabei +1 Hauptangriffsschaden.",descEn:"The most vulnerable hero is prioritized for two enemy turns; in solo they take +1 main attack damage while marked."},
  void:{id:"last_light",name:"Last Light",nameEn:"Last Light",desc:"Unter 30 % HP erhält der erste erfolgreiche Hauptangriff jedes Helden einmalig +2 Schaden.",descEn:"Below 30% HP, each hero's first successful main attack gains +2 damage once."},
  eclipse:{id:"momentum_war",name:"Momentum War",nameEn:"Momentum War",desc:"Erfolgreiche Hauptangriffe bauen bis zu +2 Schaden auf; ein Fehlschlag setzt die Serie zurück.",descEn:"Successful main attacks build up to +2 damage; a miss resets the streak."},
  bloodmoon:{id:"blood_moon",name:"Blood Moon",nameEn:"Blood Moon",desc:"Lifesteal-, Twelve- und Borrowing-Life-Heilung erhalten durch den bestehenden Blood-Moon-Effekt +1 HP.",descEn:"The existing Blood Moon effect adds +1 HP to Lifesteal, Twelve, and Borrowing Life healing."},
  prism:{id:"arcane_instability",name:"Arcane Instability",nameEn:"Arcane Instability",desc:"Mit Würfelmanipulation ausgerüstete Helden erhalten auf ihren ersten erfolgreichen Hauptangriff +1 Schaden.",descEn:"Heroes equipped with dice manipulation gain +1 damage on their first successful main attack."},
  singularity:{id:"final_gravity",name:"Final Gravity",nameEn:"Final Gravity",desc:"Ab gegnerischem Zug 4 steigt der Schaden um 1; ab Zug 7 um insgesamt 2.",descEn:"Enemy damage rises by 1 from enemy turn 4 and by 2 total from turn 7."}
});
const ENCOUNTER_TAG_LABELS=Object.freeze({normal:"Normal",elite:"Elite",miniboss:"Mini-Boss",boss:"Boss",survival:"Survival",ability:"Ability",multi_enemy:"Multi Enemy",high_risk:"High Risk"});

function inferEnemyRole(enemy){
  const ids=[enemy.ability,enemy.secondAbility,enemy.thirdAbility].map(Number);
  if(ids.includes(2)||ids.includes(22))return "support";if(ids.includes(21))return "counter";if(ids.includes(11)||ids.includes(23))return "blood";
  if(ids.includes(13)||ids.includes(12))return "gambler";if(ids.includes(18)||ids.includes(20)||ids.includes(17))return "dice_manipulator";
  if(ids.includes(19)||ids.includes(14))return "tank";if(ids.includes(1)||ids.includes(24))return "assassin";return "bruiser";
}
function defaultAiForRole(role,isBoss=false){if(isBoss)return "boss";return ({tank:"defensive",support:"support",assassin:"aggressive",finisher:"finisher",blood:"aggressive",gambler:"chaotic",dice_manipulator:"opportunist",counter:"defensive"})[role]||"opportunist";}
function bossPhaseThresholdsCrossed(phases,triggeredIds,beforeHp,afterHp,maxHp){
  const already=new Set(triggeredIds||[]),maximum=Math.max(1,Number(maxHp)||1);
  return (phases||[]).map((phase,index)=>({index,threshold:Math.floor(maximum*(phase.threshold||.5))}))
    .filter(item=>!already.has(item.index)&&beforeHp>item.threshold&&afterHp<=item.threshold)
    .sort((a,b)=>b.threshold-a.threshold||a.index-b.index).map(item=>item.index);
}
function endgameEncounterKind(encounter,index){if(index===14)return "boss";if([4,9].includes(index))return "miniboss";if(encounter.enemies.length>=3)return "multi_enemy";return index>=7?"elite":"normal";}
function applyEndgameMechanics(worlds,encounters,worldIds){
  worlds.filter(w=>worldIds.includes(w.id)).forEach(world=>{world.worldRule=ENDGAME_WORLD_RULES[world.id];world.ruleUsage="9 / 15 Encounter";});
  worldIds.forEach(worldId=>encounters.filter(e=>e.world===worldId).forEach((encounter,index)=>{
    const kind=endgameEncounterKind(encounter,index);encounter.tags=[...(encounter.tags||[]),kind];if(encounter.enemies.length>1)encounter.tags.push("multi_enemy");
    if(encounter.challenge?.type?.includes("ability")||encounter.challenge?.rules?.some(r=>r.type?.includes("ability")))encounter.tags.push("ability");
    encounter.tags=[...new Set(encounter.tags)];
    encounter.worldRuleActive=encounter.worldRuleActive??(index%5!==1&&index%5!==3);encounter.worldRule=encounter.worldRuleActive?(encounter.worldRule||ENDGAME_WORLD_RULES[worldId]?.id):null;
    if(index===4||index===9)encounter.isMiniBoss=true;if(index===14)encounter.isBoss=true;
    const modifierByWorld={astral:"precision_trial",void:"rapid_escalation",eclipse:"glass_cannon",bloodmoon:"blood_debt",prism:"hunted",singularity:"rapid_escalation"};
    if(!encounter.modifier&&[2,4,7,9,12,14].includes(index))encounter.modifier=modifierByWorld[worldId];
    encounter.enemies.forEach((enemy,enemyIndex)=>{
      enemy.definitionId=enemy.definitionId||String(enemy.name).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
      enemy.role=enemy.role||inferEnemyRole(enemy);enemy.aiProfile=enemy.aiProfile||defaultAiForRole(enemy.role,index===14&&enemyIndex===0);
      if(kind==="miniboss"&&enemyIndex===0)enemy.mutator=worldId==="bloodmoon"?"vampiric":worldId==="void"?"relentless":"armored";
      else if(index>=10&&enemyIndex===0)enemy.mutator=({astral:"lucky",void:"berserker",eclipse:"countertrained",bloodmoon:"unstable",prism:"enraged",singularity:"relentless"})[worldId];
      if(index===14&&enemyIndex===0)enemy.aiProfile="boss";
      if(index===14&&enemyIndex>0){enemy.role="boss_add";enemy.aiProfile="support";}
      if((index===4||index===9)&&enemyIndex>0)enemy.deathReaction={type:"empower_partner",amount:1};
      if(enemy.mutator&&!ELITE_MUTATORS[enemy.mutator])delete enemy.mutator;
    });
  }));
}
applyEndgameMechanics(CAMPAIGN_WORLDS,CAMPAIGN_ENCOUNTERS,["astral","void"]);
applyEndgameMechanics(DUO_CAMPAIGN_WORLDS,DUO_CAMPAIGN_ENCOUNTERS,["eclipse","bloodmoon"]);
applyEndgameMechanics(TRIO_CAMPAIGN_WORLDS,TRIO_CAMPAIGN_ENCOUNTERS,["prism","singularity"]);
// Legacy content receives metadata only; standard AI and no mutator keep its behavior neutral.
[...CAMPAIGN_ENCOUNTERS,...DUO_CAMPAIGN_ENCOUNTERS,...TRIO_CAMPAIGN_ENCOUNTERS].forEach(encounter=>(encounter.enemies||[]).forEach(enemy=>{enemy.definitionId=enemy.definitionId||String(enemy.name).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");enemy.role=enemy.role||inferEnemyRole(enemy);enemy.aiProfile=enemy.aiProfile||"standard";}));

function setEndgameBossPhases(id,boss,phaseA,phaseB){BOSS_PHASES[id]={boss,threshold:.66,title:phaseA.title,desc:`${phaseA.desc} / ${phaseB.desc}`,phases:[{threshold:.66,heal:4,aiProfile:"defensive",...phaseA},{threshold:.33,heal:6,aiProfile:"boss",markTurns:2,...phaseB}]};}
setEndgameBossPhases("astral_emperor","Astral Emperor",{title:"ORBITAL AEGIS",desc:"Der Emperor stabilisiert seine Verteidigung und wechselt auf Counterattack.",ability:21,secondAbility:19,mutator:"armored"},{title:"STARFALL",desc:"Der verwundbarste Held wird markiert; Blood Rush erhöht den finalen Druck.",ability:23,secondAbility:1,mutator:"relentless"});
setEndgameBossPhases("void_queen","Void Queen",{title:"EMPTY THRONE",desc:"Die Queen wird defensiv und schützt ihren nächsten Übergang.",ability:19,secondAbility:14,mutator:"countertrained"},{title:"VOID UNBOUND",desc:"Die Queen markiert einen Helden und eskaliert mit Brutalen Einsen.",ability:1,secondAbility:17,mutator:"berserker"});
setEndgameBossPhases("duo_eclipse_sovereign","Eclipse Pact Sovereign",{title:"DARK AEGIS",desc:"Der Sovereign wechselt in eine defensive Counter-Phase.",ability:21,secondAbility:19,mutator:"armored"},{title:"TOTAL ECLIPSE",desc:"Ein verwundbarer Held wird markiert; Double Tap erhöht den Finisher-Druck.",ability:24,secondAbility:1,mutator:"relentless"});
setEndgameBossPhases("duo_bloodmoon_empress","Bloodmoon Pact Sovereign",{title:"RED VEIL",desc:"Die Empress heilt und nutzt Lifesteal für die Mittelphase.",ability:2,secondAbility:11,mutator:"vampiric"},{title:"BLOOD ASCENSION",desc:"Der niedrigste Held wird markiert; Blood Rush und Last Stand bestimmen das Finale.",ability:23,secondAbility:14,mutator:"berserker"});
setEndgameBossPhases("trio_prism_archon","Prism Protocol Sovereign",{title:"PRISM GUARD",desc:"Der Archon absorbiert Druck und kontert breite Angriffe.",ability:21,secondAbility:16,mutator:"countertrained"},{title:"PRISM BREAK",desc:"Ein Held wird markiert und das Loadout wechselt auf offensiven Würfeldruck.",ability:18,secondAbility:24,mutator:"relentless"});
setEndgameBossPhases("trio_singularity_empress","Singularity Protocol Sovereign",{title:"EVENT HORIZON",desc:"Die Singularity verdichtet sich und reduziert eingehenden Schaden.",ability:19,secondAbility:21,mutator:"armored"},{title:"FINAL GRAVITY",desc:"Der schwächste Held wird markiert; Twelve und Blood Rush bilden die Finalphase.",ability:22,secondAbility:23,mutator:"relentless"});

function campaignMechanicSummary(encounter){
  if(!encounter)return [];
  const out=[];const worldRule=ENDGAME_WORLD_RULES[encounter.world];
  if(encounter.worldRuleActive&&worldRule)out.push({kind:"rule",name:worldRule.name,desc:worldRule.desc});
  if(encounter.modifier&&ENCOUNTER_MODIFIERS[encounter.modifier])out.push({kind:"modifier",...ENCOUNTER_MODIFIERS[encounter.modifier]});
  (encounter.enemies||[]).forEach(e=>{if(e.mutator&&ELITE_MUTATORS[e.mutator])out.push({kind:"mutator",enemy:e.name,...ELITE_MUTATORS[e.mutator]})});
  return out;
}
function campaignWorldDescription(world){const rule=world?.worldRule;return rule?`${tx(world.desc)}\n${tx("Weltregel")}: ${tx(rule.name)} — ${tx(rule.desc)} (${tx(world.ruleUsage)})`:tx(world?.desc||"");}
function campaignMechanicDetailHtml(encounter){return campaignMechanicSummary(encounter).map(item=>`<div class="node-detail-row endgame-mechanic-row ${item.kind}"><strong>${escapeHtml(item.kind==="rule"?tx("Weltregel"):tx("Aktive Mechanik"))}: ${escapeHtml(item.enemy?`${item.enemy} · ${tx(item.name)}`:tx(item.name))}</strong><span>${escapeHtml(tx(item.desc))}</span></div>`).join("");}
function buildCampaignEnemyPlayer(enemy,encounter,index){
  const mut=ELITE_MUTATORS[enemy.mutator]||null;const hp=Math.max(1,Math.round((Number(enemy.hp)||START_HP)*(mut?.hp||1)));
  const abilities=[Number(enemy.ability)||0,enemy.secondAbility!=null?Number(enemy.secondAbility):null,enemy.thirdAbility!=null?Number(enemy.thirdAbility):null];
  if(mut?.grantAbility&&!abilities.includes(mut.grantAbility)){if(abilities[1]==null)abilities[1]=mut.grantAbility;else if(abilities[2]==null)abilities[2]=mut.grantAbility;}
  return {name:enemy.name,battleTag:"",profileId:null,botLevel:enemy.level||"normal",campaignTeam:"enemy",hp,maxHp:hp,ability:abilities[0],secondAbility:abilities[1],thirdAbility:abilities[2],fourthAbility:null,secondAbilityUnlocked:true,thirdAbilityUnlocked:true,fourthAbilityUnlocked:false,rolledAbility:"CAMPAIGN",primaryWasChosen:false,seat:0,diceDesign:"classic",wins:0,momentumStreak:0,lastStandUsed:false,roundLastStandTriggered:false,damageSinceLastOwnTurn:false,bloodRushPrimed:false,voluntaryHpPaidThisTurn:false,botBloodUsesThisAttack:0,enemyDefinitionId:enemy.definitionId||enemy.name,enemyInstanceId:`${encounter.id}:${index}`,enemyRole:enemy.role||inferEnemyRole(enemy),aiProfile:enemy.aiProfile||"standard",mutatorId:enemy.mutator||null,relentlessStacks:0};
}
function getActiveWorldRule(){const encounter=typeof currentEncounterObject==="function"?currentEncounterObject():null;return campaignMode&&encounter?.worldRuleActive===true&&encounter.worldRule?encounter.worldRule:null;}
function chooseValidMarkedHero(){const alive=players.map((p,i)=>p?.campaignTeam==="hero"&&p.hp>0?i:null).filter(i=>i!=null);if(!alive.length)return null;return alive.sort((a,b)=>players[a].hp-players[b].hp)[0];}
function chooseHuntedHero(randomSource=Math.random){const alive=players.map((p,i)=>p?.campaignTeam==="hero"&&p.hp>0?i:null).filter(i=>i!=null);if(!alive.length)return null;const roll=Math.min(.999999,Math.max(0,Number(randomSource())||0));return alive[Math.floor(roll*alive.length)];}
function applyWorldRuleOnEncounterStart(){const rule=getActiveWorldRule();if(!rule)return;if(rule==="hunters_mark"){encounterRuntime.markedHero=chooseValidMarkedHero();encounterRuntime.markTurns=2;encounterRuntime.markSource="world_rule";}if(rule==="blood_moon"&&!encounterRuntime.phaseRuleIds.includes("blood_moon"))encounterRuntime.phaseRuleIds.push("blood_moon");}
function queueOneShotDamageBonus(index,id){const key=String(index);if(!encounterRuntime.pendingOneShotDamage||typeof encounterRuntime.pendingOneShotDamage!=="object")encounterRuntime.pendingOneShotDamage={};const pending=encounterRuntime.pendingOneShotDamage[key]||new Set();pending.add(id);encounterRuntime.pendingOneShotDamage[key]=pending;}
function commitOneShotDamageBonuses(index,actualDamage){const key=String(index),pending=encounterRuntime.pendingOneShotDamage?.[key];if(actualDamage>0&&pending){if(pending.has("precision_trial"))encounterRuntime.precisionUsed.add(key);if(pending.has("last_light"))encounterRuntime.lastLightUsed.add(key);if(pending.has("arcane_instability"))encounterRuntime.arcaneUsed.add(key);}if(encounterRuntime.pendingOneShotDamage)delete encounterRuntime.pendingOneShotDamage[key];}
function worldRuleDamageBonus(index,base){const rule=getActiveWorldRule(),p=players[index];if(!rule||!p||base<=0||p.campaignTeam!=="hero")return 0;const key=String(index);if(rule==="last_light"&&p.hp/Math.max(1,p.maxHp)<=.3&&!encounterRuntime.lastLightUsed.has(key)){queueOneShotDamageBonus(index,"last_light");return 2;}if(rule==="momentum_war"){const streak=Math.max(0,Number(encounterRuntime.worldMomentum[key])||0);return Math.min(2,streak);}if(rule==="arcane_instability"&&!encounterRuntime.arcaneUsed.has(key)&&[3,17,18,20].some(id=>playerAbilities(index).includes(id))){queueOneShotDamageBonus(index,"arcane_instability");return 1;}return 0;}
function applyWorldRuleAfterAttack(index,damage){const rule=getActiveWorldRule(),p=players[index];if(!rule||!p)return;if(rule==="momentum_war"&&p.campaignTeam==="hero"){const key=String(index);encounterRuntime.worldMomentum[key]=damage>0?Math.min(2,(encounterRuntime.worldMomentum[key]||0)+1):0;}if(rule==="hunters_mark"&&(encounterRuntime.markedHero==null||players[encounterRuntime.markedHero]?.hp<=0||encounterRuntime.markTurns<=0)){encounterRuntime.markedHero=chooseValidMarkedHero();encounterRuntime.markTurns=2;encounterRuntime.markSource="world_rule";}}
function applyWorldRuleOnEnemyTurn(){const rule=getActiveWorldRule();if(rule==="hunters_mark"&&(encounterRuntime.markedHero==null||players[encounterRuntime.markedHero]?.hp<=0)){encounterRuntime.markedHero=chooseValidMarkedHero();encounterRuntime.markTurns=2;encounterRuntime.markSource="world_rule";}if(rule==="final_gravity")updateEncounterEscalation();}
const WORLD_RULE_RUNTIME_HANDLERS=Object.freeze({hunters_mark:true,last_light:true,momentum_war:true,blood_moon:true,arcane_instability:true,final_gravity:true});
const ENCOUNTER_MODIFIER_RUNTIME_HANDLERS=Object.freeze({no_recovery:true,blood_debt:true,hunted:true,rapid_escalation:true,glass_cannon:true,last_breath:true,precision_trial:true});
const ELITE_MUTATOR_RUNTIME_HANDLERS=Object.freeze({enraged:true,armored:true,vampiric:true,berserker:true,unstable:true,countertrained:true,lucky:true,relentless:true});
function campaignOutgoingDamageModifier(index,base){const p=players[index],key=String(index);if(encounterRuntime.pendingOneShotDamage)delete encounterRuntime.pendingOneShotDamage[key];if(!campaignMode||!p||base<=0)return 0;let n=0;const mut=ELITE_MUTATORS[p.mutatorId];if(p.campaignTeam==="enemy"){n+=mut?.outgoing||0;if(mut?.lowHpOutgoing&&p.hp/Math.max(1,p.maxHp)<=.4)n+=mut.lowHpOutgoing;if(mut?.relentless)n+=Math.min(3,p.relentlessStacks||0);}const enc=currentEncounterObject?.();if(enc?.modifier==="glass_cannon")n+=2;if(enc?.modifier==="last_breath"&&p.hp/Math.max(1,p.maxHp)<=.3)n+=1;if(enc?.modifier==="blood_debt"&&p.campaignTeam==="hero"&&p.voluntaryHpPaidThisTurn)n+=1;if(enc?.modifier==="precision_trial"&&p.campaignTeam==="hero"&&!encounterRuntime.precisionUsed.has(key)){queueOneShotDamageBonus(index,"precision_trial");n+=1;}n+=worldRuleDamageBonus(index,base);return n;}
function campaignIncomingDamageModifier(targetIndex,base){const p=players[targetIndex];if(!campaignMode||!p||base<=0)return 0;let n=ELITE_MUTATORS[p.mutatorId]?.incoming||0;const soloMark=getActiveWorldRule()==="hunters_mark"&&p.campaignTeam==="hero"&&campaignHeroIndices().filter(i=>players[i]?.hp>0).length===1&&encounterRuntime.markTurns>0&&encounterRuntime.markedHero===targetIndex;if(soloMark)n+=1;return n;}
function initializeEncounterMechanics(){const enc=currentEncounterObject?.();if(!campaignMode||!enc)return;if(enc.modifier==="hunted"){const hero=chooseHuntedHero();if(hero!=null){encounterRuntime.markedHero=hero;encounterRuntime.markTurns=2;encounterRuntime.markSource="hunted";}}applyWorldRuleOnEncounterStart();renderEncounterRuleBanner?.();}
function updateEncounterEscalation(){const enc=currentEncounterObject?.();if(!campaignMode)return;const applies=enc?.modifier==="rapid_escalation"||getActiveWorldRule()==="final_gravity";if(!applies)return;const turns=encounterRuntime.enemyTurnCount||0;const next=turns>=7?2:turns>=4?1:0;if(next>encounterRuntime.escalationLevel){encounterRuntime.escalationLevel=next;queueEventPopup?.(next===1?"ESKALATION AKTIV":"ESKALATION II","danger");addLog(`Rapid Escalation: Druckstufe ${next} aktiv.`);}renderEncounterRuleBanner?.();}
function campaignAfterSuccessfulAttack(index,damage){const p=players[index],mut=ELITE_MUTATORS[p?.mutatorId];if(!campaignMode||!p)return;applyWorldRuleAfterAttack(index,damage);if(p.campaignTeam!=="enemy"||damage<=0||!mut)return;if(mut.healOnHit){const healed=applyHealingToPlayer(index,mut.healOnHit);if(healed)addLog(`${p.name} · ${mut.name}: +${healed} HP.`);}if(mut.selfOnHit&&p.hp>1){applyDamageToPlayer(index,mut.selfOnHit,"self");addLog(`${p.name} · ${mut.name}: -${mut.selfOnHit} HP.`);}if(mut.relentless)p.relentlessStacks=Math.min(3,(p.relentlessStacks||0)+1);}
function campaignHandleDeathReaction(deadIndex){if(!campaignMode)return;const enc=currentEncounterObject?.(),dead=players[deadIndex];if(!enc||dead?.campaignTeam!=="enemy")return;const definition=(enc.enemies||[]).find((enemy,i)=>`${enc.id}:${i}`===dead.enemyInstanceId);if(definition?.deathReaction?.type!=="empower_partner")return;const partner=players.find(p=>p.campaignTeam==="enemy"&&p.hp>0&&p.enemyInstanceId!==dead.enemyInstanceId);if(!partner)return;partner.relentlessStacks=Math.min(3,(partner.relentlessStacks||0)+(definition.deathReaction.amount||1));partner.aiProfile="aggressive";addLog(`${partner.name} reagiert auf den Fall von ${dead.name} und wird aggressiver.`);queueEventPopup?.("PARTNER ENRAGED","danger");}

Object.assign(ACHIEVEMENTS,{
  astral_conqueror:{name:"Astral Conqueror",desc:"Schließe den Astral Circuit ab."},void_conqueror:{name:"Void Conqueror",desc:"Schließe den Void Circuit ab."},
  eclipse_oath:{name:"Eclipse Oath",desc:"Schließe den Eclipse Pact ab."},bloodmoon_oath:{name:"Bloodmoon Oath",desc:"Schließe den Bloodmoon Pact ab."},
  prism_triad:{name:"Prism Triad",desc:"Schließe das Prism Protocol ab."},singularity_triad:{name:"Singularity Triad",desc:"Schließe das Singularity Protocol ab."},
  elite_breaker:{name:"Elite Breaker",desc:"Besiege einen Elite- oder Mini-Boss-Encounter."},clean_elite:{name:"Clean Elite",desc:"Besiege einen mutierten Elite-Encounter ohne Heilung."},
  marked_survivor:{name:"Marked Survivor",desc:"Gewinne einen Hunted-Encounter mit dem markierten Helden am Leben."},phase_walker:{name:"Phase Walker",desc:"Besiege einen Endgame-Boss nach beiden Phasenwechseln.",rewardFx:"rift"},
  rush_finale:{name:"Rush Finale",desc:"Schließe Boss Rush Stage 10 ab.",rewardFx:"crown"},no_rest_for_legends:{name:"No Rest for Legends",desc:"Schließe einen Boss Rush ohne Verschnaufpause ab."}
});
function awardEndgameEncounterAchievements(encounter,heroWon,challengeMet){if(!heroWon||!challengeMet||!encounter)return;const heroes=campaignHeroIndices().filter(i=>players[i]?.profileId);const finalMap={astral_emperor:"astral_conqueror",void_queen:"void_conqueror",duo_eclipse_sovereign:"eclipse_oath",duo_bloodmoon_empress:"bloodmoon_oath",trio_prism_archon:"prism_triad",trio_singularity_empress:"singularity_triad"};const ids=[];if(finalMap[encounter.id])ids.push(finalMap[encounter.id]);if(encounter.tags?.some(t=>t==="elite"||t==="miniboss"))ids.push("elite_breaker");if(encounter.enemies?.some(e=>e.mutator)&&heroes.every(i=>(roundStats[i]?.healed||0)===0))ids.push("clean_elite");if(encounter.modifier==="hunted"&&heroes.every(i=>players[i].hp>0))ids.push("marked_survivor");if(encounter.isBoss&&(encounterRuntime.phaseTriggeredIds?.length||0)>=2)ids.push("phase_walker");heroes.forEach(i=>ids.forEach(id=>unlockAchievementForPlayer(i,id)));}

window.WDEndgameDebug=Object.freeze({inspect(){const encounter=typeof currentEncounterObject==="function"?currentEncounterObject():null;return {worldId:encounter?.world||null,encounterId:encounter?.id||null,tags:encounter?.tags||[],worldRule:encounter?.worldRule||null,modifier:encounter?.modifier||null,objective:encounter?.challenge||null,bossPhase:encounter?BOSS_PHASES[encounter.id]||null:null,enemies:(encounter?.enemies||[]).map((enemy,index)=>({enemyDefinitionId:enemy.definitionId,enemyInstanceId:`${encounter.id}:${index}`,name:enemy.name,hp:enemy.hp,role:enemy.role,aiProfile:enemy.aiProfile,mutator:enemy.mutator,abilities:[enemy.ability,enemy.secondAbility,enemy.thirdAbility].filter(x=>x!=null)}))};},bossPhaseThresholdsCrossed,chooseHuntedHero,commitOneShotDamageBonuses,definitions:{roles:ENEMY_ROLES,aiProfiles:ENEMY_AI_PROFILES,mutators:ELITE_MUTATORS,modifiers:ENCOUNTER_MODIFIERS,worldRules:ENDGAME_WORLD_RULES}});
