(() => {
  "use strict";

  const VERSION = "28.2.6";
  const COMPONENT_ROOT = "assets/ui/v28/png/components/";
  let decorateQueued = false;

  function component(path){
    return `${COMPONENT_ROOT}${path}?v=${VERSION}`;
  }

  function image(path, className, alt=""){
    const element = document.createElement("img");
    element.src = component(path);
    element.className = className;
    element.alt = alt;
    element.draggable = false;
    if(!alt) element.setAttribute("aria-hidden", "true");
    return element;
  }

  function encounterList(type){
    try{
      if(type === "solo" && typeof CAMPAIGN_ENCOUNTERS !== "undefined") return CAMPAIGN_ENCOUNTERS;
      if(type === "duo" && typeof DUO_CAMPAIGN_ENCOUNTERS !== "undefined") return DUO_CAMPAIGN_ENCOUNTERS;
      if(type === "trio" && typeof TRIO_CAMPAIGN_ENCOUNTERS !== "undefined") return TRIO_CAMPAIGN_ENCOUNTERS;
    }catch(_error){
      return [];
    }
    return [];
  }

  function encounterContextForNode(node){
    let type = "";
    let id = "";
    if(node.hasAttribute("data-campaign-id")){
      type = "solo";
      id = node.dataset.campaignId;
    }else if(node.hasAttribute("data-duo-campaign-id")){
      type = "duo";
      id = node.dataset.duoCampaignId;
    }else if(node.hasAttribute("data-trio-campaign-id")){
      type = "trio";
      id = node.dataset.trioCampaignId;
    }
    const encounter = encounterList(type).find(entry => String(entry?.id) === String(id)) || null;
    return {type, encounter};
  }

  function isFarmEncounter(type, encounter){
    if(!encounter) return false;
    if(encounter.farmTrophy) return true;
    if(type !== "duo") return false;
    try{
      return typeof DUO_CAMPAIGN_WORLDS !== "undefined"
        && DUO_CAMPAIGN_WORLDS.some(world => String(world?.finalEncounterId) === String(encounter.id));
    }catch(_error){
      return false;
    }
  }

  function decorateCompletedMark(node){
    if(!node.classList.contains("done")) return;
    const mark = node.querySelector(":scope > .node-mark");
    if(!mark || mark.dataset.p6Completed === "1") return;
    mark.replaceChildren(image("completed-check-medallion.webp", "p6-completed-medallion"));
    mark.dataset.p4Decorated = "1";
    mark.dataset.p6Completed = "1";
  }

  function decorateXpBadge(node){
    const badge = node.querySelector(":scope > .node-xp-badge");
    if(!badge || badge.dataset.p6Decorated === "1") return;
    const amount = String(badge.textContent || "")
      .replace(/^\s*(?:⭐|XP)\s*/u, "")
      .trim() || "+0";
    badge.replaceChildren(
      image("xp-badge.webp", "p6-xp-badge-art"),
      document.createTextNode(amount)
    );
    badge.dataset.p4Decorated = "1";
    badge.dataset.p6Decorated = "1";
  }

  function decorateCampaignNodes(){
    document.querySelectorAll(".campaign-hub .campaign-node").forEach(node => {
      const {type, encounter} = encounterContextForNode(node);
      const farm = isFarmEncounter(type, encounter);
      node.classList.toggle("p6-farm-node", farm);

      let label = node.querySelector(":scope > .p6-farm-label");
      if(farm && !label){
        label = document.createElement("span");
        label.className = "p6-farm-label";
        label.textContent = "FARM";
        label.setAttribute("aria-hidden", "true");
        node.append(label);
      }else if(!farm && label){
        label.remove();
      }

      decorateCompletedMark(node);
      decorateXpBadge(node);
    });
  }

  function decorateCombatHp(){
    document.querySelectorAll("#players .player .hp").forEach(host => {
      let medallion = host.querySelector(":scope > .p6-hp-medallion");
      if(!medallion){
        const previous = host.querySelector(":scope > .dd-inline-icon");
        medallion = image("hp-heart-medallion.webp", "dd-inline-icon p6-hp-medallion");
        if(previous) previous.replaceWith(medallion);
        else host.prepend(medallion);
      }else{
        const wanted = component("hp-heart-medallion.webp");
        if(medallion.getAttribute("src") !== wanted) medallion.setAttribute("src", wanted);
      }
      host.dataset.ddHpIcon = "1";
    });
  }

  function decorateVitalityBranch(){
    const host = document.querySelector("#masteryContent .branch-hpLevel .mastery-branch-icon");
    if(!host || host.querySelector(":scope > .p6-hp-branch-medallion")) return;
    host.replaceChildren(
      image(
        "hp-heart-medallion.webp",
        "p5-mastery-branch-sprite p6-hp-branch-medallion"
      )
    );
  }

  function decorate(){
    decorateQueued = false;
    decorateCampaignNodes();
    decorateCombatHp();
    decorateVitalityBranch();
  }

  function scheduleDecorate(){
    if(decorateQueued) return;
    decorateQueued = true;
    const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout;
    schedule(decorate);
  }

  function observe(){
    [
      "campaignPath", "duoCampaignPath", "trioCampaignPath",
      "players", "masteryContent"
    ].forEach(id => {
      const root = document.getElementById(id);
      if(!root) return;
      const observer = new MutationObserver(scheduleDecorate);
      observer.observe(root, {childList:true, subtree:true, characterData:true});
    });
  }

  function init(){
    document.documentElement.dataset.v28Phase6 = "1";
    document.addEventListener("change", scheduleDecorate, true);
    document.addEventListener("click", () => setTimeout(scheduleDecorate, 0), true);
    observe();
    decorate();
    console.info(`[DiceDuel] UI Rework Phase 6 ${VERSION} active.`);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
