/* Exakte Kandidatenliste fuer das Entfernen von !important.
   =========================================================
   Der Vollabzug und der Zustandsabzug bleiben der abschliessende Beweis.
   Dieses Werkzeug beantwortet davor die engere Kaskadenfrage: Welche
   !important-Markierung gewinnt irgendwo wirklich nur wegen ihrer
   Wichtigkeit?

   Dafuer liest es mit CSS.getMatchedStylesForNode die vom Browser bereits
   auf Selektoren, @media und Pseudoklassen gefilterten Regeln. Kurzformen
   werden anhand der vom DevTools-Protokoll gelieferten Langformen
   verglichen. Alle Kandidaten werden gemeinsam herabgestuft und die
   wirklich benoetigten Gewinner bis zum Fixpunkt wieder als wichtig
   eingesetzt. Das erfasst auch Ketten aus mehreren !important mit
   demselben Selektor. Nur Markierungen ausserhalb dieses Fixpunkts sind
   Entfernungskandidaten.

   Analysiert werden dieselben drei Breiten wie im Vollabzug sowie :hover,
   :focus und :active fuer dieselbe Menge bedienbarer Elemente wie im
   Zustandsabzug. Pseudoelemente, Cascade Layers, @scope und logische
   Eigenschaften behandelt das Werkzeug konservativ: ein aktiver Gewinner
   bleibt dort stehen, statt aufgrund einer unvollstaendigen Annahme als
   entfernbar zu gelten.

   Voraussetzung:
     npx http-server -p 8099 -c-1 --silent .

   Aufruf:
     node scripts/qa/important-kaskade.mjs
     node scripts/qa/important-kaskade.mjs --anwenden 04-prestige-polish.css

   Die Analyse schreibt .qa/important-kaskade.json. --anwenden akzeptiert
   genau eine Quelldatei und bricht ab, wenn deren SHA-256 nicht mehr zum
   Bericht passt. Es entfernt ausschliesslich die dort freigegebenen
   !important-Tokens; Regeln, Werte und Selektoren bleiben unangetastet. */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from "node:fs";
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

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const quellOrdner = path.join(wurzel, "src", "styles", "legacy");
const bundlePfad = path.join(wurzel, "css", "app.css");
const ablage = path.join(wurzel, ".qa");
const berichtPfad = path.join(ablage, "important-kaskade.json");
const adresse = process.env.WD_QA_URL || "http://127.0.0.1:8099/index.html";
const BREITEN = [360, 412, 1280];
const ZUSTAENDE = ["hover", "focus", "active"];
const BEDIENBAR = "button,a,input,select,textarea,[role=button],[tabindex],label," +
  ".dd-select-trigger,.campaign-node,.campaign-world-btn,.ability-list-item,.prestige-item," +
  ".achievement-card,.dice-design-card,.v28-ability-option,.boss-rush-reward-card";

const sha256 = text => createHash("sha256").update(text).digest("hex");
const kandidatSchluessel = (datei, offset) => `${datei}:${offset}`;

function importantTokens(text) {
  const tokens = [];
  let zeile = 1;
  let spalte = 1;
  let kommentar = false;
  let string = "";

  for (let i = 0; i < text.length;) {
    const c = text[i];
    const n = text[i + 1];
    if (kommentar) {
      if (c === "*" && n === "/") {
        kommentar = false;
        i += 2;
        spalte += 2;
      } else {
        if (c === "\n") { zeile++; spalte = 1; } else spalte++;
        i++;
      }
      continue;
    }
    if (string) {
      if (c === "\\") {
        if (n === "\n") { zeile++; spalte = 1; } else spalte += Math.min(2, text.length - i);
        i += Math.min(2, text.length - i);
      } else {
        if (c === string) string = "";
        if (c === "\n") { zeile++; spalte = 1; } else spalte++;
        i++;
      }
      continue;
    }
    if (c === "/" && n === "*") {
      kommentar = true;
      i += 2;
      spalte += 2;
      continue;
    }
    if (c === "\"" || c === "'") {
      string = c;
      i++;
      spalte++;
      continue;
    }
    if (text.slice(i, i + 10).toLowerCase() === "!important" &&
        !/[a-z0-9_-]/i.test(text[i + 10] || "")) {
      tokens.push({ offset: i, zeile, spalte });
      i += 10;
      spalte += 10;
      continue;
    }
    if (c === "\n") { zeile++; spalte = 1; } else spalte++;
    i++;
  }
  return tokens;
}

function quellBestand() {
  const dateien = {};
  for (const datei of readdirSync(quellOrdner).filter(n => n.endsWith(".css")).sort()) {
    const text = readFileSync(path.join(quellOrdner, datei), "utf8");
    const tokens = importantTokens(text);
    dateien[datei] = {
      text,
      sha256: sha256(text),
      tokens,
      beiOffset: new Map(tokens.map(t => [t.offset, t]))
    };
  }
  return dateien;
}

function bundleAbbildung(bundle, dateien) {
  const segmente = [];
  for (const [datei, quelle] of Object.entries(dateien)) {
    const marker = `/* ===== ${datei} ===== */\n`;
    const markerStart = bundle.indexOf(marker);
    if (markerStart < 0) throw new Error(`Bundle-Marker fehlt: ${datei}`);
    const start = markerStart + marker.length;
    const inhalt = quelle.text.trimEnd();
    if (bundle.slice(start, start + inhalt.length) !== inhalt) {
      throw new Error(`css/app.css passt nicht zur Quelle ${datei}. Zuerst build-styles ausfuehren.`);
    }
    segmente.push({ datei, start, ende: start + inhalt.length });
  }
  segmente.sort((a, b) => a.start - b.start);
  return segmente;
}

function zeilenStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  return starts;
}

function bereichOffsets(range, starts) {
  if (!range || starts[range.startLine] === undefined || starts[range.endLine] === undefined) return null;
  return {
    start: starts[range.startLine] + range.startColumn,
    ende: starts[range.endLine] + range.endColumn
  };
}

function findeQuellToken(bundle, starts, segmente, dateien, range) {
  const offsets = bereichOffsets(range, starts);
  if (!offsets) return null;
  const ausschnitt = bundle.slice(offsets.start, offsets.ende);
  const relativ = ausschnitt.toLowerCase().lastIndexOf("!important");
  if (relativ < 0) return null;
  const bundleOffset = offsets.start + relativ;
  const segment = segmente.find(s => bundleOffset >= s.start && bundleOffset < s.ende);
  if (!segment) return null;
  const quellOffset = bundleOffset - segment.start;
  const token = dateien[segment.datei].beiOffset.get(quellOffset);
  if (!token) {
    throw new Error(`!important bei Bundle-Offset ${bundleOffset} laesst sich nicht auf ${segment.datei} abbilden.`);
  }
  return kandidatSchluessel(segment.datei, quellOffset);
}

function spezifitaet(match) {
  const selektoren = match.rule.selectorList?.selectors || [];
  const passende = match.matchingSelectors || [];
  let beste = [0, 0, 0, 0];
  for (const index of passende) {
    const s = selektoren[index]?.specificity || { a: 0, b: 0, c: 0 };
    const wert = [0, s.a || 0, s.b || 0, s.c || 0];
    if (vergleicheZahlen(wert, beste) > 0) beste = wert;
  }
  return beste;
}

function vergleicheZahlen(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
  }
  return 0;
}

function kanonischerName(name) {
  return name.trim().toLowerCase();
}

function istLogisch(name) {
  return /(^|-)inline($|-)|(^|-)block($|-)|^(?:min-|max-)?(?:inline|block)-size$/.test(name);
}

function langformen(property) {
  const lang = property.longhandProperties || [];
  if (lang.length) return lang.map(p => ({ name: kanonischerName(p.name), wert: p.value }));
  return [{ name: kanonischerName(property.name), wert: property.value }];
}

function normalisierterWert(wert) {
  return String(wert || "").replace(/\s*!important\s*$/i, "").trim();
}

function deklarationenAusStyle(style, meta, kandidatFuerProperty, modus = "regel") {
  if (!style) return [];
  const ausgabe = [];
  const gesehen = new Set();
  const props = style.cssProperties || [];
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    if (p.parsedOk === false || p.disabled || p.implicit) continue;
    if (modus === "regel" && !p.range && p.text === undefined) continue;
    const lang = langformen(p);
    const kandidat = kandidatFuerProperty?.(p) || null;
    for (const { name, wert } of lang) {
      const normalisiert = normalisierterWert(wert);
      const doppelt = `${name}\0${normalisiert}\0${p.important ? 1 : 0}`;
      if (modus !== "regel" && gesehen.has(doppelt)) continue;
      gesehen.add(doppelt);
      ausgabe.push({
        name,
        wert: normalisiert,
        important: Boolean(p.important),
        kandidat,
        art: meta.art,
        ursprung: meta.ursprung,
        inline: Boolean(meta.inline),
        spezifitaet: meta.spezifitaet,
        reihenfolge: meta.reihenfolge + i,
        sonderkaskade: Boolean(meta.sonderkaskade),
        selektor: meta.selektor || ""
      });
    }
  }
  return ausgabe;
}

function bleibtWichtig(d, behalten) {
  return d.important && (!d.kandidat || behalten === null || behalten.has(d.kandidat));
}

function stufe(d, behalten) {
  if (d.art === "transition") return 5;
  const wichtig = bleibtWichtig(d, behalten);
  if (wichtig) return 4;
  if (d.art === "animation") return 3;
  return 2;
}

function ursprungsRang(d, behalten) {
  const wichtig = bleibtWichtig(d, behalten);
  if (wichtig) return d.ursprung === "user-agent" ? 3 : 2;
  return d.ursprung === "user-agent" ? 1 : 2;
}

function deklarationsVergleich(a, b, behalten) {
  const sa = stufe(a, behalten), sb = stufe(b, behalten);
  if (sa !== sb) return sa - sb;
  const oa = ursprungsRang(a, behalten), ob = ursprungsRang(b, behalten);
  if (oa !== ob) return oa - ob;
  if (a.inline !== b.inline) return Number(a.inline) - Number(b.inline);
  const sp = vergleicheZahlen(a.spezifitaet, b.spezifitaet);
  if (sp) return sp;
  return a.reihenfolge - b.reihenfolge;
}

function gewinner(liste, behalten = null) {
  let bester = null;
  for (const d of liste) {
    if (!bester || deklarationsVergleich(d, bester, behalten) > 0) bester = d;
  }
  return bester;
}

function analyseKontext({ matches, inlineStyle, attributesStyle, animationen, transition, pseudo }, hilfen) {
  const deklarationen = [];
  const kandidatenImKontext = new Set();

  for (let regelIndex = 0; regelIndex < matches.length; regelIndex++) {
    const match = matches[regelIndex];
    const regel = match.rule;
    if (!regel?.style) continue;
    const kandidatFuerProperty = p => {
      if (!p.important || !p.range || regel.styleSheetId !== hilfen.appSheetId) return null;
      const id = findeQuellToken(hilfen.bundle, hilfen.starts, hilfen.segmente, hilfen.dateien, p.range);
      if (!id) throw new Error(`Wichtige Deklaration ohne abbildbares Token: ${regel.selectorList?.text || "?"}`);
      kandidatenImKontext.add(id);
      hilfen.gesehen.add(id);
      return id;
    };
    deklarationen.push(...deklarationenAusStyle(regel.style, {
      art: "regel",
      ursprung: regel.origin || "regular",
      inline: false,
      spezifitaet: spezifitaet(match),
      reihenfolge: regelIndex * 10000,
      sonderkaskade: Boolean(regel.layers?.length || regel.scopes?.length || regel.startingStyles?.length),
      selektor: regel.selectorList?.text || ""
    }, kandidatFuerProperty));
  }

  deklarationen.push(...deklarationenAusStyle(attributesStyle, {
    art: "regel", ursprung: "regular", inline: false,
    spezifitaet: [0, 0, 0, 0], reihenfolge: -20000, sonderkaskade: false,
    selektor: "[Praesentationsattribut]"
  }, null));
  deklarationen.push(...deklarationenAusStyle(inlineStyle, {
    art: "regel", ursprung: "regular", inline: true,
    spezifitaet: [1, 0, 0, 0], reihenfolge: Number.MAX_SAFE_INTEGER / 4,
    sonderkaskade: false, selektor: "style-Attribut"
  }, null));

  for (let i = 0; i < (animationen || []).length; i++) {
    deklarationen.push(...deklarationenAusStyle(animationen[i].style, {
      art: "animation", ursprung: "regular", inline: false,
      spezifitaet: [0, 0, 0, 0], reihenfolge: Number.MAX_SAFE_INTEGER / 3 + i * 1000,
      sonderkaskade: false, selektor: `@keyframes ${animationen[i].name || "?"}`
    }, null, "berechnet"));
  }
  deklarationen.push(...deklarationenAusStyle(transition, {
    art: "transition", ursprung: "regular", inline: false,
    spezifitaet: [0, 0, 0, 0], reihenfolge: Number.MAX_SAFE_INTEGER / 2,
    sonderkaskade: false, selektor: "transition"
  }, null, "berechnet"));

  const proEigenschaft = new Map();
  for (const d of deklarationen) {
    if (!proEigenschaft.has(d.name)) proEigenschaft.set(d.name, []);
    proEigenschaft.get(d.name).push(d);
  }

  for (const [eigenschaft, liste] of proEigenschaft) {
    if (!liste.some(d => d.kandidat)) continue;
    hilfen.faelle.push({
      liste,
      eigenschaft,
      breite: hilfen.breite,
      zustand: hilfen.zustand,
      pseudo: pseudo || null,
      konservativ: Boolean(pseudo || istLogisch(eigenschaft) || liste.some(d => d.sonderkaskade))
    });
  }
}

function bestimmeFixpunkt(faelle) {
  const behalten = new Set();
  const gruende = new Map();
  let geaendert = true;
  let runde = 0;
  while (geaendert) {
    geaendert = false;
    runde++;
    for (const fall of faelle) {
      const aktuell = gewinner(fall.liste, null);
      if (!aktuell?.kandidat || behalten.has(aktuell.kandidat)) continue;
      const danach = gewinner(fall.liste, behalten);
      if (!fall.konservativ && danach?.wert === aktuell.wert) continue;
      behalten.add(aktuell.kandidat);
      gruende.set(aktuell.kandidat, {
        breite: fall.breite,
        zustand: fall.zustand,
        pseudo: fall.pseudo,
        eigenschaft: fall.eigenschaft,
        selektor: aktuell.selektor,
        danach: danach?.selektor || "Browser-Standard",
        konservativ: fall.konservativ,
        fixpunktRunde: runde
      });
      geaendert = true;
    }
  }
  return { behalten, gruende, runden: runde };
}

async function analysiereNode(cdp, nodeId, hilfen) {
  const matched = await cdp.send("CSS.getMatchedStylesForNode", { nodeId });
  const keyframeStyles = (matched.cssKeyframesRules || []).flatMap(regel =>
    (regel.keyframes || []).map(frame => ({
      name: `${regel.animationName?.text || "?"} ${frame.keyText?.text || "?"}`,
      style: frame.style
    }))
  );
  analyseKontext({
    matches: matched.matchedCSSRules || [],
    inlineStyle: matched.inlineStyle,
    attributesStyle: matched.attributesStyle,
    animationen: keyframeStyles,
    transition: null,
    pseudo: null
  }, hilfen);
  for (const pseudo of matched.pseudoElements || []) {
    analyseKontext({
      matches: pseudo.matches || [],
      inlineStyle: null,
      attributesStyle: null,
      animationen: null,
      transition: null,
      pseudo: `::${pseudo.pseudoType}${pseudo.pseudoIdentifier ? `(${pseudo.pseudoIdentifier})` : ""}`
    }, hilfen);
  }
}

async function inBloecken(liste, groesse, arbeit) {
  for (let i = 0; i < liste.length; i += groesse) {
    await Promise.all(liste.slice(i, i + groesse).map(arbeit));
  }
}

async function browserAnalyse(bundle, starts, segmente, dateien) {
  const chromium = await ladePlaywright();
  const browser = await chromium.launch();
  const gesehen = new Set();
  const faelle = [];
  let elemente = 0;
  let zustaende = 0;

  for (const breite of BREITEN) {
    const seite = await browser.newPage({ viewport: { width: breite, height: 900 } });
    await seite.route("**/*", r => r.request().url().startsWith(new URL(adresse).origin)
      ? r.continue()
      : r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await seite.goto(adresse, { waitUntil: "load" });
    await seite.waitForTimeout(1600);
    await seite.evaluate(() => {
      document.querySelectorAll("section.card, .modal, .hidden").forEach(el => el.classList.remove("hidden"));
      const stopp = document.createElement("style");
      stopp.textContent = "*,*::before,*::after{animation-play-state:paused!important;transition:none!important}";
      document.head.appendChild(stopp);
    });

    const cdp = await seite.context().newCDPSession(seite);
    const headers = new Map();
    cdp.on("CSS.styleSheetAdded", ({ header }) => headers.set(header.styleSheetId, header));
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const dokument = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
    const alle = await cdp.send("DOM.querySelectorAll", { nodeId: dokument.root.nodeId, selector: "body *" });
    const bedienbar = await cdp.send("DOM.querySelectorAll", { nodeId: dokument.root.nodeId, selector: BEDIENBAR });
    const appHeader = [...headers.values()].find(h => {
      try { return new URL(h.sourceURL).pathname.endsWith("/css/app.css"); } catch (_) { return false; }
    });
    if (!appHeader) throw new Error("DevTools meldet kein geladenes css/app.css.");

    const gemeinsam = { bundle, starts, segmente, dateien, gesehen, faelle,
      appSheetId: appHeader.styleSheetId, breite, zustand: "ruhe" };
    await inBloecken(alle.nodeIds, 24, nodeId => analysiereNode(cdp, nodeId, gemeinsam));
    elemente += alle.nodeIds.length;

    if (breite === 412) {
      for (const nodeId of bedienbar.nodeIds) {
        for (const zustand of ZUSTAENDE) {
          await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [zustand] });
          await analysiereNode(cdp, nodeId, { ...gemeinsam, zustand });
          zustaende++;
        }
        await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });
      }
    }
    await seite.close();
    console.log(`${breite}px: ${alle.nodeIds.length} Elemente, ${bedienbar.nodeIds.length} bedienbar.`);
  }
  await browser.close();
  const fixpunkt = bestimmeFixpunkt(faelle);
  return { gesehen, ...fixpunkt, elemente, zustaende, faelle: faelle.length };
}

function anwenden(datei) {
  if (!existsSync(berichtPfad)) throw new Error("Kein Bericht vorhanden. Zuerst die Analyse ausfuehren.");
  const bericht = JSON.parse(readFileSync(berichtPfad, "utf8"));
  const eintrag = bericht.dateien?.[datei];
  if (!eintrag) throw new Error(`Datei nicht im Bericht: ${datei}`);
  const pfad = path.join(quellOrdner, datei);
  const text = readFileSync(pfad, "utf8");
  if (sha256(text) !== eintrag.sha256) {
    throw new Error(`${datei} wurde seit der Analyse geaendert. Bericht neu erzeugen.`);
  }
  let neu = text;
  const kandidaten = [...eintrag.entfernbar].sort((a, b) => b.offset - a.offset);
  for (const token of kandidaten) {
    if (neu.slice(token.offset, token.offset + 10).toLowerCase() !== "!important") {
      throw new Error(`${datei}:${token.zeile}:${token.spalte}: Token stimmt nicht mehr.`);
    }
    neu = neu.slice(0, token.offset) + neu.slice(token.offset + 10);
  }
  writeFileSync(pfad, neu);
  console.log(`${datei}: ${kandidaten.length} !important entfernt; ${eintrag.behalten.length} behalten.`);
}

const anwendenIndex = process.argv.indexOf("--anwenden");
if (anwendenIndex >= 0) {
  const datei = process.argv[anwendenIndex + 1];
  if (!datei || path.basename(datei) !== datei || !datei.endsWith(".css")) {
    console.error("Aufruf: node scripts/qa/important-kaskade.mjs --anwenden DATEI.css");
    process.exit(1);
  }
  anwenden(datei);
  process.exit(0);
}

const dateien = quellBestand();
const bundle = readFileSync(bundlePfad, "utf8");
const starts = zeilenStarts(bundle);
const segmente = bundleAbbildung(bundle, dateien);
const analyse = await browserAnalyse(bundle, starts, segmente, dateien);

const bericht = {
  erzeugt: new Date().toISOString(),
  adresse,
  breiten: BREITEN,
  zustaende: ZUSTAENDE,
  bundleSha256: sha256(bundle),
  elementKontexte: analyse.elemente,
  interaktionsKontexte: analyse.zustaende,
  kaskadenFaelle: analyse.faelle,
  fixpunktRunden: analyse.runden,
  dateien: {}
};

let gesamt = 0, entfernbarGesamt = 0, behaltenGesamt = 0;
for (const [datei, quelle] of Object.entries(dateien)) {
  const entfernbar = [];
  const behalten = [];
  for (const token of quelle.tokens) {
    const id = kandidatSchluessel(datei, token.offset);
    const ziel = analyse.behalten.has(id) ? behalten : entfernbar;
    ziel.push({ ...token, gesehen: analyse.gesehen.has(id), grund: analyse.gruende.get(id) || null });
  }
  bericht.dateien[datei] = {
    sha256: quelle.sha256,
    vorher: quelle.tokens.length,
    entfernbar,
    behalten
  };
  gesamt += quelle.tokens.length;
  entfernbarGesamt += entfernbar.length;
  behaltenGesamt += behalten.length;
}
bericht.gesamt = { vorher: gesamt, entfernbar: entfernbarGesamt, behalten: behaltenGesamt };

mkdirSync(ablage, { recursive: true });
writeFileSync(berichtPfad, JSON.stringify(bericht, null, 2));
console.log("\nDatei                                      vorher  entfernbar  behalten");
for (const [datei, eintrag] of Object.entries(bericht.dateien)) {
  if (!eintrag.vorher) continue;
  console.log(`${datei.padEnd(42)}${String(eintrag.vorher).padStart(7)}${String(eintrag.entfernbar.length).padStart(12)}${String(eintrag.behalten.length).padStart(10)}`);
}
console.log(`${"GESAMT".padEnd(42)}${String(gesamt).padStart(7)}${String(entfernbarGesamt).padStart(12)}${String(behaltenGesamt).padStart(10)}`);
console.log(`Bericht: ${path.relative(wurzel, berichtPfad)}`);
