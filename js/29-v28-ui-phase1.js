(() => {
  "use strict";

  const VERSION = "28.2.1";
  const ASSET_ROOT = "assets/ui/v28/";
  const SVG_ROOT = `${ASSET_ROOT}svg/`;

  const ABILITY_ICON_PATHS = {
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
  };

  const RULE_ICON_PATHS = [
    [/basiswurf|base roll/i,"gameplay/dice.svg"],
    [/unter\s*25|under\s*25/i,"gameplay/heart-hp.svg"],
    [/über\s*25|over\s*25/i,"gameplay/damage-sword.svg"],
    [/angriff|attack/i,"gameplay/target.svg"],
    [/fähigkeit|abilit/i,"gameplay/mastery.svg"],
    [/endurance/i,"gameplay/shield.svg"],
    [/overload/i,"gameplay/streak-flame.svg"],
    [/sieg|victory|win/i,"gameplay/trophy.svg"]
  ];

  const CAMPAIGN_DETAIL_ICON_PATHS = [
    [/mastery\s*xp/i,"gameplay/xp-star.svg"],
    [/challenge-ausrüstung|challenge gear/i,"gameplay/attack.svg"],
    [/challenge/i,"gameplay/challenge.svg"],
    [/belohnung|reward/i,"gameplay/reward-gift.svg"],
    [/boss-phase|boss phase/i,"gameplay/boss.svg"],
    [/pflicht-loadout|required loadout/i,"gameplay/locked.svg"],
    [/fähigkeits-drafts|ability drafts/i,"gameplay/locked.svg"],
    [/encounter-fähigkeit|encounter ability/i,"gameplay/mastery.svg"],
    [/startfähigkeit|starting ability/i,"gameplay/mastery.svg"],
    [/bonus-draft|bonus draft/i,"gameplay/mastery.svg"],
    [/extra-fähigkeiten|extra abilities/i,"gameplay/reward-gift.svg"],
    [/^farm|trophy farm/i,"gameplay/farm.svg"]
  ];

  const MODE_ICONS = {
    campaignModeSoloBtn:"gameplay/solo.svg",
    campaignModeDuoBtn:"gameplay/duo.svg",
    campaignModeTrioBtn:"gameplay/trio.svg"
  };

  let decorateQueued = false;

  function versionedAsset(relativePath){
    const clean = String(relativePath || "").replace(/^\/+/, "");
    return `${clean.startsWith(ASSET_ROOT) ? "" : SVG_ROOT}${clean}?v=${VERSION}`;
  }

  function makeIcon(path, className, alt=""){
    const image = document.createElement("img");
    image.src = versionedAsset(path);
    image.className = className;
    image.alt = alt;
    image.draggable = false;
    if(!alt) image.setAttribute("aria-hidden", "true");
    return image;
  }

  function stripLeadingDecoration(element){
    if(!element) return;
    const textNode = [...element.childNodes].find(node =>
      node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()
    );
    if(textNode){
      textNode.nodeValue = textNode.nodeValue.replace(/^\s*[^\p{L}\p{N}]+\s*/u, " ");
    }
  }

  function directIcon(element, className){
    return [...(element?.children || [])].find(child =>
      child.tagName === "IMG" && child.classList.contains(className)
    ) || null;
  }

  function ensureLeadingIcon(element, path, className="p1-inline-icon", options={}){
    if(!element || !path) return null;
    if(options.strip !== false) stripLeadingDecoration(element);
    let image = directIcon(element, className);
    if(!image){
      image = makeIcon(path, className, options.alt || "");
      element.prepend(image);
    }else{
      const wanted = versionedAsset(path);
      if(image.getAttribute("src") !== wanted) image.setAttribute("src", wanted);
    }
    return image;
  }

  // Aufgabe dieser Funktion ist es, einen kaputten Pfad-Prefix zu reparieren -
  // nicht, den Cache-Buster aller Phasen auf die Version von Phase 1 zu ziehen.
  // Genau das tat sie vorher: sie schrieb jedes img unter assets/ui/v28/ auf
  // ?v=28.2.1, waehrend Phase 5/6/8 ihre eigenen Icons auf ihre Versionen
  // zurueckschrieben. Beide Seiten beobachten Attributaenderungen, also lief das
  // endlos im Kreis und lud dieselben SVGs immer wieder neu. Ein bereits
  // vorhandener Query-String bleibt daher jetzt unangetastet.
  function repairAssetUrl(image){
    const raw = image?.getAttribute("src") || "";
    const assetIndex = raw.indexOf(ASSET_ROOT);
    if(assetIndex < 0) return;
    const rest = raw.slice(assetIndex);
    const wanted = rest.includes("?") ? rest : `${rest}?v=${VERSION}`;
    if(raw !== wanted) image.setAttribute("src", wanted);
  }

  function repairAllAssetUrls(root=document){
    if(root.nodeType === 1 && root.matches?.(`img[src*="${ASSET_ROOT}"]`)) repairAssetUrl(root);
    root.querySelectorAll?.(`img[src*="${ASSET_ROOT}"]`).forEach(repairAssetUrl);
  }

  function abilityData(){
    try{
      return typeof ABILITIES !== "undefined" ? ABILITIES : {};
    }catch(_error){
      return {};
    }
  }

  function abilityIdFromText(text){
    const clean = String(text || "").replace(/^\s*[^\p{L}\p{N}]+/u, "").trim().toLocaleLowerCase();
    const match = Object.entries(abilityData()).find(([, value]) => {
      const name = String(value?.name || "").trim().toLocaleLowerCase();
      return name && (clean === name || clean.includes(name));
    });
    return match ? Number(match[0]) : null;
  }

  function ensureModeChoiceIcons(){
    Object.entries(MODE_ICONS).forEach(([id, path]) => {
      const button = document.getElementById(id);
      if(!button) return;
      const title = button.querySelector("strong");
      stripLeadingDecoration(title);
      let image = button.querySelector(":scope > .dd-choice-icon");
      if(!image){
        image = makeIcon(path, "dd-choice-icon");
        button.prepend(image);
      }else{
        const wanted = versionedAsset(path);
        if(image.getAttribute("src") !== wanted) image.setAttribute("src", wanted);
      }
    });

    document.getElementById("campaignModePickerClose")?.classList.add("p1-action-button");
  }

  function ensureCampaignSummaryIcons(){
    document.querySelectorAll(".campaign-hub .campaign-top .menu-info-card").forEach(card => {
      const label = card.querySelector(".campaign-label");
      if(!label) return;
      const text = label.textContent.trim().toLocaleLowerCase();
      let path = "gameplay/campaign.svg";
      if(/profil|player/.test(text)) path = "gameplay/player.svg";
      else if(/prestige|belohnung|reward/.test(text)) path = "gameplay/trophy.svg";
      else if(/team/.test(text)) path = card.closest("#trioCampaignScreen") ? "gameplay/trio.svg" : "gameplay/duo.svg";
      else if(/freischaltung|unlock/.test(text)) path = "gameplay/locked.svg";
      else if(/fortschritt|progress/.test(text)) path = "gameplay/completed.svg";
      ensureLeadingIcon(label, path, "p1-inline-icon", {strip:false});
    });
  }

  function campaignDetailIconPath(row){
    const text = row?.textContent || "";
    return CAMPAIGN_DETAIL_ICON_PATHS.find(([pattern]) => pattern.test(text))?.[1] || "navigation/info.svg";
  }

  function ensureCampaignDetailIcons(){
    ["campaignEncounterDetail","duoCampaignEncounterDetail","trioCampaignEncounterDetail"].forEach(id => {
      const detail = document.getElementById(id);
      if(!detail) return;

      detail.querySelectorAll(".node-detail-row").forEach(row => {
        ensureLeadingIcon(row, campaignDetailIconPath(row), "p1-inline-icon");
      });

      const state = detail.querySelector(".node-detail-state");
      if(state && !state.querySelector(":scope > img")){
        const text = state.textContent.toLocaleLowerCase();
        const path = /farm/.test(text)
          ? "gameplay/farm.svg"
          : /gesperrt|locked/.test(text)
            ? "gameplay/locked.svg"
            : /geschafft|completed/.test(text)
              ? "gameplay/completed.svg"
              : "gameplay/encounter.svg";
        ensureLeadingIcon(state, path, "p1-inline-icon");
      }
    });
  }

  function ensureCampaignActionIcons(){
    const actions = {
      campaignStartBtn:"gameplay/encounter.svg",
      duoCampaignStartBtn:"gameplay/duo.svg",
      trioCampaignStartBtn:"gameplay/trio.svg"
    };
    Object.entries(actions).forEach(([id, path]) => {
      const button = document.getElementById(id);
      if(!button) return;
      button.classList.add("p1-action-button");
      ensureLeadingIcon(button, path, "p1-action-icon");
    });
  }

  function ensureSecondAbilityLayout(){
    document.querySelectorAll(".second-ability-card").forEach(card => {
      const id = Number(card.querySelector(".num")?.textContent);
      const path = ABILITY_ICON_PATHS[id];
      if(path){
        let image = card.querySelector(":scope > .dd-ability-icon");
        if(!image){
          image = makeIcon(path, "dd-ability-icon", abilityData()[id]?.name || "");
          card.prepend(image);
        }else{
          const wanted = versionedAsset(path);
          if(image.getAttribute("src") !== wanted) image.setAttribute("src", wanted);
        }
      }
      if(!card.querySelector(":scope > .p1-choice-indicator")){
        const indicator = document.createElement("span");
        indicator.className = "p1-choice-indicator";
        indicator.setAttribute("aria-hidden", "true");
        card.append(indicator);
      }
    });
  }

  function ensureRuleIcons(){
    document.querySelectorAll("#rulesScreen .menu-info-card>strong").forEach(title => {
      const path = RULE_ICON_PATHS.find(([pattern]) => pattern.test(title.textContent))?.[1] || "navigation/info.svg";
      ensureLeadingIcon(title, path, "p1-rule-icon");
    });
  }

  function ensureAchievementIcons(){
    document.querySelectorAll("#achievementsScreen .achievement-card").forEach(card => {
      const title = card.querySelector(".achievement-name");
      if(title && !title.querySelector(":scope > img")){
        const achieved = !!card.querySelector(".achievement-owner.done");
        ensureLeadingIcon(title, achieved ? "gameplay/trophy.svg" : "gameplay/locked.svg", "dd-inline-icon");
      }

      const reward = card.querySelector(".achievement-reward");
      if(reward && !reward.querySelector("img")){
        const raw = reward.textContent;
        const path = /fx|effekt|✨/i.test(raw) ? "gameplay/attack.svg" : "gameplay/dice.svg";
        ensureLeadingIcon(reward, path, "p1-reward-icon");
      }
    });
  }

  function ensureSetupActionIcons(){
    const actions = {
      makeNames:"gameplay/player.svg",
      setupProfilesBtn:"gameplay/player.svg",
      rollAbilities:"gameplay/dice.svg",
      startGame:"gameplay/attack.svg"
    };
    Object.entries(actions).forEach(([id, path]) => {
      const button = document.getElementById(id);
      if(!button) return;
      button.classList.add("p1-action-button");
      ensureLeadingIcon(button, path, "p1-action-icon");
    });
  }

  function ensureCombatIcons(){
    document.querySelectorAll("#players .player").forEach(card => {
      const hp = card.querySelector(".hp");
      if(hp && !hp.querySelector(":scope > img")) ensureLeadingIcon(hp, "gameplay/heart-hp.svg", "dd-inline-icon");
      const bot = card.querySelector(".bot-tag");
      if(bot && !bot.querySelector(":scope > img")) ensureLeadingIcon(bot, "gameplay/bot.svg", "dd-inline-icon");
      card.querySelectorAll(".ability-tag").forEach(tag => {
        if(tag.querySelector(":scope > img")) return;
        const id = abilityIdFromText(tag.textContent);
        if(id && ABILITY_ICON_PATHS[id]) ensureLeadingIcon(tag, ABILITY_ICON_PATHS[id], "dd-inline-icon");
      });
    });

    const taskHead = document.querySelector("#campaignTaskProgress .campaign-task-head>span");
    if(taskHead) ensureLeadingIcon(taskHead, "gameplay/challenge.svg", "p1-inline-icon");

    const banner = document.getElementById("encounterRuleBanner");
    if(banner && banner.textContent.trim() && !banner.querySelector(":scope > .p1-inline-icon")){
      ensureLeadingIcon(banner, "gameplay/boss.svg", "p1-inline-icon");
    }
  }

  function syncKnownSelectIcons(){
    const paths = {
      animationSetting:"navigation/refresh-reroll.svg",
      botSpeedSetting:"gameplay/bot.svg",
      languageSetting:"navigation/info.svg"
    };
    Object.entries(paths).forEach(([id, path]) => {
      const select = document.getElementById(id);
      const image = select?.__ddSelectTrigger?.querySelector(".dd-trigger-icon");
      if(image){
        const wanted = versionedAsset(path);
        if(image.getAttribute("src") !== wanted) image.setAttribute("src", wanted);
      }
    });
  }

  function ensureStatsAndSettingsIcons(){
    document.querySelectorAll("#statsScreen .stats-section-title").forEach(title => {
      const text = title.textContent || "";
      const path = /fähigkeit|abilit/i.test(text) ? "gameplay/mastery.svg" : "gameplay/player.svg";
      ensureLeadingIcon(title, path, "p1-inline-icon");
    });
    ensureLeadingIcon(
      document.querySelector("#settingsScreen .storage-note strong"),
      "navigation/info.svg",
      "p1-inline-icon"
    );
    const reset = document.getElementById("resetStorageBtn");
    if(reset){
      reset.classList.add("p1-action-button");
      ensureLeadingIcon(reset, "navigation/warning.svg", "p1-action-icon");
    }
    ["campaignProfilesBtn","duoCampaignProfilesBtn","trioCampaignProfilesBtn"].forEach(id => {
      const button = document.getElementById(id);
      if(!button) return;
      button.classList.add("p1-action-button");
      ensureLeadingIcon(button, "gameplay/player.svg", "p1-action-icon");
    });
  }

  function decorateAll(){
    decorateQueued = false;
    ensureModeChoiceIcons();
    ensureCampaignSummaryIcons();
    ensureCampaignDetailIcons();
    ensureCampaignActionIcons();
    ensureSecondAbilityLayout();
    ensureRuleIcons();
    ensureAchievementIcons();
    ensureSetupActionIcons();
    ensureCombatIcons();
    ensureStatsAndSettingsIcons();
    syncKnownSelectIcons();
    repairAllAssetUrls(document);
  }

  function scheduleDecorate(){
    if(decorateQueued) return;
    decorateQueued = true;
    const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout;
    schedule(decorateAll);
  }

  function observeDynamicUi(){
    const ids = [
      "campaignModePicker","campaignScreen","duoCampaignScreen","trioCampaignScreen",
      "secondAbilityOptions","settingsScreen","rulesScreen","achievementsScreen",
      "profilesScreen","setup","nameInputs","players","campaignTaskProgress","encounterRuleBanner"
    ];
    ids.forEach(id => {
      const root = document.getElementById(id);
      if(!root) return;
      const observer = new MutationObserver(records => {
        records.forEach(record => record.addedNodes.forEach(node => {
          if(node.nodeType === 1) repairAllAssetUrls(node);
        }));
        scheduleDecorate();
      });
      observer.observe(root, {childList:true, subtree:true});
    });
  }

  function setupEventHooks(){
    document.addEventListener("click", event => {
      if(event.target.closest("button,select,.dd-select-trigger")) setTimeout(scheduleDecorate, 0);
    });
    document.addEventListener("change", event => {
      if(event.target.matches("select,input")) setTimeout(scheduleDecorate, 0);
    });
  }

  function init(){
    document.documentElement.dataset.v28Phase1 = "1";
    observeDynamicUi();
    setupEventHooks();
    decorateAll();
    console.info(`[DiceDuel] UI Rework Phase 1 ${VERSION} active.`);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
