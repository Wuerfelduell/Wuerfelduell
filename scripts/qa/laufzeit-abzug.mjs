/* Vollabzug der Bildschirme, die erst zur Laufzeit entstehen.
   ==================================================================
   Der blinde Fleck der beiden anderen Netze. scripts/qa/stil-abzug.mjs
   liest jeden Knoten des Dokuments - aber mehrere Bildschirme sind im
   Dokument nur leere Huellen und werden erst von JavaScript gefuellt:

     #roundStandings, #roundStatsBox   Rundenauswertung
     #nextRoundAbilities               Rundenvorbereitung
     .v28-ability-picker               entsteht erst beim Klick
     #secondAbilityChoices             Zweitfaehigkeit

   Fuer diese Flaechen meldet der Vollabzug "IDENTISCH", weil dort gar
   nichts steht. Wer viele Regeln entfernt - beim !important-Abbau waren
   es 4.398 - bekommt also ein gruenes Ergebnis, das ueber die Haelfte
   der Kampfoberflaeche nichts aussagt.

   Dieses Skript baut die Bildschirme deshalb erst auf und liest dann
   dieselben 45 Eigenschaften je Knoten, samt ::before und ::after, bei
   drei Breiten.

   Zwei Punkte, ohne die es wertlos waere:

   - Das Markup kommt aus den echten Quellen, nicht aus einer Abschrift.
     Die Stat-Kacheln werden aus js/09-battle-stats.js herausgeschnitten
     und ausgefuehrt, der Erklaertext aus js/14-round-flow.js gelesen,
     der Picker ueber seinen eigenen Trigger geoeffnet. Eine Nachbildung
     wuerde nur sich selbst pruefen und mit der Zeit veralten.

   - Animationen und Uebergaenge werden angehalten. Sonst wandern
     transform und opacity zwischen zwei Laeufen und jede Abweichung
     wird mehrdeutig.

   Voraussetzung: das Spiel muss lokal ausgeliefert werden.
     npx http-server -p 8099 -c-1 --silent .

   Aufruf:
     node scripts/qa/laufzeit-abzug.mjs            Referenz schreiben
     node scripts/qa/laufzeit-abzug.mjs pruefen    vergleichen
*/
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

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
const REF = path.join(ablage, "laufzeit-abzug.json");
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

/* --- Markup aus den echten Quellen holen -------------------------- */

function statKacheln() {
  const quelle = readFileSync(path.join(wurzel, "js", "09-battle-stats.js"), "utf8");
  const fn = quelle.slice(quelle.indexOf("function statZeilen"), quelle.indexOf("function renderRoundStats"));
  const ab = quelle.slice(quelle.indexOf("roundStatsBox.innerHTML=`") + "roundStatsBox.innerHTML=".length);
  const vorlage = ab.slice(0, ab.indexOf("`;") + 1);
  if (!fn || !vorlage) {
    console.error("Die Stat-Kacheln wurden in js/09-battle-stats.js nicht gefunden.");
    process.exit(1);
  }
  const bauen = new Function("escapeHtml", "damage", "turn", "sixes", "healed", "selfDamage", "damageTaken",
    `${fn}\n return ${vorlage};`);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return bauen(esc,
    { names: ["Jürgen"], value: 41 },
    { names: ["Alexandra"], value: 18 },
    { names: ["Seb"], value: 7 },
    { names: ["Bot Ferdinand"], value: 12 },
    { names: ["Jürgen", "Alexandra"], value: 23 },
    { names: [], value: 0 });
}

function erklaertext() {
  const quelle = readFileSync(path.join(wurzel, "js", "14-round-flow.js"), "utf8");
  const marke = "nextRoundInfo.innerHTML=`<span class=\"last-place-note\">";
  const start = quelle.indexOf(marke);
  if (start < 0) {
    console.error("Der Classic-Erklaertext wurde in js/14-round-flow.js nicht gefunden.");
    process.exit(1);
  }
  const ab = quelle.slice(start + "nextRoundInfo.innerHTML=`".length);
  return ab.slice(0, ab.indexOf("`;"))
    .replace(/\$\{escapeHtml\(players\[lastPlaceIndex\]\.name\)\}/g, "Bot Ferdinand");
}

const MARKUP = { stats: statKacheln(), erklaerung: erklaertext() };

/* --- Die Buehnen aufbauen ---------------------------------------- */

function buehnenBauen(markup) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  document.body.classList.add("playing");

  // Rundenauswertung, wie js/13-battle-actions.js sie erzeugt
  document.getElementById("winnerText").innerHTML = `🏆 ${esc("Jürgen")} gewinnt Runde 7!`;
  document.getElementById("roundResultText").innerHTML =
    `Siegstand: <strong>2</strong> für Jürgen.<br><span class="last-place-note">Bot Ferdinand</span> wurde Letzter, startet Runde 8 und darf die nächste Fähigkeit frei wählen.`;
  document.getElementById("roundStandings").innerHTML =
    [["Jürgen", 2, "Rundensieger"], ["Seb", 1, ""], ["Alexandra", 0, ""], ["Bot Ferdinand", 0, "🏁 Letzter"]]
      .map(([n, w, f], i) => `<div class="round-score-row${i === 0 ? " winner-row" : ""}${i === 3 ? " last-row" : ""}">` +
        `<div class="round-score-name">${esc(n)}</div>` +
        `<div class="round-score-meta">🏆 ${w} · ${f || "Runde beendet"}</div></div>`).join("");
  document.getElementById("roundStatsBox").innerHTML = markup.stats;

  // Rundenvorbereitung, wie prepareNextRound() sie im Classic-Zweig erzeugt
  document.getElementById("nextRoundTitle").textContent = "Runde 8 vorbereiten";
  document.getElementById("nextRoundInfo").innerHTML = markup.erklaerung;
  const ziel = document.getElementById("nextRoundAbilities");
  ziel.innerHTML = "";
  const karte = (name, i, frei) => {
    const b = document.createElement("div"); b.className = "round-prep-player";
    const t = document.createElement("div"); t.innerHTML = `<strong>${name}</strong>`; b.appendChild(t);
    const n = document.createElement("div");
    n.className = "round-note" + (frei ? " last-place-note" : "");
    n.textContent = frei ? "\u{1F3C1} Letzter Platz: freie Wahl ohne Würfelwurf" : "\u{1F3B2} W25 = 17 → Wildcard";
    b.appendChild(n);
    if (frei) {
      const s = document.createElement("select"); s.id = "nextAbilityChoice" + i;
      [[1, "1 – Brutale Einsen"], [3, "3 – Glückswurf"], [17, "17 – Wildcard"],
       [20, "20 – Snake Eyes"], [25, "25 – Underdog"]]
        .forEach(([v, txt]) => { const o = document.createElement("option"); o.value = v; o.textContent = txt; s.appendChild(o); });
      b.appendChild(s);
    }
    ziel.appendChild(b);
  };
  karte("Bot Ferdinand", 0, true);
  karte("Jürgen", 1, false);

  document.getElementById("winnerBox").classList.remove("hidden");
  document.getElementById("nextRoundBox").classList.remove("hidden");

  const stopp = document.createElement("style");
  stopp.id = "qa-ruhe";
  stopp.textContent = "*,*::before,*::after{animation-play-state:paused!important;transition:none!important}";
  document.head.appendChild(stopp);
}

function abzugLesen({ felder, wurzeln }) {
  const pfad = (el, stamm) => {
    const teile = [];
    let n = el;
    while (n && n !== stamm && n.parentElement) {
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
  for (const [name, wahl] of wurzeln) {
    const stamm = document.querySelector(wahl);
    if (!stamm) { out[name + "|FEHLT"] = { fehlt: "ja" }; continue; }
    out[name + "|"] = lies(stamm);
    for (const el of stamm.querySelectorAll("*")) {
      if (/^(SCRIPT|STYLE|LINK|META)$/.test(el.tagName)) continue;
      const p = name + "|" + pfad(el, stamm);
      out[p] = lies(el);
      for (const ps of ["::before", "::after"]) {
        const v = lies(el, ps);
        if (v) out[p + ps] = v;
      }
    }
  }
  return out;
}

const WURZELN = [
  ["rundenauswertung", "#winnerBox"],
  ["rundenvorbereitung", "#nextRoundBox"],
  ["faehigkeits-picker", ".v28-ability-picker"]
];

async function abzug() {
  const alles = {};
  for (const breite of BREITEN) {
    const browser = await chromium.launch();
    const seite = await browser.newPage({ viewport: { width: breite, height: 900 } });
    await seite.route("**/*", r => r.request().url().startsWith(new URL(ADRESSE).origin)
      ? r.continue()
      : r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await seite.goto(ADRESSE, { waitUntil: "load" });
    await seite.waitForTimeout(1600);

    await seite.evaluate(buehnenBauen, MARKUP);
    await seite.waitForTimeout(800);

    // Den Picker ueber seinen echten Trigger oeffnen, nicht von Hand bauen.
    const offen = await seite.evaluate(() => {
      const t = document.querySelector("#nextRoundAbilities .v28-ability-trigger");
      if (!t) return false;
      t.click();
      return true;
    });
    if (!offen) {
      console.error("Der Faehigkeits-Picker liess sich nicht oeffnen - kein Trigger gefunden.");
      console.error("Wenn js/26-v28-ui.js umgebaut wurde, muss dieses Skript nachgezogen werden.");
      await browser.close();
      process.exit(1);
    }
    await seite.waitForTimeout(600);

    alles[breite] = await seite.evaluate(abzugLesen, { felder: FELDER, wurzeln: WURZELN });
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
  console.log("Jetzt die Änderung machen, dann: node scripts/qa/laufzeit-abzug.mjs pruefen");
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
