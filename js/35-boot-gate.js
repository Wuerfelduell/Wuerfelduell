(() => {
  const gate = document.getElementById("wdBootGate");
  const bar = document.getElementById("wdBootBarFill");
  const label = document.getElementById("wdBootLabel");
  const version = typeof GAME_VERSION === "string" ? GAME_VERSION : "28.3.17";

  const block = (event) => {
    if (!document.documentElement.classList.contains("wd-booting")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  document.addEventListener("click", block, true);
  document.addEventListener("pointerdown", block, true);
  document.addEventListener("touchstart", block, true);

  const artKeys = [];
  if (typeof DICE_DESIGNS === "object" && DICE_DESIGNS) {
    Object.values(DICE_DESIGNS).forEach((design) => {
      if (design?.artKey) artKeys.push(design.artKey);
    });
  }
  if (!artKeys.length) artKeys.push("ivory-royal", "sapphire-crown", "amethyst-rift");

  const urls = [];
  const add = (path) => {
    if (!path) return;
    const clean = String(path).split("?")[0];
    const url = `${clean}?v=${version}`;
    if (!urls.includes(url)) urls.push(url);
  };

  artKeys.forEach((key) => {
    ["1", "2", "3", "4", "5", "6", "question"].forEach((face) => {
      add(`assets/ui/v28/png/dice-designs/${key}/${key}-face-${face}.png`);
    });
    add(`assets/ui/v28/png/dice-designs/${key}/${key}-beauty.png`);
  });

  [
    "assets/ui/v28/png/emblems/diceduel-crest.png",
    "assets/ui/v28/bg-main-palace.png",
    "assets/ui/v28/bg-combat-hall.png",
    "assets/ui/v28/png/backgrounds/navy-lobby-profile.png",
    "assets/ui/v28/png/backgrounds/boss-finale.png",
    "assets/ui/v28/frame-button-ivory.png",
    "assets/ui/v28/png/frames/navy-button-horizontal.png",
    "assets/ui/v28/png/frames/gold-special-button.png",
    "assets/ui/v28/png/frames/panel-large.png",
    "assets/ui/v28/png/frames/player-card-combat.png",
    "assets/ui/v28/png/frames/boss-player-card.png",
    "assets/ui/v28/png/frames/active-player-glow.png",
    "icon-192.png"
  ].forEach(add);

  let done = 0;
  const total = urls.length || 1;

  const paint = () => {
    const pct = Math.min(100, Math.round((done / total) * 100));
    if (bar) bar.style.width = `${pct}%`;
    if (label) {
      label.textContent = pct < 100 ? `Lade Würfel & UI · ${pct}%` : "Bereit";
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
    const workers = Array.from({ length: 4 }, async () => {
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
    new Promise((resolve) => window.setTimeout(resolve, 28000))
  ]).then(finishGate).catch(finishGate);
})();
