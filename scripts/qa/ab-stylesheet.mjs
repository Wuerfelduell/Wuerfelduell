/* A/B zweier Stylesheets auf dem echten, gespielten DOM.
   ==================================================================
   Das Gegenstueck zu important-diagnose.mjs. Die Diagnose baut Elementformen
   aus Selektoren und erfindet dabei auch Formen, die das Spiel nie hat
   (.dd-select-trigger in .screen-topbar). Dieses Skript erfindet nichts:
   es faehrt das Spiel in echte Zustaende und liest fuer JEDES Element 49
   berechnete Eigenschaften samt ::before/::after einmal unter dem alten und
   einmal unter dem neuen Stylesheet. Gleiches DOM, nur das Blatt getauscht.
   Jede Abweichung ist echt, weil der Zustand echt ist. Was es nicht
   erreicht, sieht es nicht - deshalb beide Werkzeuge zusammen lesen.

   Erreichte Zustaende: alle Menuebildschirme; drei angelegte Profile;
   die Kampagnenkarte mit Profil (Knoten offen, Detail, zweite Welt); das
   Setup mit Namen und gewuerfelten Faehigkeiten; ein lokales Bot-gegen-
   Bot-Spiel auf schneller Stufe, das sich selbst spielt - dabei alle drei
   Sekunden ein Abzug, bis die Rundenauswertung erscheint; danach die
   Rundenvorbereitung und der Faehigkeits-Picker aus dem echten Spielfluss.

   Aufruf:
     node scripts/qa/ab-stylesheet.mjs <alt.css> [neu.css] [breite]
   Schreibt .qa/ab-stylesheet.json. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

async function ladePlaywright() {
  for (const ort of ["playwright", "playwright-core", "/opt/node22/lib/node_modules/playwright/index.mjs",
    "/usr/lib/node_modules/playwright/index.mjs", "/usr/local/lib/node_modules/playwright/index.mjs"]) {
    try { return (await import(ort)).chromium; } catch (_) { /* naechster */ }
  }
  console.error("Playwright nicht gefunden. Installieren mit:  npm i -D playwright"); process.exit(1);
}
const chromium = await ladePlaywright();
const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ADRESSE = process.env.WD_QA_URL || "http://127.0.0.1:8099/index.html";
const altPfad = process.argv[2]; const neuPfad = process.argv[3] || path.join(wurzel, "css", "app.css");
const BREITE = Number(process.argv[4] || 412);
if (!altPfad) { console.error("Aufruf: node scripts/qa/ab-stylesheet.mjs <alt.css> [neu.css] [breite]"); process.exit(1); }
const ALT = readFileSync(altPfad, "utf8"), NEU = readFileSync(neuPfad, "utf8");

const FELDER = ["display","position","width","height","margin","padding","border-width","border-style","border-color",
  "border-radius","border-image-source","border-image-slice","border-image-width","border-image-repeat",
  "background-color","background-image","background-size","background-position","background-origin","background-clip",
  "color","font-size","font-weight","line-height","letter-spacing","text-align","text-transform","text-shadow",
  "box-shadow","opacity","filter","transform","z-index","overflow","flex","gap","grid-template-columns",
  "align-items","justify-content","min-height","min-width","max-width","aspect-ratio","inset","animation-name",
  "visibility","pointer-events","outline-color","outline-width"];

const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: BREITE, height: 900 } });
seite.on("pageerror", () => {});
await seite.route("**/*", r => r.request().url().startsWith(new URL(ADRESSE).origin) ? r.continue() : r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
await seite.goto(ADRESSE, { waitUntil: "load" });
await seite.waitForTimeout(1500);

await seite.evaluate(({ alt, neu }) => {
  for (const l of document.querySelectorAll('link[rel="stylesheet"]')) l.disabled = true;
  const mach = (t, n) => { const s = document.createElement("style"); s.dataset.ab = n; s.textContent = t; document.head.appendChild(s); return s; };
  mach(alt, "alt"); mach(neu, "neu").disabled = true;
  const ruhe = document.createElement("style"); ruhe.dataset.ab = "ruhe";
  ruhe.textContent = "*,*::before,*::after{animation-play-state:paused!important;transition:none!important}";
  document.head.appendChild(ruhe);
}, { alt: ALT, neu: NEU });

const vergleich = (zustand) => seite.evaluate(({ felder, zustand }) => {
  const sAlt = document.querySelector('style[data-ab="alt"]'), sNeu = document.querySelector('style[data-ab="neu"]');
  const pfad = el => { const t = []; let n = el; while (n && n !== document.documentElement && n.parentElement) { t.unshift(n.tagName.toLowerCase() + (n.id ? "#" + n.id : "") + (n.classList.length ? "." + [...n.classList].slice(0, 3).join(".") : "")); n = n.parentElement; } return t.slice(-4).join(" > "); };
  const lies = (el, ps) => { const c = getComputedStyle(el, ps || undefined); if (ps && (c.content === "none" || c.content === "normal")) return null; const o = {}; for (const f of felder) o[f] = c.getPropertyValue(f); return o; };
  const alle = [...document.querySelectorAll("body *")].filter(el => !/^(SCRIPT|STYLE|LINK|META)$/.test(el.tagName));
  const schnapp = () => alle.map(el => [lies(el), lies(el, "::before"), lies(el, "::after")]);
  sNeu.disabled = true; sAlt.disabled = false; const a = schnapp();
  sAlt.disabled = true; sNeu.disabled = false; const b = schnapp();
  sNeu.disabled = true; sAlt.disabled = false;
  const funde = [];
  alle.forEach((el, i) => {
    // Was auf beiden Seiten display:none ist, sieht niemand - und was in einem
    // versteckten Vorfahren steckt, ebenso.
    if (el.closest(".hidden") && a[i][0].display === "none" && b[i][0].display === "none") return;
    for (let k = 0; k < 3; k++) {
      const x = a[i][k], y = b[i][k]; if (!x && !y) continue;
      const wo = pfad(el) + ["", "::before", "::after"][k];
      if (!x || !y) { funde.push({ zustand, pfad: wo, prop: "(pseudo)", alt: x ? "da" : "fehlt", neu: y ? "da" : "fehlt" }); continue; }
      if (x.display === "none" && y.display === "none") continue;
      for (const f of felder) if (x[f] !== y[f]) funde.push({ zustand, pfad: wo, prop: f, alt: x[f], neu: y[f] });
    }
  });
  return { knoten: alle.length, funde };
}, { felder: FELDER, zustand });

const alleFunde = []; const protokoll = [];
const klick = async (sel, warte = 500) => { const ok = await seite.evaluate(s => { const el = document.querySelector(s); if (!el || el.disabled) return false; el.click(); return true; }, sel); await seite.waitForTimeout(warte); return ok; };
const setze = async (sel, wert) => seite.evaluate(({ sel, wert }) => { const el = document.querySelector(sel); if (!el) return false; el.value = wert; el.dispatchEvent(new Event("change", { bubbles: true })); el.dispatchEvent(new Event("input", { bubbles: true })); return true; }, { sel, wert });
const messe = async (name) => { const r = await vergleich(name); alleFunde.push(...r.funde); protokoll.push(`${name}: ${r.knoten} Knoten, ${r.funde.length} Abweichungen`); };
const zurueck = async () => { await seite.evaluate(() => { for (const b of document.querySelectorAll("button")) if (/^(Zur(ü|ue)ck|Hauptmen(ü|ue)|Back|Main Menu)/i.test(b.textContent.trim()) && b.offsetParent) { b.click(); return; } }); await seite.waitForTimeout(400); };
const sichtbar = (sel) => seite.evaluate(s => { const el = document.querySelector(s); return !!el && !el.classList.contains("hidden") && el.offsetParent !== null; }, sel);

// 1) Hauptmenue
await messe("hauptmenue");

// 2) Profile anlegen - drei, damit die Liste scrollen muss
if (await klick("#menuProfilesBtn", 700)) {
  for (const name of ["Seb", "Jürgen", "Alexandra"]) { await setze("#newProfileName", name); await klick("#createProfileBtn", 500); }
  await messe("profile-drei");
  const roll = await seite.evaluate(() => { const s = document.getElementById("profilesScreen"); const c = getComputedStyle(s); return { overflowY: c.overflowY, inhalt: s.scrollHeight, sicht: s.clientHeight, seite: document.documentElement.scrollHeight, fenster: innerHeight }; });
  protokoll.push(`  profilesScreen: overflow-y ${roll.overflowY}, Inhalt ${roll.inhalt} / Sicht ${roll.sicht}, Seite ${roll.seite}/${roll.fenster}`);
  await zurueck();
}

// 3) Uebrige Menuebildschirme
for (const id of ["menuAccountBtn","menuAchievementsBtn","menuPrestigeShopBtn","menuStatsBtn","menuSettingsBtn","menuRulesBtn","menuChangelogBtn","menuOnlineBtn"]) {
  if (await klick("#" + id, 700)) { await messe(id.replace("menu", "").replace("Btn", "").toLowerCase()); await zurueck(); }
}

// 4) Kampagne mit Profil
if (await klick("#menuCampaignBtn", 500)) {
  await messe("kampagne-moduswahl");
  if (await klick("#campaignModeSoloBtn", 900)) {
    await seite.evaluate(() => { const s = document.getElementById("campaignProfileSelect"); if (s && s.options.length) { s.value = s.options[0].value; s.dispatchEvent(new Event("change", { bubbles: true })); } });
    await seite.waitForTimeout(600);
    await messe("kampagne-karte");
    if (await klick(".campaign-hub .campaign-node:not([disabled])", 700)) await messe("kampagne-knoten");
    if (await klick(".campaign-hub .campaign-world-btn:not(.active):not([disabled])", 700)) await messe("kampagne-welt2");
  }
  await zurueck(); await zurueck();
}

// 5) Einstellungen auf schnell, dann Setup und ein Bot-gegen-Bot-Spiel
if (await klick("#menuSettingsBtn", 500)) { await setze("#animationSetting", "fast"); await setze("#botSpeedSetting", "fast"); await zurueck(); }
if (await klick("#menuPlayBtn", 600)) {
  await messe("setup-leer");
  await klick("#makeNames", 500);
  await setze("#botChoice0", "normal"); await setze("#botChoice1", "hard");
  await seite.waitForTimeout(300); await messe("setup-bots");
  await klick("#rollAbilities", 600);
  for (let i = 0; i < 20; i++) { if (await seite.evaluate(() => !document.getElementById("startGame").disabled)) break; await seite.waitForTimeout(300); }
  await messe("setup-gewuerfelt");
  if (await klick("#startGame", 1200)) {
    await messe("kampf-start");
    // Das Spiel spielt sich selbst. Alle drei Sekunden ein Abzug, bis die Auswertung da ist.
    let ende = false;
    for (let t = 0; t < 60 && !ende; t++) {
      await seite.waitForTimeout(3000);
      const lage = await seite.evaluate(() => ({
        dice: [...document.querySelectorAll("#game .die")].map(d => [...d.classList].filter(c => /selected|locked|attack-hit|rolling|selectable/.test(c)).join("+")).filter(Boolean).join(","),
        winner: !document.getElementById("winnerBox").classList.contains("hidden"),
        modal: [...document.querySelectorAll(".modal:not(.hidden), .special-roll-modal:not(.hidden)")].map(m => m.id).join(",")
      }));
      await messe(`kampf-t${(t + 1) * 3}s${lage.dice ? " [" + lage.dice + "]" : ""}${lage.modal ? " {" + lage.modal + "}" : ""}`);
      ende = lage.winner;
    }
    if (ende) {
      await messe("rundenauswertung");
      if (await klick("#nextRoundPrepBtn", 900)) {
        await messe("rundenvorbereitung");
        if (await klick("#nextRoundAbilities .v28-ability-trigger", 700)) { await messe("faehigkeits-picker"); await klick(".v28-ability-picker-close", 300); }
        if (await klick("#startNextRoundBtn", 1200)) await messe("runde2-start");
      }
    } else protokoll.push("  Rundenende innerhalb von 3 Minuten nicht erreicht");
    await klick("#gameMenuBtn", 600); await messe("kampf-quit-modal");
  } else protokoll.push("  Spielstart nicht moeglich: " + await seite.evaluate(() => document.getElementById("setupStatus")?.textContent.trim()));
}
await browser.close();

const gruppen = new Map();
for (const f of alleFunde) { const k = f.pfad + " · " + f.prop; if (!gruppen.has(k)) gruppen.set(k, { pfad: f.pfad, prop: f.prop, alt: f.alt, neu: f.neu, zustaende: new Set() }); gruppen.get(k).zustaende.add(f.zustand.replace(/ \[.*$/, "").replace(/ \{.*$/, "")); }
const liste = [...gruppen.values()].map(g => ({ ...g, zustaende: [...g.zustaende] }));
mkdirSync(path.join(wurzel, ".qa"), { recursive: true });
writeFileSync(path.join(wurzel, ".qa", "ab-stylesheet.json"), JSON.stringify(liste, null, 1));
console.log(protokoll.join("\n"));
console.log(`\n${liste.length} Element/Eigenschaft-Paare weichen zwischen den Blaettern ab (${BREITE}px).\n`);
for (const g of liste) console.log(`${g.pfad}\n   ${g.prop}: ${String(g.alt).slice(0, 60)}  →  ${String(g.neu).slice(0, 60)}   [${g.zustaende.slice(0, 4).join(", ")}${g.zustaende.length > 4 ? " +" + (g.zustaende.length - 4) : ""}]`);
