(() => {
  "use strict";

  const VERSION = "28.2.8";
  const COMPONENT_ROOT = "assets/ui/v28/png/components/";
  const FX_ROOT = "assets/ui/v28/png/fx/";
  const LOCK_TEXT = /(?:\u{1F512}|\u{1F510})\uFE0F?/gu;
  const LOCK_TEXT_TEST = /(?:\u{1F512}|\u{1F510})/u;
  const CLOSE_SELECTOR = [
    ".ability-mastery-lab-topbar>button",
    ".mastery-locked-card>button",
    ".dd-select-close",
    ".aml-info-close"
  ].join(",");
  let decorateQueued = false;
  const queuedRoots = new Set();

  function component(path){
    return `${COMPONENT_ROOT}${path}?v=${VERSION}`;
  }

  function effect(path){
    return `${FX_ROOT}${path}?v=${VERSION}`;
  }

  function image(src, className){
    const element = document.createElement("img");
    element.src = src;
    element.className = className;
    element.alt = "";
    element.draggable = false;
    element.setAttribute("aria-hidden", "true");
    return element;
  }

  function baseElement(root){
    if(root instanceof Element) return root;
    return root?.parentElement || document.body;
  }

  function around(root, selector){
    const base = baseElement(root);
    if(!base) return [];
    const matches = new Set();
    if(base.matches?.(selector)) matches.add(base);
    base.querySelectorAll?.(selector).forEach(element => matches.add(element));
    const ancestor = base.closest?.(selector);
    if(ancestor) matches.add(ancestor);
    return [...matches];
  }

  function directAsset(host, kind){
    return [...(host?.children || [])].find(element =>
      element.matches?.(`img.p8-lock-overlay[data-p8-lock="${kind}"]`)
    ) || null;
  }

  function syncInlineLock(host, locked, kind, className){
    if(!host) return;
    let overlay = directAsset(host, kind);
    if(!locked){
      overlay?.remove();
      if(!host.querySelector(":scope > .p8-lock-overlay")) host.classList.remove("p8-lock-host");
      return;
    }
    if(!overlay){
      overlay = image(
        component("locked-padlock-overlay.png"),
        `p8-lock-overlay ${className}`
      );
      overlay.dataset.p8Lock = kind;
      host.prepend(overlay);
    }
    host.classList.add("p8-lock-host");
  }

  function syncCloseButtons(root){
    around(root, CLOSE_SELECTOR).forEach(button => {
      if(!button.getAttribute("aria-label")){
        const raw = String(button.textContent || "").trim();
        button.setAttribute("aria-label", /^(?:✕|×|x)$/iu.test(raw) ? "Schließen" : (raw || "Schließen"));
      }
      if(!button.title) button.title = button.getAttribute("aria-label") || "Schließen";
      button.dataset.p8Close = "1";
    });
  }

  function syncCampaignNode(node){
    const locked = node.classList.contains("locked");
    let mark = node.querySelector(":scope > .node-mark");
    if(locked){
      if(!mark){
        mark = document.createElement("span");
        mark.className = "node-mark";
        mark.dataset.p8Created = "1";
        node.append(mark);
      }
      let overlay = directAsset(mark, "campaign-node");
      if(!overlay){
        overlay = image(component("locked-padlock-overlay.png"), "p8-lock-overlay p8-lock-node");
        overlay.dataset.p8Lock = "campaign-node";
      }
      if(mark.childNodes.length !== 1 || mark.firstChild !== overlay) mark.replaceChildren(overlay);
      mark.classList.add("p8-lock-mark");
      mark.dataset.p4Decorated = "1";
      mark.dataset.p8LockMark = "1";
    }else if(mark?.dataset.p8LockMark === "1"){
      if(mark.dataset.p8Created === "1") mark.remove();
      else{
        directAsset(mark, "campaign-node")?.remove();
        mark.classList.remove("p8-lock-mark");
        delete mark.dataset.p8LockMark;
      }
    }

    const selectedBoss = node.classList.contains("boss")
      && (node.classList.contains("current") || node.classList.contains("selected"));
    let glow = node.querySelector(":scope > .p8-boss-selected-glow");
    if(selectedBoss && !glow){
      glow = image(effect("premium-card-selected-glow-green.png"), "p8-boss-selected-glow");
      glow.dataset.p8Stable = "1";
      glow.setAttribute("aria-hidden", "true");
      node.prepend(glow);
    }else if(!selectedBoss && glow){
      glow.remove();
    }
    // Do not touch existing stable glow — prevents MutationObserver re-entry jitter.
  }

  function containsLockText(element){
    return LOCK_TEXT_TEST.test(String(element?.textContent || ""));
  }

  function syncCampaignLocks(root){
    around(root, ".campaign-hub .campaign-node").forEach(syncCampaignNode);

    around(root, ".campaign-hub .campaign-world-btn").forEach(button => {
      const state = button.querySelector(":scope > .campaign-world-state");
      syncInlineLock(state, button.disabled, "campaign-world", "p8-lock-world");
    });

    around(root, ".campaign-hub .campaign-ability-chip").forEach(chip => {
      syncInlineLock(chip, chip.classList.contains("locked"), "campaign-ability", "p8-lock-inline");
    });

    around(root, ".campaign-hub .campaign-mastery-btn").forEach(button => {
      syncInlineLock(button, button.disabled, "campaign-mastery", "p8-lock-button");
    });

    around(root, ".campaign-hub .node-detail-state").forEach(state => {
      const locked = containsLockText(state) || /\bGESPERRT\b/iu.test(state.textContent || "");
      syncInlineLock(state, locked, "campaign-detail", "p8-lock-inline");
    });

    around(root, ".campaign-hub .node-detail-row").forEach(row => {
      const locked = containsLockText(row) || /Pflicht-Loadout/iu.test(row.textContent || "");
      syncInlineLock(row, locked, "campaign-rule", "p8-lock-inline");
    });

    around(root, "#duoUnlockSummary,#duoCampaignBanner,#trioCampaignBanner").forEach(host => {
      const text = String(host.textContent || "");
      const locked = containsLockText(host) || /\b(?:gesperrt|braucht)\b/iu.test(text);
      syncInlineLock(host, locked, "campaign-summary", "p8-lock-inline");
    });
  }

  function syncProfileLocks(root){
    around(root, "#profilesScreen .unlock-chip").forEach(chip => {
      syncInlineLock(chip, chip.classList.contains("locked"), "profile-unlock", "p8-lock-inline");
    });
  }

  function syncMasteryLocks(root){
    around(root, "#masteryModal .mastery-node").forEach(node => {
      syncInlineLock(
        node,
        node.classList.contains("locked") && !node.classList.contains("owned"),
        "standard-mastery",
        "p8-lock-standard"
      );
    });

    around(root, "#masteryModal .aml-ability-node").forEach(node => {
      syncInlineLock(
        node,
        node.classList.contains("mastery-ability-locked"),
        "ability-mastery",
        "p8-lock-ability"
      );
    });

    around(root, "#masteryModal .mastery-fusion-placeholder").forEach(button => {
      syncInlineLock(button, true, "mastery-fusion", "p8-lock-fusion");
    });

    around(root, "#masteryModal .mastery-locked-cost").forEach(cost => {
      const card = cost.closest(".mastery-locked-card");
      const note = String(card?.querySelector("small")?.textContent || "");
      const locked = containsLockText(cost)
        || /\bgesperrt\b|Freischaltung|Kaufe zuerst|Challenge|Fusion|Keystone/iu.test(note);
      syncInlineLock(cost, locked, "mastery-info", "p8-lock-modal");
    });

    around(root, "#masteryModal .mastery-ability-sheet-head>span").forEach(note => {
      syncInlineLock(note, true, "mastery-note", "p8-lock-note");
    });
  }

  function syncLabLocks(root){
    around(root, "#abilityMasteryLabModal .aml-fusion-node,#abilityMasteryLabModal .aml-keystone-node").forEach(node => {
      syncInlineLock(node, true, "mastery-prototype", "p8-lock-prototype");
    });
    around(root, "#testLab3dLock").forEach(button => {
      syncInlineLock(button, true, "test-lock", "p8-lock-inline");
    });
  }

  function cleanLockText(root){
    const base = baseElement(root);
    if(!base) return;
    const walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const parent = node.parentElement;
      if(!parent || /^(?:SCRIPT|STYLE|TEMPLATE)$/u.test(parent.tagName)) return;
      const original = String(node.nodeValue || "");
      if(!LOCK_TEXT_TEST.test(original)) return;
      node.nodeValue = original
        .replace(LOCK_TEXT, "")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/^[ \t]+/u, "");
    });

    around(base, "[title],[aria-label]").forEach(element => {
      ["title", "aria-label"].forEach(attribute => {
        if(!element.hasAttribute(attribute)) return;
        const original = element.getAttribute(attribute) || "";
        if(!LOCK_TEXT_TEST.test(original)) return;
        element.setAttribute(attribute, original.replace(LOCK_TEXT, "").replace(/[ \t]{2,}/g, " ").trim());
      });
    });
  }

  function decorate(root=document.body){
    if(!root) return;
    syncCloseButtons(root);
    syncCampaignLocks(root);
    syncProfileLocks(root);
    syncMasteryLocks(root);
    syncLabLocks(root);
    cleanLockText(root);
  }

  function flushDecorate(){
    decorateQueued = false;
    const roots = [...queuedRoots];
    queuedRoots.clear();
    if(!roots.length) return;
    if(roots.includes(document.body)){
      decorate(document.body);
      return;
    }
    roots.forEach(decorate);
  }

  function scheduleDecorate(root=document.body){
    if(root) queuedRoots.add(baseElement(root));
    if(decorateQueued) return;
    decorateQueued = true;
    const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout;
    schedule(flushDecorate);
  }

  function observe(){
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        // Ignore our own stable glow layer — adding/removing it must not re-enter decorate.
        if(mutation.type === "childList"){
          const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
          const onlyGlow = nodes.length > 0 && nodes.every(n =>
            n.nodeType === 1 && n.classList?.contains("p8-boss-selected-glow")
          );
          if(onlyGlow) return;
          scheduleDecorate(mutation.target);
          mutation.addedNodes.forEach(n => {
            if(n.nodeType === 1 && n.classList?.contains("p8-boss-selected-glow")) return;
            scheduleDecorate(n);
          });
        }else if(mutation.type === "characterData"){
          scheduleDecorate(mutation.target.parentElement);
        }else if(mutation.type === "attributes"){
          if(mutation.target?.classList?.contains("p8-boss-selected-glow")) return;
          scheduleDecorate(mutation.target);
        }else{
          scheduleDecorate(mutation.target);
        }
      });
    });
    observer.observe(document.body, {
      childList:true,
      subtree:true,
      characterData:true,
      attributes:true,
      attributeFilter:["class", "disabled", "aria-hidden"]
    });
  }

  function init(){
    document.documentElement.dataset.v28Phase8 = "1";
    observe();
    decorate(document.body);
    document.addEventListener("click", event => {
      if(event.target.closest?.(".campaign-hub .campaign-node")) setTimeout(() => scheduleDecorate(document.body), 0);
    }, true);
    console.info(`[DiceDuel] UI Rework Phase 8 ${VERSION} active.`);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
