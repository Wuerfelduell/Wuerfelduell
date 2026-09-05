/* Diagnose nach dem !important-Abbau: Welche Entfernung war blind?
   ==================================================================
   important-kaskade.mjs hat jede Markierung gegen die Elemente geprueft,
   die im statischen Dokument stehen - mit CSS.getMatchedStylesForNode,
   also mit der echten Kaskade des Browsers. Eine Regel, die dort kein
   Element traf, gewann nirgends und verlor ihre Markierung. Das war bei
   .hidden so (die Abzuege nehmen die Klasse allen Elementen weg), bei
   .die.attack-hit (Wuerfel entstehen erst in renderDice) und bei
   .v28-native-ability-select (das Feld entsteht erst in enhance()).
   Dreimal dasselbe Muster: eine Zustandsregel aus einer fruehen Schicht,
   die ohne !important von einer allgemeineren Regel aus einer spaeteren
   Schicht ueberstimmt wird - auf Elementen, die es beim Pruefen nicht gab.

   Dieses Werkzeug dreht die Frage um. Es braucht kein Element im Dokument.
   Fuer jede Deklaration, die zwischen zwei Buendelstaenden ihr !important
   verloren hat, sucht es Konkurrenten derselben Eigenschaft, die ohne die
   Markierung gewinnen wuerden (hoehere Spezifitaet, oder gleiche und
   spaeter, oder selbst !important). Fuer jedes plausible Paar baut es ein
   Element, das BEIDE Selektoren erfuellt - Klassen, Id, Tag und Vorfahren
   beider Seiten zusammengelegt - und liest die Eigenschaft einmal unter
   dem alten und einmal unter dem neuen Stylesheet. Weichen die Werte ab,
   war die Entfernung an dieser Elementform nicht wirkungsgleich.

   Plausibel heisst: die beiden Regeln koennen dasselbe Element treffen.
   Grad A: die Subjekte teilen ein Token (.die.attack-hit und .die).
   Grad B: im echten Dokument gibt es ein Element, das beide Subjekte
   traegt (#gamblingModal.hidden). Alles andere wird nicht gebaut - ein
   div.die.round-note gibt es im Spiel nicht.

   Was das Werkzeug NICHT sieht: Pseudoklassen wie :hover werden fuer den
   Aufbau gestrichen (dafuer gibt es zustands-abzug.mjs), Geschwister-
   Kombinatoren (+, ~) werden uebersprungen und gezaehlt, und
   Kindkombinatoren (>) werden wie Nachfahren gebaut - das kann einen
   Treffer verschlucken, nie einen erfinden.

   Es hat sich an den drei bekannten Faellen zu beweisen: .hidden display,
   .die.attack-hit border-color, .v28-native-ability-select width muessen
   in der Liste stehen. Stehen sie nicht drin, taugt die Liste nichts.

   Voraussetzung:
     npx http-server -p 8099 -c-1 --silent .
   Aufruf:
     node scripts/qa/important-diagnose.mjs <alt.css> [neu.css]
     (neu.css: Standard css/app.css)
   Schreibt .qa/important-diagnose.json und druckt die Fundliste. */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

async function ladePlaywright() {
  for (const ort of ["playwright", "playwright-core",
    "/opt/node22/lib/node_modules/playwright/index.mjs",
    "/usr/lib/node_modules/playwright/index.mjs",
    "/usr/local/lib/node_modules/playwright/index.mjs"]) {
    try { return (await import(ort)).chromium; } catch (_) { /* naechster */ }
  }
  console.error("Playwright nicht gefunden. Installieren mit:  npm i -D playwright");
  process.exit(1);
}
const chromium = await ladePlaywright();

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ADRESSE = process.env.WD_QA_URL || "http://127.0.0.1:8099/index.html";
const altPfad = process.argv[2];
const neuPfad = process.argv[3] || path.join(wurzel, "css", "app.css");
if (!altPfad) {
  console.error("Aufruf: node scripts/qa/important-diagnose.mjs <alt.css> [neu.css]");
  process.exit(1);
}
const ALT = readFileSync(altPfad, "utf8");
const NEU = readFileSync(neuPfad, "utf8");
const BREITEN = [360, 412, 1280];

/* Alles Weitere laeuft im Browser: er parst beide Stylesheets ueber das
   CSSOM (Kurzformen kommen dort bereits als Langformen an), baut die
   Elementformen und liest die berechneten Werte. */
const imBrowser = ({ alt, neu, breite }) => {
  // ---- 1. Stylesheets einhaengen, das eigene der Seite abschalten ----
  for (const l of document.querySelectorAll('link[rel="stylesheet"]')) l.disabled = true;
  for (const s of document.querySelectorAll("style[data-diag]")) s.remove();
  const mach = (txt, name) => { const s = document.createElement("style"); s.dataset.diag = name; s.textContent = txt; document.head.appendChild(s); return s; };
  const sAlt = mach(alt, "alt"), sNeu = mach(neu, "neu");
  sNeu.disabled = true;

  // ---- 2. Deklarationen einsammeln ----
  const sammeln = (sheet) => {
    const aus = []; let ord = 0;
    const lauf = (regeln, medien) => {
      for (const r of regeln) {
        if (r.type === CSSRule.STYLE_RULE) {
          const st = r.style;
          for (let i = 0; i < st.length; i++) {
            const p = st[i];
            aus.push({ sel: r.selectorText, medien, prop: p, wert: st.getPropertyValue(p), wichtig: st.getPropertyPriority(p) === "important", ord: ord++ });
          }
        } else if (r.cssRules && r.type !== CSSRule.KEYFRAMES_RULE) {
          lauf(r.cssRules, medien + (r.conditionText ? "|" + r.conditionText : ""));
        }
      }
    };
    lauf(sheet.cssRules, "");
    return aus;
  };
  const dAlt = sammeln(sAlt.sheet), dNeu = sammeln(sNeu.sheet);

  // ---- 3. Verlorene Markierungen: gleiche (sel, medien, prop, wert), n-tes Vorkommen ----
  const schluessel = d => d.sel + "" + d.medien + "" + d.prop + "" + d.wert;
  const zaehlAlt = new Map(), neuNachSchluessel = new Map();
  for (const d of dNeu) { const k = schluessel(d); if (!neuNachSchluessel.has(k)) neuNachSchluessel.set(k, []); neuNachSchluessel.get(k).push(d); }
  const verloren = [];
  for (const d of dAlt) {
    if (!d.wichtig) continue;
    const k = schluessel(d); const n = zaehlAlt.get(k) || 0; zaehlAlt.set(k, n + 1);
    const gegen = (neuNachSchluessel.get(k) || [])[n];
    if (gegen && !gegen.wichtig) verloren.push(gegen);
  }

  // ---- 4. Selektoren zerlegen ----
  const teileListe = s => { const t = []; let tiefe = 0, akt = ""; for (const c of s) { if (c === "(") tiefe++; if (c === ")") tiefe--; if (c === "," && tiefe === 0) { t.push(akt.trim()); akt = ""; } else akt += c; } if (akt.trim()) t.push(akt.trim()); return t; };
  const zerlege = (komplex) => {
    // in Verbindungen (Compounds) mit Kombinatoren
    const teile = []; let akt = ""; let komb = " "; let tiefe = 0;
    const schieb = () => { if (akt.trim()) teile.push({ komb, txt: akt.trim() }); akt = ""; };
    for (let i = 0; i < komplex.length; i++) {
      const c = komplex[i];
      if (c === "(" || c === "[") tiefe++;
      if (c === ")" || c === "]") tiefe--;
      if (tiefe === 0 && (c === " " || c === ">" || c === "+" || c === "~")) {
        schieb();
        let k = c === " " ? " " : c; let j = i;
        while (j + 1 < komplex.length && /[\s>+~]/.test(komplex[j + 1])) { j++; if (komplex[j] !== " ") k = komplex[j]; }
        i = j; komb = k; akt = "";
        continue;
      }
      akt += c;
    }
    schieb();
    // erster Compound bekommt keinen Kombinator
    return teile.map((t, i) => ({ ...t, komb: i === 0 ? "" : t.komb }));
  };
  const lesCompound = (txt) => {
    const o = { tag: "", id: "", klassen: [], attrs: [], pseudoEl: "", gestrichen: [] };
    let s = txt;
    const pe = s.match(/::?(before|after|marker|placeholder|selection|backdrop|first-letter|first-line)\b/);
    if (pe) { o.pseudoEl = "::" + pe[1]; s = s.replace(pe[0], ""); }
    // Pseudoklassen mit Klammern (auch verschachtelt) entfernen
    let vorher; do { vorher = s; s = s.replace(/:[a-zA-Z-]+\([^()]*\)/g, m => { o.gestrichen.push(m); return ""; }); } while (s !== vorher);
    s = s.replace(/:[a-zA-Z-]+/g, m => { o.gestrichen.push(m); return ""; });
    s = s.replace(/\[([^\]]+)\]/g, (m, inner) => { o.attrs.push(inner); return ""; });
    s = s.replace(/#([\w-]+)/g, (m, id) => { o.id = id; return ""; });
    s = s.replace(/\.([\w-]+)/g, (m, k) => { o.klassen.push(k); return ""; });
    s = s.trim(); if (s && s !== "*") o.tag = s.toLowerCase();
    return o;
  };
  const spezifitaet = (komplex) => {
    let a = 0, b = 0, c = 0;
    const s = komplex.replace(/::?(before|after|marker|placeholder|selection|backdrop|first-letter|first-line)\b/g, () => { c++; return ""; });
    a += (s.match(/#[\w-]+/g) || []).length;
    b += (s.match(/\.[\w-]+/g) || []).length + (s.match(/\[[^\]]+\]/g) || []).length;
    b += (s.match(/:(?!not|is|where|has)[a-zA-Z-]+/g) || []).length;
    c += (s.replace(/\[[^\]]+\]/g, "").replace(/:[a-zA-Z-]+(\([^)]*\))?/g, "").match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) || []).length;
    return a * 10000 + b * 100 + c;
  };

  // ---- 5. Index des echten Dokuments fuer Grad B ----
  const echt = []; for (const el of document.querySelectorAll("body *")) {
    if (el.closest("[data-diag-wurzel]")) continue;
    const t = new Set([el.tagName.toLowerCase()]); if (el.id) t.add("#" + el.id); for (const k of el.classList) t.add("." + k); echt.push(t);
  }
  const tokens = c => { const t = []; if (c.tag) t.push(c.tag); if (c.id) t.push("#" + c.id); for (const k of c.klassen) t.push("." + k); return t; };
  const gradB = (c1, c2) => { const need = [...new Set([...tokens(c1), ...tokens(c2)])]; return echt.some(s => need.every(x => s.has(x))); };

  // ---- 6. Konkurrenten je Langform-Eigenschaft (neuer Stand) ----
  const proProp = new Map();
  for (const d of dNeu) { if (!proProp.has(d.prop)) proProp.set(d.prop, []); proProp.get(d.prop).push(d); }

  // ---- 7. Paare bilden und bauen ----
  const wurzelEl = document.createElement("div"); wurzelEl.setAttribute("data-diag-wurzel", "1"); document.body.appendChild(wurzelEl);
  const bodyKlassenUr = [...document.body.classList];
  const htmlAttrsUr = [...document.documentElement.attributes].map(a => [a.name, a.value]);
  const funde = []; let paare = 0, uebersprungen = 0, gebaut = 0;
  const gesehen = new Set();

  // [name], [name=v], [name^=v], [name$=v], [name*=v], [name~=v], [name|=v] -
  // fuer den Aufbau reicht es, den Wert so zu setzen, dass der Vergleich zutrifft.
  const setzAttr = (el, spec) => {
    const m = spec.match(/^\s*([\w:-]+)\s*(?:([~|^$*]?=)\s*(.*))?$/);
    if (!m) return;
    const name = m[1]; let wert = (m[3] || "").trim().replace(/^["']|["']$/g, "").replace(/\s+[iIsS]$/, "");
    try { el.setAttribute(name, wert); } catch (_) { /* ungueltiger Name */ }
  };
  const anwenden = (compounds) => {
    // Vorfahren beider Selektoren: html/body direkt, Rest als verschachtelte Kette
    let eltern = wurzelEl;
    for (const c of compounds) {
      if (c.tag === "html" || c.klassen.includes("root")) { for (const a of c.attrs) setzAttr(document.documentElement, a); for (const k of c.klassen) document.documentElement.classList.add(k); continue; }
      if (c.tag === "body") { for (const k of c.klassen) document.body.classList.add(k); for (const a of c.attrs) setzAttr(document.body, a); continue; }
      const el = document.createElement(c.tag || "div"); if (c.id) el.id = c.id; for (const k of c.klassen) el.classList.add(k);
      for (const a of c.attrs) setzAttr(el, a);
      eltern.appendChild(el); eltern = el;
    }
    return eltern;
  };
  const aufraeumen = () => { wurzelEl.innerHTML = ""; document.body.className = bodyKlassenUr.join(" "); for (const a of [...document.documentElement.attributes]) document.documentElement.removeAttribute(a.name); for (const [n, v] of htmlAttrsUr) document.documentElement.setAttribute(n, v); };
  const lies = (el, pseudo, prop) => getComputedStyle(el, pseudo || undefined).getPropertyValue(prop);

  for (const v of verloren) {
    for (const vs of teileListe(v.sel)) {
      if (/[+~]/.test(vs.replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, ""))) { uebersprungen++; continue; }
      const vKette = zerlege(vs).map(t => lesCompound(t.txt)); const vSub = vKette[vKette.length - 1];
      const vSpez = spezifitaet(vs);
      for (const k of proProp.get(v.prop) || []) {
        if (k === v || (k.sel === v.sel && k.medien === v.medien && k.ord === v.ord)) continue;
        // gewinnt der Konkurrent ohne die Markierung?
        for (const ks of teileListe(k.sel)) {
          const kSpez = spezifitaet(ks);
          const gewinnt = k.wichtig || kSpez > vSpez || (kSpez === vSpez && k.ord > v.ord);
          if (!gewinnt) continue;
          if (/[+~]/.test(ks.replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, ""))) { uebersprungen++; continue; }
          const kKette = zerlege(ks).map(t => lesCompound(t.txt)); const kSub = kKette[kKette.length - 1];
          if (vSub.pseudoEl !== kSub.pseudoEl) continue;
          if (vSub.tag && kSub.tag && vSub.tag !== kSub.tag) continue;
          if (vSub.id && kSub.id && vSub.id !== kSub.id) continue;
          const tv = tokens(vSub), tk = tokens(kSub);
          const geteilt = tv.some(x => tk.includes(x));
          let grad = geteilt ? "A" : (gradB(vSub, kSub) ? "B" : null);
          if (!grad) continue;
          paare++;
          const id = vs + "|" + v.medien + "|" + v.prop + "|" + ks;
          if (gesehen.has(id)) continue; gesehen.add(id);
          // bauen: Vorfahren beider Ketten, dann das gemeinsame Subjekt
          const sub = { tag: vSub.tag || kSub.tag, id: vSub.id || kSub.id, klassen: [...new Set([...vSub.klassen, ...kSub.klassen])], attrs: [...new Set([...vSub.attrs, ...kSub.attrs])], pseudoEl: vSub.pseudoEl };
          const kette = [...vKette.slice(0, -1), ...kKette.slice(0, -1), sub];
          const el = anwenden(kette); gebaut++;
          sNeu.disabled = true; sAlt.disabled = false;
          const wAlt = lies(el, sub.pseudoEl, v.prop);
          sAlt.disabled = true; sNeu.disabled = false;
          const wNeu = lies(el, sub.pseudoEl, v.prop);
          aufraeumen();
          if (wAlt !== wNeu) funde.push({ regel: vs, medien: v.medien, prop: v.prop, wertRegel: v.wert, konkurrent: ks, konkurrentWichtig: k.wichtig, grad, alt: wAlt, neu: wNeu, breite });
        }
      }
    }
  }
  sAlt.disabled = false; sNeu.disabled = true;
  wurzelEl.remove();
  return { verloren: verloren.length, paare, gebaut, uebersprungen, funde };
};

const browser = await chromium.launch();
const alle = []; let stat = null;
for (const breite of BREITEN) {
  const seite = await browser.newPage({ viewport: { width: breite, height: 900 } });
  await seite.route("**/*", r => r.request().url().startsWith(new URL(ADRESSE).origin) ? r.continue() : r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await seite.goto(ADRESSE, { waitUntil: "load" });
  await seite.waitForTimeout(1500);
  const erg = await seite.evaluate(imBrowser, { alt: ALT, neu: NEU, breite });
  stat = stat || erg;
  alle.push(...erg.funde);
  console.error(`${breite}px: ${erg.verloren} verlorene Markierungen, ${erg.paare} plausible Paare, ${erg.gebaut} gebaut, ${erg.uebersprungen} uebersprungen, ${erg.funde.length} Abweichungen`);
  await seite.close();
}
await browser.close();

// Nach Regel+Eigenschaft buendeln
const gruppen = new Map();
for (const f of alle) {
  const k = f.regel + " → " + f.prop;
  if (!gruppen.has(k)) gruppen.set(k, { regel: f.regel, medien: f.medien, prop: f.prop, wertRegel: f.wertRegel, konkurrenten: new Map(), breiten: new Set(), grad: f.grad });
  const g = gruppen.get(k); g.breiten.add(f.breite); if (f.grad === "A") g.grad = "A";
  const kk = f.konkurrent; if (!g.konkurrenten.has(kk)) g.konkurrenten.set(kk, { alt: f.alt, neu: f.neu, wichtig: f.konkurrentWichtig });
}
const liste = [...gruppen.values()].sort((a, b) => (a.grad > b.grad ? 1 : a.grad < b.grad ? -1 : a.regel.localeCompare(b.regel)));
mkdirSync(path.join(wurzel, ".qa"), { recursive: true });
writeFileSync(path.join(wurzel, ".qa", "important-diagnose.json"), JSON.stringify(liste.map(g => ({ ...g, konkurrenten: [...g.konkurrenten.entries()], breiten: [...g.breiten] })), null, 1));

console.log(`\n${liste.length} Regel/Eigenschaft-Paare, deren !important-Verlust an einer plausiblen Elementform den berechneten Wert aendert.\n`);
for (const g of liste) {
  console.log(`[${g.grad}] ${g.regel}${g.medien ? "  @" + g.medien.slice(1) : ""}`);
  console.log(`     ${g.prop}: ${g.wertRegel}   (${[...g.breiten].join("/")}px)`);
  for (const [ks, w] of g.konkurrenten) console.log(`     verliert gegen  ${ks}${w.wichtig ? "  [!important]" : ""}\n        alt: ${w.alt.slice(0, 70)}\n        neu: ${w.neu.slice(0, 70)}`);
}
