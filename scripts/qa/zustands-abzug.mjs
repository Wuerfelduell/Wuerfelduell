/* Erzwungene Interaktionszustände — der blinde Fleck des Vollabzugs.
   ==================================================================
   scripts/qa/stil-abzug.mjs liest nur den Ruhezustand. Das genügt nicht,
   wenn man !important anfasst: ein !important setzt nicht nur etwas, es
   kann auch etwas VERHINDERN.

     .btn        { color:red !important }
     .btn:hover  { color:blue }

   Ohne das !important gewinnt der Hover. Im Ruhezustand ändert sich
   nichts — der Vollabzug meldet "identisch", und trotzdem sieht der Knopf
   beim Überfahren plötzlich anders aus. Genau so ein Fall ist beim ersten
   Versuch aufgetaucht: ein transform beim Drücken, das ein !important
   unterdrückt hatte.

   Dieses Skript erzwingt deshalb :hover, :focus und :active über
   CSS.forcePseudoState im DevTools-Protokoll und liest die berechneten
   Stile in jedem Zustand. Nur für bedienbare Elemente — bei einem <div>
   ohne Interaktion gibt es nichts zu verhindern.

   Voraussetzung: das Spiel muss lokal ausgeliefert werden.
     npx http-server -p 8099 -c-1 --silent .

   Aufruf:
     node scripts/qa/zustands-abzug.mjs            Referenz schreiben
     node scripts/qa/zustands-abzug.mjs pruefen    vergleichen

   Bei Arbeit an !important IMMER zusammen mit stil-abzug.mjs laufen
   lassen. Eines allein beweist nichts.
*/
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/* Playwright ist keine Abhaengigkeit dieses Projekts - es wird nur zum
   Pruefen gebraucht, nicht zum Ausliefern. Deshalb wird es hier zur
   Laufzeit gesucht: erst normal, dann an den ueblichen globalen Orten.
   Fehlt es, sagt das Skript, wie man es bekommt, statt mit einem
   Modulfehler abzubrechen. */
async function ladePlaywright() {
  const orte = [
    "playwright",
    "playwright-core",
    "/opt/node22/lib/node_modules/playwright/index.mjs",
    "/usr/lib/node_modules/playwright/index.mjs",
    "/usr/local/lib/node_modules/playwright/index.mjs"
  ];
  for (const ort of orte) {
    try { return (await import(ort)).chromium; } catch (_) { /* naechster Ort */ }
  }
  console.error("Playwright nicht gefunden. Installieren mit:  npm i -D playwright");
  console.error("Danach einmal:  npx playwright install chromium");
  process.exit(1);
}
const chromium = await ladePlaywright();

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ablage = path.join(wurzel, ".qa");
const REF = path.join(ablage, "zustands-abzug.json");
const ADRESSE = process.env.WD_QA_URL || "http://127.0.0.1:8099/index.html";
const modus = process.argv[2] || "schreiben";

const FELDER = ["color","background-color","background-image","border-color","border-width",
  "border-image-source","opacity","filter","transform","box-shadow","text-decoration-line",
  "outline-color","outline-width","padding","margin","font-size","font-weight","min-height","cursor"];

const ZUSTAENDE = ["hover", "focus", "active"];

const BEDIENBAR = "button,a,input,select,textarea,[role=button],[tabindex],label," +
  ".dd-select-trigger,.campaign-node,.campaign-world-btn,.ability-list-item,.prestige-item," +
  ".achievement-card,.dice-design-card,.v28-ability-option,.boss-rush-reward-card";

const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 412, height: 900 } });
await seite.route("**/*", r => r.request().url().startsWith(new URL(ADRESSE).origin)
  ? r.continue()
  : r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
await seite.goto(ADRESSE, { waitUntil: "load" });
await seite.waitForTimeout(1600);

await seite.evaluate(() => {
  document.querySelectorAll("section.card, .modal, .hidden").forEach(el => el.classList.remove("hidden"));
  const stopp = document.createElement("style");
  stopp.textContent = "*,*::before,*::after{animation-play-state:paused!important;transition:none!important}";
  document.head.appendChild(stopp);
});

const anzahl = await seite.evaluate(wahl => {
  const liste = [...document.querySelectorAll(wahl)];
  liste.forEach((el, i) => el.setAttribute("data-qa-zustand", String(i)));
  return liste.length;
}, BEDIENBAR);

const cdp = await seite.context().newCDPSession(seite);
await cdp.send("DOM.enable");
await cdp.send("CSS.enable");
const dokument = await cdp.send("DOM.getDocument", { depth: -1 });

const abzug = {};
for (let i = 0; i < anzahl; i++) {
  const treffer = await cdp.send("DOM.querySelector", {
    nodeId: dokument.root.nodeId,
    selector: `[data-qa-zustand="${i}"]`
  });
  if (!treffer.nodeId) continue;
  for (const z of ZUSTAENDE) {
    await cdp.send("CSS.forcePseudoState", { nodeId: treffer.nodeId, forcedPseudoClasses: [z] });
    const werte = await seite.evaluate(({ idx, felder }) => {
      const el = document.querySelector(`[data-qa-zustand="${idx}"]`);
      if (!el) return null;
      const c = getComputedStyle(el);
      const o = {};
      for (const f of felder) o[f] = c.getPropertyValue(f);
      return o;
    }, { idx: i, felder: FELDER });
    if (werte) abzug[`${i}:${z}`] = werte;
  }
  await cdp.send("CSS.forcePseudoState", { nodeId: treffer.nodeId, forcedPseudoClasses: [] });
}
await browser.close();
mkdirSync(ablage, { recursive: true });

if (modus !== "pruefen" || !existsSync(REF)) {
  writeFileSync(REF, JSON.stringify(abzug));
  console.log(`Referenz: ${anzahl} bedienbare Elemente x ${ZUSTAENDE.length} Zustände x ${FELDER.length} Eigenschaften`);
  console.log(`= ${Object.keys(abzug).length * FELDER.length} geprüfte Werte.`);
} else {
  const ref = JSON.parse(readFileSync(REF, "utf8"));
  let ab = 0;
  const zeilen = [];
  for (const k of Object.keys(abzug)) {
    if (!(k in ref)) continue;
    for (const f of Object.keys(abzug[k])) {
      if (ref[k][f] !== abzug[k][f]) {
        ab++;
        zeilen.push(`  ${k} · ${f}: ${ref[k][f]}  ->  ${abzug[k][f]}`);
      }
    }
  }
  zeilen.slice(0, 25).forEach(z => console.log(z));
  if (zeilen.length > 25) console.log(`  ... und ${zeilen.length - 25} weitere`);
  if (ab === 0) {
    console.log("ZUSTÄNDE IDENTISCH — hover, focus und active unverändert.");
  } else {
    console.log(`${ab} Abweichungen in Interaktionszuständen`);
    process.exitCode = 1;
  }
}
