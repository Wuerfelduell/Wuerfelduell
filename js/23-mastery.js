(() => {
  const XP_PER_POINT=100;
  const MAX_HP_LEVEL=3;
  const MAX_DAMAGE_LEVEL=3;
  const MAX_ABILITY_LEVEL=5;

  function masteryDefaults(){
    return {xp:0,hpLevel:0,damageLevel:0,abilityLevel:0,retroGranted:false};
  }

  function retroactiveBaselineXp(profile){
    const completed=new Set(profile?.campaign?.completedEncounters||[]);
    let total=0;

    CAMPAIGN_ENCOUNTERS.forEach(encounter=>{
      const wi=CAMPAIGN_WORLDS.findIndex(w=>w.id===(encounter.world||"house"));
      if(wi<2 || !completed.has(encounter.id)) return;

      total+=25; // 10 regular clear + 15 first-clear value

      const list=CAMPAIGN_ENCOUNTERS.filter(e=>(e.world||"house")===(encounter.world||"house"));
      const number=list.findIndex(e=>e.id===encounter.id)+1;
      if(number===10 || number===15) total+=25;
    });

    return total;
  }

  function applyRetroactiveXp(profile){
    const m=profile?.campaign?.mastery;
    if(!m || m.retroGranted) return 0;

    const baseline=retroactiveBaselineXp(profile);
    const before=Math.max(0,Math.floor(Number(m.xp)||0));

    // max() prevents doubling XP already earned in V27.8.0.
    m.xp=Math.max(before,baseline);
    m.retroGranted=true;
    return Math.max(0,m.xp-before);
  }

  function ensure(profile){
    if(!profile) return masteryDefaults();
    profile.campaign=profile.campaign||{};
    const raw=(profile.campaign.mastery&&typeof profile.campaign.mastery==="object")
      ? profile.campaign.mastery
      : {};
    profile.campaign.mastery={
      xp:Math.max(0,Math.floor(Number(raw.xp)||0)),
      hpLevel:Math.max(0,Math.min(MAX_HP_LEVEL,Math.floor(Number(raw.hpLevel)||0))),
      damageLevel:Math.max(0,Math.min(MAX_DAMAGE_LEVEL,Math.floor(Number(raw.damageLevel)||0))),
      abilityLevel:Math.max(0,Math.min(MAX_ABILITY_LEVEL,Math.floor(Number(raw.abilityLevel)||0))),
      retroGranted:!!raw.retroGranted
    };
    applyRetroactiveXp(profile);
    return profile.campaign.mastery;
  }

  function spentPoints(profile){
    const m=ensure(profile);
    return m.hpLevel+m.damageLevel+m.abilityLevel;
  }

  function earnedPoints(profile){
    return Math.floor(ensure(profile).xp/XP_PER_POINT);
  }

  function freePoints(profile){
    return Math.max(0,earnedPoints(profile)-spentPoints(profile));
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
    }catch(_err){
      return 0;
    }
  }

  function abilityThreshold(profile,encounter){
    const base=15;
    return applies(profile,encounter)?base+ensure(profile).abilityLevel:base;
  }

  function abilityThresholdForPlayer(index){
    try{
      if(!campaignMode) return 15;
      const player=players?.[Number(index)];
      if(!player||player.campaignTeam!=="hero") return 15;
      const profile=getProfile(player.profileId||campaignProfileId);
      const encounter=campaignEncounterById(campaignEncounterId);
      return abilityThreshold(profile,encounter);
    }catch(_err){
      return 15;
    }
  }

  function isBoss(encounter){
    if(!encounter) return false;
    const list=CAMPAIGN_ENCOUNTERS.filter(e=>(e.world||"house")===(encounter.world||"house"));
    const n=list.findIndex(e=>e.id===encounter.id)+1;
    return n===10||n===15;
  }

  function awardCampaignXp(profile,encounter,newlyCompleted){
    if(!profile||!applies(profile,encounter)) return 0;
    const m=ensure(profile);

    // W3+ successful challenge clear:
    // 10 XP repeat baseline, +15 first clear, +25 boss.
    let amount=10;
    if(newlyCompleted) amount+=15;
    if(isBoss(encounter)) amount+=25;

    m.xp+=amount;
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

  function nodeHtml(branch,index,free){
    const level=index+1;
    const owned=branch.level>=level;
    const available=!owned && branch.level===index && free>0;
    const locked=!owned&&!available;
    const value=branch.values[index]||`Level ${level}`;
    return `<button type="button"
      class="mastery-node${owned?" owned":""}${available?" available":""}${locked?" locked":""}"
      data-mastery-branch="${branch.key}"
      data-mastery-level="${level}"
      ${available?"":"disabled"}>
      <span class="mastery-node-dot">${owned?"✓":level}</span>
      <span class="mastery-node-value">${value}</span>
      <small>${owned?"AKTIV":available?"1 PUNKT":"GESPERRT"}</small>
    </button>`;
  }

  function currentProfile(){
    const id=document.getElementById("campaignProfileSelect")?.value || campaignProfileId;
    return id?getProfile(id):null;
  }

  function currentEncounter(){
    return campaignEncounterById(campaignEncounterId) || null;
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
    const earned=earnedPoints(profile);
    const spent=spentPoints(profile);
    const free=freePoints(profile);
    const level=earned;

    summary.innerHTML=`
      <div class="mastery-summary-main">
        <strong>${escapeHtml(profile.name)}</strong>
        <span>Mastery ${level}</span>
      </div>
      <div class="mastery-xp-line">
        <span>⭐ ${m.xp} XP</span>
        <span>◆ ${free} freie Punkte</span>
        <span>${spent} / ${earned} investiert</span>
      </div>
      <div class="mastery-xp-track"><span style="width:${m.xp%XP_PER_POINT}%"></span></div>
      <small>${XP_PER_POINT-(m.xp%XP_PER_POINT||0)} XP bis zum nächsten Punkt · Effekte gelten nur in Solo Welt 3+</small>
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
          ${Array.from({length:branch.max},(_,i)=>nodeHtml(branch,i,free)).join("")}
        </div>
      </section>
    `).join("");

    content.querySelectorAll("[data-mastery-branch]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const profile=currentProfile();
        if(!profile||freePoints(profile)<=0) return;
        const branch=btn.dataset.masteryBranch;
        const m=ensure(profile);
        const caps={hpLevel:MAX_HP_LEVEL,damageLevel:MAX_DAMAGE_LEVEL,abilityLevel:MAX_ABILITY_LEVEL};
        if(!(branch in caps)||m[branch]>=caps[branch]) return;
        m[branch]++;
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
      counter.textContent="⭐ 0 XP · 0 frei";
      button.disabled=true;
      button.textContent="🔒 Mastery";
      return;
    }

    const m=ensure(profile);
    const free=freePoints(profile);
    counter.textContent=`⭐ ${m.xp} XP · ◆ ${free} frei`;

    const on=unlocked(profile);
    button.disabled=!on;
    button.textContent=on?"⚔️ Mastery":"🔒 Mastery";
    button.title=on
      ?"Campaign Mastery öffnen"
      :"Wird freigeschaltet, sobald Welt 3 verfügbar ist.";
  }

  function initUi(){
    const openBtn=document.getElementById("campaignMasteryBtn");
    const closeBtn=document.getElementById("masteryCloseBtn");
    const modal=document.getElementById("masteryModal");
    openBtn?.addEventListener("click",open);
    closeBtn?.addEventListener("click",close);
    modal?.addEventListener("click",e=>{if(e.target===modal) close();});
    document.getElementById("campaignProfileSelect")?.addEventListener("change",()=>setTimeout(()=>refreshCampaignUi(),0));
    refreshCampaignUi();

    // Ensure existing profiles receive normalized Mastery containers lazily,
    // without touching old campaign progress.
    try{
      let migrated=false;
      (saveData.profiles||[]).forEach(profile=>{
        const before=!!profile?.campaign?.mastery?.retroGranted;
        ensure(profile);
        if(!before && profile?.campaign?.mastery?.retroGranted) migrated=true;
      });
      if(migrated) saveGameData();
    }catch(_err){}
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
    earnedPoints,
    freePoints,
    refreshCampaignUi,
    open
  });

  initUi();
})();
