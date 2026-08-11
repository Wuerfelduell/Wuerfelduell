  function currentEncounterObject(){return duoCampaignMode?duoEncounterById(duoCampaignEncounterId):campaignEncounterById(campaignEncounterId);}
  function resetEncounterRuntime(encounter){encounterRuntime={ruleIds:[...(ENCOUNTER_SPECIAL_RULES[encounter?.id]||[])],phaseRuleIds:[],phaseTriggered:false,firstStrikeUsed:new Set(),armorUsed:new Set(),turnStarts:{}};}
  function encounterRuleActive(id){return !!campaignMode && (encounterRuntime.ruleIds.includes(id)||encounterRuntime.phaseRuleIds.includes(id));}
  function encounterRuleText(encounter){const ids=ENCOUNTER_SPECIAL_RULES[encounter?.id]||[];return ids.map(id=>SPECIAL_RULES[id]).filter(Boolean);}
  function bossPhaseFor(encounter){return BOSS_PHASES[encounter?.id]||null;}
  function profileCosmeticTitle(profile){const id=profile?.prestigeCosmetics?.selectedTitle;const item=PRESTIGE_SHOP_ITEMS.find(x=>x.id===id&&x.type==="title");return item?.value||"";}
  function profileCosmeticFrame(profile){const id=profile?.prestigeCosmetics?.selectedFrame;const item=PRESTIGE_SHOP_ITEMS.find(x=>x.id===id&&x.type==="frame");return item?.value||"";}
  function playerCosmeticsFromProfile(profile){return {cosmeticTitle:profileCosmeticTitle(profile),cosmeticFrame:profileCosmeticFrame(profile)};}
  function encounterVoluntaryCost(base){return Math.max(0,base+(encounterRuleActive("blood_tax")?1:0));}
  function encounterHealAmount(index,base){return Math.max(0,base+(campaignMode&&encounterRuleActive("blood_moon")?1:0));}
  function renderEncounterRuleBanner(){
    if(!encounterRuleBanner) return;
    if(!campaignMode){encounterRuleBanner.classList.add("hidden");encounterRuleBanner.innerHTML="";return;}
    const enc=currentEncounterObject(),staticRules=encounterRuleText(enc),phase=bossPhaseFor(enc);
    const parts=staticRules.map(r=>`<strong>⚙ ${escapeHtml(r.name)}:</strong> ${escapeHtml(r.desc)}`);
    if(phase) parts.push(encounterRuntime.phaseTriggered?`<span class="phase-live">👹 PHASE II AKTIV · ${escapeHtml(phase.title)}</span>`:`👹 Phase II bei ${Math.round((phase.threshold||.5)*100)} % Boss-HP · ${escapeHtml(phase.title)}`);
    encounterRuleBanner.classList.toggle("hidden",parts.length===0);encounterRuleBanner.innerHTML=parts.join("<br>");
  }
  function campaignHeroIndices(){
    return players.map((p,i)=>p?.campaignTeam==="hero"?i:null).filter(i=>i!=null);
  }

  function campaignAttackSwitchesFor(heroIndex){
    const seq=(campaignMetrics.attackSequence||[]).filter(a=>String(a.hero)===String(heroIndex));
    let n=0;for(let i=1;i<seq.length;i++) if(seq[i].target!==seq[i-1].target) n++;
    return n;
  }

  function campaignFocusPasses(){
    const seq=campaignMetrics.attackSequence||[];let n=0;
    for(let i=1;i<seq.length;i++) if(seq[i].hero!==seq[i-1].hero&&seq[i].target===seq[i-1].target)n++;
    return n;
  }

  function campaignSharedTargetsCount(){
    const ids=campaignHeroIndices();if(ids.length<2)return 0;
    const sets=ids.map(i=>new Set(Object.keys(campaignMetrics.attackTargetsByHero?.[String(i)]||{})));
    return [...sets[0]].filter(k=>sets.slice(1).every(set=>set.has(k))).length;
  }

  function campaignMatchedPrefix(actual,expected){
    let n=0;while(n<actual.length&&n<expected.length&&actual[n]===expected[n])n++;return n;
  }

  function campaignChallengeProgressInfo(c,heroIndex){
    const heroes=campaignHeroIndices(),heroPos=i=>Math.max(0,heroes.indexOf(i))+1;
    const stat=i=>roundStats[i]||{};
    const need=n=>Math.max(0,Number(n)||0);
    const abilityName=id=>ABILITIES[id]?.name||`Fähigkeit ${id}`;
    let label=c?.text||c?.type||"Aufgabe",value="",failed=false;
    if(!c)return {label:"Aufgabe",value:"–",failed:false};
    switch(c.type){
      case "win": label="Encounter gewinnen";value="am Ende";break;
      case "base_over_25": label="Basiswurf über 25";value=campaignMetrics.baseOver25?"geschafft":"offen";break;
      case "turn_damage": label="Rohschaden in einem Zug";value=`${campaignMetrics.maxRawTurnDamage||0} / ${need(c.value)}`;break;
      case "finish_hp": label="HP beim Sieg";value=`aktuell ${Math.max(0,players[heroIndex]?.hp||0)} · Ziel ≥${need(c.value)}`;break;
      case "self_damage_max": {const v=stat(heroIndex).selfDamage||0;label="Eigenschaden maximal";value=`${v} / ${need(c.value)}`;failed=v>need(c.value);break;}
      case "self_damage_min": label="Eigenschaden";value=`${stat(heroIndex).selfDamage||0} / ${need(c.value)}`;break;
      case "voluntary_hp_min": label="Freiwillig bezahlte HP";value=`${stat(heroIndex).voluntaryHp||0} / ${need(c.value)}`;break;
      case "healed_min": label="Geheilte HP";value=`${stat(heroIndex).healed||0} / ${need(c.value)}`;break;
      case "twelve_triggers_min": label="12-Trigger";value=`${stat(heroIndex).twelveTriggers||0} / ${need(c.value)}`;break;
      case "attack_hits_min": label="Bester Angriff · Treffer";value=`${campaignMetrics.maxAttackHits||0} / ${need(c.value)}`;break;
      case "damage_targets_min": {const v=Object.values(campaignMetrics.rawDamageByTarget||{}).filter(x=>(Number(x)||0)>0).length;label="Verschiedene Ziele beschädigt";value=`${v} / ${need(c.value)}`;break;}
      case "kill_first_name": {const first=campaignMetrics.killOrder?.[0];label=`Erster Kill: ${c.name}`;value=first||"offen";failed=!!first&&first!==c.name;break;}
      case "kill_last_name": {const last=campaignMetrics.killOrder?.at(-1);label=`Letzter Kill: ${c.name}`;value=last?`aktuell ${last}`:"offen";break;}
      case "kill_sequence_names": {const actual=campaignMetrics.killOrder||[],expected=c.names||[],m=campaignMatchedPrefix(actual,expected);label="Kill-Reihenfolge";value=`${m} / ${expected.length}`;failed=actual.length>m;break;}
      case "active_ability_uses_max": {const ids=[3,4,11,13,18,20],v=ids.reduce((sum,id)=>sum+(campaignMetrics.abilityUses?.[String(id)]||0),0);label="Aktive Fähigkeiten maximal";value=`${v} / ${need(c.value)}`;failed=v>need(c.value);break;}
      case "ability_use": label=`${abilityName(c.ability)} benutzt`;value=`${campaignMetrics.abilityUses?.[String(c.ability)]||0} / ${need(c.count||1)}`;break;
      case "ability_success": label=`${abilityName(c.ability)} erfolgreich`;value=`${campaignMetrics.abilitySuccesses?.[String(c.ability)]||0} / ${need(c.count||1)}`;break;
      case "secondary_unlocked": label="2. Fähigkeit freigeschaltet";value=players[heroIndex]?.secondAbilityUnlocked?"ja":"nein";break;
      case "each_hero_ability_success": label=`${abilityName(c.ability)} je Spieler`;value=heroes.map((i,n)=>`P${n+1} ${campaignMetrics.abilitySuccessesByHero?.[String(i)]?.[String(c.ability)]||0}/${need(c.count||1)}`).join(" · ");break;
      case "all_heroes_survive": {const alive=heroes.filter(i=>players[i]?.hp>0).length;label="Beide überleben";value=`${alive} / ${heroes.length}`;failed=alive<heroes.length;break;}
      case "each_hero_attack": label="Jeder greift an";value=heroes.map((i,n)=>`P${n+1} ${(campaignMetrics.heroAttacks?.[String(i)]||0)>0?"✓":"0"}`).join(" · ");break;
      case "each_hero_ability_use": label=`${abilityName(c.ability)} je Spieler`;value=heroes.map((i,n)=>`P${n+1} ${campaignMetrics.abilityUsesByHero?.[String(i)]?.[String(c.ability)]||0}/${need(c.count||1)}`).join(" · ");break;
      case "team_healed_min": {const v=heroes.reduce((sum,i)=>sum+(stat(i).healed||0),0);label="Team-Heilung";value=`${v} / ${need(c.value)}`;break;}
      case "team_self_damage_min": {const v=heroes.reduce((sum,i)=>sum+(stat(i).selfDamage||0),0);label="Team-Eigenschaden";value=`${v} / ${need(c.value)}`;break;}
      case "each_hero_self_damage_min": label="Eigenschaden je Spieler";value=heroes.map((i,n)=>`P${n+1} ${stat(i).selfDamage||0}/${need(c.value)}`).join(" · ");break;
      case "each_hero_healed_min": label="Heilung je Spieler";value=heroes.map((i,n)=>`P${n+1} ${stat(i).healed||0}/${need(c.value)}`).join(" · ");break;
      case "all_heroes_secondary_unlocked": label="2. Fähigkeit bei beiden";value=heroes.map((i,n)=>`P${n+1} ${players[i]?.secondAbilityUnlocked?"✓":"–"}`).join(" · ");break;
      case "exactly_one_hero_survives": {const alive=heroes.filter(i=>players[i]?.hp>0).length;label="Genau 1 Spieler überlebt";value=`aktuell ${alive}`;break;}
      case "team_voluntary_hp_min": {const v=heroes.reduce((sum,i)=>sum+(stat(i).voluntaryHp||0),0);label="Freiwillige Team-HP";value=`${v} / ${need(c.value)}`;break;}
      case "each_hero_voluntary_hp_min": label="Freiwillige HP je Spieler";value=heroes.map((i,n)=>`P${n+1} ${stat(i).voluntaryHp||0}/${need(c.value)}`).join(" · ");break;
      case "each_hero_turn_damage": label="Zugschaden je Spieler";value=heroes.map((i,n)=>`P${n+1} ${campaignMetrics.maxRawTurnDamageByHero?.[String(i)]||0}/${need(c.value)}`).join(" · ");break;
      case "team_raw_damage": {const v=Object.values(campaignMetrics.rawDamageByHero||{}).reduce((a,b)=>a+(Number(b)||0),0);label="Team-Rohschaden";value=`${v} / ${need(c.value)}`;break;}
      case "each_hero_targets_min": label="Ziele je Spieler";value=heroes.map((i,n)=>`P${n+1} ${Object.keys(campaignMetrics.attackTargetsByHero?.[String(i)]||{}).length}/${need(c.value)}`).join(" · ");break;
      case "shared_targets_min": label="Gemeinsam angegriffene Ziele";value=`${campaignSharedTargetsCount()} / ${need(c.value)}`;break;
      case "each_hero_attack_hits_min": label="Bester Treffer-Angriff je Spieler";value=heroes.map((i,n)=>`P${n+1} ${campaignMetrics.maxAttackHitsByHero?.[String(i)]||0}/${need(c.value)}`).join(" · ");break;
      case "each_hero_kill_min": label="Kills je Spieler";value=heroes.map((i,n)=>`P${n+1} ${campaignMetrics.killsByHero?.[String(i)]||0}/${need(c.value)}`).join(" · ");break;
      case "alternating_hero_kills": {const n=need(c.value||2),seq=(campaignMetrics.killHeroes||[]).slice(0,n),good=seq.every((h,i)=>i===0||h!==seq[i-1]);label="Abwechselnde Kills";value=`${Math.min(seq.length,n)} / ${n}`;failed=seq.length>1&&!good;break;}
      case "hero_attacks_min": label="Eigene Angriffe";value=`${campaignMetrics.heroAttacks?.[String(heroIndex)]||0} / ${need(c.value)}`;break;
      case "each_hero_attacks_min": label="Angriffe je Spieler";value=heroes.map((i,n)=>`P${n+1} ${campaignMetrics.heroAttacks?.[String(i)]||0}/${need(c.value)}`).join(" · ");break;
      case "first_kill_after_targets_min": {const v=campaignMetrics.firstKillDistinctTargets||0;const killed=(campaignMetrics.killOrder||[]).length>0;label="Ziele vor dem ersten Kill";value=`${v} / ${need(c.value)}`;failed=killed&&v<need(c.value);break;}
      case "attack_target_sequence_names": {const seq=(campaignMetrics.attackSequence||[]).filter(a=>String(a.hero)===String(heroIndex)).map(a=>a.name),expected=c.names||[],m=campaignMatchedPrefix(seq,expected);label="Angriffs-Zielreihenfolge";value=`${m} / ${expected.length}`;failed=seq.length>m;break;}
      case "target_switches_min": label="Zielwechsel";value=`${campaignAttackSwitchesFor(heroIndex)} / ${need(c.value)}`;break;
      case "attack_heroes_alternate_min": {const n=need(c.value||2),seq=(campaignMetrics.attackSequence||[]).slice(0,n),good=seq.every((a,i)=>i===0||a.hero!==seq[i-1].hero);label="Abwechselnde Duo-Angriffe";value=`${Math.min(seq.length,n)} / ${n}`;failed=seq.length>1&&!good;break;}
      case "focus_passes_min": label="Fokus-Pässe";value=`${campaignFocusPasses()} / ${need(c.value)}`;break;
      case "hero_kill_name": {const wanted=heroes[(c.hero||1)-1],idx=(campaignMetrics.killOrder||[]).indexOf(c.name),killer=idx>=0?campaignMetrics.killHeroes?.[idx]:null;label=`P${c.hero||1} eliminiert ${c.name}`;value=idx<0?"offen":String(killer)===String(wanted)?"geschafft":"falscher Spieler";failed=idx>=0&&String(killer)!==String(wanted);break;}
      case "kill_hero_pattern": {const pat=c.pattern||[],actual=(campaignMetrics.killHeroes||[]).slice(0,pat.length).map(h=>heroes.indexOf(Number.isInteger(h)?h:+h)+1),m=campaignMatchedPrefix(actual,pat);label="Finisher-Muster";value=`${m} / ${pat.length}`;failed=actual.length>m;break;}
      case "each_hero_attacked_name": {const seq=campaignMetrics.attackSequence||[];label=`Beide greifen ${c.name} an`;value=heroes.map((i,n)=>`P${n+1} ${seq.some(a=>String(a.hero)===String(i)&&a.name===c.name)?"✓":"–"}`).join(" · ");break;}
    }
    return {label,value,failed};
  }

  function renderCampaignTaskProgress(){
    if(!campaignTaskProgress)return;
    if(!campaignMode){campaignTaskProgress.classList.add("hidden");campaignTaskProgress.innerHTML="";return;}
    const encounter=currentEncounterObject(),heroIndex=campaignHeroIndices()[0];
    if(!encounter?.challenge||heroIndex==null){campaignTaskProgress.classList.add("hidden");campaignTaskProgress.innerHTML="";return;}
    const rules=encounter.challenge.type==="all"?(encounter.challenge.rules||[]):[encounter.challenge];
    const rows=rules.map(rule=>{
      const met=campaignChallengeRuleMet(rule,heroIndex),info=campaignChallengeProgressInfo(rule,heroIndex),state=met?"done":info.failed?"failed":"";
      return `<div class="campaign-task-line ${state}"><span class="campaign-task-mark">${met?"✓":info.failed?"✕":"•"}</span><span class="campaign-task-label">${escapeHtml(info.label)}</span><strong>${escapeHtml(info.value||"")}</strong></div>`;
    }).join("");
    const overall=campaignChallengeRuleMet(encounter.challenge,heroIndex);
    campaignTaskProgress.classList.remove("hidden");
    campaignTaskProgress.title=encounter.challenge.text||"";
    campaignTaskProgress.innerHTML=`<div class="campaign-task-head"><span>🎯 Aufgabenfortschritt</span><strong>${overall?"ERFÜLLT":"LIVE"}</strong></div>${rows}`;
  }

  function checkBossPhase(targetIndex,beforeHp,afterHp){
    if(!campaignMode||encounterRuntime.phaseTriggered||afterHp<=0) return false;
    const enc=currentEncounterObject(),phase=bossPhaseFor(enc),target=players[targetIndex];
    if(!phase||!target||target.campaignTeam!=="enemy"||target.name!==phase.boss) return false;
    const threshold=Math.floor(maxHpForPlayer(target)*(phase.threshold||.5));
    if(beforeHp>threshold && afterHp<=threshold){
      encounterRuntime.phaseTriggered=true;
      if(phase.rule&&!encounterRuntime.phaseRuleIds.includes(phase.rule)) encounterRuntime.phaseRuleIds.push(phase.rule);
      if(phase.ability!=null) target.ability=phase.ability;
      if(phase.secondAbility!=null) target.secondAbility=phase.secondAbility;
      if(phase.heal){const before=target.hp;target.hp=Math.min(maxHpForPlayer(target),target.hp+phase.heal);const healed=target.hp-before;if(healed>0) pendingExtraHealFx.push({target:targetIndex,amount:healed});}
      queueEventPopup(`PHASE II · ${phase.title}`,"death");
      addLog(`👹 PHASE II – ${phase.title}: ${phase.desc}`);
      renderEncounterRuleBanner();renderPlayers();
      return true;
    }
    return false;
  }
  function applyEncounterTurnStartRule(index){
    if(!campaignMode||players[index]?.campaignTeam!=="hero"||!encounterRuleActive("void_clock")) return;
    const key=String(index),count=(encounterRuntime.turnStarts[key]||0)+1;encounterRuntime.turnStarts[key]=count;
    if(count<2||players[index].hp<=1) return;
    const result=applyDamageToPlayer(index,1,"self"),lost=result.lost;
    if(lost>0){recordSelfDamage(index,lost);players[index].damageSinceLastOwnTurn=true;pendingDamage={target:index,amount:lost};addLog(`⌛ Void Clock: ${players[index].name} verliert beim Zugstart ${lost} HP.`);}
  }

  function freshCampaignMetrics(){return {baseOver25:false,maxRawTurnDamage:0,currentRawTurnDamage:0,abilityUses:{},abilitySuccesses:{},abilityUsesByHero:{},abilitySuccessesByHero:{},heroAttacks:{},attackTargetsByHero:{},attackSequence:[],rawDamageByHero:{},rawDamageByTarget:{},currentRawTurnDamageByHero:{},maxRawTurnDamageByHero:{},maxAttackHits:0,maxAttackHitsByHero:{},firstKillDistinctTargets:0,killOrder:[],killHeroes:[],killsByHero:{}};}
  function markCampaignAbilityUse(index,abilityId,amount=1){
    if(!campaignMode || index==null || players[index]?.campaignTeam!=="hero") return;
    const key=String(abilityId),heroKey=String(index),inc=Math.max(0,amount||0);
    campaignMetrics.abilityUses[key]=(campaignMetrics.abilityUses[key]||0)+inc;
    if(!campaignMetrics.abilityUsesByHero[heroKey]) campaignMetrics.abilityUsesByHero[heroKey]={};
    campaignMetrics.abilityUsesByHero[heroKey][key]=(campaignMetrics.abilityUsesByHero[heroKey][key]||0)+inc;
  }
  function markCampaignAbilitySuccess(index,abilityId,amount=1){
    if(!campaignMode || index==null || players[index]?.campaignTeam!=="hero") return;
    const key=String(abilityId),heroKey=String(index),inc=Math.max(0,amount||0);
    campaignMetrics.abilitySuccesses[key]=(campaignMetrics.abilitySuccesses[key]||0)+inc;
    if(!campaignMetrics.abilitySuccessesByHero[heroKey]) campaignMetrics.abilitySuccessesByHero[heroKey]={};
    campaignMetrics.abilitySuccessesByHero[heroKey][key]=(campaignMetrics.abilitySuccessesByHero[heroKey][key]||0)+inc;
  }
  let campaignMetrics=freshCampaignMetrics();
  let gameContext={mode:"menu",returnScreen:"menu",profileId:null,encounterId:null};
  let pendingCampaignAttackStart=null;


  function duoTeamKey(profile1OrId,profile2OrId){
    const a=typeof profile1OrId==="string"?profile1OrId:profile1OrId?.id;
    const b=typeof profile2OrId==="string"?profile2OrId:profile2OrId?.id;
    if(!a||!b||a===b) return null;
    return [String(a),String(b)].sort().join("::");
  }

  function duoCampaignProgress(profile1,profile2,create=true){
    const key=duoTeamKey(profile1,profile2);
    if(!key) return null;
    if(!saveData.duoCampaigns || typeof saveData.duoCampaigns!=="object" || Array.isArray(saveData.duoCampaigns)) saveData.duoCampaigns={};
    let progress=saveData.duoCampaigns[key];
    if(!progress && create){progress=defaultDuoProgress(profile1.id,profile2.id);saveData.duoCampaigns[key]=progress;}
    if(!progress) return null;
    progress.profileIds=[profile1.id,profile2.id].sort();
    progress.completedEncounters=Array.isArray(progress.completedEncounters)?[...new Set(progress.completedEncounters.map(String).filter(Boolean))]:[];
    progress.wins=Math.max(0,Math.floor(Number(progress.wins)||0));
    progress.losses=Math.max(0,Math.floor(Number(progress.losses)||0));
    progress.campaignVersion=Math.max(Number(progress.campaignVersion)||1,CAMPAIGN_VERSION);
    return progress;
  }

  function profileUnlocksDuo(profile){
    return !!campaignProgress(profile)?.completedEncounters?.includes("black_table");
  }

  function duoCampaignUnlocked(profile1,profile2){
    return !!profile1 && !!profile2 && profile1.id!==profile2.id && profileUnlocksDuo(profile1);
  }

  function duoEncounterById(id){return DUO_CAMPAIGN_ENCOUNTERS.find(e=>e.id===id)||null;}
  function duoWorldById(id){return DUO_CAMPAIGN_WORLDS.find(w=>w.id===id)||null;}
  function duoEncountersForWorld(worldId){return DUO_CAMPAIGN_ENCOUNTERS.filter(e=>(e.world||"covenant")===worldId);}
  function duoWorldUnlocked(profile1,profile2,worldOrId){
    const world=typeof worldOrId==="string"?duoWorldById(worldOrId):worldOrId;
    if(!duoCampaignUnlocked(profile1,profile2)||!world) return false;
    const progress=duoCampaignProgress(profile1,profile2);
    return (world.unlockRequires||[]).every(id=>progress.completedEncounters.includes(id));
  }
  function isDuoWorldComplete(profile1,profile2,worldId){
    const world=duoWorldById(worldId),progress=duoCampaignProgress(profile1,profile2,false);
    return !!world&&!!progress&&progress.completedEncounters.includes(world.finalEncounterId);
  }

  function duoEncounterAvailable(profile1,profile2,encounter){
    if(!duoCampaignUnlocked(profile1,profile2)||!encounter) return false;
    if(!duoWorldUnlocked(profile1,profile2,encounter.world||"covenant")) return false;
    const progress=duoCampaignProgress(profile1,profile2);
    if(progress.completedEncounters.includes(encounter.id)) return true;
    return (encounter.requires||[]).every(id=>progress.completedEncounters.includes(id));
  }

  function defaultDuoEncounter(profile1,profile2,worldId=duoWorldId){
    const world=duoWorldById(worldId)||DUO_CAMPAIGN_WORLDS[0];
    const worldEncounters=duoEncountersForWorld(world.id);
    const progress=duoCampaignProgress(profile1,profile2,false);
    if(!progress) return worldEncounters[0]||null;
    return worldEncounters.find(e=>!progress.completedEncounters.includes(e.id)&&duoEncounterAvailable(profile1,profile2,e))
      || (progress.completedEncounters.includes(world.finalEncounterId)?duoEncounterById(world.finalEncounterId):worldEncounters[0]);
  }

  function campaignProgress(profile){
    if(!profile) return null;
    if(!profile.campaign) profile.campaign=defaultCampaignProgress();
    return profile.campaign;
  }

  function campaignEncounterById(id){
    return CAMPAIGN_ENCOUNTERS.find(e=>e.id===id)||null;
  }

  function campaignWorldById(id){
    return CAMPAIGN_WORLDS.find(w=>w.id===id)||null;
  }

  function campaignEncountersForWorld(worldId){
    return CAMPAIGN_ENCOUNTERS.filter(e=>(e.world||"house")===worldId);
  }

  function campaignWorldUnlocked(profile,worldOrId){
    const world=typeof worldOrId==="string"?campaignWorldById(worldOrId):worldOrId;
    const progress=campaignProgress(profile);
    if(!world || !progress) return false;
    const requires=Array.isArray(world.unlockRequires)?world.unlockRequires:[];
    return requires.every(id=>progress.completedEncounters.includes(id));
  }

  function campaignEncounterAvailable(profile,encounterOrIndex){
    const progress=campaignProgress(profile);
    const encounter=typeof encounterOrIndex==="number"?CAMPAIGN_ENCOUNTERS[encounterOrIndex]:encounterOrIndex;
    if(!progress || !encounter) return false;
    if(!campaignWorldUnlocked(profile,encounter.world||"house")) return false;
    if(progress.completedEncounters.includes(encounter.id)) return true;
    const requires=Array.isArray(encounter.requires)?encounter.requires:[];
    return requires.every(id=>progress.completedEncounters.includes(id));
  }

  function campaignCurrentCompletedCount(profile,worldId=campaignWorldId){
    const done=new Set(campaignProgress(profile)?.completedEncounters||[]);
    return campaignEncountersForWorld(worldId).reduce((n,e)=>n+(done.has(e.id)?1:0),0);
  }

  function isCampaignWorldComplete(profile,worldId){
    const world=campaignWorldById(worldId);
    if(!world || !campaignWorldUnlocked(profile,world)) return false;
    const done=new Set(campaignProgress(profile)?.completedEncounters||[]);
    return !!world.finalEncounterId && done.has(world.finalEncounterId);
  }

  function isCampaignComplete(profile){
    return CAMPAIGN_WORLDS.every(w=>campaignWorldUnlocked(profile,w) && isCampaignWorldComplete(profile,w.id));
  }

  function defaultCampaignEncounter(profile,worldId=campaignWorldId){
    const worldEncounters=campaignEncountersForWorld(worldId);
    if(!worldEncounters.length) return CAMPAIGN_ENCOUNTERS[0]||null;
    if(!profile) return worldEncounters[0]||null;
    const progress=campaignProgress(profile);
    const openIncomplete=worldEncounters.find(e=>!progress.completedEncounters.includes(e.id)&&campaignEncounterAvailable(profile,e));
    if(openIncomplete) return openIncomplete;
    const world=campaignWorldById(worldId);
    const finalDone=campaignEncounterById(world?.finalEncounterId);
    if(finalDone && progress.completedEncounters.includes(finalDone.id)) return finalDone;
    return worldEncounters.find(e=>progress.completedEncounters.includes(e.id)) || worldEncounters[0] || null;
  }

  function campaignUnlockedAbilities(profile){
    const progress=campaignProgress(profile);
    return progress
      ? [...new Set(progress.unlockedAbilities)].filter(id=>ABILITIES[id]&&!CAMPAIGN_SECONDARY_ONLY_ABILITY_IDS.includes(id))
      : [...CAMPAIGN_START_ABILITIES];
  }

  function campaignUnlockedSecondAbilities(profile){
    const progress=campaignProgress(profile);
    if(!progress) return [...CAMPAIGN_START_ABILITIES];
    return [...new Set([
      ...campaignUnlockedAbilities(profile),
      ...(Array.isArray(progress.unlockedSecondaryAbilities)?progress.unlockedSecondaryAbilities:[])
    ])].filter(id=>ABILITIES[id]);
  }

  function campaignHasAllMainAbilities(profile){
    const owned=new Set(campaignUnlockedAbilities(profile));
    return CAMPAIGN_PRESTIGE_REQUIRED_IDS.every(id=>owned.has(id));
  }

  function campaignRewardLabel(profile,encounter){
    if(!encounter) return "–";
    const progress=campaignProgress(profile);
    const parts=[];
    if(encounter.rewardAbility){
      const already=!!progress?.unlockedAbilities?.includes(encounter.rewardAbility);
      parts.push(`${already?"✓":"🔓"} ${ABILITIES[encounter.rewardAbility]?.name||`Fähigkeit ${encounter.rewardAbility}`}`);
    }
    if(encounter.rewardSecondaryAbility){
      const already=!!progress?.unlockedSecondaryAbilities?.includes(encounter.rewardSecondaryAbility);
      parts.push(`${already?"✓":"🍀"} ${ABILITIES[encounter.rewardSecondaryAbility]?.name||`Fähigkeit ${encounter.rewardSecondaryAbility}`} · nur Zweitfähigkeit ≤12 HP`);
    }
    if(encounter.farmTrophy){
      parts.push("🏆 1 Trophäe pro erfolgreichem Clear");
    }else if(campaignHasAllMainAbilities(profile) || (!encounter.rewardAbility && !encounter.rewardSecondaryAbility)){
      parts.push("🏆 1 Prestige-Trophäe bei erfolgreichem Clear");
    }
    return parts.length?parts.join(" · "):"Fortschritt";
  }

  function renderCampaign(){
    const previous=campaignProfileSelect.value || campaignProfileId || saveData.profiles[0]?.id || "";
    campaignProfileSelect.innerHTML="";
    if(!saveData.profiles.length){
      const opt=document.createElement("option");opt.value="";opt.textContent="Kein Profil vorhanden";campaignProfileSelect.appendChild(opt);
    }else{
      saveData.profiles.forEach(p=>{
        const opt=document.createElement("option");opt.value=p.id;opt.textContent=`${p.name} #${p.tagNumber}`;campaignProfileSelect.appendChild(opt);
      });
      campaignProfileSelect.value=getProfile(previous)?previous:saveData.profiles[0].id;
    }

    const profile=getProfile(campaignProfileSelect.value);
    campaignProfileId=profile?.id||null;
    const progress=campaignProgress(profile);

    if(profile && !campaignWorldUnlocked(profile,campaignWorldId)){
      campaignWorldId=CAMPAIGN_WORLDS.find(w=>campaignWorldUnlocked(profile,w))?.id||"house";
      campaignEncounterId=null;
    }
    const world=campaignWorldById(campaignWorldId)||CAMPAIGN_WORLDS[0];
    const worldEncounters=campaignEncountersForWorld(world.id);
    const completed=profile?campaignCurrentCompletedCount(profile,world.id):0;
    const worldComplete=profile?isCampaignWorldComplete(profile,world.id):false;
    const campaignComplete=profile?isCampaignComplete(profile):false;

    campaignWorldTabs.innerHTML=CAMPAIGN_WORLDS.map(w=>{
      const unlocked=!!profile && campaignWorldUnlocked(profile,w);
      const done=unlocked && isCampaignWorldComplete(profile,w.id);
      const active=w.id===world.id;
      let state=unlocked?(done?"✓ Abgeschlossen":`${campaignCurrentCompletedCount(profile,w.id)} / ${campaignEncountersForWorld(w.id).length}`):(w.lockedText||"🔒 Gesperrt");
      return `<button type="button" class="campaign-world-btn${active?" active":""}${done?" done":""}" data-world-id="${w.id}" ${unlocked?"":"disabled"}><span class="campaign-world-name">${escapeHtml(w.name)}</span><span class="campaign-world-state">${escapeHtml(state)}</span></button>`;
    }).join("");
    campaignWorldTabs.querySelectorAll("[data-world-id]").forEach(btn=>{
      btn.onclick=()=>{campaignWorldId=btn.dataset.worldId;campaignEncounterId=null;renderCampaign();};
    });
    campaignWorldDesc.textContent=world.desc;

    campaignProfileSummary.textContent=profile?profileLabel(profile):"Profil erforderlich";
    campaignProgressSummary.textContent=`${completed} / ${worldEncounters.length} Encounter`;
    const prestige=!!profile && campaignHasAllMainAbilities(profile);
    campaignTrophySummary.textContent=profile?`🏆 ${Math.max(0,progress?.trophies||0)}${prestige?" · PRESTIGE":""}`:"🏆 0";

    campaignCompleteBanner.classList.toggle("hidden",!worldComplete);
    if(worldComplete){
      campaignCompleteBanner.innerHTML=campaignComplete
        ? `🏆 <strong>Alle aktuellen Welten abgeschlossen.</strong> Dein Fortschritt bleibt für spätere Erweiterungen erhalten.`
        : `🏆 <strong>${escapeHtml(world.shortName)} abgeschlossen.</strong> Du kannst über die Welt-Auswahl jederzeit zwischen den freigeschalteten Welten wechseln.`;
    }

    const unlocked=campaignUnlockedAbilities(profile);
    const oldAbility=+campaignAbilitySelect.value;
    campaignAbilitySelect.innerHTML="";
    unlocked.forEach(id=>{
      const opt=document.createElement("option");opt.value=id;opt.textContent=`${id} · ${ABILITIES[id].name}`;campaignAbilitySelect.appendChild(opt);
    });
    if(unlocked.includes(oldAbility)) campaignAbilitySelect.value=String(oldAbility);

    let selectedEncounter=campaignEncounterById(campaignEncounterId);
    if(!selectedEncounter || selectedEncounter.world!==world.id || !profile || !campaignEncounterAvailable(profile,selectedEncounter)){
      selectedEncounter=profile?defaultCampaignEncounter(profile,world.id):worldEncounters[0];
      campaignEncounterId=selectedEncounter?.id||null;
    }
    gameContext.profileId=profile?.id||gameContext.profileId;
    gameContext.encounterId=campaignEncounterId||gameContext.encounterId;

    campaignPath.innerHTML=worldEncounters.map((e,i)=>{
      const done=!!progress?.completedEncounters?.includes(e.id),available=!!profile&&campaignEncounterAvailable(profile,e),current=available&&e.id===campaignEncounterId;
      const num=i+1,isBoss=num===10||num===15,isWorldBoss=num===15,mark=done?(e.farmTrophy?"🏆":"✓"):available?(current?"▶":""):"🔒";
      return `<button type="button" class="campaign-node${done?" done":""}${current?" current":""}${available?"":" locked"}${isBoss?" boss":""}${isWorldBoss?" world-boss":""}" data-campaign-id="${e.id}" ${available?"":"disabled"}><span>${num}</span>${mark?`<span class="node-mark">${mark}</span>`:""}</button>`;
    }).join("");
    campaignPath.querySelectorAll("[data-campaign-id]").forEach(btn=>btn.onclick=()=>{campaignEncounterId=btn.dataset.campaignId;gameContext.encounterId=campaignEncounterId;renderCampaign();});
    if(selectedEncounter){const done=!!progress?.completedEncounters?.includes(selectedEncounter.id),available=!!profile&&campaignEncounterAvailable(profile,selectedEncounter),reward=campaignRewardLabel(profile,selectedEncounter),rules=encounterRuleText(selectedEncounter),phase=bossPhaseFor(selectedEncounter);campaignEncounterDetail.innerHTML=`<div class="node-detail-head"><div><div class="node-detail-title">${escapeHtml(selectedEncounter.title)}</div><div class="node-detail-sub">${escapeHtml(selectedEncounter.subtitle)}</div></div><div class="node-detail-state">${done?(selectedEncounter.farmTrophy?"🏆 FARM":"✓ GESCHAFFT"):available?"OFFEN":"🔒 GESPERRT"}</div></div><div class="node-detail-desc">${escapeHtml(selectedEncounter.desc)}</div><div class="node-detail-row">🎯 <strong>Challenge:</strong> ${escapeHtml(selectedEncounter.challenge.text)}</div><div class="node-detail-row">🎁 <strong>Belohnung:</strong> ${escapeHtml(reward)}</div>${rules.map(r=>`<div class="node-detail-row node-detail-rule">⚙ <strong>${escapeHtml(r.name)}:</strong> ${escapeHtml(r.desc)}</div>`).join("")}${phase?`<div class="node-detail-row node-detail-phase">👹 <strong>Boss-Phase bei ${Math.round((phase.threshold||.5)*100)} %:</strong> ${escapeHtml(phase.title)} · ${escapeHtml(phase.desc)}</div>`:""}`;}else campaignEncounterDetail.innerHTML="";

    const secondaryUnlocked=new Set(progress?.unlockedSecondaryAbilities||[]);
    campaignAbilityGrid.innerHTML=REAL_ABILITY_IDS.map(id=>{
      const secondOnly=CAMPAIGN_SECONDARY_ONLY_ABILITY_IDS.includes(id);
      const on=secondOnly?secondaryUnlocked.has(id):unlocked.includes(id);
      const suffix=secondOnly?" · nur Zweitfähigkeit ≤12 HP":"";
      return `<span class="campaign-ability-chip${on?"":" locked"}">${on?(secondOnly?"✦":"✓"):"🔒"} ${id} · ${escapeHtml(ABILITIES[id].name)}${suffix}</span>`;
    }).join("");

    campaignStartBtn.disabled=!profile || !campaignEncounterById(campaignEncounterId) || !unlocked.length;
  }

  function renderDuoCampaign(){
    const profiles=saveData.profiles||[];
    const old1=duoProfile1Select.value||duoProfile1Id||profiles[0]?.id||"";
    const old2=duoProfile2Select.value||duoProfile2Id||profiles.find(p=>p.id!==old1)?.id||"";
    const fillProfiles=(select,preferred)=>{
      select.innerHTML="";
      if(!profiles.length){const o=document.createElement("option");o.value="";o.textContent="Kein Profil vorhanden";select.appendChild(o);return;}
      profiles.forEach(p=>{const o=document.createElement("option");o.value=p.id;o.textContent=`${p.name} #${p.tagNumber}`;select.appendChild(o);});
      select.value=getProfile(preferred)?preferred:profiles[0].id;
    };
    fillProfiles(duoProfile1Select,old1);fillProfiles(duoProfile2Select,old2);
    if(duoProfile2Select.value===duoProfile1Select.value){const alt=profiles.find(p=>p.id!==duoProfile1Select.value);if(alt)duoProfile2Select.value=alt.id;}

    const p1=getProfile(duoProfile1Select.value),p2=getProfile(duoProfile2Select.value);
    duoProfile1Id=p1?.id||null;duoProfile2Id=p2?.id||null;
    const validPair=!!p1&&!!p2&&p1.id!==p2.id;
    const baseUnlocked=validPair&&duoCampaignUnlocked(p1,p2);
    const progress=validPair?duoCampaignProgress(p1,p2):null;

    if(validPair&&baseUnlocked&&!duoWorldUnlocked(p1,p2,duoWorldId)){
      duoWorldId=DUO_CAMPAIGN_WORLDS.find(w=>duoWorldUnlocked(p1,p2,w))?.id||"covenant";duoCampaignEncounterId=null;
    }
    const world=duoWorldById(duoWorldId)||DUO_CAMPAIGN_WORLDS[0];
    const worldUnlocked=validPair&&duoWorldUnlocked(p1,p2,world);
    const worldEncounters=duoEncountersForWorld(world.id);
    const completed=progress?worldEncounters.filter(e=>progress.completedEncounters.includes(e.id)).length:0;
    const worldComplete=validPair&&isDuoWorldComplete(p1,p2,world.id);
    const allComplete=validPair&&DUO_CAMPAIGN_WORLDS.every(w=>duoWorldUnlocked(p1,p2,w)&&isDuoWorldComplete(p1,p2,w.id));

    duoCampaignWorldTabs.innerHTML=DUO_CAMPAIGN_WORLDS.map(w=>{
      const unlocked=validPair&&duoWorldUnlocked(p1,p2,w),done=unlocked&&isDuoWorldComplete(p1,p2,w.id),active=w.id===world.id;
      const state=unlocked?(done?"✓ Abgeschlossen":`${duoEncountersForWorld(w.id).filter(e=>progress?.completedEncounters?.includes(e.id)).length} / ${duoEncountersForWorld(w.id).length}`):(w.lockedText||"🔒 Gesperrt");
      return `<button type="button" class="campaign-world-btn${active?" active":""}${done?" done":""}" data-duo-world-id="${w.id}" ${unlocked?"":"disabled"}><span class="campaign-world-name">${escapeHtml(w.name)}</span><span class="campaign-world-state">${escapeHtml(state)}</span></button>`;
    }).join("");
    duoCampaignWorldTabs.querySelectorAll("[data-duo-world-id]").forEach(btn=>btn.onclick=()=>{duoWorldId=btn.dataset.duoWorldId;duoCampaignEncounterId=null;renderDuoCampaign();});
    duoCampaignWorldDesc.textContent=world.desc;

    duoTeamSummary.textContent=validPair?`${p1.name} + ${p2.name}`:(profiles.length<2?"2 Profile erforderlich":"Zwei verschiedene Profile wählen");
    duoProgressSummary.textContent=`${completed} / ${worldEncounters.length} Encounter`;
    duoUnlockSummary.textContent=!baseUnlocked?"🔒 Spieler 1 braucht Black Table":worldUnlocked?"✅ Freigeschaltet":(world.lockedText||"🔒 Gesperrt");
    duoCampaignBanner.classList.add("hidden");
    if(!baseUnlocked){duoCampaignBanner.classList.remove("hidden");duoCampaignBanner.innerHTML=`🔒 <strong>Duo-Kampagne gesperrt.</strong> Spieler 1 muss Solo Encounter 10 · Black Table abgeschlossen haben. Danach stehen im Duo alle regulären Hauptfähigkeiten direkt zur Verfügung.`;}
    else if(!worldUnlocked){duoCampaignBanner.classList.remove("hidden");duoCampaignBanner.innerHTML=`🔒 <strong>${escapeHtml(world.name)} gesperrt.</strong> ${escapeHtml(world.lockedText||"Vorherige Duo-Welt abschließen")}.`;}
    else if(worldComplete){duoCampaignBanner.classList.remove("hidden");duoCampaignBanner.innerHTML=allComplete?`🏆 <strong>Alle aktuellen Duo-Welten abgeschlossen.</strong> Diese Profil-Paarung hat alle aktuell verfügbaren Duo-Welten abgeschlossen.`:`🏆 <strong>${escapeHtml(world.shortName)} abgeschlossen.</strong> Über die Welt-Auswahl könnt ihr jederzeit zurückwechseln.`;}

    const sharedDuoAbilityPool=p1?[...CHOOSABLE_ABILITY_IDS]:[];
    const fillAbilities=(select,ids)=>{const old=+select.value;select.innerHTML="";ids.forEach(id=>{const o=document.createElement("option");o.value=id;o.textContent=`${id} · ${ABILITIES[id].name}`;select.appendChild(o);});if(ids.includes(old))select.value=String(old);};
    fillAbilities(duoAbility1Select,sharedDuoAbilityPool);fillAbilities(duoAbility2Select,sharedDuoAbilityPool);

    let encounter=duoEncounterById(duoCampaignEncounterId);
    if(!encounter||(encounter.world||"covenant")!==world.id||!validPair||!duoEncounterAvailable(p1,p2,encounter)){encounter=validPair&&worldUnlocked?defaultDuoEncounter(p1,p2,world.id):worldEncounters[0];duoCampaignEncounterId=encounter?.id||null;}

    duoCampaignPath.innerHTML=worldEncounters.map((e,i)=>{
      const done=!!progress?.completedEncounters?.includes(e.id),available=validPair&&duoEncounterAvailable(p1,p2,e),current=available&&e.id===duoCampaignEncounterId;
      const num=i+1,isBoss=num===10||num===15,isWorldBoss=num===15,mark=done?"✓":available?(current?"▶":""):"🔒";
      return `<button type="button" class="campaign-node${done?" done":""}${current?" current":""}${available?"":" locked"}${isBoss?" boss":""}${isWorldBoss?" world-boss":""}" data-duo-campaign-id="${e.id}" ${available?"":"disabled"}><span>${num}</span>${mark?`<span class="node-mark">${mark}</span>`:""}</button>`;
    }).join("");
    duoCampaignPath.querySelectorAll("[data-duo-campaign-id]").forEach(btn=>btn.onclick=()=>{duoCampaignEncounterId=btn.dataset.duoCampaignId;duoWorldId=duoEncounterById(duoCampaignEncounterId)?.world||"covenant";renderDuoCampaign();});
    if(encounter){const done=!!progress?.completedEncounters?.includes(encounter.id),available=validPair&&duoEncounterAvailable(p1,p2,encounter),worldBoss=encounter.id===world.finalEncounterId,progression=worldBoss?"Duo-Welt abschließen":"Nächsten Duo-Encounter freischalten",trophy=done?(worldBoss?"🏆 +1 Trophäe je Profil pro erfolgreichem Clear":"Erstclear bereits abgeschlossen"):`🏆 +1 Trophäe je Profil beim Erstclear`,reward=`${trophy} · ${progression}`,rules=encounterRuleText(encounter),phase=bossPhaseFor(encounter);duoCampaignEncounterDetail.innerHTML=`<div class="node-detail-head"><div><div class="node-detail-title">${escapeHtml(encounter.title)}</div><div class="node-detail-sub">${escapeHtml(encounter.subtitle)}</div></div><div class="node-detail-state">${done?"✓ GESCHAFFT":available?"OFFEN":"🔒 GESPERRT"}</div></div><div class="node-detail-desc">${escapeHtml(encounter.desc)}</div><div class="node-detail-row">🎯 <strong>Challenge:</strong> ${escapeHtml(encounter.challenge.text)}</div><div class="node-detail-row">🤝 <strong>Belohnung:</strong> ${escapeHtml(reward)}</div>${rules.map(r=>`<div class="node-detail-row node-detail-rule">⚙ <strong>${escapeHtml(r.name)}:</strong> ${escapeHtml(r.desc)}</div>`).join("")}${phase?`<div class="node-detail-row node-detail-phase">👹 <strong>Boss-Phase bei ${Math.round((phase.threshold||.5)*100)} %:</strong> ${escapeHtml(phase.title)} · ${escapeHtml(phase.desc)}</div>`:""}`;}else duoCampaignEncounterDetail.innerHTML="";
    duoCampaignStartBtn.disabled=!baseUnlocked||!worldUnlocked||!encounter||!duoEncounterAvailable(p1,p2,encounter)||!duoAbility1Select.value||!duoAbility2Select.value;
  }

  function openDuoCampaignScreen(){
    clearBotAutomation();tutorialMode=false;campaignMode=false;duoCampaignMode=false;campaignMetrics=freshCampaignMetrics();
    document.body.classList.remove("playing","bot-acting");game.classList.add("hidden");winnerBox.classList.add("hidden");nextRoundBox.classList.add("hidden");
    gameContext={mode:"duo-campaign-map",returnScreen:"duo",profileIds:[duoProfile1Id,duoProfile2Id].filter(Boolean),encounterId:duoCampaignEncounterId};
    renderDuoCampaign();openFrontScreen(duoCampaignScreen);
  }

  function returnToDuoCampaignMap(){
    clearBotAutomation();tutorialMode=false;campaignMode=false;duoCampaignMode=false;campaignMetrics=freshCampaignMetrics();isAnimating=false;
    eventPopupQueue=[];eventPopupBusy=false;eventPopup.classList.remove("active","death","win","survive");quitModal.classList.add("hidden");winnerBox.classList.add("hidden");nextRoundBox.classList.add("hidden");
    document.body.classList.remove("playing","bot-acting");game.classList.add("hidden");rotatingBoard.style.transform="rotate(0deg) scale(1)";restartBtn.disabled=false;
    if(duoCampaignEncounterId&&duoEncounterById(duoCampaignEncounterId)) duoWorldId=duoEncounterById(duoCampaignEncounterId).world||"covenant";
    gameContext={mode:"duo-campaign-map",returnScreen:"duo",profileIds:[duoProfile1Id,duoProfile2Id].filter(Boolean),encounterId:duoCampaignEncounterId};
    renderDuoCampaign();hideFrontScreens();duoCampaignScreen.classList.remove("hidden");window.scrollTo?.(0,0);
  }

  function returnToCampaignMap(){
    // Der Ergebnis-Button darf nicht von einem alten Bot-/Modal-/Game-State abhängen.
    // Profil und Encounter zuerst sichern, danach den Kampfzustand verlassen.
    const heroProfileId=players.find(p=>p?.campaignTeam==="hero"&&p.profileId)?.profileId||null;
    const keepProfileId=campaignProfileId||gameContext.profileId||heroProfileId||null;
    const keepEncounterId=gameContext.encounterId||campaignEncounterId||null;

    clearBotAutomation();
    tutorialMode=false;
    campaignMode=false;
    duoCampaignMode=false;
    campaignMetrics=freshCampaignMetrics();
    isAnimating=false;
    eventPopupQueue=[];eventPopupBusy=false;
    eventPopup.classList.remove("active","death","win","survive");
    quitModal.classList.add("hidden");
    winnerBox.classList.add("hidden");
    nextRoundBox.classList.add("hidden");
    document.body.classList.remove("playing","bot-acting");
    game.classList.add("hidden");
    rotatingBoard.style.transform="rotate(0deg) scale(1)";
    restartBtn.disabled=false;

    if(keepProfileId && getProfile(keepProfileId)) campaignProfileId=keepProfileId;
    if(keepEncounterId && campaignEncounterById(keepEncounterId)){
      campaignEncounterId=keepEncounterId;
      campaignWorldId=campaignEncounterById(keepEncounterId).world||"house";
    }
    gameContext={mode:"campaign-map",returnScreen:"campaign",profileId:campaignProfileId||keepProfileId,encounterId:campaignEncounterId||keepEncounterId};

    renderCampaign();
    hideFrontScreens();
    campaignScreen.classList.remove("hidden");
    window.scrollTo?.(0,0);
  }

  function openCampaignScreen(){
    returnToCampaignMap();
  }

  function campaignChallengeRuleMet(c,heroIndex){
    if(!c) return true;
    if(c.type==="all") return Array.isArray(c.rules) && c.rules.every(rule=>campaignChallengeRuleMet(rule,heroIndex));
    if(c.type==="win") return true;
    if(c.type==="base_over_25") return !!campaignMetrics.baseOver25;
    if(c.type==="turn_damage") return (campaignMetrics.maxRawTurnDamage||0)>=(c.value||0);
    if(c.type==="finish_hp") return (players[heroIndex]?.hp||0)>=(c.value||0);
    if(c.type==="self_damage_max") return (roundStats[heroIndex]?.selfDamage||0)<=(c.value??0);
    if(c.type==="self_damage_min") return (roundStats[heroIndex]?.selfDamage||0)>=(c.value||0);
    if(c.type==="voluntary_hp_min") return (roundStats[heroIndex]?.voluntaryHp||0)>=(c.value||0);
    if(c.type==="healed_min") return (roundStats[heroIndex]?.healed||0)>=(c.value||0);
    if(c.type==="twelve_triggers_min") return (roundStats[heroIndex]?.twelveTriggers||0)>=(c.value||0);
    if(c.type==="attack_hits_min") return (campaignMetrics.maxAttackHits||0)>=(c.value||0);
    if(c.type==="damage_targets_min") return Object.values(campaignMetrics.rawDamageByTarget||{}).filter(v=>(Number(v)||0)>0).length>=(c.value||0);
    if(c.type==="kill_first_name") return (campaignMetrics.killOrder?.[0]||"")===c.name;
    if(c.type==="kill_last_name") return campaignMetrics.killOrder?.length>0 && campaignMetrics.killOrder.at(-1)===c.name;
    if(c.type==="kill_sequence_names"){const seq=campaignMetrics.killOrder||[];return Array.isArray(c.names)&&c.names.every((name,i)=>seq[i]===name)&&seq.length>=c.names.length;}
    if(c.type==="active_ability_uses_max"){const ids=[3,4,11,13,18,20];const used=ids.reduce((sum,id)=>sum+(campaignMetrics.abilityUses?.[String(id)]||0),0);return used<=(c.value??0);}
    if(c.type==="ability_use") return (campaignMetrics.abilityUses?.[String(c.ability)]||0)>=(c.count||1);
    if(c.type==="ability_success") return (campaignMetrics.abilitySuccesses?.[String(c.ability)]||0)>=(c.count||1);
    if(c.type==="secondary_unlocked") return !!players[heroIndex]?.secondAbilityUnlocked;
    if(c.type==="each_hero_ability_success"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null),key=String(c.ability);return ids.length>=2&&ids.every(i=>(campaignMetrics.abilitySuccessesByHero?.[String(i)]?.[key]||0)>=(c.count||1));}
    if(c.type==="all_heroes_survive"){const heroes=players.filter(p=>p.campaignTeam==="hero");return heroes.length>=2&&heroes.every(p=>p.hp>0);}
    if(c.type==="each_hero_attack"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null);return ids.length>=2&&ids.every(i=>(campaignMetrics.heroAttacks?.[String(i)]||0)>=1);}
    if(c.type==="each_hero_ability_use"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null),key=String(c.ability);return ids.length>=2&&ids.every(i=>(campaignMetrics.abilityUsesByHero?.[String(i)]?.[key]||0)>=(c.count||1));}
    if(c.type==="team_healed_min"){return players.reduce((sum,p,i)=>sum+(p.campaignTeam==="hero"?(roundStats[i]?.healed||0):0),0)>=(c.value||0);}
    if(c.type==="team_self_damage_min"){return players.reduce((sum,p,i)=>sum+(p.campaignTeam==="hero"?(roundStats[i]?.selfDamage||0):0),0)>=(c.value||0);}
    if(c.type==="each_hero_self_damage_min"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null);return ids.length>=2&&ids.every(i=>(roundStats[i]?.selfDamage||0)>=(c.value||0));}
    if(c.type==="each_hero_healed_min"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null);return ids.length>=2&&ids.every(i=>(roundStats[i]?.healed||0)>=(c.value||0));}
    if(c.type==="all_heroes_secondary_unlocked"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null);return ids.length>=2&&ids.every(i=>!!players[i]?.secondAbilityUnlocked);}
    if(c.type==="exactly_one_hero_survives"){const heroes=players.filter(p=>p.campaignTeam==="hero");return heroes.length>=2&&heroes.filter(p=>p.hp>0).length===1;}
    if(c.type==="team_voluntary_hp_min"){return players.reduce((sum,p,i)=>sum+(p.campaignTeam==="hero"?(roundStats[i]?.voluntaryHp||0):0),0)>=(c.value||0);}
    if(c.type==="each_hero_voluntary_hp_min"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null);return ids.length>=2&&ids.every(i=>(roundStats[i]?.voluntaryHp||0)>=(c.value||0));}
    if(c.type==="each_hero_turn_damage"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null);return ids.length>=2&&ids.every(i=>(campaignMetrics.maxRawTurnDamageByHero?.[String(i)]||0)>=(c.value||0));}
    if(c.type==="team_raw_damage"){return Object.values(campaignMetrics.rawDamageByHero||{}).reduce((a,b)=>a+(Number(b)||0),0)>=(c.value||0);}
    if(c.type==="each_hero_targets_min"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null);return ids.length>=2&&ids.every(i=>Object.keys(campaignMetrics.attackTargetsByHero?.[String(i)]||{}).length>=(c.value||0));}
    if(c.type==="shared_targets_min"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null);if(ids.length<2)return false;const sets=ids.map(i=>new Set(Object.keys(campaignMetrics.attackTargetsByHero?.[String(i)]||{})));const common=[...sets[0]].filter(k=>sets.slice(1).every(set=>set.has(k)));return common.length>=(c.value||0);}
    if(c.type==="each_hero_attack_hits_min"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null);return ids.length>=2&&ids.every(i=>(campaignMetrics.maxAttackHitsByHero?.[String(i)]||0)>=(c.value||0));}
    if(c.type==="each_hero_kill_min"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null);return ids.length>=2&&ids.every(i=>(campaignMetrics.killsByHero?.[String(i)]||0)>=(c.value||0));}
    if(c.type==="alternating_hero_kills"){const need=c.value||2,heroes=(campaignMetrics.killHeroes||[]).slice(0,need);return heroes.length>=need&&heroes.every((h,i)=>i===0||h!==heroes[i-1]);}
    if(c.type==="hero_attacks_min") return (campaignMetrics.heroAttacks?.[String(heroIndex)]||0)>=(c.value||0);
    if(c.type==="each_hero_attacks_min"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null);return ids.length>=2&&ids.every(i=>(campaignMetrics.heroAttacks?.[String(i)]||0)>=(c.value||0));}
    if(c.type==="first_kill_after_targets_min") return (campaignMetrics.firstKillDistinctTargets||0)>=(c.value||0);
    if(c.type==="attack_target_sequence_names"){const seq=(campaignMetrics.attackSequence||[]).filter(a=>String(a.hero)===String(heroIndex));return Array.isArray(c.names)&&seq.length>=c.names.length&&c.names.every((name,i)=>seq[i]?.name===name);}
    if(c.type==="target_switches_min"){const seq=(campaignMetrics.attackSequence||[]).filter(a=>String(a.hero)===String(heroIndex));let n=0;for(let i=1;i<seq.length;i++)if(seq[i].target!==seq[i-1].target)n++;return n>=(c.value||0);}
    if(c.type==="attack_heroes_alternate_min"){const need=c.value||2,seq=(campaignMetrics.attackSequence||[]).slice(0,need);return seq.length>=need&&seq.every((a,i)=>i===0||a.hero!==seq[i-1].hero);}
    if(c.type==="focus_passes_min"){const seq=campaignMetrics.attackSequence||[];let n=0;for(let i=1;i<seq.length;i++)if(seq[i].hero!==seq[i-1].hero&&seq[i].target===seq[i-1].target)n++;return n>=(c.value||0);}
    if(c.type==="hero_kill_name"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?String(i):null).filter(Boolean),wanted=ids[(c.hero||1)-1];if(!wanted)return false;return (campaignMetrics.killOrder||[]).some((name,i)=>name===c.name&&String(campaignMetrics.killHeroes?.[i])===wanted);}
    if(c.type==="kill_hero_pattern"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?String(i):null).filter(Boolean),pat=Array.isArray(c.pattern)?c.pattern:[],kills=(campaignMetrics.killHeroes||[]).slice(0,pat.length).map(h=>ids.indexOf(String(h))+1);return pat.length>0&&kills.length>=pat.length&&pat.every((v,i)=>kills[i]===v);}
    if(c.type==="each_hero_attacked_name"){const ids=players.map((p,i)=>p.campaignTeam==="hero"?String(i):null).filter(Boolean),seq=campaignMetrics.attackSequence||[];return ids.length>=2&&ids.every(id=>seq.some(a=>String(a.hero)===id&&a.name===c.name));}
    return false;
  }

  function campaignChallengeMet(encounter,heroIndex){
    return campaignChallengeRuleMet(encounter?.challenge,heroIndex);
  }

  function unlockCampaignReward(profile,encounter){
    const progress=campaignProgress(profile);
    if(!progress || !encounter?.rewardAbility) return false;
    if(progress.unlockedAbilities.includes(encounter.rewardAbility)) return false;
    progress.unlockedAbilities.push(encounter.rewardAbility);
    return true;
  }

  function unlockCampaignSecondaryReward(profile,encounter){
    const progress=campaignProgress(profile);
    if(!progress || !encounter?.rewardSecondaryAbility) return false;
    if(!Array.isArray(progress.unlockedSecondaryAbilities)) progress.unlockedSecondaryAbilities=[];
    if(progress.unlockedSecondaryAbilities.includes(encounter.rewardSecondaryAbility)) return false;
    progress.unlockedSecondaryAbilities.push(encounter.rewardSecondaryAbility);
    return true;
  }

  function awardCampaignTrophy(profile,encounter){
    const progress=campaignProgress(profile);
    if(!progress || !encounter) return 0;
    // Royal Flush und Rift Sovereign sind ausdrücklich immer farmbar.
    // Nach Freischaltung aller regulären Hauptfähigkeiten wird jeder erfolgreiche Clear zu Prestige.
    if(!encounter.farmTrophy && !campaignHasAllMainAbilities(profile)) return 0;
    progress.trophies=Math.max(0,Math.floor(Number(progress.trophies)||0))+1;
    return 1;
  }

  function isDuoWorldBossEncounter(encounter){
    return !!encounter && DUO_CAMPAIGN_WORLDS.some(world=>world.finalEncounterId===encounter.id);
  }

  function awardDuoCampaignTrophies(profile1,profile2,encounter,newlyCompleted){
    if(!profile1||!profile2||!encounter) return 0;
    if(!newlyCompleted && !isDuoWorldBossEncounter(encounter)) return 0;
    [profile1,profile2].forEach(profile=>{
      const progress=campaignProgress(profile);
      progress.trophies=Math.max(0,Math.floor(Number(progress.trophies)||0))+1;
    });
    return 1;
  }

  function startDuoCampaignEncounter(){
    const p1=getProfile(duoProfile1Select.value),p2=getProfile(duoProfile2Select.value),encounter=duoEncounterById(duoCampaignEncounterId);
    if(!p1||!p2||p1.id===p2.id||!encounter||!duoEncounterAvailable(p1,p2,encounter)) return;
    const sharedDuoAbilityPool=[...CHOOSABLE_ABILITY_IDS];
    let a1=+duoAbility1Select.value,a2=+duoAbility2Select.value;
    if(!sharedDuoAbilityPool.includes(a1)) a1=sharedDuoAbilityPool[0]||3;
    if(!sharedDuoAbilityPool.includes(a2)) a2=sharedDuoAbilityPool[0]||3;
    clearBotAutomation();resetTutorialUi();tutorialMode=false;campaignMode=true;duoCampaignMode=true;campaignProfileId=null;duoProfile1Id=p1.id;duoProfile2Id=p2.id;
    gameContext={mode:"duo-campaign-game",returnScreen:"duo",profileIds:[p1.id,p2.id],encounterId:encounter.id};campaignMetrics=freshCampaignMetrics();resetEncounterRuntime(encounter);
    const sharedDuoSecondPool=[...REAL_ABILITY_IDS];
    const makeHero=(profile,ability)=>({name:profile.name,battleTag:`#${profile.tagNumber}`,profileId:profile.id,botLevel:"human",campaignTeam:"hero",hp:START_HP,maxHp:START_HP,ability,secondAbility:null,thirdAbility:null,secondAbilityUnlocked:sharedDuoSecondPool.length<2,thirdAbilityUnlocked:false,rolledAbility:"DUO",primaryWasChosen:true,seat:0,diceDesign:profile.selectedDice||"classic",...playerCosmeticsFromProfile(profile),wins:0,momentumStreak:0,lastStandUsed:false,roundLastStandTriggered:false,damageSinceLastOwnTurn:false,bloodRushPrimed:false,voluntaryHpPaidThisTurn:false,botBloodUsesThisAttack:0});
    const heroes=[makeHero(p1,a1),makeHero(p2,a2)];
    const enemies=encounter.enemies.map(enemy=>({name:enemy.name,battleTag:"",profileId:null,botLevel:enemy.level||"normal",campaignTeam:"enemy",hp:Number(enemy.hp)||START_HP,maxHp:Number(enemy.hp)||START_HP,ability:Number(enemy.ability)||0,secondAbility:enemy.secondAbility!=null?Number(enemy.secondAbility):null,thirdAbility:null,secondAbilityUnlocked:true,thirdAbilityUnlocked:true,rolledAbility:"DUO",primaryWasChosen:false,seat:0,diceDesign:"classic",wins:0,momentumStreak:0,lastStandUsed:false,roundLastStandTriggered:false,damageSinceLastOwnTurn:false,bloodRushPrimed:false,voluntaryHpPaidThisTurn:false,botBloodUsesThisAttack:0}));
    players=[];
    const max=Math.max(heroes.length,enemies.length);for(let i=0;i<max;i++){if(heroes[i])players.push(heroes[i]);if(enemies[i])players.push(enemies[i]);}
    resetRoundStats();current=0;prepareBloodRushForTurn(current);applyEncounterTurnStartRule(current);dice=freshDice();phase="idle";isAnimating=false;attackFace=null;attackTarget=null;pendingCampaignAttackStart=null;attackHits=0;attackDamage=0;firstAttackRoll=true;currentAttackRollNewHits=0;
    baseRerollUsed=false;loadedDiceUsed=false;lastBaseRollIndices=[];attackPowerUsed=false;precisionUses=0;momentumBonus=0;bloodPriceNeighbors=[];bloodRushActiveThisAttack=false;doubleTapApplied=false;pendingDamage=null;pendingHeal=null;pendingExtraDamageFx=[];pendingExtraHealFx=[];
    roundNumber=Math.max(1,duoEncountersForWorld(encounter.world||"covenant").findIndex(e=>e.id===encounter.id)+1);roundEliminationOrder=[];lastPlaceIndex=null;roundWinnerHandled=false;roundWinnerIndex=null;nextRoundAbilityRolls=[];eventPopupQueue=[];eventPopupBusy=false;secondAbilityDraftBusy=false;secondAbilityDraftIndex=null;deferredBaseAdvance=false;
    gamblingRolling=false;gamblingBaseTotal=null;gamblingModal.classList.add("hidden");highStakesRolling=false;highStakesDecisionThisAttack=false;highStakesModal.classList.add("hidden");perfect25Rolling=false;perfect25D4Rolling=false;perfect25BaseTotal=null;pendingPerfect25Total=null;perfect25Modal.classList.add("hidden");perfect25D4Modal.classList.add("hidden");insuranceRolling=false;insuranceContext=null;insuranceModal.classList.add("hidden");counterRolling=false;counterContext=null;counterDiceState=[];counterHits=0;counterFirstRoll=true;pendingCounterattack=null;deferredAttackFinish=false;counterModal.classList.add("hidden");wildcardFace=null;secondAbilityDraftQueue=[];secondAbilityModal.classList.add("hidden");
    logEl.innerHTML="";winnerBox.classList.add("hidden");nextRoundBox.classList.add("hidden");nextRoundPrepBtn.classList.add("hidden");restartBtn.textContent="Zur Duo-Kampagne";hideFrontScreens();game.classList.remove("hidden");document.body.classList.add("playing");window.scrollTo?.(0,0);
    addLog(`🤝 Duo-Kampagne: ${encounter.title} – ${encounter.subtitle}. Challenge: ${encounter.challenge.text}`);encounterRuleText(encounter).forEach(r=>addLog(`⚙ Sonderregel ${r.name}: ${r.desc}`));if(bossPhaseFor(encounter))addLog(`👹 Bossphase vorbereitet: ${bossPhaseFor(encounter).title} bei ${Math.round((bossPhaseFor(encounter).threshold||.5)*100)} % Boss-HP.`);addLog(`⚡ Duo-Vollpool: Alle regulären Hauptfähigkeiten sind verfügbar. ${p1.name}: ${ABILITIES[a1].name} · ${p2.name}: ${ABILITIES[a2].name}.`);addLog(`💀 Fällt einer von euch, läuft der Encounter weiter, solange der andere noch lebt.`);renderAll();
  }

  function finishDuoCampaignEncounter(heroWon){
    if(roundWinnerHandled) return true;roundWinnerHandled=true;
    const encounter=duoEncounterById(duoCampaignEncounterId),p1=getProfile(duoProfile1Id),p2=getProfile(duoProfile2Id),progress=duoCampaignProgress(p1,p2);
    const heroIndices=players.map((p,i)=>p.campaignTeam==="hero"?i:null).filter(i=>i!=null);
    const challengeMet=heroWon&&campaignChallengeMet(encounter,heroIndices[0]??0);roundWinnerIndex=heroWon?(heroIndices.find(i=>players[i].hp>0)??heroIndices[0]):players.findIndex(p=>p.hp>0&&p.campaignTeam==="enemy");
    if(heroWon){progress.wins++;heroIndices.filter(i=>players[i].hp>0).forEach(i=>{players[i].wins=(players[i].wins||0)+1;checkRoundWinnerAchievements(i);});}else progress.losses++;
    let newlyCompleted=false,trophiesEach=0;if(heroWon&&challengeMet&&!progress.completedEncounters.includes(encounter.id)){progress.completedEncounters.push(encounter.id);newlyCompleted=true;}if(heroWon&&challengeMet)trophiesEach=awardDuoCampaignTrophies(p1,p2,encounter,newlyCompleted);progress.campaignVersion=Math.max(Number(progress.campaignVersion)||1,CAMPAIGN_VERSION);saveGameData();
    const encounterWorld=encounter.world||"covenant";duoWorldId=encounterWorld;
    if(newlyCompleted){const next=defaultDuoEncounter(p1,p2,encounterWorld);if(next)duoCampaignEncounterId=next.id;}
    const world=duoWorldById(encounterWorld),complete=!!world&&progress.completedEncounters.includes(world.finalEncounterId);
    const worldIndex=DUO_CAMPAIGN_WORLDS.findIndex(w=>w.id===encounterWorld),nextWorld=worldIndex>=0?DUO_CAMPAIGN_WORLDS[worldIndex+1]:null;
    const nextWorldUnlocked=!!(newlyCompleted&&nextWorld&&duoWorldUnlocked(p1,p2,nextWorld));
    const nextWorldText=nextWorldUnlocked?`<br>🌐 <strong>${escapeHtml(nextWorld.name)} wurde freigeschaltet!</strong>`:"";
    if(heroWon&&challengeMet){const trophyText=trophiesEach?`<br>🏆 <strong>+${trophiesEach} Trophäe für jedes Profil</strong> · ${escapeHtml(p1.name)}: ${campaignProgress(p1).trophies} · ${escapeHtml(p2.name)}: ${campaignProgress(p2).trophies}`:"";queueEventPopup(complete?"Duo-Welt geschafft!":"Duo-Encounter geschafft!","win");winnerText.innerHTML=complete?"🏆 DUO-WELT GESCHAFFT!":"🤝 Duo-Encounter geschafft!";roundResultText.innerHTML=`✅ Gegnerteam besiegt.<br>✅ Challenge erfüllt: <strong>${escapeHtml(encounter.challenge.text)}</strong>${trophyText}${newlyCompleted?"<br>Der nächste Duo-Encounter wurde freigeschaltet.":"<br>Dieser Duo-Encounter war bereits abgeschlossen."}${nextWorldText}`;}
    else if(heroWon){queueEventPopup("Challenge verfehlt","survive");winnerText.textContent="⚠️ Sieg – aber Challenge verfehlt";roundResultText.innerHTML=`Ihr habt das Gegnerteam besiegt, aber die Pflichtaufgabe fehlt:<br><strong>${escapeHtml(encounter.challenge.text)}</strong><br>Der nächste Duo-Encounter bleibt gesperrt.`;}
    else{queueEventPopup("Duo-Encounter verloren","death");winnerText.textContent="💀 Duo-Encounter verloren";roundResultText.innerHTML=`Das Gegnerteam hat beide Spieler ausgeschaltet. Euer Teamfortschritt bleibt gespeichert.`;}
    roundStandings.innerHTML=players.map((p,i)=>`<div class="round-score-row${p.campaignTeam==="hero"&&heroWon?" winner-row":""}"><div class="round-score-name">${escapeHtml(p.name)}${p.battleTag?` <span class="battle-tag">${escapeHtml(p.battleTag)}</span>`:""}</div><div class="round-score-meta">${p.campaignTeam==="hero"?"🤝 Duo-Spieler":"🤖 Gegner"} · ${Math.max(0,p.hp)} HP</div></div>`).join("");
    renderRoundStats();clearBotAutomation();winnerBox.classList.remove("hidden");nextRoundBox.classList.add("hidden");nextRoundPrepBtn.classList.add("hidden");restartBtn.textContent="Zur Duo-Kampagne";restartBtn.disabled=false;gameContext.returnScreen="duo";gameContext.encounterId=duoCampaignEncounterId;turnLine.textContent="Duo-Encounter beendet";statusEl.textContent="";abilityState.innerHTML="";hideAllControls();renderPlayers();roundNumberEl.textContent=roundNumber;return true;
  }

  function startCampaignEncounter(){
    const profile=getProfile(campaignProfileSelect.value);
    const encounter=campaignEncounterById(campaignEncounterId);
    if(!profile || !encounter) return;
    if(!campaignEncounterAvailable(profile,encounter)) return;

    const unlocked=campaignUnlockedAbilities(profile);
    let heroAbility=+campaignAbilitySelect.value;
    if(!unlocked.includes(heroAbility)) heroAbility=unlocked[0]||3;

    clearBotAutomation();
    resetTutorialUi();
    tutorialMode=false;
    campaignMode=true;
    duoCampaignMode=false;
    campaignProfileId=profile.id;
    gameContext={mode:"campaign-game",returnScreen:"campaign",profileId:profile.id,encounterId:encounter.id};
    campaignMetrics=freshCampaignMetrics();
    resetEncounterRuntime(encounter);

    const hero={
      name:profile.name,battleTag:`#${profile.tagNumber}`,profileId:profile.id,botLevel:"human",campaignTeam:"hero",hp:START_HP,maxHp:START_HP,
      ability:heroAbility,secondAbility:null,secondAbilityUnlocked:encounter.startSecondAbilityDraft?true:unlocked.length<2,rolledAbility:"CAMPAIGN",primaryWasChosen:true,
      seat:0,diceDesign:profile.selectedDice||"classic",...playerCosmeticsFromProfile(profile),wins:0,momentumStreak:0,lastStandUsed:false,roundLastStandTriggered:false,
      damageSinceLastOwnTurn:false,bloodRushPrimed:false,voluntaryHpPaidThisTurn:false,botBloodUsesThisAttack:0
    };
    const enemies=encounter.enemies.map((enemy,i)=>({
      name:enemy.name,battleTag:"",profileId:null,botLevel:enemy.level||"normal",campaignTeam:"enemy",hp:Number(enemy.hp)||START_HP,maxHp:Number(enemy.hp)||START_HP,
      ability:enemy.ability==="mirror"?heroAbility:(Number(enemy.ability)||0),secondAbility:enemy.secondAbility==="mirror"?heroAbility:(enemy.secondAbility!=null?Number(enemy.secondAbility):null),secondAbilityUnlocked:true,rolledAbility:"CAMPAIGN",primaryWasChosen:false,
      seat:0,diceDesign:"classic",wins:0,momentumStreak:0,lastStandUsed:false,roundLastStandTriggered:false,
      damageSinceLastOwnTurn:false,bloodRushPrimed:false,voluntaryHpPaidThisTurn:false,botBloodUsesThisAttack:0
    }));
    players=[hero,...enemies];

    resetRoundStats();
    current=0;prepareBloodRushForTurn(current);applyEncounterTurnStartRule(current);dice=freshDice();phase="idle";isAnimating=false;
    attackFace=null;attackTarget=null;pendingCampaignAttackStart=null;attackHits=0;attackDamage=0;firstAttackRoll=true;currentAttackRollNewHits=0;
    baseRerollUsed=false;loadedDiceUsed=false;lastBaseRollIndices=[];attackPowerUsed=false;precisionUses=0;momentumBonus=0;bloodPriceNeighbors=[];bloodRushActiveThisAttack=false;doubleTapApplied=false;pendingDamage=null;pendingHeal=null;pendingExtraDamageFx=[];pendingExtraHealFx=[];
    roundNumber=Math.max(1,campaignEncountersForWorld(encounter.world||"house").findIndex(e=>e.id===encounter.id)+1);roundEliminationOrder=[];lastPlaceIndex=null;roundWinnerHandled=false;roundWinnerIndex=null;nextRoundAbilityRolls=[];eventPopupQueue=[];eventPopupBusy=false;secondAbilityDraftBusy=false;secondAbilityDraftIndex=null;deferredBaseAdvance=false;
    gamblingRolling=false;gamblingBaseTotal=null;gamblingModal.classList.add("hidden");highStakesRolling=false;highStakesDecisionThisAttack=false;highStakesModal.classList.add("hidden");perfect25Rolling=false;perfect25D4Rolling=false;perfect25BaseTotal=null;pendingPerfect25Total=null;perfect25Modal.classList.add("hidden");perfect25D4Modal.classList.add("hidden");insuranceRolling=false;insuranceContext=null;insuranceModal.classList.add("hidden");counterRolling=false;counterContext=null;counterDiceState=[];counterHits=0;counterFirstRoll=true;pendingCounterattack=null;deferredAttackFinish=false;counterModal.classList.add("hidden");wildcardFace=null;secondAbilityDraftQueue=[];secondAbilityModal.classList.add("hidden");
    logEl.innerHTML="";winnerBox.classList.add("hidden");nextRoundBox.classList.add("hidden");nextRoundPrepBtn.classList.add("hidden");restartBtn.textContent="Zur Kampagne";
    hideFrontScreens();game.classList.remove("hidden");document.body.classList.add("playing");window.scrollTo?.(0,0);

    addLog(`🗺️ Kampagne: ${encounter.title} – ${encounter.subtitle}. Challenge: ${encounter.challenge.text}`);
    encounterRuleText(encounter).forEach(r=>addLog(`⚙ Sonderregel ${r.name}: ${r.desc}`));
    if(bossPhaseFor(encounter)) addLog(`👹 Bossphase vorbereitet: ${bossPhaseFor(encounter).title} bei ${Math.round((bossPhaseFor(encounter).threshold||.5)*100)} % Boss-HP.`);
    addLog(`⚡ ${profile.name} startet mit ${ABILITIES[heroAbility].name}. In der Kampagne stehen nur bereits freigeschaltete Fähigkeiten zur Verfügung.`);
    if(enemies.length>1) addLog(`⚠️ 2 gegen 1: ${enemies.map(e=>e.name).join(" & ")} spielen als Team und greifen nur dich an.`);
    renderAll();
    if(encounter.startSecondAbilityDraft){
      addLog(`✨ Boss-Vorteil: ${profile.name} darf direkt zu Beginn die 2. Fähigkeit wählen.`);
      setTimeout(()=>openSecondAbilityDraft(0),120);
    }
  }

  function finishCampaignEncounter(heroWon){
    if(roundWinnerHandled) return true;
    roundWinnerHandled=true;
    const encounter=campaignEncounterById(campaignEncounterId);
    const heroIndex=players.findIndex(p=>p.campaignTeam==="hero");
    const hero=players[heroIndex];
    const profile=getProfile(campaignProfileId);
    const progress=campaignProgress(profile);
    const challengeMet=heroWon && campaignChallengeMet(encounter,heroIndex);
    roundWinnerIndex=heroWon?heroIndex:players.findIndex(p=>p.hp>0 && p.campaignTeam==="enemy");

    if(heroWon){
      hero.wins=(hero.wins||0)+1;
      if(progress) progress.wins=(progress.wins||0)+1;
      checkRoundWinnerAchievements(heroIndex);
    }else if(progress){
      progress.losses=(progress.losses||0)+1;
    }

    let newlyCompleted=false,rewardUnlocked=false,secondaryRewardUnlocked=false,trophiesEarned=0;
    if(heroWon && challengeMet && profile && progress){
      if(!progress.completedEncounters.includes(encounter.id)){
        progress.completedEncounters.push(encounter.id);
        newlyCompleted=true;
      }
      rewardUnlocked=unlockCampaignReward(profile,encounter);
      secondaryRewardUnlocked=unlockCampaignSecondaryReward(profile,encounter);
      trophiesEarned=awardCampaignTrophy(profile,encounter);
      progress.campaignVersion=Math.max(Number(progress.campaignVersion)||1,CAMPAIGN_VERSION);
    }
    const campaignComplete=profile?isCampaignComplete(profile):false;
    if(newlyCompleted && profile){
      const nextEncounter=defaultCampaignEncounter(profile,encounter.world||campaignWorldId);
      if(nextEncounter) gameContext.encounterId=nextEncounter.id;
    }
    if(profile) saveGameData();

    if(heroWon && challengeMet){
      queueEventPopup(campaignComplete?"Kampagne geschafft!":"Encounter geschafft!","win");
      winnerText.innerHTML=campaignComplete?"🏆 KAMPAGNE GESCHAFFT!":"🗺️ Encounter geschafft!";
      const rewardText=rewardUnlocked?`<br><strong>Neue Hauptfähigkeit:</strong> ${encounter.rewardAbility} · ${escapeHtml(ABILITIES[encounter.rewardAbility].name)}`:"";
      const secondaryRewardText=secondaryRewardUnlocked?`<br>🍀 <strong>${escapeHtml(ABILITIES[encounter.rewardSecondaryAbility].name)} freigeschaltet:</strong> ausschließlich als Zweitfähigkeit ab ≤12 HP.`:"";
      const trophyText=trophiesEarned?`<br>🏆 <strong>+${trophiesEarned} Prestige-Trophäe</strong> · Gesamt: ${progress?.trophies||0}`:"";
      const prestigeText=(rewardUnlocked && campaignHasAllMainAbilities(profile))?"<br>✨ <strong>PRESTIGE AKTIV:</strong> Ab jetzt bringt jeder erfolgreiche Encounter-Clear 1 Trophäe.":"";
      const unlockedWorlds=CAMPAIGN_WORLDS.filter(w=>w.id!==encounter.world && (w.unlockRequires||[]).includes(encounter.id) && campaignWorldUnlocked(profile,w));
      const worldUnlockText=newlyCompleted&&unlockedWorlds.length?unlockedWorlds.map(w=>`<br>🌐 <strong>${escapeHtml(w.name)} wurde freigeschaltet!</strong>`).join(""):"";
      roundResultText.innerHTML=`✅ Gegner besiegt.<br>✅ Challenge erfüllt: <strong>${escapeHtml(encounter.challenge.text)}</strong>${rewardText}${secondaryRewardText}${trophyText}${prestigeText}${newlyCompleted?"<br>Der nächste Encounter wurde freigeschaltet.":"<br>Dieser Encounter war bereits abgeschlossen und bleibt spielbar."}${worldUnlockText}`;
    }else if(heroWon){
      queueEventPopup("Challenge verfehlt","survive");
      winnerText.textContent="⚠️ Sieg – aber Challenge verfehlt";
      roundResultText.innerHTML=`Du hast alle Gegner besiegt, aber die Pflichtaufgabe fehlt:<br><strong>${escapeHtml(encounter.challenge.text)}</strong><br>Der nächste Encounter bleibt gesperrt.`;
    }else{
      queueEventPopup("Encounter verloren","death");
      winnerText.textContent="💀 Encounter verloren";
      roundResultText.innerHTML=`${escapeHtml(encounter.subtitle)} war diesmal stärker. Der Encounter bleibt offen; dein Kampagnenfortschritt geht nicht verloren.`;
    }

    roundStandings.innerHTML=players.map((p,i)=>`<div class="round-score-row${i===heroIndex&&heroWon?" winner-row":""}"><div class="round-score-name">${escapeHtml(p.name)}${p.battleTag?` <span class="battle-tag">${escapeHtml(p.battleTag)}</span>`:""}</div><div class="round-score-meta">${p.campaignTeam==="hero"?"🧍 Spieler":"🤖 Gegner"} · ${Math.max(0,p.hp)} HP</div></div>`).join("");
    renderRoundStats();
    clearBotAutomation();winnerBox.classList.remove("hidden");nextRoundBox.classList.add("hidden");nextRoundPrepBtn.classList.add("hidden");restartBtn.textContent="Zur Kampagne";restartBtn.disabled=false;
    gameContext.returnScreen="campaign";
    gameContext.profileId=campaignProfileId||gameContext.profileId;
    gameContext.encounterId=gameContext.encounterId||campaignEncounterId;
    turnLine.textContent="Encounter beendet";statusEl.textContent="";abilityState.innerHTML="";hideAllControls();renderPlayers();roundNumberEl.textContent=roundNumber;
    return true;
  }

  function checkCampaignWinner(){
    if(!campaignMode) return false;
    const heroAlive=players.some(p=>p.campaignTeam==="hero" && p.hp>0);
    const enemyAlive=players.some(p=>p.campaignTeam==="enemy" && p.hp>0);
    if(duoCampaignMode){
      if(!heroAlive) return finishDuoCampaignEncounter(false);
      if(!enemyAlive) return finishDuoCampaignEncounter(true);
      return false;
    }
    if(!heroAlive) return finishCampaignEncounter(false);
    if(!enemyAlive) return finishCampaignEncounter(true);
    return false;
  }


