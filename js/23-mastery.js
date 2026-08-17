(() => {
  const MODES=["solo","duo","trio"];
  const MAX_HP_LEVEL=3;
  const MAX_DAMAGE_LEVEL=3;
  const MAX_ABILITY_LEVEL=5;

  const ABILITY_SHEET=[
    ["Second Chance","One More Try","Second Chance darf 2-mal verwendet werden.","Reroll for Damage","Jeder Wurf im aktuellen Turn gibt dem daraus entstehenden Angriff +1 Gesamtschaden. Maximal +5. Nächster Turn startet wieder bei 0."],
    ["Rache","Grudge","Rache wird bereits bei ≤15 HP aktiv statt erst bei ≤10 HP.","Vendetta","Basis-Rache bleibt +2 DMG pro Treffer. Zusätzlich: 5 HP = +1 Gesamtschaden, 4 HP = +2, 3 HP = +3, 2 HP = +4, 1 HP = +5 pro Angriff."],
    ["Last Stand","Back from the Dead","Wenn Last Stand triggert, wird dein Spielerleben auf 6 HP gesetzt.","I Can Do This All Day","Nach einem Last-Stand-Trigger kann Last Stand nach 3 Runden erneut triggern."],
    ["High Stakes","Raise the Stakes","Eine gewürfelte 3 gilt nicht mehr als Misserfolg, sondern verursacht normalen High-Stakes-Schaden.","All In","Bei einer gewürfelten 6 verursacht High Stakes 75 % mehr Schaden."],
    ["Ricochet","Rebound","Der erste Ricochet-Bounce auf Gegner 2 verursacht 2 DMG pro Angriffstreffer statt 1.","Chain Reaction","Ricochet bounced auf Gegner 3 weiter und verursacht dort 1 DMG pro Angriffstreffer."],
    ["Snake Eyes","Snake Bite","Snake Eyes ist auch im Angriffswurf nutzbar.","Python Entangle","Pro Snake-Eyes-Use im aktuellen Zug bekommt der Angriff +1 Gesamtschaden."],
    ["Loaded Dice","Dealer’s Choice","Loaded Dice darf 2-mal pro Zug verwendet werden.","Discount Dice","Der zweite Loaded-Dice-Use im selben Zug kostet nur 1 HP."],
    ["Präzision","Wider Window","Präzision erhält +1 Einsatz.","Bullseye","Treffer auf die ursprünglich gewählte Angriffszahl geben +1 Gesamtschaden für den Angriff."],
    ["Double Tap","One Tap","Bei genau 1 Angriffstreffer kann Double Tap triggern und gibt +2 Bonus-DMG.","Two Piece","Der Double-Tap-Bonus steigt auf +3 statt +2."],
    ["Momentum","Keep Rolling","Bei einem Fail sinkt die Momentum-Streak um 1 statt komplett zu resetten.","Unstoppable","Der Momentum-Bonus kann bis +3 steigen."],
    ["Blood Price","Blood Pact","Blood Price kostet weiterhin 3 HP. Bei 0 Treffern bekommst du 2 HP zurück.","Blood Credit","Wenn Blood Price vorher nicht aktiviert wurde, darf es nach dem Angriffswurf für 5 HP aktiviert werden."],
    ["Lifesteal","Borrowing Life","Bei 0 Treffern heilt Lifesteal trotzdem +2 HP.","Overheal","Ein erfolgreicher Lifesteal heilt zusätzlich +3 HP."],
    ["Insurance","Better Conditions","50 % Schadensreduktion gilt nun bei 4, 5 und 6.","Full Coverage","Bei einer 6 werden 100 % des anwendbaren Schadens reduziert."],
    ["Counterattack","Fast Hits","Counterattack triggert bereits bei 4 HP eingehendem Schaden.","Parry","5 Einser im Counterattack-Wurf setzen den ursprünglichen eingehenden Schaden auf 0."],
    ["Gambling Man","Gambling Twice","Bei 0 Treffern darfst du freiwillig erneut gambeln.","Better Chances","Die 1 ist nicht mehr im Gambling-Man-Angriffspool."],
    ["Brutale Einsen","1 for Poison","Erfolgreicher 1er-Angriff: Ziel verliert für die nächsten 2 Runden jeweils 1 HP.","Toxic Bomb","Stirbt ein vergifteter Gegner, verursacht eine einmalige Explosion 3 DMG an allen benachbarten Gegnern."],
    ["Glückswurf","Reroll the Reroll","Die durch Glückswurf neu gewürfelte 1 darf einmal zusätzlich neu gewürfelt werden.","Reroll for Days","Glückswurf kann 2-mal pro Runde triggern."],
    ["Angriffsvorsprung","Jump Ahead","24 und 25 zählen als 1er-Angriff; bei 24 bleibt 1 Self-DMG.","First Strike","Beim ersten Angriffswurf eines Angriffsvorsprung-Angriffs hast du automatisch 1 Treffer."],
    ["Perfect 25","Better Odds","Die 3 zählt jetzt auch als Hit.","Even the Odds","Die 2 zählt jetzt ebenfalls als Hit."],
    ["Wildcard","Wildcards","Wildcard zählt auch beim 2. Angriffswurf.","Joker","Fällt die Wildcard-Zahl nicht, bekommen normale Angriffstreffer jeweils +2 DMG."],
    ["Blood Rush","Sacrifice","Selbst verursachter Schaden der letzten Runde zählt ebenfalls für Blood Rush.","Self Harm","Nach dem Angriffswurf darfst du 1 HP opfern, um Blood Rush zu triggern, falls es nicht aktiv ist."],
    ["Underdog","Stay Hungry","Gleichstand bei niedrigsten HP reicht. Ist Underdog zu Zugbeginn aktiv, bleibt es den gesamten Zug aktiv.","Top Dog","Bonus = floor(Angriffstreffer × 1,5): 1→+1, 2→+3, 3→+4, 4→+6, 5→+7."]
  ];

  const STANDALONE=[
    ["Glück","Lucky Bastard","+1 % Chance auf 6er.","Very Lucky Bastard","Noch einmal +1 % Chance auf 6er.","FORTUNE'S FAVOR","Nach 3 Rolls ohne 6 steigt die 6er-Chance temporär stärker, bis eine 6 fällt. Danach Reset."],
    ["12","18","Bei 3 Sechsern gleichzeitig heilst du +2 HP.","24","Jeder zweite Heileffekt heilt zusätzlich +1 HP.","???","Keystone noch offen."]
  ];

  let activeMode="solo";
  let activeProfileId=null;

  function defaults(){
    return {xp:0,lifetimeXp:0,hpLevel:0,damageLevel:0,abilityLevel:0};
  }

  function normalize(raw){
    raw=raw&&typeof raw==="object"?raw:{};
    return {
      xp:Math.max(0,Math.floor(Number(raw.xp)||0)),
      lifetimeXp:Math.max(0,Math.floor(Number(raw.lifetimeXp)||0)),
      hpLevel:Math.max(0,Math.min(MAX_HP_LEVEL,Math.floor(Number(raw.hpLevel)||0))),
      damageLevel:Math.max(0,Math.min(MAX_DAMAGE_LEVEL,Math.floor(Number(raw.damageLevel)||0))),
      abilityLevel:Math.max(0,Math.min(MAX_ABILITY_LEVEL,Math.floor(Number(raw.abilityLevel)||0)))
    };
  }

  function ensureModes(profile){
    if(!profile) return null;
    profile.campaign=profile.campaign||{};
    profile.campaign.masteryModes=profile.campaign.masteryModes||{};

    // One-time safe migration of the old V27.8 Solo pool.
    if(!profile.campaign.masteryModes.solo){
      const legacy=profile.campaign.mastery;
      profile.campaign.masteryModes.solo=normalize(legacy);
    }

    for(const mode of MODES){
      profile.campaign.masteryModes[mode]=normalize(profile.campaign.masteryModes[mode]);
    }
    return profile.campaign.masteryModes;
  }

  function ensure(profile,mode="solo"){
    if(!MODES.includes(mode)) mode="solo";
    return ensureModes(profile)?.[mode]||defaults();
  }

  function perkCost(level){return Math.max(1,Number(level)||1)*100;}
  function branchSpent(level){let n=0;for(let i=1;i<=level;i++)n+=perkCost(i);return n;}
  function totalSpent(profile,mode){
    const m=ensure(profile,mode);
    return branchSpent(m.hpLevel)+branchSpent(m.damageLevel)+branchSpent(m.abilityLevel);
  }

  function modeLabel(mode){
    return mode==="duo"?"DUO MASTERY":mode==="trio"?"TRIO MASTERY":"SOLO MASTERY";
  }

  function soloWorldIndex(encounter){
    return CAMPAIGN_WORLDS.findIndex(w=>w.id===(encounter?.world||"house"));
  }
  function duoWorldIndex(encounter){
    return DUO_CAMPAIGN_WORLDS.findIndex(w=>w.id===(encounter?.world||"covenant"));
  }

  function encounterEligible(mode,encounter){
    if(!encounter) return false;
    if(mode==="solo") return soloWorldIndex(encounter)>=2;   // Welt 3+
    if(mode==="duo") return duoWorldIndex(encounter)>=1;     // Welt 2+
    if(mode==="trio") return true;                            // Level 1+
    return false;
  }

  function modeUnlocked(mode,profiles){
    const list=(profiles||[]).filter(Boolean);
    if(mode==="trio") return list.length>=1;
    if(mode==="solo"){
      const profile=list[0];
      if(!profile) return false;
      const w3=CAMPAIGN_WORLDS[2];
      const done=new Set(profile.campaign?.completedEncounters||[]);
      return !!w3&&(w3.unlockRequires||[]).every(id=>done.has(id));
    }
    if(mode==="duo"){
      if(list.length<2) return false;
      try{
        const w2=DUO_CAMPAIGN_WORLDS[1];
        return !!w2&&duoWorldUnlocked(list[0],list[1],w2);
      }catch(_err){return false;}
    }
    return false;
  }

  function hpBonus(profile,mode,encounter){
    return encounterEligible(mode,encounter)?ensure(profile,mode).hpLevel*2:0;
  }
  function damageBonus(profile,mode,encounter){
    return encounterEligible(mode,encounter)?ensure(profile,mode).damageLevel:0;
  }
  function abilityThreshold(profile,mode,encounter){
    return encounterEligible(mode,encounter)?15+ensure(profile,mode).abilityLevel:15;
  }

  function currentBattleMode(){
    if(typeof trioCampaignMode!=="undefined"&&trioCampaignMode) return "trio";
    if(typeof duoCampaignMode!=="undefined"&&duoCampaignMode) return "duo";
    return "solo";
  }

  function damageBonusForPlayer(index){
    try{
      if(!campaignMode) return 0;
      const p=players?.[Number(index)];
      if(!p||p.campaignTeam!=="hero") return 0;
      const mode=currentBattleMode();
      const profile=getProfile(p.profileId);
      const encounter=currentEncounterObject?.();
      return damageBonus(profile,mode,encounter);
    }catch(_err){return 0;}
  }

  function abilityThresholdForPlayer(index){
    try{
      if(!campaignMode) return 15;
      const p=players?.[Number(index)];
      if(!p||p.campaignTeam!=="hero") return 15;
      const mode=currentBattleMode();
      const profile=getProfile(p.profileId);
      const encounter=currentEncounterObject?.();
      return abilityThreshold(profile,mode,encounter);
    }catch(_err){return 15;}
  }

  function awardXp(profile,mode,encounter,newlyCompleted){
    if(!profile||!encounterEligible(mode,encounter)) return 0;
    const m=ensure(profile,mode);
    const amount=newlyCompleted?100:20;
    m.xp+=amount;
    m.lifetimeXp+=amount;
    return amount;
  }

  function profileIdsForMode(mode){
    if(mode==="solo"){
      return [document.getElementById("campaignProfileSelect")?.value||campaignProfileId].filter(Boolean);
    }
    if(mode==="duo"){
      return [
        document.getElementById("duoProfile1Select")?.value||duoProfile1Id,
        document.getElementById("duoProfile2Select")?.value||duoProfile2Id
      ].filter(Boolean);
    }
    return [
      document.getElementById("trioProfile1Select")?.value||trioProfile1Id,
      document.getElementById("trioProfile2Select")?.value||trioProfile2Id,
      document.getElementById("trioProfile3Select")?.value||trioProfile3Id
    ].filter(Boolean);
  }

  function profilesForMode(mode){
    return profileIdsForMode(mode).map(getProfile).filter(Boolean);
  }

  function selectedMasteryProfile(){
    const profiles=profilesForMode(activeMode);
    if(!profiles.length) return null;
    const picked=getProfile(activeProfileId);
    return picked&&profiles.some(p=>p.id===picked.id)?picked:profiles[0];
  }

  function branchData(profile){
    const m=ensure(profile,activeMode);
    return [
      {key:"hpLevel",icon:"❤️",title:"Vitality",desc:"Mehr Start- und Max-HP.",max:3,level:m.hpLevel,values:["+2 HP","+4 HP","+6 HP"]},
      {key:"damageLevel",icon:"⚔️",title:"Force",desc:"+1 / +2 / +3 Gesamtschaden pro Angriff.",max:3,level:m.damageLevel,values:["+1 DMG","+2 DMG","+3 DMG"]},
      {key:"abilityLevel",icon:"✨",title:"Awakening",desc:"Bonus-Draft früher verfügbar.",max:5,level:m.abilityLevel,values:["16 HP","17 HP","18 HP","19 HP","20 HP"]}
    ];
  }

  function standardNode(branch,index,xp){
    const level=index+1,cost=perkCost(level);
    const owned=branch.level>=level;
    const next=!owned&&branch.level===index;
    const available=next&&xp>=cost;
    return `<button type="button" class="mastery-node${owned?" owned":""}${available?" available":" locked"}"
      data-standard-branch="${branch.key}" data-standard-level="${level}" data-standard-cost="${cost}" ${available?"":"disabled"}>
      <span class="mastery-node-orb"><span class="mastery-node-dot">${owned?"✓":level}</span></span>
      <span class="mastery-node-plaque"><span class="mastery-node-value">${branch.values[index]}</span><small>${owned?"AKTIV":next?cost+" XP":"GESPERRT"}</small></span>
    </button>`;
  }

  function renderStandard(profile){
    const m=ensure(profile,activeMode);
    const summary=document.getElementById("masterySummary");
    const content=document.getElementById("masteryContent");
    summary.innerHTML=`
      <div class="mastery-summary-main"><strong>${escapeHtml(profile.name)}</strong><span>${modeLabel(activeMode)}</span></div>
      <div class="mastery-xp-line"><span>⭐ ${m.xp} XP verfügbar</span><span>Σ ${m.lifetimeXp} verdient</span><span>-${totalSpent(profile,activeMode)} investiert</span></div>
      <div class="mastery-xp-track mastery-xp-currency"></div>
      <small>Dieses XP-Konto gilt nur für ${activeMode.toUpperCase()}.</small>`;

    content.innerHTML=branchData(profile).map(branch=>`
      <section class="mastery-branch branch-${branch.key}">
        <div class="mastery-branch-head"><span class="mastery-branch-icon">${branch.icon}</span><div><strong>${branch.title}</strong><small>${branch.desc}</small></div><span class="mastery-branch-level">${branch.level}/${branch.max}</span></div>
        <div class="mastery-tree-line">${Array.from({length:branch.max},(_,i)=>standardNode(branch,i,m.xp)).join("")}</div>
      </section>`).join("");

    content.querySelectorAll("[data-standard-branch]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const p=selectedMasteryProfile(); if(!p) return;
        const mode=activeMode,m=ensure(p,mode);
        const branch=btn.dataset.standardBranch,level=Number(btn.dataset.standardLevel),cost=Number(btn.dataset.standardCost);
        const caps={hpLevel:3,damageLevel:3,abilityLevel:5};
        if(!(branch in caps)||m[branch]!==level-1||m.xp<cost) return;
        m.xp-=cost;m[branch]=level;
        saveGameData();
        renderModal();
        refreshAll();
      });
    });
  }

  function lockedAbilityNode(ability,level){
    const name=level===1?ability[1]:ability[3];
    const desc=level===1?ability[2]:ability[4];
    const cost=level===1?300:500;
    return `<button type="button" class="aml-node aml-ability-node mastery-ability-locked" data-locked-title="${escapeHtml(ability[0]+" · "+name)}" data-locked-desc="${escapeHtml(desc)}" data-locked-cost="${cost}">
      <span class="aml-node-orbit"></span><span class="aml-node-core"><span class="aml-node-level">🔒</span></span>
      <span class="aml-node-tag"><strong>${escapeHtml(name)}</strong><small>${cost} XP · GESPERRT</small></span>
    </button>`;
  }

  function abilityPair(a,b){
    return `<section class="mastery-ability-pair">
      <div class="mastery-ability-pair-head"><strong>${escapeHtml(a[0])}</strong><span>×</span><strong>${escapeHtml(b[0])}</strong></div>
      <div class="mastery-ability-columns">
        <div>${lockedAbilityNode(a,1)}${lockedAbilityNode(a,2)}</div>
        <div>${lockedAbilityNode(b,1)}${lockedAbilityNode(b,2)}</div>
      </div>
      <button type="button" class="mastery-fusion-placeholder" data-locked-title="${escapeHtml(a[0]+" × "+b[0]+" · Fusion")}" data-locked-desc="Fusion noch nicht festgelegt." data-locked-cost="1000">🔒 <strong>???</strong><small>FUSION · 1000 XP</small></button>
    </section>`;
  }

  function renderAbilitySheet(){
    const sheet=document.getElementById("masteryAbilitySheet");
    const chunks=[];
    for(let i=0;i<ABILITY_SHEET.length;i+=2) chunks.push(abilityPair(ABILITY_SHEET[i],ABILITY_SHEET[i+1]));

    const stand=STANDALONE.map(a=>`
      <section class="mastery-ability-pair mastery-standalone-pair">
        <div class="mastery-ability-pair-head"><strong>${escapeHtml(a[0])}</strong><span>STANDALONE</span></div>
        <div class="mastery-ability-columns single">
          <div>
            ${lockedAbilityNode([a[0],a[1],a[2],a[3],a[4]],1)}
            ${lockedAbilityNode([a[0],a[1],a[2],a[3],a[4]],2)}
          </div>
        </div>
        <button type="button" class="mastery-fusion-placeholder" data-locked-title="${escapeHtml(a[0]+" · "+a[5])}" data-locked-desc="${escapeHtml(a[6])}" data-locked-cost="1000">🔒 <strong>${escapeHtml(a[5])}</strong><small>KEYSTONE · 1000 XP</small></button>
      </section>`).join("");

    sheet.innerHTML=chunks.join("")+stand;
    sheet.querySelectorAll("[data-locked-title]").forEach(btn=>{
      btn.addEventListener("click",()=>showLockedPopup(btn.dataset.lockedTitle,btn.dataset.lockedDesc,btn.dataset.lockedCost));
    });
  }

  function showLockedPopup(title,desc,cost){
    let p=document.getElementById("masteryLockedInfo");
    if(!p){
      p=document.createElement("div");
      p.id="masteryLockedInfo";p.className="mastery-locked-info hidden";
      p.innerHTML=`<div class="mastery-locked-card"><button type="button">✕</button><div class="mastery-kicker">ABILITY MASTERY · GESPERRT</div><h3></h3><div class="mastery-locked-cost"></div><p></p><small>Freischaltbedingung wird später festgelegt.</small></div>`;
      document.getElementById("masteryModal")?.appendChild(p);
      p.querySelector("button").onclick=()=>p.classList.add("hidden");
      p.onclick=e=>{if(e.target===p)p.classList.add("hidden")};
    }
    p.querySelector("h3").textContent=title;
    p.querySelector(".mastery-locked-cost").textContent=`🔒 ${cost} XP`;
    p.querySelector("p").textContent=desc;
    p.classList.remove("hidden");
  }

  function renderProfilePicker(){
    const wrap=document.getElementById("masteryProfilePickerWrap");
    const select=document.getElementById("masteryProfilePicker");
    const profiles=profilesForMode(activeMode);
    select.innerHTML=profiles.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
    if(!activeProfileId||!profiles.some(p=>p.id===activeProfileId)) activeProfileId=profiles[0]?.id||null;
    select.value=activeProfileId||"";
    wrap.classList.toggle("hidden",profiles.length<=1);
  }

  function renderModal(){
    const profile=selectedMasteryProfile();
    document.getElementById("masteryModeBadge").textContent=modeLabel(activeMode);
    document.querySelector("#masteryModal .mastery-kicker").textContent=`Campaign Progression · ${modeLabel(activeMode)}`;
    renderProfilePicker();
    if(!profile){
      document.getElementById("masterySummary").textContent="Kein Profil ausgewählt.";
      document.getElementById("masteryContent").innerHTML="";
    }else renderStandard(profile);
    renderAbilitySheet();
  }

  function open(mode="solo"){
    if(!MODES.includes(mode)) mode="solo";
    const profiles=profilesForMode(mode);
    if(!profiles.length||!modeUnlocked(mode,profiles)) return;
    activeMode=mode;activeProfileId=profiles[0].id;
    document.getElementById("masteryModal")?.classList.remove("hidden");
    document.body.classList.add("mastery-open");
    renderModal();
  }
  function close(){
    document.getElementById("masteryModal")?.classList.add("hidden");
    document.getElementById("masteryLockedInfo")?.classList.add("hidden");
    document.body.classList.remove("mastery-open");
  }

  function summaryFor(mode){
    const profiles=profilesForMode(mode);
    if(!profiles.length) return "⭐ –";
    return profiles.map(p=>`${p.name}: ${ensure(p,mode).xp}`).join(" · ")+" XP";
  }

  function refreshMode(mode){
    const profiles=profilesForMode(mode);
    const unlocked=modeUnlocked(mode,profiles);
    const ids=mode==="solo"
      ?["campaignMasteryXpSummary","campaignMasteryBtn"]
      :mode==="duo"
        ?["duoCampaignMasteryXpSummary","duoCampaignMasteryBtn"]
        :["trioCampaignMasteryXpSummary","trioCampaignMasteryBtn"];
    const counter=document.getElementById(ids[0]),btn=document.getElementById(ids[1]);
    if(counter) counter.textContent=summaryFor(mode);
    if(btn){btn.disabled=!unlocked;btn.textContent=unlocked?"⚔️ Mastery":"🔒 Mastery";}
  }

  function refreshAll(){
    refreshMode("solo");refreshMode("duo");refreshMode("trio");
  }
  function refreshCampaignUi(){refreshAll();}

  function init(){
    try{
      let migrated=false;
      (saveData.profiles||[]).forEach(p=>{
        const before=!!p.campaign?.masteryModes?.solo;
        ensureModes(p);
        if(!before) migrated=true;
      });
      if(migrated) saveGameData();
    }catch(_err){}

    document.getElementById("campaignMasteryBtn")?.addEventListener("click",()=>open("solo"));
    document.getElementById("duoCampaignMasteryBtn")?.addEventListener("click",()=>open("duo"));
    document.getElementById("trioCampaignMasteryBtn")?.addEventListener("click",()=>open("trio"));
    document.getElementById("masteryCloseBtn")?.addEventListener("click",close);
    document.getElementById("masteryModal")?.addEventListener("click",e=>{if(e.target?.id==="masteryModal")close()});
    document.getElementById("masteryProfilePicker")?.addEventListener("change",e=>{activeProfileId=e.target.value;renderModal();});

    ["campaignProfileSelect","duoProfile1Select","duoProfile2Select","trioProfile1Select","trioProfile2Select","trioProfile3Select"]
      .forEach(id=>document.getElementById(id)?.addEventListener("change",()=>setTimeout(refreshAll,0)));
    refreshAll();
  }

  window.WDMastery=Object.freeze({
    ensure,ensureModes,encounterEligible,modeUnlocked,hpBonus,damageBonus,damageBonusForPlayer,
    abilityThreshold,abilityThresholdForPlayer,awardXp,refreshCampaignUi,refreshAll,open
  });
  init();
})();
