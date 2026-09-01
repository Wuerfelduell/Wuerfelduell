(() => {
  const ICON_ROOT="assets/ui/v28/svg/gameplay/";
  const STAGES=Object.freeze([
    {encounterId:"duo_covenant_zero",enemyName:"Covenant King",hp:58,label:"Covenant King"},
    {encounterId:"duo_fracture_monarch",enemyName:"Fracture Monarch",hp:72,label:"Fracture Monarch"},
    {encounterId:"duo_mirror_heart",enemyName:"Mirror Heart",hp:78,label:"Mirror Heart"},
    {encounterId:"duo_omega_roles_two",enemyName:"Delta Seal",hp:84,label:"Delta Seal"},
    {encounterId:"duo_omega_throne",enemyName:"Omega Sovereign",hp:100,label:"Omega Sovereign"}
  ]);

  const REWARDS=Object.freeze([
    {id:"damage",name:"Klingenfokus",icon:"damage-sword.svg",desc:"Alle eigenen Hauptangriffe verursachen dauerhaft +1 Schaden pro Stapel."},
    {id:"rest",name:"Verschnaufpause",icon:"heart-hp.svg",desc:"Heilt diesen Spieler sofort um 12 HP. Kann erneut gewählt werden."},
    {id:"regen",name:"Regeneration",icon:"heal.svg",desc:"Heilt diesen Spieler jetzt und nach jedem weiteren Boss um 5 HP pro Stapel."},
    {id:"opening",name:"Eröffnungsschlag",icon:"attack.svg",desc:"Der erste erfolgreiche eigene Hauptangriff jedes Bosses erhält +3 Schaden pro Stapel."},
    {id:"siphon",name:"Blutdurst",icon:"self-damage-blood.svg",desc:"Jeder erfolgreiche eigene Hauptangriff heilt 2 HP pro Stapel."},
    {id:"hunter",name:"Trophäenjäger",icon:"reward-gift.svg",desc:"Jeder eigene Gegner-Kill heilt diesen Spieler um 4 HP pro Stapel."}
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

  function currentEncounter(){
    const stage=stageConfig();
    if(!run||!stage)return null;
    const base=duoEncounterById(stage.encounterId);
    if(!base)return null;
    const sourceEnemy=base.enemies.find(enemy=>enemy.name===stage.enemyName)||base.enemies[0];
    if(!sourceEnemy)return null;
    return {
      ...base,
      title:`Boss Rush ${run.stage+1}/${STAGES.length} · ${stage.label}`,
      subtitle:"Fortlaufender Duo-Kampf",
      desc:`Besiegt ${stage.label}. Verbleibende HP und gewählte Rush-Belohnungen werden in den nächsten Kampf übernommen.`,
      requires:[],
      challenge:{type:"win",text:`Besiegt ${stage.label}.`},
      enemies:[{...sourceEnemy,name:stage.enemyName,hp:stage.hp,level:"hard"}],
      farmTrophy:false,
      bossRush:true
    };
  }

  function stageNumber(){return run?run.stage+1:1;}
  function statusText(){
    const stage=stageConfig();
    return run&&stage?`Boss Rush ${run.stage+1}/${STAGES.length} · ${stage.label}`:"";
  }

  function findHeroIndex(profileId){
    return players.findIndex(player=>player?.campaignTeam==="hero"&&String(player.profileId)===String(profileId));
  }

  function syncVitalsFromPlayers(){
    if(!run)return;
    run.profileIds.forEach(profileId=>{
      const index=findHeroIndex(profileId),player=players[index],hero=heroState(profileId);
      if(!player||!hero)return;
      hero.hp=Math.max(0,Number(player.hp)||0);
      hero.maxHp=Math.max(1,Number(player.maxHp)||START_HP);
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

  function shuffledRewards(){
    const pool=[...REWARDS];
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    return pool;
  }

  function choicesFor(profileId){
    const pool=shuffledRewards(),hero=heroState(profileId),choices=[];
    if((hero?.hp||0)<=0){
      const recovery=pool.find(reward=>reward.id==="rest"||reward.id==="regen");
      if(recovery)choices.push(recovery);
    }
    pool.forEach(reward=>{if(choices.length<3&&!choices.some(item=>item.id===reward.id))choices.push(reward);});
    return choices.slice(0,3);
  }

  function perkStackLabel(profileId,rewardId){
    const count=Math.max(0,Number(heroState(profileId)?.perks?.[rewardId])||0);
    if(rewardId==="rest")return count?`Bereits ${count}× gewählt`:"Sofort-Effekt";
    return count?`Aktuell ${count} Stapel`:"Noch kein Stapel";
  }

  function renderRewardTurn(){
    if(!run)return;
    const profileId=run.profileIds[rewardTurn],profile=getProfile(profileId),hero=heroState(profileId);
    if(!profile||!hero)return;
    rewardChoices=choicesFor(profileId);
    selectionLocked=false;
    $("duoBossRushRewardKicker").textContent=`BOSS ${run.stage+1} / ${STAGES.length} BESIEGT`;
    $("duoBossRushRewardTitle").textContent=`Belohnung für ${profile.name}`;
    $("duoBossRushRewardText").textContent=`Spieler ${rewardTurn+1} von ${run.profileIds.length} · ${Math.max(0,hero.hp)} HP · Wähle 1 von 3.`;
    $("duoBossRushRewardOptions").innerHTML=rewardChoices.map(reward=>`
      <button type="button" class="boss-rush-reward-card" data-boss-rush-reward="${safe(reward.id)}">
        <img src="${ICON_ROOT}${safe(reward.icon)}" alt="" aria-hidden="true">
        <span class="boss-rush-reward-copy"><strong>${safe(reward.name)}</strong><small>${safe(reward.desc)}</small><em>${safe(perkStackLabel(profileId,reward.id))}</em></span>
      </button>`).join("");
  }

  function applyReward(profileId,rewardId){
    const reward=rewardById(rewardId),hero=heroState(profileId);
    if(!reward||!hero)return false;
    hero.perks[rewardId]=(Number(hero.perks[rewardId])||0)+1;
    if(rewardId==="rest")healHero(profileId,12);
    if(rewardId==="regen")healHero(profileId,5);
    run.rewardHistory.push({stage:run.stage+1,profileId:String(profileId),rewardId});
    syncVitalsFromPlayers();
    renderPlayers();
    return true;
  }

  function selectReward(rewardId){
    if(selectionLocked||!run||run.finished||!rewardChoices.some(reward=>reward.id===rewardId))return;
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

  function perkSummary(profileId){
    const hero=heroState(profileId),parts=[];
    if(!hero)return "Keine Run-Belohnungen";
    REWARDS.forEach(reward=>{
      const count=Math.max(0,Number(hero.perks[reward.id])||0);
      if(count>0)parts.push(`${reward.name} ${count}×`);
    });
    return parts.join(" · ")||"Keine Run-Belohnungen";
  }

  function showOutcome(completed,technicalMessage=""){
    if(!run)return;
    run.finished=true;
    run.active=true;
    syncVitalsFromPlayers();
    const cleared=completed?STAGES.length:Math.max(0,run.cleared||0);
    const heroRows=run.profileIds.map((profileId,slot)=>{
      const profile=getProfile(profileId),hero=heroState(profileId);
      return `<div class="round-score-row${completed?" winner-row":""}"><div class="round-score-name">${safe(profile?.name||`Spieler ${slot+1}`)}</div><div class="round-score-meta">Duo-Spieler · ${Math.max(0,hero?.hp||0)} HP · ${safe(perkSummary(profileId))}</div></div>`;
    }).join("");
    winnerText.textContent=completed?"BOSS RUSH GESCHAFFT!":"BOSS RUSH GESCHEITERT";
    roundResultText.innerHTML=completed
      ?`Alle ${STAGES.length} Bosse wurden besiegt.<br><strong>Run abgeschlossen: ${cleared} / ${STAGES.length}</strong><br>Rush-Belohnungen sind nur für diesen Lauf gültig und werden beim Verlassen entfernt.`
      :`Euer Team ist bei Boss ${Math.min(STAGES.length,run.stage+1)} gefallen.<br><strong>Besiegt: ${cleared} / ${STAGES.length}</strong>${technicalMessage?`<br>${safe(technicalMessage)}`:""}<br>Kampagnenfortschritt, XP und Trophäen bleiben unverändert.`;
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
    syncVitalsFromPlayers();
    if(!heroWon){showOutcome(false);return true;}
    run.cleared=run.stage+1;
    applyStageRegeneration();
    syncVitalsFromPlayers();
    if(run.stage>=STAGES.length-1){showOutcome(true);return true;}
    turnLine.textContent=`Boss ${run.stage+1} besiegt`;
    statusEl.textContent="Belohnungen wählen";
    abilityState.innerHTML="";
    hideAllControls();
    renderPlayers();
    showRewardModal();
    return true;
  }

  function refreshButton(){
    const button=$("duoBossRushStartBtn");
    if(!button)return;
    const p1=getProfile($("duoProfile1Select")?.value),p2=getProfile($("duoProfile2Select")?.value);
    const validPair=!!p1&&!!p2&&p1.id!==p2.id;
    const unlocked=validPair&&duoCampaignUnlocked(p1,p2);
    const abilities=!!$("duoAbility1Select")?.value&&!!$("duoAbility2Select")?.value;
    button.disabled=!validPair||!unlocked||!abilities||isActive();
    button.title=!validPair?"Zwei verschiedene Duo-Profile wählen":!unlocked?"Duo-Kampagne zuerst freischalten":"5 Bosse · HP werden übernommen · 1 aus 3 Belohnungen je Spieler";
  }

  function start(){
    if(isActive())return false;
    const p1=getProfile($("duoProfile1Select")?.value),p2=getProfile($("duoProfile2Select")?.value);
    if(!p1||!p2||p1.id===p2.id||!duoCampaignUnlocked(p1,p2))return false;
    run={
      active:true,finished:false,stage:0,cleared:0,
      profileIds:[String(p1.id),String(p2.id)],
      previousEncounterId:duoCampaignEncounterId,
      previousWorldId:duoWorldId,
      rewardHistory:[],
      heroes:{
        [String(p1.id)]:{hp:null,maxHp:null,perks:{},openingUsedStage:-1},
        [String(p2.id)]:{hp:null,maxHp:null,perks:{},openingUsedStage:-1}
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

  window.WDDuoBossRush=Object.freeze({
    start,reset,abort,isActive,currentEncounter,stageNumber,statusText,startingVitals,
    finishEncounter,attackDamageBonus,afterHeroAttack,onHeroKill,refreshButton,snapshot,rewardDefinitions
  });

  $("duoBossRushStartBtn")?.addEventListener("click",start);
  $("duoBossRushRewardOptions")?.addEventListener("click",event=>{
    const button=event.target.closest("[data-boss-rush-reward]");
    if(button)selectReward(button.dataset.bossRushReward);
  });
  $("duoBossRushAbortBtn")?.addEventListener("click",abort);
  queueMicrotask(refreshButton);
})();
