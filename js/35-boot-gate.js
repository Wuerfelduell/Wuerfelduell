(() => {
  const gate = document.getElementById("wdBootGate");
  const bar = document.getElementById("wdBootBarFill");
  const label = document.getElementById("wdBootLabel");
  /* Cache-Buster fuer die Wuerfel-URLs. Faellt auf das <meta name="wd-build">
     zurueck statt auf eine hartkodierte Version, die bei jedem Release veraltet. */
  const version = typeof GAME_VERSION === "string"
    ? GAME_VERSION
    : (document.querySelector('meta[name="wd-build"]')?.content || "0");

  /* Block input only while the gate is up */
  const block = (event) => {
    if (!document.documentElement.classList.contains("wd-booting")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  document.addEventListener("click", block, true);
  document.addEventListener("pointerdown", block, true);
  document.addEventListener("touchstart", block, true);

  const seen = new Set();
  const critical = [];
  const background = [];

  const add = (list, raw) => {
    if (!raw) return;
    let href = String(raw).trim();
    if (!href || href.startsWith("data:") || href.startsWith("blob:")) return;
    try {
      href = new URL(href, location.href).href;
    } catch {
      return;
    }
    const key = href.split("#")[0];
    if (seen.has(key)) return;
    seen.add(key);
    list.push(href);
  };

  /* ---- CRITICAL: only what the main menu + first interaction need ---- */
  [
    "assets/ui/v28/bg-main-palace.webp",
    "assets/ui/v28/crest-diceduel.webp",
    "assets/ui/v28/png/backgrounds/main-menu.webp",
    "assets/ui/v28/svg/navigation/back.svg",
    "assets/ui/v28/svg/navigation/close-x.svg",
    "assets/ui/v28/svg/navigation/chevron-down.svg",
    "assets/ui/v28/svg/gameplay/dice.svg"
  ].forEach((p) => add(critical, p));

  /* Default dice set only (classic_v2 / ivory-royal) — other designs load when equipped */
  const defaultArt = "ivory-royal";
  ["1", "2", "3", "4", "5", "6", "question"].forEach((face) => {
    add(critical, `assets/ui/v28/png/dice-designs/${defaultArt}/${defaultArt}-face-${face}.webp?v=${version}`);
  });
  add(critical, `assets/ui/v28/png/dice-designs/${defaultArt}/${defaultArt}-beauty.webp?v=${version}`);

  /* DOM images already on the first paint (menu) */
  document.querySelectorAll("#mainMenu img[src], #wdBootGate img[src], img.preload-critical[src]").forEach((node) => {
    add(critical, node.currentSrc || node.getAttribute("src"));
  });

  /* ---- BACKGROUND (does not block the gate): other dice + heavy screens ---- */
  if (typeof DICE_DESIGNS === "object" && DICE_DESIGNS) {
    Object.values(DICE_DESIGNS).forEach((design) => {
      const artKey = design?.artKey;
      if (!artKey || artKey === defaultArt) return;
      if (design.previewAsset) add(background, design.previewAsset);
      ["1", "2", "3", "4", "5", "6", "question"].forEach((face) => {
        add(background, `assets/ui/v28/png/dice-designs/${artKey}/${artKey}-face-${face}.webp?v=${version}`);
      });
    });
  } else {
    ["sapphire-crown", "amethyst-rift"].forEach((key) => {
      ["1", "2", "3", "4", "5", "6", "question"].forEach((face) => {
        add(background, `assets/ui/v28/png/dice-designs/${key}/${key}-face-${face}.webp?v=${version}`);
      });
      add(background, `assets/ui/v28/png/dice-designs/${key}/${key}-beauty.webp?v=${version}`);
    });
  }

  [
    "assets/ui/v28/png/backgrounds/combat.webp",
    "assets/ui/v28/png/backgrounds/campaign-mastery-light.webp",
    "assets/ui/v28/png/backgrounds/navy-lobby-profile.webp",
    "assets/ui/v28/png/backgrounds/boss-finale.webp",
    "assets/ui/v28/png/frames/player-card-combat.webp",
    "assets/ui/v28/png/frames/boss-player-card.webp",
    "assets/ui/v28/png/frames/active-player-glow.webp",
    "assets/ui/v28/png/components/campaign-node-farm-frame.webp",
    "assets/ui/v28/png/components/encounter-button-green.webp",
    "assets/ui/v28/png/components/xp-badge.webp",
    "assets/ui/v28/png/components/hp-heart-medallion.webp",
    "assets/ui/v28/png/components/completed-check-medallion.webp",
    "assets/ui/v28/png/components/locked-padlock-overlay.webp",
    "assets/ui/v28/png/components/close-button.webp",
    "assets/ui/v28/png/components/back-button.webp",
    "assets/ui/v28/png/fx/premium-card-selected-glow-green.webp",
    "assets/ui/v28/png/fx/arcane-halo-blue.webp",
    "assets/ui/v28/png/fx/divine-burst-gold.webp"
  ].forEach((p) => add(background, p));

  let done = 0;
  const total = Math.max(1, critical.length);

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
      resolve();
    };
    img.onload = finish;
    img.onerror = finish;
    /* decode when available so we don't paint half-ready bitmaps */
    img.src = url;
    if (img.decode) {
      img.decode().then(finish).catch(finish);
    }
  });

  const runPool = async (list, workers = 8, onEach) => {
    const queue = list.slice();
    await Promise.all(Array.from({ length: workers }, async () => {
      while (queue.length) {
        const next = queue.shift();
        if (!next) break;
        await loadOne(next);
        if (onEach) onEach();
      }
    }));
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
    window.setTimeout(() => gate.remove(), 400);
    /* Keep warming cache after the menu is usable */
    if (background.length) {
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 600));
      idle(() => { runPool(background, 4).catch(() => {}); });
    }
  };

  paint();
  Promise.race([
    runPool(critical, 8, () => { done += 1; paint(); }),
    new Promise((resolve) => window.setTimeout(resolve, 10000)) /* hard cap 10s */
  ]).then(finishGate).catch(finishGate);
})();
