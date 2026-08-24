(() => {
  const gate = document.getElementById("wdBootGate");
  const bar = document.getElementById("wdBootBarFill");
  const label = document.getElementById("wdBootLabel");
  const version = typeof GAME_VERSION === "string" ? GAME_VERSION : "28.3.21";

  const block = (event) => {
    if (!document.documentElement.classList.contains("wd-booting")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  document.addEventListener("click", block, true);
  document.addEventListener("pointerdown", block, true);
  document.addEventListener("touchstart", block, true);

  const seen = new Set();
  const urls = [];
  const add = (raw, base) => {
    if (!raw) return;
    let href = String(raw).trim();
    if (!href || href.startsWith("data:") || href.startsWith("blob:")) return;
    try {
      href = new URL(href, base || location.href).href;
    } catch {
      return;
    }
    const key = href.split("#")[0];
    if (seen.has(key)) return;
    seen.add(key);
    urls.push(href);
  };

  if (typeof DICE_DESIGNS === "object" && DICE_DESIGNS) {
    Object.values(DICE_DESIGNS).forEach((design) => {
      if (design?.previewAsset) add(design.previewAsset);
      const artKey = design?.artKey;
      if (!artKey) return;
      ["1", "2", "3", "4", "5", "6", "question"].forEach((face) => {
        add(`assets/ui/v28/png/dice-designs/${artKey}/${artKey}-face-${face}.png?v=${version}`);
      });
    });
  } else {
    ["ivory-royal", "sapphire-crown", "amethyst-rift"].forEach((key) => {
      ["1", "2", "3", "4", "5", "6", "question"].forEach((face) => {
        add(`assets/ui/v28/png/dice-designs/${key}/${key}-face-${face}.png?v=${version}`);
      });
      add(`assets/ui/v28/png/dice-designs/${key}/${key}-beauty.png?v=${version}`);
    });
  }

  const urlRe = /url\(\s*(['"]?)([^"')]+)\1\s*\)/gi;
  const walkRules = (list, base) => {
    if (!list) return;
    for (const rule of list) {
      if (rule.cssRules) walkRules(rule.cssRules, base);
      const text = rule.cssText || "";
      urlRe.lastIndex = 0;
      let match;
      while ((match = urlRe.exec(text))) add(match[2], base);
    }
  };
  Array.from(document.styleSheets).forEach((sheet) => {
    let rules;
    try { rules = sheet.cssRules; } catch { return; }
    walkRules(rules, sheet.href || location.href);
  });

  document.querySelectorAll("img[src], source[src], image[href]").forEach((node) => {
    add(node.currentSrc || node.getAttribute("src") || node.getAttribute("href"));
  });

  [
    "assets/ui/v28/png/backgrounds/main-menu.png",
    "assets/ui/v28/png/backgrounds/campaign-mastery-light.png",
    "assets/ui/v28/png/backgrounds/combat.png",
    "assets/ui/v28/png/backgrounds/navy-lobby-profile.png",
    "assets/ui/v28/png/backgrounds/boss-finale.png",
    "assets/ui/v28/bg-combat-hall.png",
    "assets/ui/v28/png/frames/modal-popup.png",
    "assets/ui/v28/png/frames/mastery.png",
    "assets/ui/v28/png/frames/prestige.png",
    "assets/ui/v28/png/frames/ivory-button.png",
    "assets/ui/v28/png/frames/navy-tile.png",
    "assets/ui/v28/png/frames/boss.png",
    "assets/ui/v28/png/frames/campaign-node-selected.png",
    "assets/ui/v28/png/frames/ability-choice-card.png",
    "assets/ui/v28/png/frames/player-card-combat.png",
    "assets/ui/v28/png/frames/boss-player-card.png",
    "assets/ui/v28/png/frames/active-player-glow.png",
    "assets/ui/v28/png/components/campaign-node-farm-frame.png",
    "assets/ui/v28/png/components/encounter-button-green.png",
    "assets/ui/v28/png/components/xp-badge.png",
    "assets/ui/v28/png/components/hp-heart-medallion.png",
    "assets/ui/v28/png/components/completed-check-medallion.png",
    "assets/ui/v28/png/components/locked-padlock-overlay.png",
    "assets/ui/v28/png/components/close-button.png",
    "assets/ui/v28/png/components/back-button.png",
    "assets/ui/v28/png/fx/premium-card-selected-glow-green.png",
    "assets/ui/v28/png/fx/arcane-halo-blue.png",
    "assets/ui/v28/png/fx/divine-burst-gold.png",
    "assets/ui/v28/svg/gameplay/dice.svg",
    "assets/ui/v28/svg/navigation/back.svg",
    "assets/ui/v28/svg/navigation/close-x.svg",
    "assets/ui/v28/svg/navigation/chevron-down.svg"
  ].forEach((path) => add(path));

  let done = 0;
  const total = urls.length || 1;

  const paint = () => {
    const pct = Math.min(100, Math.round((done / total) * 100));
    if (bar) bar.style.width = `${pct}%`;
    if (label) {
      label.textContent = pct < 100 ? `Lade Spiel · ${pct}%` : "Bereit";
    }
  };

  const loadOne = (url) => new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      done += 1;
      paint();
      resolve();
    };
    img.onload = finish;
    img.onerror = finish;
    img.src = url;
  });

  const runPool = async () => {
    const queue = urls.slice();
    const workers = Array.from({ length: 6 }, async () => {
      while (queue.length) {
        const next = queue.shift();
        if (next) await loadOne(next);
      }
    });
    await Promise.all(workers);
  };

  const finishGate = () => {
    document.documentElement.classList.remove("wd-booting");
    document.body.classList.remove("wd-booting");
    document.body.classList.add("wd-booted");
    document.removeEventListener("click", block, true);
    document.removeEventListener("pointerdown", block, true);
    document.removeEventListener("touchstart", block, true);
    if (!gate) return;
    gate.classList.add("is-done");
    gate.setAttribute("aria-busy", "false");
    window.setTimeout(() => gate.remove(), 480);
  };

  paint();
  Promise.race([
    runPool(),
    new Promise((resolve) => window.setTimeout(resolve, 45000))
  ]).then(finishGate).catch(finishGate);
})();
