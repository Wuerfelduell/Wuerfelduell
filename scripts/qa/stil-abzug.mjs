/* Vollabzug der berechneten Stile — das Prüfmittel für CSS-Aufräumarbeit.
   ==================================================================
   Wozu: wer Regeln aus den Schichten entfernt, kann nicht am Bildschirm
   erkennen, ob dabei etwas kaputtgegangen ist. Der Schaden zeigt sich oft
   an einem ganz anderen Element als dem bearbeiteten — beim Quit-Knopf
   waren es die Löschen-Knöpfe, die plötzlich ausgegraut gewesen wären.

   Dieses Skript liest deshalb von JEDEM Element JEDES Bildschirms 45
   berechnete Eigenschaften, dazu ::before und ::after, bei drei Breiten.
   Rund 476.000 Werte. Vor der Änderung als Referenz, danach zum Vergleich.

   Zwei Details machen es überhaupt brauchbar:
   - Es hält Animationen und Übergänge an. Sonst wandern transform und
     opacity zwischen zwei Läufen und jede Abweichung wird mehrdeutig.
   - Es lässt sich gegen sich selbst prüfen: zwei Läufe ohne Änderung
     müssen identisch sein. Ohne diesen Selbsttest ist das Ergebnis
     wertlos.

   Blinder Fleck: Interaktionszustände. Ein !important kann etwas
   VERHINDERN, das ohne es sichtbar würde — "color:red!important" schlägt
   ".btn:hover{color:blue}". Im Ruhezustand ändert sich nichts, im Hover
   sehr wohl. Dafür gibt es scripts/qa/zustands-abzug.mjs; bei Arbeit an
   !important immer BEIDE laufen lassen.

   Voraussetzung: das Spiel muss lokal ausgeliefert werden.
     npx http-server -p 8099 -c-1 --silent .

   Aufruf:
     node scripts/qa/stil-abzug.mjs            Referenz schreiben
     node scripts/qa/stil-abzug.mjs pruefen    gegen die Referenz vergleichen
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
const REF = path.join(ablage, "stil-abzug.json");
const ADRESSE = process.env.WD_QA_URL || "http://127.0.0.1:8099/index.html";
const modus = process.argv[2] || "schreiben";
const BREITEN = [360, 412, 1280];

const FELDER = [
  "display","position","width","height","margin","padding","border-width","border-style","border-color",
  "border-radius","border-image-source","border-image-slice","border-image-width","border-image-repeat",
  "background-color","background-image","background-size","background-position","background-origin","background-clip",
  "color","font-size","font-weight","line-height","letter-spacing","text-align","text-transform","text-shadow",
  "box-shadow","opacity","filter","transform","z-index","overflow","flex","gap","grid-template-columns",
  "align-items","justify-content","min-height","min-width","max-width","aspect-ratio","inset","animation-name"
];

async function abzug() {
  const alles = {};
  for (const breite of BREITEN) {
    const browser = await chromium.launch();
    const seite = await browser.newPage({ viewport: { width: breite, height: 900 } });
    // Externe Hosts (Firebase, CDN-Module) sind im Prüflauf nicht erreichbar
    // und wuerden waitUntil:"load" haengen lassen.
    await seite.route("**/*", r => r.request().url().startsWith(new URL(ADRESSE).origin)
      ? r.continue()
      : r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await seite.goto(ADRESSE, { waitUntil: "load" });
    await seite.waitForTimeout(1600);

    alles[breite] = await seite.evaluate(felder => {
      document.querySelectorAll("section.card, .modal, .hidden").forEach(el => el.classList.remove("hidden"));
      const stopp = document.createElement("style");
      stopp.textContent = "*,*::before,*::after{animation-play-state:paused!important;transition:none!important}";
      document.head.appendChild(stopp);

      const pfad = el => {
        const teile = [];
        let n = el;
        while (n && n !== document.documentElement && n.parentElement) {
          teile.unshift(n.tagName + ":" + [...n.parentElement.children].indexOf(n));
          n = n.parentElement;
        }
        return teile.join("/");
      };
      const lies = (el, pseudo) => {
        const c = getComputedStyle(el, pseudo || undefined);
        if (pseudo && (c.content === "none" || c.content === "normal")) return null;
        const o = {};
        for (const f of felder) o[f] = c.getPropertyValue(f);
        return o;
      };

      const out = {};
      for (const el of document.querySelectorAll("body *")) {
        if (/^(SCRIPT|STYLE|LINK|META)$/.test(el.tagName)) continue;
        const p = pfad(el);
        out[p] = lies(el);
        for (const ps of ["::before", "::after"]) {
          const v = lies(el, ps);
          if (v) out[p + ps] = v;
        }
      }
      return out;
    }, FELDER);
    await browser.close();
  }
  return alles;
}

const jetzt = await abzug();
mkdirSync(ablage, { recursive: true });

if (modus !== "pruefen" || !existsSync(REF)) {
  writeFileSync(REF, JSON.stringify(jetzt));
  const n = Object.keys(jetzt[BREITEN[1]]).length;
  console.log(`Referenz geschrieben: ${n} Knoten je Breite, ${BREITEN.length} Breiten, ${FELDER.length} Eigenschaften.`);
  console.log(`Rund ${Math.round(n * BREITEN.length * FELDER.length / 1000)} Tausend geprüfte Werte.`);
  console.log("Jetzt die Änderung machen, dann: node scripts/qa/stil-abzug.mjs pruefen");
} else {
  const ref = JSON.parse(readFileSync(REF, "utf8"));
  let ab = 0, fehlt = 0, neu = 0;
  const zeilen = [];
  for (const breite of BREITEN) {
    const a = ref[breite] || {}, b = jetzt[breite] || {};
    for (const k of Object.keys(a)) if (!(k in b)) { fehlt++; zeilen.push(`${breite}px ${k}: Knoten fehlt jetzt`); }
    for (const k of Object.keys(b)) {
      if (!(k in a)) { neu++; zeilen.push(`${breite}px ${k}: Knoten ist neu`); continue; }
      for (const f of Object.keys(b[k])) {
        if (a[k][f] !== b[k][f]) {
          ab++;
          zeilen.push(`${breite}px ${k} · ${f}\n     vorher : ${a[k][f]}\n     nachher: ${b[k][f]}`);
        }
      }
    }
  }
  zeilen.slice(0, 40).forEach(z => console.log("  " + z));
  if (zeilen.length > 40) console.log(`  ... und ${zeilen.length - 40} weitere`);
  if (ab + fehlt + neu === 0) {
    console.log("IDENTISCH — kein berechneter Wert, kein Knoten weicht ab.");
  } else {
    console.log(`${ab} geänderte Werte, ${fehlt} fehlende Knoten, ${neu} neue Knoten`);
    process.exitCode = 1;
  }
}
