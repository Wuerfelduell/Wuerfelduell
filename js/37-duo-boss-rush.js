(() => {
  const ICON_ROOT="assets/ui/v28/svg/gameplay/";
  const ABILITY_ICON_ROOT="assets/ui/v28/svg/";
  const ABILITY_ICON_PATHS=Object.freeze({
    1:"abilities/01-brutale-einsen.svg",
    2:"abilities/02-lifesteal.svg",
    3:"abilities/03-glueckswurf.svg",
    4:"abilities/04-zweite-chance.svg",
    5:"abilities/05-angriffsvorsprung.svg",
    7:"abilities/07-glueck.svg",
    8:"abilities/08-praezision.svg",
    9:"abilities/09-rache.svg",
    10:"abilities/10-momentum.svg",
    11:"abilities/11-blutpreis.svg",
    12:"abilities/12-gambling-man.svg",
    13:"abilities/13-high-stakes.svg",
    14:"abilities/14-last-stand.svg",
    15:"abilities/15-perfect-25.svg",
    16:"abilities/16-ricochet.svg",
    17:"abilities/17-wildcard.svg",
    18:"abilities/18-loaded-dice.svg",
    19:"abilities/19-insurance.svg",
    20:"abilities/20-snake-eyes.svg",
    21:"abilities/21-counterattack.svg",
    22:"abilities/22-twelve.svg",
    23:"abilities/23-blood-rush.svg",
    24:"abilities/24-double-tap.svg",
    25:"abilities/25-underdog.svg"
  });

  // Doppelstufen haben bewusst weniger Gesamt-HP als die alten Einzelbosse.
  // Ihre zwei getrennten Züge und die stärkeren Zufalls-Loadouts liefern den Druck.
  const STAGES=Object.freeze([
    {encounterId:"duo_covenant_zero",label:"Covenant King",phaseHeal:3,phaseAbilityCount:2,enemies:[
      {name:"Covenant King",hp:50,abilityCount:2}
    ]},
    {encounterId:"duo_fracture_monarch",label:"Fracture Monarch + Left Hand",phaseHeal:4,phaseAbilityCount:2,enemies:[
      {name:"Fracture Monarch",hp:34,abilityCount:2},
      {name:"Left Hand",hp:24,abilityCount:2}
    ]},
    {encounterId:"duo_mirror_heart",label:"Mirror Heart",phaseHeal:5,phaseAbilityCount:3,enemies:[
      {name:"Mirror Heart",hp:58,abilityCount:3}
    ]},
    {encounterId:"duo_omega_roles_two",label:"Delta + Gamma Seal",phaseHeal:6,phaseAbilityCount:3,enemies:[
      {name:"Delta Seal",hp:36,abilityCount:3},
      {name:"Gamma Seal",hp:26,abilityCount:2}
    ]},
    {encounterId:"duo_omega_throne",label:"Omega Sovereign + Throne Black",phaseHeal:8,phaseAbilityCount:3,enemies:[
      {name:"Omega Sovereign",hp:46,abilityCount:3},
      {name:"Throne Black",hp:30,abilityCount:3}
    ]}
  ]);

  const BRUTAL_ABILITY_IDS=Object.freeze([1,4,8,9,10,11,13,16,17,18,21,23,24,25]);
  const REWARDS=Object.freeze([
    {kind:"perk",id:"damage",name:"Klingenfokus",icon:"damage-sword.svg",desc:"Alle eigenen Hauptangriffe verursachen dauerhaft +1 Schaden pro Stapel."},
    {kind:"perk",id:"rest",name:"Verschnaufpause",icon:"heart-hp.svg",desc:"Heilt diesen Spieler sofort um 12 HP. Kann erneut gewählt werden."},
    {kind:"perk",id:"regen",name:"Regeneration",icon:"heal.svg",desc:"Heilt diesen Spieler jetzt und nach jedem weiteren Boss um 5 HP pro Stapel."},
    {kind:"perk",id:"opening",name:"Eröffnungsschlag",icon:"attack.svg",desc:"Der erste erfolgreiche eigene Hauptangriff jedes Bosses erhält +3 Schaden pro Stapel."},
    {kind:"perk",id:"siphon",name:"Blutdurst",icon:"self-damage-blood.svg",desc:"Jeder erfolgreiche eigene Hauptangriff heilt 2 HP pro Stapel."},
    {kind:"perk",id:"hunter",name:"Trophäenjäger",icon:"reward-gift.svg",desc:"Jeder eigene Gegner-Kill heilt diesen Spieler um 4 HP pro Stapel."}
  ]);

  let run=null;
  let rewardTurn=0;
  let rewardChoices=[];
  let selectionLocked=false;

  const $=id=>document.getElementById(id);
  const safe=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const rewardById=id=>REWARDS.find(reward=>reward.id===id)||null;
  const stageConfig=()=>run?STAGES[Math.max(0,Math.min(STAGES.length-1,run.stage))]:null;
  const heroState=profileId=>run?.heroes?.[String(profileId)]||null;
  const isActive=()=>!!run?.active;
  const validAbility=id=>REAL_ABILITY_IDS.includes(Number(id))?Number(id):null;

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

  function abilityNames(ids){
    return (ids||[]).map(id=>ABILITIES[id]?.name||`Fähigkeit ${id}`).join(" + ");
  }

  function currentEncounter(){
    const stage=stageConfig(),build=run?.stageBuilds?.[run?.stage];
    if(!run||!stage||!build)return null;
    const base=duoEncounterById(stage.encounterId);
    if(!base)return null;
    const enemies=build.enemies.map((built,index)=>{
      const spec=stage.enemies[index];
      const source=base.enemies.find(enemy=>enemy.name===spec.name)||base.enemies[index]||base.enemies[0];
      if(!source)return null;
      return {
        ...source,
        name:spec.name,
        hp:spec.hp,
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
      desc:`${stage.enemies[0].name} wechselt das Loadout auf ${abilityNames(phaseAbilities)} und heilt ${stage.phaseHeal} HP.`,
      heal:stage.phaseHeal,
      ability:phaseAbilities[0],
      secondAbility:phaseAbilities[1]??null,
      thirdAbility:phaseAbilities[2]??null
    };
    return {
      ...base,
      title:`Boss Rush ${run.stage+1}/${STAGES.length} · ${stage.label}`,
      subtitle:enemies.length>1?"Fortlaufender Duo-Gruppenkampf":"Fortlaufender Duo-Bosskampf",
      desc:`Besiegt ${stage.label}. Gegnerfähigkeiten wechseln bei jedem neuen Run; Spieler-HP, Rush-Fähigkeiten und Belohnungen werden übernommen.`,
      requires:[],
      challenge:{type:"win",text:`Besiegt ${stage.label}.`},
      enemies,
      farmTrophy:false,
      bossRush:true,
      bossRushPhase
    };
  }

  function stageNumber(){return run?run.stage+1:1;}
  function statusText(){
    const stage=stageConfig();
    return run&&stage?`Boss Rush ${run.stage+1}/${STAGES.length} · ${stage.label} · ${run.bossXpEarned} Boss XP je Profil`:"";
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
      hero.maxHp=Math.max(hero.maxHp,fallback);
      hero.hp=Math.max(0,Number(hero.hp)||0);
    }
    return {hp:hero.hp,maxHp:hero.maxHp};
  }

  function startingLoadout(profile,primaryAbility,fallbackSecond=null){
    const hero=heroState(profile?.id),primary=validAbility(primaryAbility);
    if(!hero)return {secondAbility:validAbility(fallbackSecond),thirdAbility:null,secondAbilityUnlocked:fallbackSecond!=null,thirdAbilityUnlocked:false,campaignBonusDraftUsed:false};
    hero.primaryAbility=primary;
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
    if(!run||amount<=0)return 0;
    const hero=heroState(profileId),index=findHeroIndex(profileId),player=players[index];
    if(!hero||!player)return 0;
    const before=Math.max(0,Number(player.hp)||0);
    player.hp=before+Math.max(0,Number(amount)||0);
    const healed=player.hp-before;
    hero.hp=player.hp;
    hero.maxHp=Math.max(1,Number(player.maxHp)||hero.maxHp||START_HP);
    if(combat&&healed>0){
      recordHealing(index,healed);
      if(Array.isArray(pendingExtraHealFx))pendingExtraHealFx.push({target:index,amount:healed});
      addLog(`${reason}: ${player.name} heilt ${healed} HP.`);
    }
    return healed;
  }

  function attackDamageBonus(index){
    if(!run||run.finished||players[index]?.campaignTeam!=="hero")return {amount:0,parts:[]};
    const hero=heroState(players[index].profileId);
    if(!hero)return {amount:0,parts:[]};
    const parts=[];
    let amount=Math.max(0,Number(hero.perks.damage)||0);
    if(amount>0)parts.push(`Klingenfokus +${amount}`);
    const openingStacks=Math.max(0,Number(hero.perks.opening)||0);
    if(openingStacks>0&&hero.openingUsedStage!==run.stage){
      const openingBonus=openingStacks*3;
      amount+=openingBonus;
      hero.openingUsedStage=run.stage;
      parts.push(`Eröffnungsschlag +${openingBonus}`);
    }
    return {amount,parts};
  }

  function afterHeroAttack(index,totalDamage){
    if(!run||run.finished||totalDamage<=0||players[index]?.campaignTeam!=="hero")return 0;
    const hero=heroState(players[index].profileId),stacks=Math.max(0,Number(hero?.perks?.siphon)||0);
    return stacks>0?healHero(players[index].profileId,stacks*2,{combat:true,reason:"Boss Rush · Blutdurst"}):0;
  }

  function onHeroKill(index){
    if(!run||run.finished||players[index]?.campaignTeam!=="hero")return 0;
    const hero=heroState(players[index].profileId),stacks=Math.max(0,Number(hero?.perks?.hunter)||0);
    return stacks>0?healHero(players[index].profileId,stacks*4,{combat:true,reason:"Boss Rush · Trophäenjäger"}):0;
  }

  function perkChoicesFor(profileId,count){
    const pool=shuffled(REWARDS),hero=heroState(profileId),choices=[];
    if((hero?.hp||0)<=0){
      const recovery=pool.find(reward=>reward.id==="rest"||reward.id==="regen");
      if(recovery)choices.push(recovery);
    }
    pool.forEach(reward=>{
      if(choices.length<count&&!choices.some(item=>item.id===reward.id))choices.push(reward);
    });
    return choices.slice(0,count);
  }

  function abilityChoiceFor(profileId){
    const hero=heroState(profileId),index=findHeroIndex(profileId),player=players[index];
    if(!hero||hero.thirdAbility!=null)return null;
    const owned=new Set([
      hero.primaryAbility,hero.secondAbility,hero.thirdAbility,
      player?.ability,player?.secondAbility,player?.thirdAbility
    ].map(validAbility).filter(id=>id!=null));
    const abilityId=shuffled(REAL_ABILITY_IDS.filter(id=>!owned.has(id)))[0];
    if(abilityId==null)return null;
    const ability=ABILITIES[abilityId]||{name:`Fähigkeit ${abilityId}`,desc:"Zusätzliche Rush-Fähigkeit."};
    return {
      kind:"ability",
      id:`ability:${abilityId}`,
      abilityId,
      name:ability.name,
      icon:ABILITY_ICON_PATHS[abilityId]||"gameplay/mastery.svg",
      desc:`3. Fähigkeit für den restlichen Boss Rush. ${ability.desc}`
    };
  }

  function choicesFor(profileId){
    const abilityChoice=abilityChoiceFor(profileId);
    const choices=perkChoicesFor(profileId,abilityChoice?2:3);
    if(abilityChoice)choices.push(abilityChoice);
    return choices.slice(0,3);
  }

  function choiceIcon(choice){
    return choice.kind==="ability"?`${ABILITY_ICON_ROOT}${choice.icon}`:`${ICON_ROOT}${choice.icon}`;
  }

  function choiceStateLabel(profileId,choice){
    if(choice.kind==="ability")return "Einmalig · bleibt bis Rush-Ende";
    const count=Math.max(0,Number(heroState(profileId)?.perks?.[choice.id])||0);
    if(choice.id==="rest")return count?`Bereits ${count}× gewählt`:"Sofort-Effekt";
    return count?`Aktuell ${count} Stapel`:"Noch kein Stapel";
  }

  function renderRewardTurn(){
    if(!run)return;
    const profileId=run.profileIds[rewardTurn],profile=getProfile(profileId),hero=heroState(profileId);
    if(!profile||!hero)return;
    rewardChoices=choicesFor(profileId);
    selectionLocked=false;
    $("duoBossRushRewardKicker").textContent=`BOSS ${run.stage+1} / ${STAGES.length} BESIEGT · +${run.lastBossXpAward} BOSS XP`;
    $("duoBossRushRewardTitle").textContent=`Belohnung für ${profile.name}`;
    $("duoBossRushRewardText").textContent=`Spieler ${rewardTurn+1} von ${run.profileIds.length} · ${Math.max(0,hero.hp)} HP · Run: ${run.bossXpEarned} Boss XP je Profil · Wähle 1 von 3.`;
    $("duoBossRushRewardOptions").innerHTML=rewardChoices.map(choice=>`
      <button type="button" class="boss-rush-reward-card${choice.kind==="ability"?" is-ability":""}" data-boss-rush-reward="${safe(choice.id)}">
        <img src="${safe(choiceIcon(choice))}" alt="" aria-hidden="true">
        <span class="boss-rush-reward-copy"><strong>${safe(choice.name)}</strong><small>${safe(choice.desc)}</small><em>${safe(choiceStateLabel(profileId,choice))}</em></span>
      </button>`).join("");
  }

  function applyReward(profileId,rewardId){
    const hero=heroState(profileId),choice=rewardChoices.find(item=>item.id===rewardId);
    if(!hero||!choice)return false;
    if(choice.kind==="ability"){
      const abilityId=validAbility(choice.abilityId);
      if(abilityId==null||hero.thirdAbility!=null)return false;
      hero.thirdAbility=abilityId;
      const index=findHeroIndex(profileId),player=players[index];
      if(player){
        player.thirdAbility=abilityId;
        player.thirdAbilityUnlocked=true;
        player.thirdAbilityWasChosen=true;
      }
      run.rewardHistory.push({stage:run.stage+1,profileId:String(profileId),rewardId,abilityId});
    }else{
      const reward=rewardById(rewardId);
      if(!reward)return false;
      hero.perks[rewardId]=(Number(hero.perks[rewardId])||0)+1;
      if(rewardId==="rest")healHero(profileId,12);
      if(rewardId==="regen")healHero(profileId,5);
      run.rewardHistory.push({stage:run.stage+1,profileId:String(profileId),rewardId});
    }
    syncRunStateFromPlayers();
    renderPlayers();
    return true;
  }

  function selectReward(rewardId){
    if(selectionLocked||!run||run.finished||!rewardChoices.some(choice=>choice.id===rewardId))return;
    selectionLocked=true;
    const profileId=run.profileIds[rewardTurn];
    if(!applyReward(profileId,rewardId)){selectionLocked=false;return;}
    rewardTurn++;
    if(rewardTurn<run.profileIds.length){renderRewardTurn();return;}
    $("duoBossRushRewardModal").classList.add("hidden");
    run.stage++;
    const next=stageConfig();
    if(!next){showOutcome(true);return;}
    duoCampaignEncounterId=next.encounterId;
    if(!startDuoCampaignEncounter({bossRush:true}))showOutcome(false,"Der nächste Boss konnte nicht gestartet werden.");
  }

  function showRewardModal(){
    rewardTurn=0;
    rewardChoices=[];
    selectionLocked=false;
    $("duoBossRushRewardModal").classList.remove("hidden");
    renderRewardTurn();
  }

  function applyStageRegeneration(){
    if(!run)return;
    run.profileIds.forEach(profileId=>{
      const stacks=Math.max(0,Number(heroState(profileId)?.perks?.regen)||0);
      if(stacks>0)healHero(profileId,stacks*5);
    });
  }

  function profileBossXp(profile){
    return Math.max(0,Math.floor(Number(profile?.campaign?.bossRushXp)||0));
  }

  function awardBossXp(){
    if(!run)return 0;
    const amount=50+(run.stage*25);
    run.bossXpEarned+=amount;
    run.lastBossXpAward=amount;
    run.bossXpAwards.push({stage:run.stage+1,amount});
    run.profileIds.forEach(profileId=>{
      const profile=getProfile(profileId);
      if(!profile)return;
      if(!profile.campaign||typeof profile.campaign!=="object")profile.campaign={};
      profile.campaign.bossRushXp=profileBossXp(profile)+amount;
    });
    if(typeof saveGameData==="function")saveGameData();
    window.WDMastery?.refreshAll?.();
    refreshButton();
    return amount;
  }

  function perkSummary(profileId){
    const hero=heroState(profileId),parts=[];
    if(!hero)return "Keine Run-Belohnungen";
    REWARDS.forEach(reward=>{
      const count=Math.max(0,Number(hero.perks[reward.id])||0);
      if(count>0)parts.push(`${reward.name} ${count}×`);
    });
    if(hero.thirdAbility!=null)parts.push(`3. Fähigkeit: ${ABILITIES[hero.thirdAbility]?.name||hero.thirdAbility}`);
    return parts.join(" · ")||"Keine Run-Belohnungen";
  }

  function showOutcome(completed,technicalMessage=""){
    if(!run)return;
    run.finished=true;
    run.active=true;
    syncRunStateFromPlayers();
    const cleared=completed?STAGES.length:Math.max(0,run.cleared||0);
    const heroRows=run.profileIds.map((profileId,slot)=>{
      const profile=getProfile(profileId),hero=heroState(profileId);
      return `<div class="round-score-row${completed?" winner-row":""}"><div class="round-score-name">${safe(profile?.name||`Spieler ${slot+1}`)}</div><div class="round-score-meta">Duo-Spieler · ${Math.max(0,hero?.hp||0)} HP · Boss XP gesamt ${profileBossXp(profile)} · ${safe(perkSummary(profileId))}</div></div>`;
    }).join("");
    winnerText.textContent=completed?"BOSS RUSH GESCHAFFT!":"BOSS RUSH GESCHEITERT";
    roundResultText.innerHTML=completed
      ?`Alle ${STAGES.length} Bossstufen wurden besiegt.<br><strong>Run abgeschlossen: ${cleared} / ${STAGES.length} · +${run.bossXpEarned} Boss XP je Profil</strong><br>Rush-Belohnungen und zusätzliche Fähigkeiten sind nur für diesen Lauf gültig und werden beim Verlassen entfernt.`
      :`Euer Team ist bei Boss ${Math.min(STAGES.length,run.stage+1)} gefallen.<br><strong>Besiegt: ${cleared} / ${STAGES.length} · +${run.bossXpEarned} Boss XP je Profil behalten</strong>${technicalMessage?`<br>${safe(technicalMessage)}`:""}<br>Kampagnenfortschritt, Mastery XP und Trophäen bleiben unverändert.`;
    roundStandings.innerHTML=heroRows;
    renderRoundStats();
    clearBotAutomation();
    winnerBox.classList.remove("hidden");
    nextRoundBox.classList.add("hidden");
    nextRoundPrepBtn.classList.add("hidden");
    restartBtn.textContent="Zur Duo-Kampagne";
    restartBtn.disabled=false;
    gameContext.returnScreen="duo";
    gameContext.mode="duo-boss-rush-result";
    turnLine.textContent=completed?"Boss Rush abgeschlossen":"Boss Rush beendet";
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
    awardBossXp();
    applyStageRegeneration();
    syncRunStateFromPlayers();
    if(run.stage>=STAGES.length-1){showOutcome(true);return true;}
    turnLine.textContent=`Boss ${run.stage+1} besiegt`;
    statusEl.textContent=`+${run.lastBossXpAward} Boss XP je Profil · Belohnungen wählen`;
    abilityState.innerHTML="";
    hideAllControls();
    renderPlayers();
    showRewardModal();
    return true;
  }

  function refreshButton(){
    const button=$("duoBossRushStartBtn"),summary=$("duoBossRushXpSummary");
    if(!button)return;
    const p1=getProfile($("duoProfile1Select")?.value),p2=getProfile($("duoProfile2Select")?.value);
    const validPair=!!p1&&!!p2&&p1.id!==p2.id;
    const unlocked=validPair&&duoCampaignUnlocked(p1,p2);
    const abilities=!!$("duoAbility1Select")?.value&&!!$("duoAbility2Select")?.value;
    button.disabled=!validPair||!unlocked||!abilities||isActive();
    button.title=!validPair?"Zwei verschiedene Duo-Profile wählen":!unlocked?"Duo-Kampagne zuerst freischalten":"5 Bossstufen · wechselnde Fähigkeiten · 50 bis 150 Boss XP je Clear";
    if(summary){
      summary.textContent=validPair
        ?`Boss XP · ${p1.name} ${profileBossXp(p1)} · ${p2.name} ${profileBossXp(p2)}`
        :"Boss XP · zwei Profile wählen";
    }
  }

  function start(){
    if(isActive())return false;
    const p1=getProfile($("duoProfile1Select")?.value),p2=getProfile($("duoProfile2Select")?.value);
    if(!p1||!p2||p1.id===p2.id||!duoCampaignUnlocked(p1,p2))return false;
    run={
      active:true,finished:false,stage:0,cleared:0,bossXpEarned:0,lastBossXpAward:0,
      profileIds:[String(p1.id),String(p2.id)],
      previousEncounterId:duoCampaignEncounterId,
      previousWorldId:duoWorldId,
      rewardHistory:[],
      bossXpAwards:[],
      stageBuilds:STAGES.map(buildStage),
      heroes:{
        [String(p1.id)]:{hp:null,maxHp:null,primaryAbility:null,secondAbility:null,thirdAbility:null,perks:{},openingUsedStage:-1},
        [String(p2.id)]:{hp:null,maxHp:null,primaryAbility:null,secondAbility:null,thirdAbility:null,perks:{},openingUsedStage:-1}
      }
    };
    duoCampaignEncounterId=STAGES[0].encounterId;
    const started=startDuoCampaignEncounter({bossRush:true});
    if(!started)reset();
    refreshButton();
    return !!started;
  }

  function reset({restoreSelection=true}={}){
    const hadRun=!!run,previousEncounterId=run?.previousEncounterId??null,previousWorldId=run?.previousWorldId||"covenant";
    $("duoBossRushRewardModal")?.classList.add("hidden");
    game?.classList.remove("boss-rush-game");
    run=null;
    rewardTurn=0;
    rewardChoices=[];
    selectionLocked=false;
    if(restoreSelection&&hadRun){duoCampaignEncounterId=previousEncounterId;duoWorldId=previousWorldId;}
    refreshButton();
  }

  function abort(){
    if(!run)return;
    $("duoBossRushRewardModal")?.classList.add("hidden");
    returnToDuoCampaignMap();
  }

  function snapshot(){return run?JSON.parse(JSON.stringify(run)):null;}
  function rewardDefinitions(){return REWARDS.map(reward=>({...reward}));}
  function stageDefinitions(){return STAGES.map(stage=>JSON.parse(JSON.stringify(stage)));}

  window.WDDuoBossRush=Object.freeze({
    start,reset,abort,isActive,currentEncounter,stageNumber,statusText,startingVitals,startingLoadout,
    finishEncounter,attackDamageBonus,afterHeroAttack,onHeroKill,refreshButton,snapshot,rewardDefinitions,stageDefinitions,profileBossXp
  });

  $("duoBossRushStartBtn")?.addEventListener("click",start);
  $("duoBossRushRewardOptions")?.addEventListener("click",event=>{
    const button=event.target.closest("[data-boss-rush-reward]");
    if(button)selectReward(button.dataset.bossRushReward);
  });
  $("duoBossRushAbortBtn")?.addEventListener("click",abort);
  queueMicrotask(refreshButton);
})();
