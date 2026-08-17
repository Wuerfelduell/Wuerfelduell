(() => {
  const MAX_HP_LEVEL=3;
  const MAX_DAMAGE_LEVEL=3;
  const MAX_ABILITY_LEVEL=5;

  function masteryDefaults(){
    return {
      xp:0,                  // spendable XP currency
      lifetimeXp:0,          // total earned after migration
      hpLevel:0,
      damageLevel:0,
      abilityLevel:0,
      xpCurrencyMigrated:false
    };
  }

  function clampLevel(value,max){
    return Math.max(0,Math.min(max,Math.floor(Number(value)||0)));
  }

  function perkCostForLevel(level){
    return Math.max(1,Math.floor(Number(level)||1))*100;
  }

  function branchSpent(level){
    let total=0;
    for(let i=1;i<=Math.max(0,Math.floor(Number(level)||0));i++){
      total+=perkCostForLevel(i);
    }
    return total;
  }

  function totalSpent(profile){
    const m=ensure(profile,false);
    return branchSpent(m.hpLevel)+branchSpent(m.damageLevel)+branchSpent(m.abilityLevel);
  }

  function worldIndex(encounter){
    if(!encounter) return -1;
    return CAMPAIGN_WORLDS.findIndex(w=>w.id===(encounter.world||"house"));
  }

  function applies(profile,encounter){
    return !!profile && worldIndex(encounter)>=2;
  }

  function unlocked(profile){
    if(!profile) return false;
    const world3=CAMPAIGN_WORLDS[2];
    const completed=new Set(profile.campaign?.completedEncounters||[]);
    return !!world3 && (world3.unlockRequires||[]).every(id=>completed.has(id));
  }

  function completedW3Plus(profile){
    const completed=new Set(profile?.campaign?.completedEncounters||[]);
    return CAMPAIGN_ENCOUNTERS.filter(encounter=>
      worldIndex(encounter)>=2 && completed.has(encounter.id)
    );
  }

  function oldRetroBaseline(profile){
    // V27.8.0-27.8.3 retro formula:
    // 25 per first clear +25 extra on world L10/L15.
    let total=0;
    for(const encounter of completedW3Plus(profile)){
      total+=25;
      const list=CAMPAIGN_ENCOUNTERS.filter(e=>(e.world||"house")===(encounter.world||"house"));
      const number=list.findIndex(e=>e.id===encounter.id)+1;
      if(number===10||number===15) total+=25;
    }
    return total;
  }

  function newRetroBaseline(profile){
    // New rule: every already completed W3+ encounter = 100 XP.
    return completedW3Plus(profile).length*100;
  }

  function migrateToXpCurrency(profile,m){
    if(m.xpCurrencyMigrated) return false;

    const oldXp=Math.max(0,Math.floor(Number(m.xp)||0));
    const oldBaseline=oldRetroBaseline(profile);
    const extraFarmXp=Math.max(0,oldXp-oldBaseline);
    const lifetime=Math.max(
      Math.max(0,Math.floor(Number(m.lifetimeXp)||0)),
      newRetroBaseline(profile)+extraFarmXp
    );

    m.lifetimeXp=lifetime;
    m.xp=Math.max(0,lifetime-(
      branchSpent(m.hpLevel)+
      branchSpent(m.damageLevel)+
      branchSpent(m.abilityLevel)
    ));
    m.xpCurrencyMigrated=true;
    return true;
  }

  function ensure(profile,runMigration=true){
    if(!profile) return masteryDefaults();
    profile.campaign=profile.campaign||{};
    const raw=(profile.campaign.mastery&&typeof profile.campaign.mastery==="object")
      ? profile.campaign.mastery
      : {};

    const m={
      xp:Math.max(0,Math.floor(Number(raw.xp)||0)),
      lifetimeXp:Math.max(0,Math.floor(Number(raw.lifetimeXp)||0)),
      hpLevel:clampLevel(raw.hpLevel,MAX_HP_LEVEL),
      damageLevel:clampLevel(raw.damageLevel,MAX_DAMAGE_LEVEL),
      abilityLevel:clampLevel(raw.abilityLevel,MAX_ABILITY_LEVEL),
      xpCurrencyMigrated:!!raw.xpCurrencyMigrated
    };

    // Legacy flag is intentionally ignored after converting to XP currency.
    profile.campaign.mastery=m;
    if(runMigration) migrateToXpCurrency(profile,m);
    return m;
  }

  function hpBonus(profile,encounter){
    return applies(profile,encounter)?ensure(profile).hpLevel*2:0;
  }

  function damageBonus(profile,encounter){
    return applies(profile,encounter)?ensure(profile).damageLevel:0;
  }

  function damageBonusForPlayer(index){
    try{
      if(!campaignMode) return 0;
      const player=players?.[Number(index)];
      if(!player||player.campaignTeam!=="hero") return 0;
      const profile=getProfile(player.profileId||campaignProfileId);
      const encounter=campaignEncounterById(campaignEncounterId);
      return damageBonus(profile,encounter);
    }catch(_err){return 0;}
  }

  function abilityThreshold(profile,encounter){
    return applies(profile,encounter)?15+ensure(profile).abilityLevel:15;
  }

  function abilityThresholdForPlayer(index){
    try{
      if(!campaignMode) return 15;
      const player=players?.[Number(index)];
      if(!player||player.campaignTeam!=="hero") return 15;
      const profile=getProfile(player.profileId||campaignProfileId);
      const encounter=campaignEncounterById(campaignEncounterId);
      return abilityThreshold(profile,encounter);
    }catch(_err){return 15;}
  }

  function awardCampaignXp(profile,encounter,newlyCompleted){
    if(!profile||!applies(profile,encounter)) return 0;
    const m=ensure(profile);

    // First clear is the main progression source.
    // Repeats still give a small farm reward.
    const amount=newlyCompleted?100:20;
    m.xp+=amount;
    m.lifetimeXp+=amount;
    return amount;
  }

  function branchData(profile){
    const m=ensure(profile);
    return [
      {
        key:"hpLevel",
        icon:"❤️",
        title:"Vitality",
        desc:"Mehr Start- und Max-HP in Solo Welt 3+.",
        max:MAX_HP_LEVEL,
        level:m.hpLevel,
        values:["+2 HP","+4 HP","+6 HP"]
      },
      {
        key:"damageLevel",
        icon:"⚔️",
        title:"Force",
        desc:"Gesamtbonus pro abgeschlossenem Angriff. Nicht pro Treffer.",
        max:MAX_DAMAGE_LEVEL,
        level:m.damageLevel,
        values:["+1 DMG","+2 DMG","+3 DMG"]
      },
      {
        key:"abilityLevel",
        icon:"✨",
        title:"Awakening",
        desc:"Die HP-Schwelle für den Bonus-Draft der nächsten Fähigkeit steigt.",
        max:MAX_ABILITY_LEVEL,
        level:m.abilityLevel,
        values:["16 HP","17 HP","18 HP","19 HP","20 HP"]
      }
    ];
  }

  function nodeHtml(branch,index,xp){
    const level=index+1;
    const cost=perkCostForLevel(level);
    const owned=branch.level>=level;
    const next=!owned && branch.level===index;
    const affordable=next && xp>=cost;
    const locked=!owned&&!affordable;
    const value=branch.values[index]||`Level ${level}`;

    return `<button type="button"
      class="mastery-node${owned?" owned":""}${affordable?" available":""}${locked?" locked":""}"
      data-mastery-branch="${branch.key}"
      data-mastery-level="${level}"
      data-mastery-cost="${cost}"
      ${affordable?"":"disabled"}>
      <span class="mastery-node-dot">${owned?"✓":level}</span>
      <span class="mastery-node-value">${value}</span>
      <small>${owned?"AKTIV":next?`${cost} XP`:"GESPERRT"}</small>
    </button>`;
  }

  function currentProfile(){
    const id=document.getElementById("campaignProfileSelect")?.value || campaignProfileId;
    return id?getProfile(id):null;
  }

  function currentEncounter(){
    return campaignEncounterById(campaignEncounterId)||null;
  }

  function renderModal(){
    const profile=currentProfile();
    const content=document.getElementById("masteryContent");
    const summary=document.getElementById("masterySummary");
    if(!content||!summary) return;

    if(!profile){
      summary.textContent="Kein Profil ausgewählt.";
      content.innerHTML="";
      return;
    }

    const m=ensure(profile);
    summary.innerHTML=`
      <div class="mastery-summary-main">
        <strong>${escapeHtml(profile.name)}</strong>
        <span>⚔️ Mastery</span>
      </div>
      <div class="mastery-xp-line">
        <span>⭐ ${m.xp} XP verfügbar</span>
        <span>Σ ${m.lifetimeXp} XP verdient</span>
        <span>-${totalSpent(profile)} XP investiert</span>
      </div>
      <div class="mastery-xp-track mastery-xp-currency"></div>
      <small>XP ist die direkte Währung. Nächste Perkstufe kostet 100 / 200 / 300 / … XP.</small>
    `;

    const branches=branchData(profile);
    content.innerHTML=branches.map(branch=>`
      <section class="mastery-branch">
        <div class="mastery-branch-head">
          <span class="mastery-branch-icon">${branch.icon}</span>
          <div>
            <strong>${branch.title}</strong>
            <small>${branch.desc}</small>
          </div>
          <span class="mastery-branch-level">${branch.level}/${branch.max}</span>
        </div>
        <div class="mastery-tree-line">
          ${Array.from({length:branch.max},(_,i)=>nodeHtml(branch,i,m.xp)).join("")}
        </div>
      </section>
    `).join("");

    content.querySelectorAll("[data-mastery-branch]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const profile=currentProfile();
        if(!profile) return;
        const m=ensure(profile);
        const branch=btn.dataset.masteryBranch;
        const level=Math.floor(Number(btn.dataset.masteryLevel)||0);
        const cost=perkCostForLevel(level);
        const caps={hpLevel:MAX_HP_LEVEL,damageLevel:MAX_DAMAGE_LEVEL,abilityLevel:MAX_ABILITY_LEVEL};

        if(!(branch in caps)) return;
        if(m[branch]!==level-1 || level>caps[branch]) return;
        if(m.xp<cost) return;

        m.xp-=cost;
        m[branch]=level;
        saveGameData();
        renderModal();
        try{renderCampaign();}catch(_err){}
        refreshCampaignUi(profile,currentEncounter());
      });
    });
  }

  function open(){
    const profile=currentProfile();
    if(!profile||!unlocked(profile)) return;
    document.getElementById("masteryModal")?.classList.remove("hidden");
    document.body.classList.add("mastery-open");
    renderModal();
  }

  function close(){
    document.getElementById("masteryModal")?.classList.add("hidden");
    document.body.classList.remove("mastery-open");
  }

  function refreshCampaignUi(profile=currentProfile(),encounter=currentEncounter()){
    const counter=document.getElementById("campaignMasteryXpSummary");
    const button=document.getElementById("campaignMasteryBtn");
    if(!counter||!button) return;

    if(!profile){
      counter.textContent="⭐ 0 XP";
      button.disabled=true;
      button.textContent="🔒 Mastery";
      return;
    }

    const m=ensure(profile);
    counter.textContent=`⭐ ${m.xp} XP`;

    const on=unlocked(profile);
    button.disabled=!on;
    button.textContent=on?"⚔️ Mastery":"🔒 Mastery";
    button.title=on
      ?"Campaign Mastery öffnen"
      :"Wird freigeschaltet, sobald Welt 3 verfügbar ist.";
  }

  function initUi(){
    document.getElementById("campaignMasteryBtn")?.addEventListener("click",open);
    document.getElementById("masteryCloseBtn")?.addEventListener("click",close);

    const modal=document.getElementById("masteryModal");
    modal?.addEventListener("click",e=>{if(e.target===modal) close();});
    document.getElementById("campaignProfileSelect")?.addEventListener("change",()=>setTimeout(()=>refreshCampaignUi(),0));

    try{
      let migrated=false;
      (saveData.profiles||[]).forEach(profile=>{
        const before=!!profile?.campaign?.mastery?.xpCurrencyMigrated;
        ensure(profile);
        if(!before && profile?.campaign?.mastery?.xpCurrencyMigrated) migrated=true;
      });
      if(migrated) saveGameData();
    }catch(_err){}

    refreshCampaignUi();
  }

  window.WDMastery=Object.freeze({
    ensure,
    unlocked,
    applies,
    hpBonus,
    damageBonus,
    damageBonusForPlayer,
    abilityThreshold,
    abilityThresholdForPlayer,
    awardCampaignXp,
    refreshCampaignUi,
    perkCostForLevel,
    totalSpent,
    open
  });

  initUi();
})();
