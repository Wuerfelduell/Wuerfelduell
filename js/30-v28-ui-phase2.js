(() => {
  "use strict";

  const VERSION = "28.2.2";
  const DICE_ICON = `assets/ui/v28/svg/gameplay/dice.svg?v=${VERSION}`;
  const SUMMARY_IDS = ["campaignTrophySummary", "duoUnlockSummary", "trioTrophySummary"];
  let activeSelectId = "";
  let decorateQueued = false;

  function isGerman(){
    const selected = document.getElementById("languageSetting")?.value;
    return selected ? selected === "de" : !/^en\b/i.test(document.documentElement.lang || "de");
  }

  function optionTextSpan(button){
    return [...button.children].find(child =>
      child.tagName === "SPAN" && !child.classList.contains("dd-option-check")
    ) || null;
  }

  function decoratePlayerCountPicker(){
    const picker = document.querySelector(".dd-select-picker:not(.hidden)");
    if(!picker) return;
    picker.classList.toggle("p2-player-count-picker", activeSelectId === "playerCount");
    if(activeSelectId !== "playerCount") return;

    const title = picker.querySelector(".dd-select-title");
    if(title) title.textContent = isGerman() ? "Spieler" : "Players";

    picker.querySelectorAll(".dd-select-option").forEach(button => {
      const span = optionTextSpan(button);
      const number = String(span?.textContent || "").match(/^\s*(\d+)/)?.[1];
      if(!span || !number) return;
      const wanted = `${number} ${isGerman() ? "Spieler" : "Players"}`;
      if(span.textContent !== wanted) span.textContent = wanted;
    });
  }

  function stripSummaryDecoration(){
    SUMMARY_IDS.forEach(id => {
      const element = document.getElementById(id);
      if(!element) return;
      const clean = element.textContent.replace(/^\s*(?:🏆|🔒|✅)\s*/u, "");
      if(clean !== element.textContent) element.textContent = clean;
    });
  }

  function stripLeadingDiceEmoji(element){
    // js/36-emoji-sprite-pass.js bildet 🎲 auf gameplay/dice.svg ab. Ist das
    // schon passiert, steckt der Wuerfel nicht mehr im Textknoten und stuende
    // sonst doppelt neben dem Icon, das hier gleich gesetzt wird.
    for(const node of [...element.childNodes]){
      if(node.nodeType === Node.TEXT_NODE){
        if(!node.nodeValue.trim()) continue;
        break;
      }
      if(node.nodeType === Node.ELEMENT_NODE && node.classList?.contains("dd-emoji-sprite")) node.remove();
    }
    const textNode = [...element.childNodes].find(node =>
      node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()
    );
    if(textNode) textNode.nodeValue = textNode.nodeValue.replace(/^\s*🎲\s*/u, "");
  }

  function ensureSetupIcon(element){
    if(!element || element.querySelector(":scope > .p2-setup-inline-icon")) return;
    stripLeadingDiceEmoji(element);
    const image = document.createElement("img");
    image.className = "p2-setup-inline-icon";
    image.src = DICE_ICON;
    image.alt = "";
    image.draggable = false;
    image.setAttribute("aria-hidden", "true");
    element.prepend(image);
  }

  function decorateSetup(){
    document.querySelectorAll("#setup .setup-dice-readonly, #setup .ability-roll").forEach(ensureSetupIcon);
  }

  function decorate(){
    decorateQueued = false;
    decoratePlayerCountPicker();
    stripSummaryDecoration();
    decorateSetup();
  }

  function scheduleDecorate(){
    if(decorateQueued) return;
    decorateQueued = true;
    const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout;
    schedule(decorate);
  }

  function captureActiveSelect(event){
    const trigger = event.target.closest?.(".dd-select-trigger");
    if(!trigger) return;
    const select = trigger.previousElementSibling;
    activeSelectId = select?.tagName === "SELECT" ? select.id : "";
    setTimeout(scheduleDecorate, 0);
  }

  function init(){
    document.documentElement.dataset.v28Phase2 = "1";
    document.addEventListener("click", captureActiveSelect, true);
    document.addEventListener("change", scheduleDecorate, true);

    const observer = new MutationObserver(scheduleDecorate);
    observer.observe(document.body, {childList:true, subtree:true});
    decorate();
    console.info(`[DiceDuel] UI Rework Phase 2 ${VERSION} active.`);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
