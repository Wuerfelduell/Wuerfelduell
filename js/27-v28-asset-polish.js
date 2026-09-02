(() => {
  const VERSION = "28.2.0";
  const ROOT = "assets/ui/v28/svg/";

  const menuIcons = {
    menuPlayBtn:"menu/play.svg",
    menuOnlineBtn:"menu/online.svg",
    menuCampaignBtn:"menu/campaign.svg",
    menuTutorialBtn:"menu/tutorial.svg",
    menuProfilesBtn:"menu/profile.svg",
    menuAccountBtn:"menu/account.svg",
    menuAchievementsBtn:"menu/achievements.svg",
    menuPrestigeShopBtn:"menu/trophy-shop.svg",
    menuStatsBtn:"menu/statistics.svg",
    menuSettingsBtn:"menu/settings.svg",
    menuRulesBtn:"menu/rules.svg",
    menuChangelogBtn:"menu/changelog.svg"
  };

  const titleIcons = {
    accountScreen:"menu/account.svg",
    onlineScreen:"menu/online.svg",
    campaignScreen:"menu/campaign.svg",
    duoCampaignScreen:"menu/campaign.svg",
    trioCampaignScreen:"menu/campaign.svg",
    prestigeShopScreen:"menu/trophy-shop.svg",
    profilesScreen:"menu/profile.svg",
    achievementsScreen:"menu/achievements.svg",
    statsScreen:"menu/statistics.svg",
    settingsScreen:"menu/settings.svg",
    rulesScreen:"menu/rules.svg",
    abilitiesScreen:"gameplay/mastery.svg",
    changelogScreen:"menu/changelog.svg"
  };

  function img(path, className, alt=""){
    const el=document.createElement("img");
    el.src=ROOT+path;
    el.className=className;
    el.alt=alt;
    el.setAttribute("aria-hidden","true");
    el.draggable=false;
    return el;
  }

  function decorateMenu(){
    for(const [id,path] of Object.entries(menuIcons)){
      const button=document.getElementById(id);
      const holder=button?.querySelector(".menu-icon");
      if(!holder || holder.dataset.v28IconReady) continue;
      holder.dataset.v28IconReady="1";
      holder.textContent="";
      holder.appendChild(img(path,"v28-menu-icon"));
    }
  }

  function stripLeadingEmojiFromTitle(title){
    if(!title || title.dataset.v28TitleCleaned) return;
    // js/36-emoji-sprite-pass.js kann das fuehrende Emoji schon in ein
    // <img class="dd-emoji-sprite"> verwandelt haben; dann findet die
    // Textersetzung unten nichts mehr und das Sprite bliebe sichtbar stehen.
    for(const node of [...title.childNodes]){
      if(node.nodeType===Node.TEXT_NODE){
        if(!node.nodeValue.trim()) continue;
        break;
      }
      if(node.nodeType===Node.ELEMENT_NODE && node.classList?.contains("dd-emoji-sprite")) node.remove();
    }
    const firstText=[...title.childNodes].find(n=>n.nodeType===Node.TEXT_NODE && n.nodeValue.trim());
    if(firstText){
      // Static source titles begin with an emoji. At this point the i18n layer has
      // already translated the words, so only remove the decorative prefix.
      firstText.nodeValue=firstText.nodeValue.replace(/^\s*[^\p{L}\p{N}]+\s*/u,"");
    }
    title.dataset.v28TitleCleaned="1";
  }

  function decorateScreenTitles(){
    for(const [screenId,path] of Object.entries(titleIcons)){
      const screen=document.getElementById(screenId);
      const topbar=screen?.querySelector(":scope > .screen-topbar");
      const title=topbar?.querySelector(".screen-title");
      if(!title || title.dataset.v28IconReady) continue;
      stripLeadingEmojiFromTitle(title);
      title.dataset.v28IconReady="1";
      title.insertAdjacentElement("beforebegin",img(path,"screen-title-icon"));
    }

  }

  function visible(el){
    return !!el && !el.classList.contains("hidden");
  }

  function detectScene(){
    if(visible(document.getElementById("masteryModal"))) return "mastery";
    if(visible(document.getElementById("game"))) return "combat";
    if(visible(document.getElementById("mainMenu"))) return "main";
    if(visible(document.getElementById("setup"))) return "setup";
    if(["campaignScreen","duoCampaignScreen","trioCampaignScreen"].some(id=>visible(document.getElementById(id)))) return "campaign";
    return "light";
  }

  function applyScene(){
    const next=detectScene();
    if(document.body.dataset.v28Scene!==next) document.body.dataset.v28Scene=next;
  }

  function setupSceneObservers(){
    const ids=[
      "masteryModal","game","mainMenu","setup","campaignScreen","duoCampaignScreen","trioCampaignScreen",
      "accountScreen","onlineScreen","prestigeShopScreen","profilesScreen","achievementsScreen","statsScreen",
      "settingsScreen","rulesScreen","abilitiesScreen","changelogScreen"
    ];
    const observer=new MutationObserver(applyScene);
    for(const id of ids){
      const el=document.getElementById(id);
      if(el) observer.observe(el,{attributes:true,attributeFilter:["class"]});
    }
    applyScene();
  }

  function classifyCampaignDetail(el){
    if(!el) return;
    const subtitle=(el.querySelector(".node-detail-sub")?.textContent||"").toLowerCase();
    const all=(el.textContent||"").toLowerCase();
    const boss=/\bboss\b|kapitel-boss|welt-boss|duo-boss|final boss|chapter boss|world boss/.test(subtitle);
    const prestige=/trophy farm|prestige|farm trophy|trophäen|mastery xp/.test(all);
    if(el.classList.contains("v28-boss-detail") !== boss){
      el.classList.toggle("v28-boss-detail", boss);
    }
    if(el.classList.contains("v28-prestige-detail") !== prestige){
      el.classList.toggle("v28-prestige-detail", prestige);
    }
  }

  function setupCampaignDetailObservers(){
    for(const id of ["campaignEncounterDetail","duoCampaignEncounterDetail","trioCampaignEncounterDetail"]){
      const el=document.getElementById(id);
      if(!el) continue;
      let timer=null;
      const run=()=>{
        if(timer) return;
        timer=setTimeout(()=>{ timer=null; classifyCampaignDetail(el); }, 50);
      };
      const observer=new MutationObserver(run);
      observer.observe(el,{childList:true,subtree:true,characterData:true});
      classifyCampaignDetail(el);
    }
  }

  function init(){
    document.documentElement.dataset.v28Assets="1";
    decorateMenu();
    decorateScreenTitles();
    setupSceneObservers();
    setupCampaignDetailObservers();
    console.info(`[DiceDuel] Bright Arcane asset system ${VERSION} active.`);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
