(() => {
  const ICON_ROOT="assets/ui/v28/svg/gameplay/";
  // Druckbudget = Gesamt-HP * (1 + 0,25 je zusätzlichem Gegner).
  // Getrennte, chronologisch geordnete Vorräte verhindern Wiederholungen.
  const STAGES=Object.freeze([45,54,64.5,76.5,91.5,108,127.5,150,177,210]);
  const FINAL_ENCOUNTER_ID="trio_helix_apex";
  const DIFFICULTIES=Object.freeze([
    {id:"easy",name:"leicht",factor:.94,loot:"3 gewöhnliche Belohnungen"},
    {id:"normal",name:"normal",factor:1,loot:"3 Belohnungen · mindestens eine seltene"},
    {id:"hard",name:"schwer",factor:1.06,loot:"3 Belohnungen · mindestens eine epische + Fähigkeitsangebot"}
  ]);
  const RARITIES=Object.freeze({common:"gewöhnlich",rare:"selten",epic:"episch"});
  const copy=value=>JSON.parse(JSON.stringify(value));
  const trioKey=ids=>JSON.stringify([...ids].map(String).sort());

  function isBossEncounter(encounter){
    const world=TRIO_CAMPAIGN_ENCOUNTERS.filter(e=>e.world===encounter.world);
    return !!(encounter.isBoss||encounter.isMiniBoss||[4,9,14].includes(world.findIndex(e=>e.id===encounter.id)));
  }

  function stagePool(index){
    if(index===9)return [trioEncounterById(FINAL_ENCOUNTER_ID)].filter(Boolean);
    const pool=TRIO_CAMPAIGN_ENCOUNTERS.filter(e=>e.id!==FINAL_ENCOUNTER_ID&&e.enemies.length>0);
    // Boss-/Miniboss-Encounter erst als Zwischenprüfung auf Stufe 5 anbieten.
    if(index===4)return pool.filter(isBossEncounter);
    const normal=pool.filter(e=>!isBossEncounter(e)),slot=[0,1,2,3,5,6,7,8].indexOf(index);
    return normal.slice(Math.floor(slot*normal.length/8),Math.floor((slot+1)*normal.length/8));
  }

  function optionFor(encounter,index,difficulty){
    const weight=1+.25*(encounter.enemies.length-1);
    const rawTotal=encounter.enemies.reduce((n,e)=>n+e.hp,0);
    // Drei statt zwei Helden: Duo-Druckbudget × 1,5, auch beim festen Endboss.
    const total=Math.round(STAGES[index]*(index===9?1:DIFFICULTIES.find(d=>d.id===difficulty).factor)/weight);
    let remaining=total;
    const enemies=encounter.enemies.map((e,i)=>{
      const hp=i===encounter.enemies.length-1?remaining:Math.max(1,Math.round(total*e.hp/rawTotal));
      remaining-=hp;
      return {name:e.name,hp,abilityCount:index<3?2:3};
    });
    return {encounterId:encounter.id,label:enemies.map(e=>e.name).join(" + "),difficulty,
      phaseHeal:Math.min(8,3+Math.floor(index*.6)),phaseAbilityCount:index<3?2:3,enemies,pressure:total*weight};
  }

  // Visual world identities are indexed by stage, never rolled. Repeated
  // encounter families (Omega, Eclipse, Bloodmoon) deliberately receive an
  // alternate world on their following stage, so adjacent bosses cannot
  // share a palette or crest.
  const BOSS_RUSH_WORLD_THEME_KEYS=Object.freeze([
    "duo-covenant",
    "duo-fracture",
    "duo-mirror",
    "duo-omega",
    "solo-paradox",
    "duo-eclipse",
    "solo-astral",
    "trio-helix",
    "duo-bloodmoon",
    "trio-singularity"
  ]);

  const BRUTAL_ABILITY_IDS=Object.freeze([1,4,8,9,10,11,13,16,17,18,21,23,24,25]);
  const REWARDS=Object.freeze([
    {kind:"perk",id:"damage",rarity:"common",name:"Klingenfokus",icon:"damage-sword.svg",desc:"Alle eigenen Hauptangriffe verursachen dauerhaft +1 Schaden pro Stapel."},
    {kind:"perk",id:"rest",rarity:"common",name:"Verschnaufpause",icon:"heart-hp.svg",desc:"Heilt diesen Spieler sofort um 12 HP. Kann erneut gewählt werden."},
    {kind:"perk",id:"regen",rarity:"rare",name:"Regeneration",icon:"heal.svg",desc:"Heilt diesen Spieler jetzt und nach jedem weiteren Boss um 5 HP pro Stapel."},
    {kind:"perk",id:"opening",rarity:"rare",name:"Eröffnungsschlag",icon:"attack.svg",desc:"Der erste erfolgreiche eigene Hauptangriff jedes Bosses erhält +3 Schaden pro Stapel."},
    {kind:"perk",id:"siphon",rarity:"rare",name:"Blutdurst",icon:"self-damage-blood.svg",desc:"Jeder erfolgreiche eigene Hauptangriff heilt 2 HP pro Stapel."},
    {kind:"perk",id:"hunter",rarity:"common",name:"Trophäenjäger",icon:"reward-gift.svg",desc:"Jeder eigene Gegner-Kill heilt diesen Spieler um 4 HP pro Stapel."},
    {kind:"perk",id:"execution",rarity:"epic",name:"Henkersblick",icon:"target.svg",desc:"Angriffe auf Gegner unter 30 % ihrer maximalen HP verursachen +4 Schaden pro Stapel."},
    {kind:"perk",id:"revenge",rarity:"rare",name:"Vergeltung",icon:"loss.svg",desc:"Jeder gefallene eigene Held erhöht den Angriffsschaden um 3 pro Stapel."},
    {kind:"perk",id:"sacrifice",rarity:"rare",name:"Aufopferung",icon:"self-damage-blood.svg",desc:"Unter 50 % eigener HP: +2 Angriffsschaden, unter 25 %: +4 pro Stapel."},
    {kind:"perk",id:"momentum",rarity:"common",name:"Schwung",icon:"streak-flame.svg",desc:"Jeder bereits besiegte Boss erhöht den Angriffsschaden um 1 pro Stapel."},
    {kind:"perk",id:"drill",rarity:"rare",name:"Präzisionsdrill",icon:"target.svg",desc:"Jeder dritte erfolgreiche eigene Hauptangriff im Run verursacht +6 Schaden pro Stapel."},
    {kind:"perk",id:"gamble",rarity:"epic",name:"Glücksspiel",icon:"dice.svg",desc:"Dauerhaft +5 Angriffsschaden und -5 maximale HP pro Stapel; mindestens 10 maximale HP bleiben."},
    {kind:"perk",id:"hospital",rarity:"rare",name:"Feldlazarett",icon:"heal.svg",desc:"Nach jedem Boss heilen alle drei Helden 8 HP pro Stapel."},
    {kind:"perk",id:"second_wind",rarity:"epic",name:"Zweiter Atem",icon:"heart-hp.svg",desc:"Ein gefallener Held startet den nächsten Boss mit 15 HP."},
    {kind:"perk",id:"constitution",rarity:"common",name:"Eiserne Konstitution",icon:"heart-hp.svg",desc:"Erhöht die maximalen und aktuellen HP sofort um 10 pro Stapel."},
    {kind:"perk",id:"blood_pact",rarity:"rare",name:"Blutpakt",icon:"self-damage-blood.svg",desc:"Heilt sofort 25 HP; nach jedem weiteren Boss kostet jeder Stapel 3 HP, ohne zu töten."},
    {kind:"perk",id:"scales",rarity:"common",name:"Schuppenpanzer",icon:"shield.svg",desc:"Eingehender Gegnerangriffsschaden sinkt um 1 pro Stapel, mindestens auf 0."},
    {kind:"perk",id:"bulwark",rarity:"rare",name:"Bollwerk",icon:"shield.svg",desc:"Der erste Gegnerangriff auf diesen Helden je Boss verursacht 4 Schaden weniger pro Stapel."},
    {kind:"perk",id:"dodge",rarity:"rare",name:"Ausweichinstinkt",icon:"shield.svg",desc:"Unter 30 % eigener HP verursachen Gegnerangriffe 2 Schaden weniger pro Stapel."},
    {kind:"perk",id:"realign",rarity:"epic",name:"Neuausrichtung",icon:"mastery.svg",desc:"Wähle einen belegten Fähigkeitsslot; seine Fähigkeit wird zufällig gegen eine noch nicht besessene getauscht."},
    {kind:"perk",id:"reroll",rarity:"common",name:"Neuwurf",icon:"dice.svg",desc:"Gewährt pro Stapel einen Neuwurf einer Belohnungsauswahl im Run."},
    {kind:"perk",id:"supply",rarity:"rare",name:"Vorratspaket",icon:"reward-gift.svg",desc:"Die nächste eigene Belohnungsauswahl enthält vier statt drei Perks; einmal pro Stapel."},
    {kind:"perk",id:"second_find",rarity:"epic",name:"Zweitfund",icon:"trio.svg",desc:"Die nächsten zwei Stufen erhält je ein Mitspieler eine deiner Belohnungen eine Stufe später ebenfalls. Ein erneuter Fund verlängert um zwei Stufen."},
    {kind:"perk",id:"scout",rarity:"common",name:"Kundschafter",icon:"encounter.svg",desc:"Zeigt bei der Pfadwahl die Fähigkeiten aller angebotenen Gegner."},
    {kind:"perk",id:"greed",rarity:"rare",name:"Trophäengier",icon:"trophy.svg",desc:"Erhöht die eigenen Boss-XP im restlichen Run um 50 % pro Stapel."},
    {kind:"perk",id:"relay",rarity:"rare",name:"Wechselspiel",icon:"trio.svg",desc:"Solange alle drei leben: Greift nach einem Mitspieler an und verursacht +2 Schaden pro Stapel."},
    {kind:"perk",id:"sharing",rarity:"common",name:"Proviantteilung",icon:"trio.svg",desc:"Vor jedem Boss gibt der gesündeste Held jedem schwächeren Mitspieler bis zu 3 HP pro Stapel, höchstens bis zum jeweiligen Gleichstand."},
    {kind:"perk",id:"cartographer",rarity:"common",name:"Kartograph",icon:"world.svg",desc:"Gewährt pro Stapel einen Austausch eines Pfadangebots gegen einen ungesehenen Encounter derselben Stufe."},
    {kind:"perk",id:"flawless",rarity:"epic",name:"Auslese",icon:"completed.svg",desc:"Nach einem Boss ohne erlittenen Schaden erhält dieser Held je Stapel zusätzlich einen zufälligen gewöhnlichen Perk."},
    {kind:"perk",id:"refinement",rarity:"rare",name:"Feinschliff",icon:"xp-star.svg",desc:"Hebt eine ausgerüstete Fähigkeit dieses Helden für diesen Lauf auf Mastery-Level 1."},
    {kind:"perk",id:"mastery",rarity:"epic",name:"Meisterschaft",icon:"prestige.svg",desc:"Hebt eine ausgerüstete Fähigkeit dieses Helden für diesen Lauf auf Mastery-Level 2; beide Upgradestufen wirken."},
    {kind:"perk",id:"plunder",rarity:"rare",name:"Plünderer",icon:"xp-star.svg",desc:"Jeder eigene Gegner-Kill bringt bei einem gewonnenen Boss 10 zusätzliche eigene Boss-XP pro Stapel."}
  ]);

  let run=null;
  let rewardTurn=0;
  let rewardChoices=[];
  let selectionLocked=false;
  let inputReadyAt=0;
  let resumeCandidate=null;

  const $=id=>document.getElementById(id);
  const tr=value=>window.t?window.t(String(value)):String(value);
  const safe=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const rewardById=id=>REWARDS.find(reward=>reward.id===id)||null;
  const stageConfig=()=>run?.selectedPaths?.[run.stage]||null;
  const heroState=profileId=>run?.heroes?.[String(profileId)]||null;
  const isActive=()=>!!run?.active;
  const validAbility=id=>REAL_ABILITY_IDS.includes(Number(id))?Number(id):null;

  function worldThemeKey(stageIndex=run?.stage??0){
    const index=Math.max(0,Math.floor(Number(stageIndex)||0));
    return BOSS_RUSH_WORLD_THEME_KEYS[index%BOSS_RUSH_WORLD_THEME_KEYS.length];
  }

  function shuffled(items){
    const pool=[...(items||[])];
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    return pool;
  }

  function randomBossLoadout(count,blocked=[]){
    const wanted=Math.max(1,Math.min(3,Number(count)||2));
    const blockedIds=new Set((blocked||[]).map(Number));
    const selected=[];
    const brutal=shuffled(BRUTAL_ABILITY_IDS.filter(id=>!blockedIds.has(id)));
    if(brutal.length)selected.push(brutal[0]);
    const pool=shuffled(REAL_ABILITY_IDS.filter(id=>!blockedIds.has(id)&&!selected.includes(id)));
    [...brutal.slice(1),...pool].forEach(id=>{
      if(selected.length<wanted&&!selected.includes(id))selected.push(id);
    });
    return selected.slice(0,wanted);
  }

  function buildStage(stage){
    const used=[];
    const enemies=stage.enemies.map(enemy=>{
      const abilities=randomBossLoadout(enemy.abilityCount,used);
      used.push(...abilities);
      return {name:enemy.name,hp:enemy.hp,abilities};
    });
    const phaseAbilities=randomBossLoadout(stage.phaseAbilityCount,used);
    return {enemies,phaseAbilities};
  }

  function abilityName(id){const name=ABILITIES[id]?.name||String(id);return window.WD_LANG_PACKS?.en?.exact?.[name]||name;}
  function abilityNames(ids){return (ids||[]).map(abilityName).join(" + ");}

  function currentEncounter(){
    const stage=stageConfig(),build=stage?.build;
    if(!run||!stage||!build)return null;
    const base=trioEncounterById(stage.encounterId);
    if(!base)return null;
    const enemies=build.enemies.map((built,index)=>{
      const spec=stage.enemies[index];
      const source=base.enemies[index];
      if(!source)return null;
      return {
        ...source,
        name:spec.name,
        // Der Motor multipliziert Mutator-HP beim Aufbau; die Vorschau zeigt End-HP.
        hp:spec.hp/(ELITE_MUTATORS[source.mutator]?.hp||1),
        level:"hard",
        ability:built.abilities[0],
        secondAbility:built.abilities[1]??null,
        thirdAbility:built.abilities[2]??null
      };
    }).filter(Boolean);
    if(enemies.length!==stage.enemies.length)return null;
    const phaseAbilities=build.phaseAbilities;
    const bossRushPhase={
      boss:stage.enemies[0].name,
      threshold:.5,
      title:`RUSH OVERDRIVE ${run.stage+1}`,
      desc:tr(`${stage.enemies[0].name} wechselt das Loadout auf ${abilityNames(phaseAbilities)} und heilt ${stage.phaseHeal} HP.`),
      heal:stage.phaseHeal,
      ability:phaseAbilities[0],
      secondAbility:phaseAbilities[1]??null,
      thirdAbility:phaseAbilities[2]??null
    };
    return {
      ...base,
      title:`Boss Rush ${run.stage+1}/${STAGES.length} · ${stage.label}`,
      subtitle:tr(enemies.length>1?"Fortlaufender Trio-Gruppenkampf":"Fortlaufender Trio-Bosskampf"),
      desc:tr(`Besiegt ${stage.label}. Gegnerfähigkeiten wechseln bei jedem neuen Run; Spieler-HP, Rush-Fähigkeiten und Belohnungen werden übernommen.`),
      requires:[],
      requiredPrimaryAbilities:[],grantedThirdAbilities:[],randomStartSecondAbility:false,
      playerHp:START_HP,
      challenge:{type:"win",text:tr(`Besiegt ${stage.label}.`)},
      enemies,
      farmTrophy:false,
      bossRush:true,
      bossRushWorldTheme:worldThemeKey(run.stage),
      bossRushPhase
    };
  }

  function stageNumber(){return run?run.stage+1:1;}
  function livePhaseValue(){
    const encounter=currentEncounter(),phase=encounter?.bossRushPhase;
    if(!phase)return tr("–");
    const triggered=typeof encounterRuntime!=="undefined"&&Array.isArray(encounterRuntime?.phaseTriggeredIds)
      ?encounterRuntime.phaseTriggeredIds.length
      :0;
    if(triggered>0)return tr(`2 · ${phase.title}`);
    return tr(`1 · ${Math.round((Number(phase.threshold)||.5)*100)} % → ${phase.title}`);
  }

  function liveStatusItem(label,value){
    const item=document.createElement("span"),caption=document.createElement("small"),content=document.createElement("b");
    item.className="boss-rush-status-item";
    caption.textContent=tr(label);
    content.textContent=String(value);
    item.append(caption,content);
    return item;
  }

  function syncLiveStatus(){
    if(!run?.active)return;
    const banner=$("encounterRuleBanner"),status=banner?.querySelector(".boss-rush-live"),stage=stageConfig();
    if(!banner||!status||!stage)return;
    const phaseValue=livePhaseValue();
    const signature=[run.stage,stage.label,phaseValue,run.bossXpEarned].join("|");
    if(status.dataset.bossRushStatus!==signature){
      status.dataset.bossRushStatus=signature;
      status.classList.add("boss-rush-status-items");
      status.replaceChildren(
        liveStatusItem("Stufe",`${run.stage+1} / ${STAGES.length}`),
        liveStatusItem("Boss",stage.label),
        liveStatusItem("Phase",phaseValue),
        liveStatusItem("XP",run.profileIds.map(id=>`${getProfile(id)?.name}: ${heroState(id)?.xpEarned||0}`).join(" · "))
      );
      status.setAttribute("aria-label",tr(`Boss Rush, Stufe ${run.stage+1} von ${STAGES.length}, Boss ${stage.label}, Phase ${phaseValue}, ${run.bossXpEarned} ${tr("Basis-Boss-XP")}`));
    }
    banner.querySelectorAll(".phase-live").forEach(line=>{
      line.dataset.bossRushLegacyPhase="1";
      line.setAttribute("aria-hidden","true");
    });
  }

  function statusText(){
    const stage=stageConfig();
    if(!run||!stage)return "";
    queueMicrotask(syncLiveStatus);
    return tr(`Boss Rush ${run.stage+1}/${STAGES.length} · ${stage.label} · ${run.bossXpEarned} ${tr("Basis-Boss-XP")}`);
  }

  function findHeroIndex(profileId){
    return players.findIndex(player=>player?.campaignTeam==="hero"&&String(player.profileId)===String(profileId));
  }

  function syncRunStateFromPlayers(){
    if(!run)return;
    run.profileIds.forEach(profileId=>{
      const index=findHeroIndex(profileId),player=players[index],hero=heroState(profileId);
      if(!player||!hero)return;
      hero.hp=Math.max(0,Number(player.hp)||0);
      hero.maxHp=Math.max(1,Number(player.maxHp)||START_HP);
      hero.primaryAbility=validAbility(player.ability)??hero.primaryAbility??null;
      const second=validAbility(player.secondAbility),third=validAbility(player.thirdAbility);
      if(second!=null)hero.secondAbility=second;
      if(third!=null)hero.thirdAbility=third;
    });
  }

  function startingVitals(profile,baseMaxHp){
    const fallback=Math.max(1,Number(baseMaxHp)||START_HP),hero=heroState(profile?.id);
    if(!hero)return {hp:fallback,maxHp:fallback};
    if(hero.maxHp==null){
      hero.maxHp=fallback;
      hero.hp=fallback;
    }else{
      hero.maxHp=Math.max(10,hero.maxHp);
      hero.hp=Math.max(0,Number(hero.hp)||0);
    }
    if(hero.hp<=0&&perk(profile.id,"second_wind")>0)hero.hp=15;
    return {hp:hero.hp,maxHp:hero.maxHp};
  }

  function startingLoadout(profile,primaryAbility,fallbackSecond=null){
    const hero=heroState(profile?.id),primary=validAbility(primaryAbility);
    if(!hero)return {secondAbility:validAbility(fallbackSecond),thirdAbility:null,secondAbilityUnlocked:fallbackSecond!=null,thirdAbilityUnlocked:false,campaignBonusDraftUsed:false};
    hero.primaryAbility=validAbility(hero.primaryAbility)??primary;
    const fallback=validAbility(fallbackSecond);
    const storedSecond=validAbility(hero.secondAbility);
    const second=storedSecond??(fallback!==primary?fallback:null);
    const third=validAbility(hero.thirdAbility);
    hero.secondAbility=second;
    hero.thirdAbility=third;
    return {
      secondAbility:second,
      thirdAbility:third,
      secondAbilityUnlocked:second!=null,
      thirdAbilityUnlocked:third!=null,
      // Sobald Slot 2 belegt ist, darf der normale Kill-/HP-Draft Slot 3 nicht füllen.
      // Slot 3 gehört im Boss Rush exklusiv der Level-Belohnung.
      campaignBonusDraftUsed:second!=null
    };
  }

  function healHero(profileId,amount,{combat=false,reason="Boss Rush"}={}){
    const hero=heroState(profileId),index=findHeroIndex(profileId),player=players[index];
    if(!hero||amount<=0)return 0;
    const before=Math.max(0,Number(combat?player?.hp:hero.hp)||0);
    hero.hp=before+amount;
    if(player)player.hp=hero.hp;
    if(combat&&player){recordHealing(index,amount);pendingExtraHealFx.push({target:index,amount});addLog(`${tr(reason)}: ${player.name} +${amount} HP`);}
    return amount;
  }

  function perk(profileId,id){return Math.max(0,Number(heroState(profileId)?.perks?.[id])||0);}
  function combatHero(index){return run?.active&&!run.finished&&players[index]?.campaignTeam==="hero"?heroState(players[index].profileId):null;}
  function partnerIds(profileId){return run.profileIds.filter(id=>String(id)!==String(profileId));}
  // Zweitfund laeuft zwei Stufen und gibt je Stufe hoechstens eine Kopie ab.
  // Vorher ging jeder Stapel an beide Mitspieler: bei drei Helden sammelte
  // einer so bis zu 52 statt zehn Belohnungen. Empfaenger ist immer der
  // Mitspieler mit den bisher wenigsten Kopien - fair, und die Zaehlung
  // steckt schon in rewardHistory, ueberlebt also einen Reload.
  const SECOND_FIND_STAGES=2;
  function copyPartner(profileId){
    const partner=partnerIds(profileId);
    if(!partner.length)return null;
    const erhalten=id=>run.rewardHistory.filter(h=>h.copy&&String(h.profileId)===String(id)).length;
    return [...partner].sort((a,b)=>erhalten(a)-erhalten(b)||partner.indexOf(a)-partner.indexOf(b))[0];
  }
  function persistRun(){
    if(!run)return;
    if(!saveData.trioBossRushRuns)saveData.trioBossRushRuns={};
    if(run.finished)delete saveData.trioBossRushRuns[trioKey(run.profileIds)];
    else saveData.trioBossRushRuns[trioKey(run.profileIds)]=copy(run);
    saveGameData();
  }

  function attackDamageBonus(index,targetIndex){
    const hero=combatHero(index);
    if(!hero)return {amount:0,parts:[]};
    const id=players[index].profileId,parts=[];
    let amount=0;
    const add=(key,factor)=>{const n=perk(id,key)*factor;if(n>0){amount+=n;parts.push(`${tr(rewardById(key).name)} +${n}`);}};
    add("damage",1);
    if(hero.openingUsedStage!==run.stage&&perk(id,"opening")){add("opening",3);hero.openingUsedStage=run.stage;}
    const target=players[targetIndex],ratio=players[index].hp/Math.max(1,players[index].maxHp);
    if(target&&target.hp/Math.max(1,target.maxHp)<.3)add("execution",4);
    add("revenge",3*players.filter(p=>p.campaignTeam==="hero"&&p.hp<=0).length);
    add("sacrifice",ratio<.25?4:ratio<.5?2:0);
    add("momentum",run.cleared);
    if(((hero.successfulAttacks||0)+1)%3===0)add("drill",6);
    add("gamble",5);
    if(partnerIds(id).includes(run.lastAttacker)&&run.profileIds.every(pid=>players[findHeroIndex(pid)]?.hp>0))add("relay",2);
    return {amount,parts};
  }

  function incomingDamageModifier(targetIndex,base){
    const hero=combatHero(targetIndex);
    if(!hero||players[current]?.campaignTeam!=="enemy"||base<=0)return 0;
    const id=players[targetIndex].profileId;
    let reduction=perk(id,"scales");
    if(hero.bulwarkUsedStage!==run.stage){reduction+=4*perk(id,"bulwark");hero.bulwarkUsedStage=run.stage;}
    if(players[targetIndex].hp/Math.max(1,players[targetIndex].maxHp)<.3)reduction+=2*perk(id,"dodge");
    return -Math.min(base,reduction);
  }

  function afterHeroAttack(index,totalDamage){
    const hero=combatHero(index);
    if(!hero||totalDamage<=0)return 0;
    hero.successfulAttacks=(hero.successfulAttacks||0)+1;
    run.lastAttacker=String(players[index].profileId);
    return healHero(players[index].profileId,perk(players[index].profileId,"siphon")*2,{combat:true,reason:"Boss Rush · Blutdurst"});
  }

  function onHeroKill(index){
    const hero=combatHero(index);
    if(!hero)return 0;
    hero.stageKills=(hero.stageKills||0)+1;
    return healHero(players[index].profileId,perk(players[index].profileId,"hunter")*4,{combat:true,reason:"Boss Rush · Trophäenjäger"});
  }

  const MASTERY_REWARD_LEVELS=Object.freeze({refinement:1,mastery:2});
  const ABILITY_SLOTS=Object.freeze(["primaryAbility","secondAbility","thirdAbility"]);
  function abilityLevelOverride(profileId,id){
    const hero=heroState(profileId);
    if(!run?.active||run.finished||!hero||!ABILITY_SLOTS.some(slot=>hero[slot]===Number(id)))return 0;
    return Math.max(0,Math.min(2,Number(run.abilityLevelOverrides?.[String(profileId)]?.[Number(id)])||0));
  }
  function masteryTargets(profileId,rewardId){
    const hero=heroState(profileId),level=MASTERY_REWARD_LEVELS[rewardId];
    if(!hero||!level)return [];
    return ABILITY_SLOTS.flatMap((slot,index)=>{
      const id=validAbility(hero[slot]);if(id==null)return [];
      const effective=Math.max(window.WDMastery?.abilityLevel?.(getProfile(profileId),"trio",id)||0,abilityLevelOverride(profileId,id));
      if(effective>=level)return [];
      const upgrades=[];
      for(let next=effective+1;next<=level;next++){
        const upgrade=window.WDMastery?.abilityUpgrade?.(id,next);
        if(!upgrade)return [];
        upgrades.push(upgrade);
      }
      return [{slot,index,id,upgrades}];
    });
  }
  function rewardEligible(profileId,rewardId){
    return !MASTERY_REWARD_LEVELS[rewardId]||masteryTargets(profileId,rewardId).length>0;
  }
  function needsTarget(rewardId){return rewardId==="realign"||!!MASTERY_REWARD_LEVELS[rewardId];}

  function perkChoicesFor(profileId,count,difficulty=stageConfig()?.difficulty||"easy"){
    const eligible=REWARDS.filter(r=>(difficulty!=="easy"||r.rarity==="common")&&rewardEligible(profileId,r.id));
    const mandatory=difficulty==="hard"?"epic":difficulty==="normal"?"rare":"common";
    const chosen=shuffled(eligible.filter(r=>r.rarity===mandatory)).slice(0,1);
    shuffled(eligible).forEach(r=>{if(chosen.length<count&&!chosen.includes(r))chosen.push(r);});
    return shuffled(chosen);
  }

  function abilityChoicesFor(profileId,count=1){
    const hero=heroState(profileId);
    if(!hero)return [];
    const owned=new Set([hero.primaryAbility,hero.secondAbility,hero.thirdAbility].map(validAbility).filter(id=>id!=null));
    return shuffled(REAL_ABILITY_IDS.filter(id=>!owned.has(id))).slice(0,count).map(abilityId=>({kind:"ability",id:`ability:${abilityId}`,abilityId,name:abilityName(abilityId),icon:"mastery.svg",desc:"Setzt die 3. Fähigkeit für die nächsten Stufen."}));
  }

  function choiceById(id){
    if(String(id).startsWith("ability:")){
      const abilityId=validAbility(String(id).slice(8));
      return abilityId==null?null:{kind:"ability",id,abilityId,name:abilityName(abilityId),icon:"mastery.svg",desc:"Setzt die 3. Fähigkeit für die nächsten Stufen."};
    }
    return rewardById(id);
  }

  function newChoices(profileId,count){
    const difficulty=stageConfig()?.difficulty||"easy";
    return [...perkChoicesFor(profileId,count,difficulty),...(difficulty==="hard"?abilityChoicesFor(profileId):[])].map(c=>c.id);
  }

  function choiceIcon(choice){return `${ICON_ROOT}${choice.icon}`;}
  function choiceStateLabel(profileId,choice){
    if(choice.kind==="ability")return tr("Einmalig · bleibt bis Rush-Ende");
    return `${tr(RARITIES[choice.rarity])} · ${tr("Stapel")}: ${perk(profileId,choice.id)}`;
  }
  function modal(title,text,kicker="Boss Rush"){
    $("trioBossRushRewardModal").classList.remove("hidden");
    $("trioBossRushRewardTitle").textContent=tr(title);
    $("trioBossRushRewardText").textContent=text;
    $("trioBossRushRewardKicker").textContent=tr(kicker);
    $("trioBossRushRerollBtn").classList.add("hidden");
    $("trioBossRushRewardOptions").replaceChildren();
  }
  function optionButton(label,desc,icon,attribute,value,meta=""){
    return `<button type="button" class="boss-rush-reward-card" ${attribute}="${safe(value)}"><img src="${ICON_ROOT}${safe(icon)}?v=${ASSET_REV}" alt="" aria-hidden="true"><span class="boss-rush-reward-copy"><strong>${safe(label)}</strong><small>${safe(desc)}</small><em>${safe(meta)}</em></span></button>`;
  }
  function lockSelection(){selectionLocked=true;inputReadyAt=performance.now()+250;}
  function inputBlocked(){return performance.now()<inputReadyAt;}
  function currentTask(){return run?.rewardTasks?.[run.rewardTurn];}

  function renderRewardTurn(){
    const task=currentTask();if(!task)return;
    rewardTurn=run.rewardTurn;
    const profile=getProfile(task.profileId),hero=heroState(task.profileId);
    // Frühere Zweitfunde können die später vorbereitete Auswahl bereits verbessern.
    // Eine wirkungslose Kopie überspringen; reguläre Auswahl mit Seltenheitsgarantie neu ziehen.
    if(task.choices.some(id=>!rewardEligible(task.profileId,id))){
      run.swapPending=null;
      if(task.copy){completeReward();return;}
      task.choices=newChoices(task.profileId,task.count);persistRun();
    }
    rewardChoices=task.choices.map(choiceById).filter(Boolean);
    selectionLocked=!!run.swapPending;
    const intro=`${profile.name} · ${hero.hp} HP · ${tr("Wähle eine Belohnung")}`;
    modal(run.swapPending?(run.swapPending.rewardId==="realign"?"Fähigkeit zum Tauschen wählen":"Fähigkeit verbessern"):"Run-Belohnung",intro,task.copy?"Zweitfund":"Boss besiegt");
    if(run.swapPending&&MASTERY_REWARD_LEVELS[run.swapPending.rewardId]){
      const reward=rewardById(run.swapPending.rewardId);
      $("trioBossRushRewardOptions").innerHTML=masteryTargets(task.profileId,reward.id).map(target=>
        optionButton(`${target.index+1}. ${tr("Fähigkeit")}: ${abilityName(target.id)}`,
          target.upgrades.map(upgrade=>`${upgrade.name}: ${tr(upgrade.text)}`).join(" · "),
          reward.icon,"data-rush-slot",target.slot,tr(reward.name))
      ).join("");
      return;
    }
    if(run.swapPending){
      $("trioBossRushRewardOptions").innerHTML=["primaryAbility","secondAbility","thirdAbility"].map((slot,i)=>{
        const ability=validAbility(hero[slot]);
        return ability==null?"":optionButton(`${i+1}. ${tr("Fähigkeit")}: ${abilityName(ability)}`,tr("Diesen belegten Slot tauschen"),"mastery.svg","data-rush-slot",slot);
      }).join("");
      return;
    }
    $("trioBossRushRewardOptions").innerHTML=rewardChoices.map(choice=>optionButton(tr(choice.name),tr(choice.desc),choice.icon,"data-boss-rush-reward",choice.id,choiceStateLabel(task.profileId,choice))).join("");
    const left=perk(task.profileId,"reroll")-(hero.rerollsUsed||0);
    const reroll=$("trioBossRushRerollBtn");
    reroll.classList.toggle("hidden",task.copy||left<=0);
    reroll.textContent=`${tr("Belohnungen neu würfeln")} (${left})`;
  }

  function mirrorHero(profileId){
    const player=players[findHeroIndex(profileId)],hero=heroState(profileId);
    if(!player||!hero)return;
    player.hp=hero.hp;player.maxHp=hero.maxHp;player.ability=hero.primaryAbility;
    player.secondAbility=hero.secondAbility;player.thirdAbility=hero.thirdAbility;
    player.secondAbilityUnlocked=hero.secondAbility!=null;player.thirdAbilityUnlocked=hero.thirdAbility!=null;
  }

  function grant(profileId,rewardId,{slot=null,abilityId=null,copyReward=false,automatic=false}={}){
    const hero=heroState(profileId),choice=choiceById(rewardId);if(!hero||!choice)return false;
    if(choice.kind==="ability"){
      if(!copyReward&&[hero.primaryAbility,hero.secondAbility].includes(choice.abilityId))return false;
      if(![hero.primaryAbility,hero.secondAbility].includes(choice.abilityId))hero.thirdAbility=choice.abilityId;abilityId=choice.abilityId;
    }else{
      if(MASTERY_REWARD_LEVELS[rewardId]){
        const target=masteryTargets(profileId,rewardId).find(target=>target.slot===slot);
        if(!target)return false;
        abilityId=target.id;
        run.abilityLevelOverrides??={};
        run.abilityLevelOverrides[String(profileId)]??={};
        run.abilityLevelOverrides[String(profileId)][abilityId]=MASTERY_REWARD_LEVELS[rewardId];
      }
      if(rewardId==="realign"){
        if(!["primaryAbility","secondAbility","thirdAbility"].includes(slot)||validAbility(hero[slot])==null)return false;
        const available=REAL_ABILITY_IDS.filter(id=>![hero.primaryAbility,hero.secondAbility,hero.thirdAbility].includes(id));
        abilityId=shuffled(available)[0];if(abilityId==null)return false;
        hero[slot]=abilityId;
      }
      hero.perks[rewardId]=perk(profileId,rewardId)+1;
      if(rewardId==="constitution"){hero.maxHp+=10;hero.hp+=10;}
      if(rewardId==="gamble"){hero.maxHp=Math.max(10,hero.maxHp-5);hero.hp=Math.min(hero.hp,hero.maxHp);}
      if(rewardId==="rest")hero.hp+=12;
      if(rewardId==="regen")hero.hp+=5;
      if(rewardId==="blood_pact")hero.hp+=25;
    }
    run.rewardHistory.push({stage:run.stage+1,profileId:String(profileId),rewardId,slot,abilityId,copy:copyReward,automatic});
    if(!copyReward&&!automatic){
      if(rewardId==="second_find")hero.secondFindLeft=(Number(hero.secondFindLeft)||0)+SECOND_FIND_STAGES;
      else if((Number(hero.secondFindLeft)||0)>0&&run.stage<9){
        const partner=copyPartner(profileId);
        if(partner!=null){hero.secondFindLeft--;run.deferredRewards.push({dueStage:run.stage+1,profileId:partner,rewardId});}
      }
    }
    mirrorHero(profileId);
    return true;
  }

  function completeReward(){
    run.swapPending=null;run.rewardTurn++;
    if(run.rewardTurn<run.rewardTasks.length){persistRun();renderPlayers();renderRewardTurn();return;}
    run.stage++;run.phase="path";run.rewardTasks=[];run.rewardTurn=0;
    ensurePaths();persistRun();renderPlayers();showPaths();
  }

  function selectReward(rewardId){
    const task=currentTask();
    if(inputBlocked()||selectionLocked||!run||run.finished||run.phase!=="reward"||!task?.choices.includes(rewardId)||!rewardEligible(task.profileId,rewardId))return;
    lockSelection();
    if(needsTarget(rewardId)){
      run.swapPending={profileId:task.profileId,rewardId};persistRun();renderRewardTurn();return;
    }
    if(!grant(task.profileId,rewardId,{copyReward:!!task.copy})){selectionLocked=false;return;}
    completeReward();
  }

  function selectSlot(slot){
    if(inputBlocked()||!run?.swapPending||!selectionLocked)return;
    const task=currentTask();lockSelection();
    if(!grant(task.profileId,run.swapPending.rewardId,{slot,copyReward:!!task.copy}))return;
    completeReward();
  }

  function rerollRewards(){
    const task=currentTask(),hero=task&&heroState(task.profileId);
    if(inputBlocked()||selectionLocked||!task||task.copy||perk(task.profileId,"reroll")<=(hero.rerollsUsed||0))return;
    lockSelection();hero.rerollsUsed=(hero.rerollsUsed||0)+1;
    task.choices=newChoices(task.profileId,task.count);persistRun();renderRewardTurn();
  }

  function showRewardModal(){
    if(!run.rewardTasks.length){
      // Hoechstens eine Kopie je Held und Stufe; was darueber liegt, rueckt
      // eine Stufe nach statt verloren zu gehen.
      const faellig=[],warten=[],vergeben=new Set();
      run.deferredRewards.forEach(r=>{
        if(r.dueStage>run.stage){warten.push(r);return;}
        if(vergeben.has(String(r.profileId))){if(run.stage<9)warten.push({...r,dueStage:run.stage+1});return;}
        vergeben.add(String(r.profileId));faellig.push(r);
      });
      run.deferredRewards=warten;
      run.rewardTasks=faellig.map(r=>({profileId:r.profileId,copy:true,count:1,choices:[r.rewardId]}));
      run.profileIds.forEach(profileId=>{
        const hero=heroState(profileId),supply=perk(profileId,"supply")>(hero.suppliesUsed||0);
        if(supply)hero.suppliesUsed=(hero.suppliesUsed||0)+1;
        const count=supply?4:3;
        run.rewardTasks.push({profileId,copy:false,count,choices:newChoices(profileId,count)});
      });
      run.rewardTurn=0;
    }
    persistRun();renderRewardTurn();
  }

  function applyStageRegeneration(){
    const hospital=run.profileIds.reduce((n,id)=>n+perk(id,"hospital"),0)*8;
    run.profileIds.forEach(id=>{
      const hero=heroState(id);
      healHero(id,perk(id,"regen")*5+hospital);
      if(hero.hp>0)hero.hp=Math.max(1,hero.hp-3*perk(id,"blood_pact"));
      mirrorHero(id);
    });
  }

  function profileBossXp(profile){return Math.max(0,Math.floor(Number(profile?.campaign?.bossRushXp)||0));}
  function awardBossXp(){
    const base=50+run.stage*25;
    run.lastBossXpAward=base;run.bossXpEarned+=base;
    run.profileIds.forEach(id=>{
      const profile=getProfile(id),hero=heroState(id);
      const amount=Math.floor((base+10*perk(id,"plunder")*(hero.stageKills||0))*(1+.5*perk(id,"greed")));
      if(!profile.campaign)profile.campaign={};
      profile.campaign.bossRushXp=profileBossXp(profile)+amount;
      hero.xpEarned=(hero.xpEarned||0)+amount;
      run.bossXpAwards.push({stage:run.stage+1,profileId:id,amount});
    });
    // XP und abgeschlossene Stufe werden zusammen mit dem Belohnungszustand gespeichert.
    return base;
  }

  function perkSummary(profileId){
    const hero=heroState(profileId);if(!hero)return tr("Keine Run-Belohnungen");
    const parts=REWARDS.filter(r=>perk(profileId,r.id)>0).map(r=>`${tr(r.name)} ${perk(profileId,r.id)}×`);
    if(hero.thirdAbility!=null)parts.push(`${tr("3. Fähigkeit")}: ${abilityName(hero.thirdAbility)}`);
    parts.push(`${hero.xpEarned||0} Boss XP`);
    return parts.join(" · ");
  }

  function stageDefinitions(){
    return STAGES.map((_,index)=>({candidates:stagePool(index).flatMap(e=>(index===9?[DIFFICULTIES[2]]:DIFFICULTIES).map(d=>optionFor(e,index,d.id)))}));
  }
  function ensurePaths(){
    if(run.paths[run.stage]?.length)return;
    const pool=shuffled(stagePool(run.stage).filter(e=>!run.seenEncounters.includes(e.id)));
    const chosen=pool.slice(0,run.stage===9?1:3);
    run.paths[run.stage]=chosen.map((encounter,i)=>{
      const option=optionFor(encounter,run.stage,run.stage===9?"hard":DIFFICULTIES[i].id);
      option.build=buildStage(option);run.seenEncounters.push(encounter.id);return option;
    });
  }
  function showPaths(){
    if(run.stage===9){choosePath(0,true);return;}
    selectionLocked=false;
    modal("Nächsten Gegner wählen",`${tr("Stufe")} ${run.stage+1} / 10 · ${tr("Schwerer Pfad, bessere Beute")}`);
    const scouting=run.profileIds.some(id=>perk(id,"scout")>0);
    $("trioBossRushRewardOptions").innerHTML=run.paths[run.stage].map((o,i)=>{
      const difficulty=DIFFICULTIES.find(d=>d.id===o.difficulty);
      const enemies=o.enemies.map((e,j)=>`${e.name}: ${e.hp} HP${scouting?` · ${abilityNames(o.build.enemies[j].abilities)}`:""}`).join(" · ");
      const card=optionButton(`${tr(difficulty.name)} · ${o.label}`,enemies,"encounter.svg","data-rush-path",i,tr(difficulty.loot));
      const available=run.profileIds.reduce((n,id)=>n+perk(id,"cartographer")-(heroState(id).pathRerollsUsed||0),0);
      const unseen=stagePool(run.stage).some(e=>!run.seenEncounters.includes(e.id));
      return `<div class="rush-path-entry">${card}${available>0&&unseen?`<button type="button" class="secondary" data-rush-redraw="${i}">${safe(tr("Pfad neu ziehen"))} (${available})</button>`:""}</div>`;
    }).join("");
  }
  function redrawPath(index){
    if(inputBlocked()||selectionLocked||run?.phase!=="path"||!run.paths[run.stage]?.[index])return;
    const donor=run.profileIds.find(id=>perk(id,"cartographer")>(heroState(id).pathRerollsUsed||0));
    const encounter=shuffled(stagePool(run.stage).filter(e=>!run.seenEncounters.includes(e.id)))[0];
    if(!donor||!encounter)return;
    lockSelection();const old=run.paths[run.stage][index],option=optionFor(encounter,run.stage,old.difficulty);
    option.build=buildStage(option);run.paths[run.stage][index]=option;run.seenEncounters.push(encounter.id);
    heroState(donor).pathRerollsUsed=(heroState(donor).pathRerollsUsed||0)+1;
    persistRun();showPaths();
  }
  function choosePath(index,final=false){
    if(!final&&(inputBlocked()||selectionLocked))return;
    const option=run?.paths?.[run.stage]?.[index];if(!option||run.phase!=="path")return;
    lockSelection();run.selectedPaths[run.stage]=copy(option);run.phase="combat";
    startStage();
  }
  function startStage(){
    $("trioBossRushRewardModal").classList.add("hidden");
    const encounter=currentEncounter();if(!encounter){showOutcome(false,tr("Der nächste Boss konnte nicht gestartet werden."));return;}
    if(run.preparedStage!==run.stage){
      run.profileIds.forEach(id=>{
        const profile=getProfile(id),hero=heroState(id);
        startingVitals(profile,START_HP+(window.WDMastery?.hpBonus?.(profile,"trio",encounter)||0));
        hero.stageKills=0;
      });
      const heroes=run.profileIds.map(heroState);
      if(heroes.every(h=>h.hp>0)){
        const ordered=[...heroes].sort((a,b)=>b.hp-a.hp),stacks=run.profileIds.reduce((n,id)=>n+perk(id,"sharing"),0);
        for(const recipient of ordered.slice(1).reverse()){
          const transfer=Math.max(0,Math.min(3*stacks,Math.floor((ordered[0].hp-recipient.hp)/2)));
          ordered[0].hp-=transfer;recipient.hp+=transfer;
        }
      }
      run.preparedStage=run.stage;
    }
    // Der Motor liest die Primärfähigkeiten aus der bestehenden Trio-Auswahl.
    run.profileIds.forEach((id,i)=>{
      $("trioProfile"+(i+1)+"Select").value=id;
      $("trioAbility"+(i+1)+"Select").value=String(heroState(id).primaryAbility);
    });
    trioCampaignEncounterId=encounter.id;
    persistRun();
    if(!startTrioCampaignEncounter({bossRush:true})){showOutcome(false,tr("Der nächste Boss konnte nicht gestartet werden."));return;}
  }

  function showOutcome(completed,technicalMessage=""){
    if(!run)return;
    run.finished=true;
    persistRun();
    run.active=true;
    syncRunStateFromPlayers();
    const cleared=completed?STAGES.length:Math.max(0,run.cleared||0);
    const heroRows=run.profileIds.map((profileId,slot)=>{
      const profile=getProfile(profileId),hero=heroState(profileId);
      return `<div class="round-score-row${completed?" winner-row":""}"><div class="round-score-name">${safe(profile?.name||tr(`Spieler ${slot+1}`))}</div><div class="round-score-meta">${safe(tr(`Trio-Spieler · ${Math.max(0,hero?.hp||0)} HP · Boss XP gesamt ${profileBossXp(profile)}`))} · ${safe(perkSummary(profileId))}</div></div>`;
    }).join("");
    winnerText.textContent=tr(completed?"BOSS RUSH GESCHAFFT!":"BOSS RUSH GESCHEITERT");
    roundResultText.innerHTML=completed
      ?`${safe(tr(`Alle ${STAGES.length} Bossstufen wurden besiegt.`))}<br><strong>${safe(tr(`Run abgeschlossen: ${cleared} / ${STAGES.length} · +${run.bossXpEarned} ${tr("Basis-Boss-XP")}`))}</strong><br>${safe(tr("Rush-Belohnungen und zusätzliche Fähigkeiten sind nur für diesen Lauf gültig und werden beim Verlassen entfernt."))}`
      :`${safe(tr(`Euer Team ist bei Boss ${Math.min(STAGES.length,run.stage+1)} gefallen.`))}<br><strong>${safe(tr(`Besiegt: ${cleared} / ${STAGES.length} · +${run.bossXpEarned} ${tr("Basis-Boss-XP")} behalten`))}</strong>${technicalMessage?`<br>${safe(technicalMessage)}`:""}<br>${safe(tr("Kampagnenfortschritt, Mastery XP und Trophäen bleiben unverändert."))}`;
    roundStandings.innerHTML=heroRows;
    renderRoundStats();
    clearBotAutomation();
    winnerBox.classList.remove("hidden");
    nextRoundBox.classList.add("hidden");
    nextRoundPrepBtn.classList.add("hidden");
    restartBtn.textContent=tr("Zur Trio-Kampagne");
    restartBtn.disabled=false;
    gameContext.returnScreen="trio";
    gameContext.mode="trio-boss-rush-result";
    turnLine.textContent=tr(completed?"Boss Rush abgeschlossen":"Boss Rush beendet");
    statusEl.textContent="";
    abilityState.innerHTML="";
    hideAllControls();
    renderPlayers();
    roundNumberEl.textContent=Math.min(STAGES.length,run.stage+1);
  }

  function finishEncounter(heroWon){
    if(!run)return false;
    if(roundWinnerHandled)return true;
    roundWinnerHandled=true;
    const heroIndices=campaignHeroIndices();
    roundWinnerIndex=heroWon?(heroIndices.find(index=>players[index]?.hp>0)??heroIndices[0]):players.findIndex(player=>player?.hp>0&&player.campaignTeam==="enemy");
    heroIndices.forEach(index=>window.WDMastery?.noteMatchEnd?.(index,heroWon));
    clearBotAutomation();
    isAnimating=false;
    phase="idle";
    syncRunStateFromPlayers();
    if(!heroWon){showOutcome(false);return true;}
    run.cleared=run.stage+1;
    run.profileIds.forEach(id=>{
      if((roundStats[findHeroIndex(id)]?.damageTaken||0)===0){
        const count=perk(id,"flawless");
        for(let i=0;i<count;i++)grant(id,shuffled(REWARDS.filter(r=>r.rarity==="common"))[0].id,{automatic:true});
      }
    });
    awardBossXp();
    applyStageRegeneration();
    syncRunStateFromPlayers();
    if(run.stage>=STAGES.length-1){
      heroIndices.forEach(index=>unlockAchievementForPlayer(index,"rush_finale"));
      const usedRest=run.rewardHistory.some(entry=>entry.rewardId==="rest");
      if(!usedRest)heroIndices.forEach(index=>unlockAchievementForPlayer(index,"no_rest_for_legends"));
      showOutcome(true);return true;
    }
    turnLine.textContent=tr(`Boss ${run.stage+1} besiegt`);
    statusEl.textContent=`+${run.lastBossXpAward} ${tr("Basis-Boss-XP")} · ${tr("Wähle eine Belohnung")}`;
    abilityState.innerHTML="";
    hideAllControls();
    renderPlayers();
    run.phase="reward";
    showRewardModal();
    return true;
  }

  function refreshButton(){
    const button=$("trioBossRushStartBtn"),summary=$("trioBossRushXpSummary");
    if(!button)return;
    const p1=getProfile($("trioProfile1Select")?.value),p2=getProfile($("trioProfile2Select")?.value),p3=getProfile($("trioProfile3Select")?.value);
    const validPair=!!p1&&!!p2&&!!p3&&new Set([p1.id,p2.id,p3.id]).size===3;
    const unlocked=validPair&&trioWorldUnlocked(p1,p2,p3,TRIO_CAMPAIGN_WORLDS[0]);
    const abilities=[1,2,3].every(i=>!!$("trioAbility"+i+"Select")?.value);
    button.disabled=!validPair||!unlocked||!abilities||isActive();
    button.title=tr(!validPair?"Drei verschiedene Trio-Profile wählen":!unlocked?"Trio-Kampagne zuerst freischalten":"10 Bossstufen · wechselnde Loadouts · Build-Drafts nach jeder Stufe");
    if(summary){
      summary.textContent=validPair
        ?`Boss XP · ${p1.name} ${profileBossXp(p1)} · ${p2.name} ${profileBossXp(p2)} · ${p3.name} ${profileBossXp(p3)}`
        :tr("Boss XP · drei Profile wählen");
    }
  }

  function validStored(candidate,ids){
    if(!candidate||candidate.schema!==1||candidate.finished||!Array.isArray(candidate.profileIds)||candidate.profileIds.length!==3||trioKey(candidate.profileIds)!==trioKey(ids))return false;
    if(!["path","combat","reward"].includes(candidate.phase)||!Number.isInteger(candidate.stage)||candidate.stage<0||candidate.stage>9)return false;
    if(!candidate.profileIds.every(id=>getProfile(id)&&candidate.heroes?.[id]))return false;
    if(!Array.isArray(candidate.paths)||!Array.isArray(candidate.selectedPaths)||!Array.isArray(candidate.rewardTasks))return false;
    if(!Array.isArray(candidate.seenEncounters)||!Array.isArray(candidate.deferredRewards)||!Array.isArray(candidate.rewardHistory)||!Array.isArray(candidate.bossXpAwards))return false;
    if(candidate.profileIds.some(id=>Object.keys(candidate.heroes[id].perks||{}).some(key=>!rewardById(key))))return false;
    if(candidate.paths.length>10||candidate.selectedPaths.length>10)return false;
    for(const [index,options] of candidate.paths.entries()){
      if(!options)continue;
      if(!Array.isArray(options)||options.length!==(index===9?1:3)||new Set(options.map(o=>o?.encounterId)).size!==options.length)return false;
      for(const option of options){
        if(!option||typeof option!=="object")return false;
        const base=stagePool(index).find(e=>e.id===option.encounterId);
        if(!base||!DIFFICULTIES.some(d=>d.id===option.difficulty)||!option.build)return false;
        const expected=optionFor(base,index,option.difficulty);
        const {build,...spec}=option;
        if(JSON.stringify(spec)!==JSON.stringify(expected))return false;
        if(!Array.isArray(option.build.enemies)||option.build.enemies.length!==expected.enemies.length||!option.build.enemies.every(e=>Array.isArray(e.abilities)&&e.abilities.length===expected.phaseAbilityCount&&new Set(e.abilities).size===e.abilities.length&&e.abilities.every(id=>validAbility(id)!=null))||!Array.isArray(option.build.phaseAbilities)||option.build.phaseAbilities.length!==expected.phaseAbilityCount||new Set(option.build.phaseAbilities).size!==option.build.phaseAbilities.length||option.build.phaseAbilities.some(id=>validAbility(id)==null))return false;
      }
    }
    for(const [index,chosen] of candidate.selectedPaths.entries())if(chosen&&!candidate.paths[index]?.some(o=>JSON.stringify(o)===JSON.stringify(chosen)))return false;
    if(candidate.phase==="combat"&&!candidate.selectedPaths[candidate.stage])return false;
    for(const task of candidate.rewardTasks)if(!task||!candidate.profileIds.includes(task.profileId)||!Array.isArray(task.choices)||!task.choices.length||task.choices.some(id=>!choiceById(id)))return false;
    if(candidate.swapPending&&(!needsTarget(candidate.swapPending.rewardId)||!candidate.rewardTasks[candidate.rewardTurn]?.choices.includes(candidate.swapPending.rewardId)||candidate.swapPending.profileId!==candidate.rewardTasks[candidate.rewardTurn]?.profileId))return false;
    if(!Number.isInteger(candidate.rewardTurn)||candidate.rewardTurn<0||!Number.isInteger(candidate.cleared)||candidate.cleared<0||candidate.cleared>10)return false;
    if(candidate.deferredRewards.some(r=>!r||!candidate.profileIds.includes(r.profileId)||!Number.isInteger(r.dueStage)||r.dueStage<0||r.dueStage>9||!choiceById(r.rewardId)))return false;
    if(candidate.phase==="reward"&&!candidate.rewardTasks[candidate.rewardTurn])return false;
    return true;
  }

  function newRun(){
    const p1=getProfile($("trioProfile1Select").value),p2=getProfile($("trioProfile2Select").value),p3=getProfile($("trioProfile3Select").value);
    run={schema:1,active:true,finished:false,phase:"path",stage:0,cleared:0,preparedStage:-1,bossXpEarned:0,lastBossXpAward:0,
      profileIds:[String(p1.id),String(p2.id),String(p3.id)],previousEncounterId:trioCampaignEncounterId,previousWorldId:trioWorldId,
      abilityLevelOverrides:{},rewardHistory:[],bossXpAwards:[],paths:[],selectedPaths:[],seenEncounters:[],deferredRewards:[],rewardTasks:[],rewardTurn:0,swapPending:null,lastAttacker:null,
      heroes:Object.fromEntries([p1,p2,p3].map((p,i)=>[p.id,{hp:null,maxHp:null,primaryAbility:validAbility($("trioAbility"+(i+1)+"Select").value)??3,
        secondAbility:null,thirdAbility:null,perks:{},openingUsedStage:-1,bulwarkUsedStage:-1,successfulAttacks:0,stageKills:0,xpEarned:0}]))};
    resumeCandidate=null;ensurePaths();persistRun();showPaths();refreshButton();return true;
  }

  function start(){
    if(isActive())return false;
    const p1=getProfile($("trioProfile1Select")?.value),p2=getProfile($("trioProfile2Select")?.value),p3=getProfile($("trioProfile3Select")?.value);
    if(!p1||!p2||!p3||new Set([p1.id,p2.id,p3.id]).size!==3||!trioWorldUnlocked(p1,p2,p3,TRIO_CAMPAIGN_WORLDS[0]))return false;
    const key=trioKey([p1.id,p2.id,p3.id]),stored=saveData.trioBossRushRuns?.[key];
    if(validStored(stored,[p1.id,p2.id,p3.id])){
      resumeCandidate=copy(stored);selectionLocked=false;
      modal("Offener Boss Rush",`${p1.name} + ${p2.name} + ${p3.name} · ${tr("Stufe")} ${stored.stage+1} / 10`);
      $("trioBossRushRewardOptions").innerHTML=optionButton(tr("Fortsetzen"),tr("Am gespeicherten Abschnitt weiterspielen"),"trio.svg","data-rush-resume","yes")+optionButton(tr("Neu starten"),tr("Den offenen Run durch einen neuen ersetzen"),"dice.svg","data-rush-resume","no");
      return true;
    }
    if(stored){delete saveData.trioBossRushRuns[key];saveGameData();}
    return newRun();
  }

  function resumeRun(choice){
    if(inputBlocked()||selectionLocked||!resumeCandidate)return;
    lockSelection();
    if(choice==="no"){newRun();return;}
    run=copy(resumeCandidate);resumeCandidate=null;run.active=true;
    if(run.phase==="combat")startStage();
    else if(run.phase==="reward")renderRewardTurn();
    else showPaths();
    refreshButton();
  }

  function reset({restoreSelection=true}={}){
    const hadRun=!!run,previousEncounterId=run?.previousEncounterId??null,previousWorldId=run?.previousWorldId||"trinity";
    $("trioBossRushRewardModal")?.classList.add("hidden");
    game?.classList.remove("boss-rush-game");
    run=null;
    rewardTurn=0;
    rewardChoices=[];
    selectionLocked=false;
    resumeCandidate=null;
    if(restoreSelection&&hadRun){trioCampaignEncounterId=previousEncounterId;trioWorldId=previousWorldId;}
    refreshButton();
  }

  function abort(){
    $("trioBossRushRewardModal")?.classList.add("hidden");
    resumeCandidate=null;
    if(run)returnToTrioCampaignMap();
  }

  function snapshot(){return run?JSON.parse(JSON.stringify(run)):null;}
  function rewardDefinitions(){return REWARDS.map(reward=>({...reward}));}
  function worldThemeSequence(){return [...BOSS_RUSH_WORLD_THEME_KEYS];}

  window.WDTrioBossRush=Object.freeze({
    start,reset,abort,isActive,currentEncounter,stageNumber,statusText,worldThemeKey,worldThemeSequence,startingVitals,startingLoadout,
    finishEncounter,attackDamageBonus,incomingDamageModifier,abilityLevelOverride,afterHeroAttack,onHeroKill,refreshButton,snapshot,rewardDefinitions,stageDefinitions,profileBossXp
  });

  $("trioBossRushStartBtn")?.addEventListener("click",start);
  $("trioBossRushRewardOptions")?.addEventListener("click",event=>{
    const button=event.target.closest("button");if(!button)return;
    if(button.hasAttribute("data-boss-rush-reward"))selectReward(button.dataset.bossRushReward);
    else if(button.hasAttribute("data-rush-slot"))selectSlot(button.dataset.rushSlot);
    else if(button.hasAttribute("data-rush-path"))choosePath(Number(button.dataset.rushPath));
    else if(button.hasAttribute("data-rush-redraw"))redrawPath(Number(button.dataset.rushRedraw));
    else if(button.hasAttribute("data-rush-resume"))resumeRun(button.dataset.rushResume);
  });
  $("trioBossRushRerollBtn")?.addEventListener("click",rerollRewards);
  $("trioBossRushAbortBtn")?.addEventListener("click",abort);
  queueMicrotask(refreshButton);
})();
