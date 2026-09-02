(() => {
  "use strict";

  const VERSION = "28.2.5";
  const SVG_ROOT = "assets/ui/v28/svg/";
  const EMOJI_RE = /(?:\p{Extended_Pictographic}|\uFE0E|\uFE0F|\u200D)/gu;
  const MASTERY_ROOT_IDS = ["masteryModal", "abilityMasteryLabModal"];
  const MASTERY_BUTTON_IDS = ["campaignMasteryBtn", "duoCampaignMasteryBtn", "trioCampaignMasteryBtn"];
  const MASTERY_XP_IDS = ["campaignMasteryXpSummary", "duoCampaignMasteryXpSummary", "trioCampaignMasteryXpSummary"];
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

  function stripEmojiString(value){
    return String(value || "")
      .replace(EMOJI_RE, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/^[ \t]+|[ \t]+$/g, "");
  }

  function cleanTextNodes(root){
    if(!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const parent = node.parentElement;
      if(!parent || /^(?:SCRIPT|STYLE)$/u.test(parent.tagName)) return;
      const original = node.nodeValue;
      const withoutEmoji = original.replace(EMOJI_RE, "");
      if(withoutEmoji === original) return;
      const clean = withoutEmoji.replace(/[ \t]{2,}/g, " ");
      node.nodeValue = clean;
    });
  }

  function ensureIcon(element, path, className, position="prepend"){
    if(!element) return null;
    // cleanTextNodes() raeumt Emoji nur aus Textknoten. Hat
    // js/36-emoji-sprite-pass.js das fuehrende Emoji vorher schon in ein
    // <img class="dd-emoji-sprite"> verwandelt, bleibt es sonst neben dem
    // Icon stehen, das hier gleich gesetzt wird. Nur die fuehrende Position
    // wird geraeumt - Sprites mitten im Text sind gewollt.
    if(position === "prepend"){
      for(const node of [...element.childNodes]){
        if(node.nodeType === Node.TEXT_NODE){
          if(!node.nodeValue.trim()) continue;
          break;
        }
        if(node.nodeType === Node.ELEMENT_NODE && node.classList?.contains("dd-emoji-sprite")) node.remove();
      }
    }
    let image = element.querySelector(`:scope > .${className}`);
    if(!image){
      image = icon(path, className);
      element[position](image);
    }else{
      const wanted = asset(path);
      if(image.getAttribute("src") !== wanted) image.setAttribute("src", wanted);
    }
    return image;
  }

  function wrapQuitLabel(){
    const button = document.getElementById("quitConfirmBtn");
    if(!button || button.querySelector(":scope > .p5-button-label")) return;
    const label = stripEmojiString(button.textContent) || "Spiel verlassen";
    button.textContent = "";
    const span = document.createElement("span");
    span.className = "p5-button-label";
    span.textContent = label;
    button.append(span);
  }

  function decorateMasteryBranches(){
    const paths = {
      hpLevel:"gameplay/heart-hp.svg",
      damageLevel:"gameplay/damage-sword.svg",
      abilityLevel:"gameplay/mastery.svg"
    };
    document.querySelectorAll("#masteryContent .mastery-branch").forEach(branch => {
      const key = Object.keys(paths).find(name => branch.classList.contains(`branch-${name}`));
      const host = branch.querySelector(":scope > .mastery-branch-head .mastery-branch-icon");
      if(!host || !key) return;
      if(!host.querySelector(":scope > .p5-mastery-branch-sprite")){
        host.textContent = "";
        host.append(icon(paths[key], "p5-mastery-branch-sprite"));
      }
    });
  }

  function decorateMasteryModal(){
    const modal = document.getElementById("masteryModal");
    if(!modal) return;
    cleanTextNodes(modal);

    const title = modal.querySelector(".screen-topbar .screen-title");
    ensureIcon(title, "gameplay/mastery.svg", "p5-mastery-title-icon");

    const firstXp = modal.querySelector(".mastery-xp-line>span:first-child");
    ensureIcon(firstXp, "gameplay/xp-star.svg", "p5-mastery-xp-icon");

    const sheetTitle = modal.querySelector(".mastery-ability-sheet-head h3");
    ensureIcon(sheetTitle, "gameplay/mastery.svg", "p5-mastery-sheet-icon");

    decorateMasteryBranches();
    modal.querySelectorAll(".mastery-fusion-placeholder").forEach(button => {
      ensureIcon(button, "gameplay/locked.svg", "p5-mastery-lock-icon");
    });
  }

  function decorateMasteryLab(){
    const modal = document.getElementById("abilityMasteryLabModal");
    if(!modal) return;
    cleanTextNodes(modal);
    const title = modal.querySelector(".ability-mastery-lab-title");
    ensureIcon(title, "gameplay/mastery.svg", "p5-mastery-title-icon");
  }

  function decorateCampaignMasteryControls(){
    MASTERY_BUTTON_IDS.forEach(id => {
      const button = document.getElementById(id);
      if(!button) return;
      cleanTextNodes(button);
      ensureIcon(button, "gameplay/mastery.svg", "p5-mastery-button-icon");
    });

    MASTERY_XP_IDS.forEach(id => {
      const summary = document.getElementById(id);
      if(!summary) return;
      cleanTextNodes(summary);
      ensureIcon(summary, "gameplay/xp-star.svg", "p5-mastery-xp-icon");
    });
  }

  function directTextNode(element){
    return [...(element?.childNodes || [])].find(node =>
      node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()
    ) || null;
  }

  function decoratePrestigeSummary(){
    const value = document.getElementById("campaignTrophySummary");
    if(!value) return;

    const number = String(value.textContent || "").match(/\d+/u)?.[0] || value.dataset.p5PrestigeCount || "0";
    const card = value.closest(".menu-info-card");
    const label = card?.querySelector(".campaign-label");
    if(card) card.classList.add("p5-prestige-card");
    if(label){
      const text = directTextNode(label);
      if(text){
        if(text.nodeValue !== "PRESTIGE") text.nodeValue = "PRESTIGE";
      }else{
        label.append(document.createTextNode("PRESTIGE"));
      }
    }

    if(value.dataset.p5PrestigeCount === number && value.querySelector(":scope > .p5-prestige-trophy")) return;
    value.textContent = "";
    value.classList.add("p5-prestige-value");
    value.dataset.p5PrestigeCount = number;
    const count = document.createElement("span");
    count.className = "p5-prestige-count";
    count.textContent = number;
    value.append(icon("gameplay/trophy.svg", "p5-prestige-trophy"), count);
  }

  function decorate(){
    decorateQueued = false;
    wrapQuitLabel();
    decorateMasteryModal();
    decorateMasteryLab();
    decorateCampaignMasteryControls();
    decoratePrestigeSummary();
  }

  function scheduleDecorate(){
    if(decorateQueued) return;
    decorateQueued = true;
    const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout;
    schedule(decorate);
  }

  function observe(){
    const ids = [
      "quitModal", "campaignScreen", "duoCampaignScreen", "trioCampaignScreen",
      ...MASTERY_ROOT_IDS
    ];
    ids.forEach(id => {
      const root = document.getElementById(id);
      if(!root) return;
      const observer = new MutationObserver(scheduleDecorate);
      observer.observe(root, {childList:true, subtree:true, characterData:true});
    });
  }

  function init(){
    document.documentElement.dataset.v28Phase5 = "1";
    document.addEventListener("change", scheduleDecorate, true);
    document.addEventListener("click", () => setTimeout(scheduleDecorate, 0), true);
    observe();
    decorate();
    console.info(`[DiceDuel] UI Rework Phase 5 ${VERSION} active.`);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
