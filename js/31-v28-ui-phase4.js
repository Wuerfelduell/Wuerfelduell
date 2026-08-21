(() => {
  "use strict";

  const VERSION = "28.2.4";
  const SVG_ROOT = "assets/ui/v28/svg/";
  const DETAIL_MAPS = [
    ["campaignPath", "campaignEncounterDetail"],
    ["duoCampaignPath", "duoCampaignEncounterDetail"],
    ["trioCampaignPath", "trioCampaignEncounterDetail"]
  ];
  const SETUP_EMOJI = /^\s*(?:🎮|👤|🤖|💺|🎲|✨|⚡|⚔️?|🗡️?)\s*/u;
  let decorateQueued = false;

  function asset(path){
    return `${SVG_ROOT}${path}?v=${VERSION}`;
  }

  function icon(path, className, alt=""){
    const image = document.createElement("img");
    image.src = asset(path);
    image.className = className;
    image.alt = alt;
    image.draggable = false;
    if(!alt) image.setAttribute("aria-hidden", "true");
    return image;
  }

  function directTextNode(element){
    return [...(element?.childNodes || [])].find(node =>
      node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()
    ) || null;
  }

  function stripSetupEmoji(value){
    return String(value || "").replace(SETUP_EMOJI, "").trimStart();
  }

  function ensureLeadingIcon(element, path, className){
    if(!element) return null;
    const node = directTextNode(element);
    if(node){
      const clean = stripSetupEmoji(node.nodeValue);
      if(clean !== node.nodeValue) node.nodeValue = clean;
    }
    let image = element.querySelector(`:scope > .${className}`);
    if(!image){
      image = icon(path, className);
      element.prepend(image);
    }else if(image.getAttribute("src") !== asset(path)){
      image.setAttribute("src", asset(path));
    }
    return image;
  }

  function cleanSelectText(select){
    if(!select) return;
    [...select.options].forEach(option => {
      const clean = stripSetupEmoji(option.textContent);
      if(clean !== option.textContent) option.textContent = clean;
    });
    const label = select.__ddSelectTrigger?.querySelector(":scope > span");
    if(label){
      const clean = stripSetupEmoji(label.textContent);
      if(clean !== label.textContent) label.textContent = clean;
    }
  }

  function decorateSetup(){
    const makeNames = document.getElementById("makeNames");
    if(makeNames){
      makeNames.hidden = true;
      makeNames.setAttribute("aria-hidden", "true");
      makeNames.tabIndex = -1;
    }

    const localLabel = document.querySelector("#setup .local-mode-card>label");
    ensureLeadingIcon(localLabel, "gameplay/dice.svg", "p4-setup-label-icon");

    document.querySelectorAll(
      "#setup select, #profilesScreen .profile-dice-edit, #profilesScreen .profile-fx-edit"
    ).forEach(cleanSelectText);

    const setupActions = [
      ["setupProfilesBtn", "gameplay/player.svg"],
      ["rollAbilities", "gameplay/dice.svg"],
      ["startGame", "gameplay/attack.svg"]
    ];
    setupActions.forEach(([id, path]) => {
      const button = document.getElementById(id);
      if(!button || button.querySelector(":scope > .p1-action-icon")) return;
      ensureLeadingIcon(button, path, "p4-action-icon");
    });
  }

  function decorateRules(){
    const button = document.getElementById("allAbilitiesBtn");
    if(button && !button.querySelector(":scope > .p4-action-icon")){
      ensureLeadingIcon(button, "gameplay/mastery.svg", "p4-action-icon");
    }
  }

  function decoratePrestigeShop(){
    const wallet = document.getElementById("prestigeShopTrophies");
    if(wallet && !wallet.querySelector(":scope > .p4-inline-icon")){
      const node = directTextNode(wallet);
      if(node) node.nodeValue = node.nodeValue.replace(/^\s*🏆\s*/u, "");
      wallet.prepend(icon("gameplay/trophy.svg", "p4-inline-icon"));
    }

    document.querySelectorAll("#prestigeShopScreen .prestige-item").forEach(item => {
      const kicker = item.querySelector(".prestige-item-kicker");
      if(kicker && !kicker.dataset.p4Decorated){
        const raw = kicker.textContent.trim();
        const match = raw.match(/^(.*?)\s*·\s*🏆?\s*(\d+)\s*$/u);
        if(match){
          kicker.textContent = "";
          const type = document.createElement("span");
          type.textContent = match[1].trim();
          const cost = document.createElement("span");
          cost.textContent = match[2];
          kicker.append(type, document.createTextNode(" · "), icon("gameplay/trophy.svg", "p4-inline-icon"), cost);
        }
        kicker.dataset.p4Decorated = "1";
      }

      const button = item.querySelector(":scope > button");
      if(!button || button.querySelector(":scope > .p4-inline-icon")) return;
      const raw = button.textContent.trim();
      const active = /^✓/u.test(raw);
      button.textContent = raw.replace(/^\s*(?:🏆|✓)\s*/u, "");
      const path = active
        ? "gameplay/completed.svg"
        : button.matches("[data-shop-equip]")
          ? "gameplay/prestige.svg"
          : "gameplay/trophy.svg";
      button.prepend(icon(path, "p4-inline-icon"));
    });
  }

  function markIconPath(mark){
    const text = String(mark || "");
    if(text.includes("🏆")) return "gameplay/trophy.svg";
    if(text.includes("✓")) return "gameplay/completed.svg";
    if(text.includes("🔒")) return "gameplay/locked.svg";
    return "gameplay/encounter.svg";
  }

  function decorateCampaignNodes(){
    document.querySelectorAll(".campaign-hub .campaign-node").forEach(node => {
      const mark = node.querySelector(":scope > .node-mark");
      if(mark && !mark.dataset.p4Decorated){
        const raw = mark.textContent;
        mark.textContent = "";
        mark.append(icon(markIconPath(raw), "p4-node-mark-icon"));
        mark.dataset.p4Decorated = "1";
      }

      const xp = node.querySelector(":scope > .node-xp-badge");
      if(xp && !xp.dataset.p4Decorated){
        const text = xp.textContent.replace(/^\s*⭐\s*/u, "").trim();
        xp.textContent = text;
        xp.prepend(icon("gameplay/xp-star.svg", "p4-node-xp-icon"));
        xp.dataset.p4Decorated = "1";
      }
    });
  }

  function setDetailTone(map, detail, node){
    if(!map || !detail || !node) return;
    const tone = node.classList.contains("boss") || node.classList.contains("world-boss")
      ? "boss"
      : "standard";
    if(detail.dataset.p4DetailTone !== tone) detail.dataset.p4DetailTone = tone;
  }

  function syncDetailTones(){
    DETAIL_MAPS.forEach(([mapId, detailId]) => {
      const map = document.getElementById(mapId);
      const detail = document.getElementById(detailId);
      if(!map || !detail) return;
      const node = map.querySelector(".campaign-node.current, .campaign-node.selected");
      if(node) setDetailTone(map, detail, node);
    });
  }

  function toneFromEvent(event){
    const node = event.target.closest?.(".campaign-hub .campaign-node");
    if(!node) return;
    const pair = DETAIL_MAPS.find(([mapId]) => node.closest(`#${mapId}`));
    if(!pair) return;
    setDetailTone(document.getElementById(pair[0]), document.getElementById(pair[1]), node);
  }

  function decorate(){
    decorateQueued = false;
    decorateSetup();
    decorateRules();
    decoratePrestigeShop();
    decorateCampaignNodes();
    syncDetailTones();
  }

  function scheduleDecorate(){
    if(decorateQueued) return;
    decorateQueued = true;
    const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout;
    schedule(decorate);
  }

  function observe(){
    const ids = [
      "setup", "nameInputs", "profilesScreen", "rulesScreen", "prestigeShopScreen",
      "campaignPath", "duoCampaignPath", "trioCampaignPath",
      "campaignEncounterDetail", "duoCampaignEncounterDetail", "trioCampaignEncounterDetail"
    ];
    ids.forEach(id => {
      const root = document.getElementById(id);
      if(!root) return;
      const observer = new MutationObserver(scheduleDecorate);
      observer.observe(root, {childList:true, subtree:true, characterData:true});
    });
  }

  function init(){
    document.documentElement.dataset.v28Phase4 = "1";
    document.addEventListener("pointerdown", toneFromEvent, true);
    document.addEventListener("click", toneFromEvent, true);
    document.addEventListener("change", scheduleDecorate, true);
    observe();
    decorate();
    console.info(`[DiceDuel] UI Rework Phase 4 ${VERSION} active.`);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
