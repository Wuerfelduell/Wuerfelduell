(() => {
  "use strict";

  const VERSION = "28.2.0";
  const SVG_ROOT = "assets/ui/v28/svg/";

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

  const SELECT_ICON_PATHS = [
    [/localMode/i,"gameplay/dice.svg"],
    [/playerCount/i,"gameplay/player.svg"],
    [/profile/i,"gameplay/player.svg"],
    [/seat/i,"gameplay/seat-position.svg"],
    [/dice/i,"gameplay/dice.svg"],
    [/bot/i,"gameplay/bot.svg"],
    [/animation/i,"navigation/refresh-reroll.svg"],
    [/language/i,"navigation/info.svg"],
    [/world/i,"gameplay/world.svg"],
    [/fx/i,"gameplay/attack.svg"]
  ];

  let selectPicker = null;
  let activeGenericSelect = null;
  let previousBodyOverflow = "";
  let decorateQueued = false;

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;"
  }[ch]));

  function icon(path, className, alt=""){
    const el = document.createElement("img");
    el.src = SVG_ROOT + path;
    el.className = className;
    el.alt = alt;
    el.draggable = false;
    if(!alt) el.setAttribute("aria-hidden", "true");
    return el;
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
    const entries = Object.entries(abilityData());
    const exact = entries.find(([, value]) => String(value?.name || "").trim().toLocaleLowerCase() === clean);
    if(exact) return Number(exact[0]);
    const contained = entries.find(([, value]) => clean.includes(String(value?.name || "").trim().toLocaleLowerCase()));
    return contained ? Number(contained[0]) : null;
  }

  function stripLeadingGlyph(element){
    if(!element) return;
    const textNode = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
    if(textNode) textNode.nodeValue = textNode.nodeValue.replace(/^\s*[^\p{L}\p{N}]+\s*/u, "");
  }

  function prependInlineIcon(element, path, marker){
    if(!element || !path || element.dataset[marker]) return;
    element.dataset[marker] = "1";
    stripLeadingGlyph(element);
    element.prepend(icon(path, "dd-inline-icon"));
  }

  function isVisible(element){
    return !!element && !element.classList.contains("hidden");
  }

  function isEnglish(){
    const lang = document.documentElement.lang || "";
    if(/^en\b/i.test(lang)) return true;
    try{
      return String(saveData?.settings?.language || "").toLowerCase() === "en";
    }catch(_error){
      return false;
    }
  }

  function uiText(de, en){
    return isEnglish() ? en : de;
  }

  function isBossCombat(){
    if(!isVisible(document.getElementById("game"))) return false;
    try{
      const encounter = typeof currentEncounterObject === "function" ? currentEncounterObject() : null;
      if(encounter){
        if(typeof bossPhaseFor === "function" && bossPhaseFor(encounter)) return true;
        const label = `${encounter.title || ""} ${encounter.subtitle || ""} ${encounter.id || ""}`;
        if(/boss|finale|sovereign|warden|regent|overseer/i.test(label)) return true;
      }
    }catch(_error){
      // The normal local mode intentionally has no campaign encounter object.
    }
    return /boss|phase\s*ii/i.test(document.getElementById("encounterRuleBanner")?.textContent || "");
  }

  function detectScene(){
    if(isVisible(document.getElementById("masteryModal"))) return "mastery";
    if(isVisible(document.getElementById("game"))) return isBossCombat() ? "boss" : "combat";
    if(isVisible(document.getElementById("mainMenu"))) return "main";
    if(isVisible(document.getElementById("setup"))) return "setup";
    if(["campaignScreen","duoCampaignScreen","trioCampaignScreen"].some(id => isVisible(document.getElementById(id)))) return "campaign";
    if(["onlineScreen","accountScreen","profilesScreen","prestigeShopScreen"].some(id => isVisible(document.getElementById(id)))) return "lobby";
    return "light";
  }

  function applyScene(){
    const scene = detectScene();
    if(document.body.dataset.v28Scene !== scene) document.body.dataset.v28Scene = scene;
  }

  function decorateBadges(){
    document.querySelectorAll(".online-beta-badge").forEach(badge => {
      if(badge.dataset.ddBadgeReady) return;
      const label = badge.textContent.trim().toUpperCase();
      const path = label.includes("PREP") ? "badges/prep.svg" : "badges/beta.svg";
      badge.dataset.ddBadgeReady = "1";
      badge.textContent = "";
      badge.appendChild(icon(path, "dd-badge-icon", label));
    });
  }

  function decorateCampaignModeChoices(){
    const paths = {
      campaignModeSoloBtn:"gameplay/solo.svg",
      campaignModeDuoBtn:"gameplay/duo.svg",
      campaignModeTrioBtn:"gameplay/trio.svg"
    };
    Object.entries(paths).forEach(([id, path]) => {
      const button = document.getElementById(id);
      if(!button || button.dataset.ddChoiceReady) return;
      button.dataset.ddChoiceReady = "1";
      stripLeadingGlyph(button.querySelector("strong"));
      button.prepend(icon(path, "dd-choice-icon"));
    });
  }

  function decorateSecondAbilityCards(){
    document.querySelectorAll(".second-ability-card").forEach(card => {
      const id = Number(card.querySelector(".num")?.textContent);
      const path = ABILITY_ICON_PATHS[id];
      if(!path || card.querySelector(":scope > .dd-ability-icon")) return;
      card.prepend(icon(path, "dd-ability-icon", abilityData()[id]?.name || ""));
    });
  }

  function decorateAbilityReferenceList(){
    document.querySelectorAll(".ability-list-item").forEach(item => {
      const head = item.querySelector(".ability-list-head");
      const id = Number(item.querySelector(".ability-list-number")?.textContent);
      const path = ABILITY_ICON_PATHS[id];
      if(!head || !path || head.querySelector(".dd-ability-icon")) return;
      head.prepend(icon(path, "dd-ability-icon", abilityData()[id]?.name || ""));
    });
  }

  function decorateAbilityPicker(){
    document.querySelectorAll(".v28-ability-option").forEach(option => {
      const name = option.querySelector(".v28-name")?.textContent || "";
      const id = Number(name.match(/\b(\d{1,2})\s*·/)?.[1]);
      const holder = option.querySelector(".v28-icon");
      const path = ABILITY_ICON_PATHS[id];
      if(!holder || !path || holder.querySelector("img")) return;
      holder.textContent = "";
      holder.appendChild(icon(path, "dd-ability-picker-icon", abilityData()[id]?.name || ""));
    });
  }

  function decorateAbilityTriggers(){
    document.querySelectorAll(".v28-ability-trigger").forEach(trigger => {
      const select = trigger.previousElementSibling?.matches("select") ? trigger.previousElementSibling : null;
      const id = Number(select?.value);
      const path = ABILITY_ICON_PATHS[id];
      if(!select || !path) return;
      const option = select.options[select.selectedIndex];
      const name = abilityData()[id]?.name || option?.textContent || uiText("Fähigkeit wählen", "Choose ability");
      trigger.innerHTML = "";
      const row = document.createElement("span");
      row.append(icon(path, "dd-trigger-icon", name));
      const label = document.createElement("span");
      label.textContent = `${id} · ${name}`;
      row.append(label);
      trigger.append(row);
    });
  }

  function decoratePlayers(){
    const boss = isBossCombat();
    let livePlayers = [];
    try{
      livePlayers = typeof players !== "undefined" && Array.isArray(players) ? players : [];
    }catch(_error){
      livePlayers = [];
    }

    document.querySelectorAll("#players .player").forEach((card, index) => {
      card.classList.toggle("v28-boss-player", boss && livePlayers[index]?.campaignTeam === "enemy");
      card.dataset.ddPlayerReady = "1";

      prependInlineIcon(card.querySelector(".hp"), "gameplay/heart-hp.svg", "ddHpIcon");
      prependInlineIcon(card.querySelector(".bot-tag"), "gameplay/bot.svg", "ddBotIcon");
      prependInlineIcon(card.querySelector(".seat-tag"), "gameplay/seat-position.svg", "ddSeatIcon");
      prependInlineIcon(card.querySelector(".score-badge"), "gameplay/trophy.svg", "ddTrophyIcon");

      card.querySelectorAll(".ability-tag").forEach(tag => {
        const id = abilityIdFromText(tag.textContent);
        if(id && ABILITY_ICON_PATHS[id]) prependInlineIcon(tag, ABILITY_ICON_PATHS[id], "ddAbilityIcon");
      });
    });
  }

  function decorateAchievements(){
    document.querySelectorAll(".achievement-card").forEach(card => {
      const achieved = !!card.querySelector(".achievement-owner.done");
      card.classList.toggle("dd-achieved", achieved);
      const title = card.querySelector(".achievement-name");
      prependInlineIcon(title, achieved ? "gameplay/trophy.svg" : "gameplay/locked.svg", "ddAchievementIcon");
    });
  }

  function decorateCampaignDetails(){
    ["campaignEncounterDetail","duoCampaignEncounterDetail","trioCampaignEncounterDetail"].forEach(id => {
      const detail = document.getElementById(id);
      if(!detail) return;
      const hub = detail.closest(".campaign-hub");
      const node = hub?.querySelector(".campaign-node.current,.campaign-node.selected");
      const text = detail.textContent.toLowerCase();
      const boss = !!node?.classList.contains("boss") || /boss-phase|bossphase|boss phase|final boss|welt-boss|world boss/.test(text);
      const prestige = /trophy farm|prestige|farm trophy|trophäen/.test(text);
      detail.classList.toggle("v28-boss-detail", boss);
      detail.classList.toggle("v28-prestige-detail", prestige);

      const state = detail.querySelector(".node-detail-state");
      if(state && !state.dataset.ddStateIcon){
        const lower = state.textContent.toLowerCase();
        const path = /gesperrt|locked/.test(lower) ? "gameplay/locked.svg" : /geschafft|farm|completed/.test(lower) ? "gameplay/completed.svg" : "gameplay/encounter.svg";
        prependInlineIcon(state, path, "ddStateIcon");
      }
    });
  }

  function decorateGameMenu(){
    prependInlineIcon(document.getElementById("gameMenuBtn"), "navigation/menu-hamburger.svg", "ddMenuIcon");
  }

  function genericSelectIcon(select){
    if(/ability/i.test(select.id || "") && ABILITY_ICON_PATHS[Number(select.value)]) return ABILITY_ICON_PATHS[Number(select.value)];
    const match = SELECT_ICON_PATHS.find(([pattern]) => pattern.test(select.id || select.className || ""));
    return match?.[1] || "navigation/chevron-down.svg";
  }

  function isLegacyAbilitySelect(select){
    return !!select?.dataset.v28Enhanced || /^(abilityChoice\d+|nextAbilityChoice\d+(?:_\d+)?)$/.test(select?.id || "");
  }

  function genericSelectLabel(select){
    const escapedId = select.id
      ? (window.CSS?.escape ? window.CSS.escape(select.id) : select.id.replace(/["\\]/g, "\\$&"))
      : "";
    const explicit = escapedId ? document.querySelector(`label[for="${escapedId}"]`) : null;
    const label = explicit || select.closest("label");
    if(label){
      const directText = [...label.childNodes]
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.nodeValue.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/[:：]\s*$/, "")
        .trim();
      if(directText) return directText;
    }
    return select.getAttribute("aria-label") || uiText("Auswahl", "Choose");
  }

  function syncGenericSelect(select){
    const trigger = select.__ddSelectTrigger;
    if(!trigger) return;
    const option = select.options[select.selectedIndex];
    const text = option?.textContent?.trim() || uiText("Auswählen", "Choose");
    const path = genericSelectIcon(select);
    trigger.innerHTML = "";
    if(path) trigger.append(icon(path, "dd-trigger-icon"));
    const label = document.createElement("span");
    label.textContent = text;
    trigger.append(label);
    trigger.disabled = !!select.disabled;
    trigger.classList.toggle("hidden", select.classList.contains("hidden"));
  }

  function closeGenericPicker(){
    if(!selectPicker) return;
    const trigger = activeGenericSelect?.__ddSelectTrigger;
    selectPicker.classList.add("hidden");
    selectPicker.setAttribute("aria-hidden", "true");
    trigger?.setAttribute("aria-expanded", "false");
    activeGenericSelect = null;
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.classList.remove("wd-picker-open");
    trigger?.focus({preventScroll:true});
  }

  function ensureGenericPicker(){
    if(selectPicker) return selectPicker;
    selectPicker = document.createElement("div");
    selectPicker.className = "dd-select-picker hidden";
    selectPicker.setAttribute("aria-hidden", "true");
    selectPicker.innerHTML = `
      <div class="dd-select-panel" role="dialog" aria-modal="true">
        <div class="dd-select-head">
          <div class="dd-select-title"></div>
          <button type="button" class="dd-select-close">${escapeHtml(uiText("Schließen", "Close"))}</button>
        </div>
        <div class="dd-select-options"></div>
      </div>`;
    document.body.appendChild(selectPicker);
    selectPicker.querySelector(".dd-select-close").addEventListener("click", closeGenericPicker);
    selectPicker.addEventListener("click", event => {
      if(event.target === selectPicker) closeGenericPicker();
    });
    return selectPicker;
  }

  function optionIconPath(select, option){
    if(/ability/i.test(select.id || "") && ABILITY_ICON_PATHS[Number(option.value)]) return ABILITY_ICON_PATHS[Number(option.value)];
    return genericSelectIcon(select);
  }

  function openGenericPicker(select){
    syncGenericSelect(select);
    if(select.disabled || select.classList.contains("hidden")) return;
    activeGenericSelect = select;
    const picker = ensureGenericPicker();
    picker.querySelector(".dd-select-title").textContent = genericSelectLabel(select);
    const options = picker.querySelector(".dd-select-options");
    options.textContent = "";

    [...select.options].forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dd-select-option" + (String(select.value) === String(option.value) ? " selected" : "");
      button.disabled = !!option.disabled;
      const path = optionIconPath(select, option);
      if(path) button.append(icon(path, "dd-option-icon"));
      const text = document.createElement("span");
      text.textContent = option.textContent;
      button.append(text);
      const check = document.createElement("span");
      check.className = "dd-option-check";
      check.textContent = "✓";
      button.append(check);
      button.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("input", {bubbles:true}));
        select.dispatchEvent(new Event("change", {bubbles:true}));
        syncGenericSelect(select);
        closeGenericPicker();
      });
      options.append(button);
    });

    picker.classList.remove("hidden");
    picker.setAttribute("aria-hidden", "false");
    select.__ddSelectTrigger?.setAttribute("aria-expanded", "true");
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("wd-picker-open");
    requestAnimationFrame(() => {
      const panel = picker.querySelector(".dd-select-panel");
      const head = picker.querySelector(".dd-select-head");
      const max = Math.min(Math.round(window.innerHeight * 0.78), 720);
      if(panel){
        panel.style.maxHeight = max + "px";
        panel.style.overflow = "hidden";
      }
      const headH = head ? head.getBoundingClientRect().height : 40;
      const room = Math.max(140, max - headH - 78);
      options.style.maxHeight = room + "px";
      options.style.overflowY = "auto";
      options.style.overflowX = "hidden";
      options.style.webkitOverflowScrolling = "touch";
      const selected = options.querySelector(".selected") || options.querySelector("button:not(:disabled)");
      if(selected){
        const top = selected.offsetTop - (options.clientHeight / 2) + (selected.offsetHeight / 2);
        options.scrollTop = Math.max(0, top);
        selected.focus({preventScroll:true});
      }
    });
  }

  function enhanceGenericSelect(select){
    if(!select || select.tagName !== "SELECT" || select.dataset.ddSelectEnhanced || isLegacyAbilitySelect(select)) return;
    if(select.closest("#testLabAbilityModal, #abilityMasteryLabModal")) return;
    select.dataset.ddSelectEnhanced = "1";
    select.classList.add("dd-native-select");
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "dd-select-trigger";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openGenericPicker(select);
    });
    select.insertAdjacentElement("afterend", trigger);
    select.__ddSelectTrigger = trigger;
    select.addEventListener("change", () => syncGenericSelect(select));

    const wrapperLabel = select.closest("label");
    const escapedId = select.id
      ? (window.CSS?.escape ? window.CSS.escape(select.id) : select.id.replace(/["\\]/g, "\\$&"))
      : "";
    const explicitLabel = escapedId ? document.querySelector(`label[for="${escapedId}"]`) : null;
    [...new Set([wrapperLabel, explicitLabel].filter(Boolean))].forEach(label => {
      label.addEventListener("click", event => {
        if(event.target.closest(".dd-select-trigger")) return;
        event.preventDefault();
        openGenericPicker(select);
      });
    });

    const observer = new MutationObserver(() => syncGenericSelect(select));
    observer.observe(select, {childList:true, subtree:true, attributes:true, attributeFilter:["class","disabled"]});
    select.__ddSelectObserver = observer;
    syncGenericSelect(select);
  }

  function scanGenericSelects(root=document){
    if(root.nodeType === 1 && root.matches?.("select")) enhanceGenericSelect(root);
    root.querySelectorAll?.("select").forEach(enhanceGenericSelect);
  }

  function decorateAll(){
    decorateQueued = false;
    decorateBadges();
    decorateCampaignModeChoices();
    decorateSecondAbilityCards();
    decorateAbilityReferenceList();
    decorateAbilityPicker();
    decorateAbilityTriggers();
    decoratePlayers();
    decorateAchievements();
    decorateCampaignDetails();
    decorateGameMenu();
    scanGenericSelects(document);
    applyScene();
  }

  function scheduleDecorate(){
    if(decorateQueued) return;
    decorateQueued = true;
    const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout;
    schedule(decorateAll);
  }

  function observeDynamicUi(){
    const contentRoots = [
      "setup","nameInputs","campaignScreen","duoCampaignScreen","trioCampaignScreen",
      "profilesScreen","achievementsScreen","statsScreen","settingsScreen","prestigeShopScreen",
      "onlineScreen","accountScreen","masteryModal","nextRoundBox","secondAbilityOptions","players"
    ];
    contentRoots.forEach(id => {
      const root = document.getElementById(id);
      if(!root) return;
      const observer = new MutationObserver(records => {
        records.forEach(record => record.addedNodes.forEach(node => {
          if(node.nodeType === 1) scanGenericSelects(node);
        }));
        scheduleDecorate();
      });
      observer.observe(root, {childList:true, subtree:true});
    });

    const sceneIds = [
      "mainMenu","setup","game","masteryModal","campaignScreen","duoCampaignScreen","trioCampaignScreen",
      "onlineScreen","accountScreen","profilesScreen","prestigeShopScreen","achievementsScreen","statsScreen",
      "settingsScreen","rulesScreen","abilitiesScreen","changelogScreen"
    ];
    const sceneObserver = new MutationObserver(scheduleDecorate);
    sceneIds.forEach(id => {
      const element = document.getElementById(id);
      if(element) sceneObserver.observe(element, {attributes:true, attributeFilter:["class"]});
    });
    const banner = document.getElementById("encounterRuleBanner");
    if(banner) sceneObserver.observe(banner, {attributes:true, attributeFilter:["class"], childList:true, subtree:true});
  }

  function setupEventHooks(){
    document.addEventListener("click", event => {
      if(event.target.closest(".v28-ability-trigger")) setTimeout(scheduleDecorate, 0);
      if(event.target.closest("#rollAbilities")) setTimeout(scheduleDecorate, 0);
    });
    document.addEventListener("change", event => {
      if(event.target.matches("select")) setTimeout(scheduleDecorate, 0);
    });
    document.addEventListener("keydown", event => {
      if(event.key === "Escape" && activeGenericSelect) closeGenericPicker();
    });
  }

  function init(){
    document.documentElement.dataset.v28Rework = "2";
    scanGenericSelects(document);
    observeDynamicUi();
    setupEventHooks();
    decorateAll();
    console.info(`[DiceDuel] Full Bright Arcane UI rework ${VERSION} active.`);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
