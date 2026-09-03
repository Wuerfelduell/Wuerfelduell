/* Rundenvorbereitung und Fähigkeits-Picker nachmessen.
   ==================================================================
   Wozu ein eigenes Netz: die beiden anderen Prüfmittel
   (stil-abzug.mjs, zustands-abzug.mjs) sehen diesen Bildschirm nicht.
   `#nextRoundAbilities` ist im Dokument leer und wird erst von
   `prepareNextRound()` gefüllt; die Picker-Ebene existiert überhaupt
   erst, nachdem jemand einen Trigger gedrückt hat. Wer hier etwas
   ändert, bekommt von den anderen beiden ein "IDENTISCH" zurück, das
   nichts bedeutet.

   Dieses Skript baut den Bildschirm deshalb so auf, wie
   js/14-round-flow.js ihn im Classic-Zweig erzeugt, öffnet den Picker
   über seinen echten Trigger und misst.

   Zwei Dinge, die es anders macht als eine naive Messung:

   - Kontrast wird aus den fertig gerenderten Bildpunkten gelesen, nicht
     aus `backgroundColor`. Die Ebenen unter diesen Texten malen mit
     Verläufen und Bildern; wer nur die berechnete Hintergrundfarbe
     addiert, bekommt Unsinn heraus. Beim ersten Versuch kam so 3,54
     heraus, wo in Wahrheit 4,45 und 2,47 stehen.

   - "Ragt über den Rand" und "wird abgeschnitten" werden getrennt
     gemessen. Das Symbol ragt absichtlich über die Zeile (left:-12px in
     29-v28-korrekturen.css) und liegt auf dem gemalten Rahmen. Das ist
     Gestaltung. Ein Fehler wäre es erst, wenn ein Vorfahre mit
     overflow:hidden etwas davon wegschneidet - und genau das wird hier
     gesucht. Das Häkchen ist seit V28.11.11 kein Element mehr, sondern
     der Hintergrund der Zeile, der durch die Fassung im Rahmen scheint.

   Voraussetzung: das Spiel muss lokal ausgeliefert werden.
     npx http-server -p 8099 -c-1 --silent .

   Aufruf:
     node scripts/qa/vorbereitung-abzug.mjs
*/
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/* Den Erklaertext nicht abschreiben, sondern aus der Quelle holen. Eine
   Kopie im Pruefskript veraltet still, und dann misst das Netz einen
   Text, den niemand mehr zu sehen bekommt. */
function erklaertext() {
  const quelle = readFileSync(path.join(wurzel, "js", "14-round-flow.js"), "utf8");
  const marke = "nextRoundInfo.innerHTML=`<span class=\"last-place-note\">";
  const start = quelle.indexOf(marke);
  if (start < 0) {
    console.error("Der Classic-Erklaertext wurde in js/14-round-flow.js nicht gefunden.");
    console.error("Wenn er umgebaut wurde, muss dieses Skript nachgezogen werden.");
    process.exit(1);
  }
  const ab = quelle.slice(start + "nextRoundInfo.innerHTML=`".length);
  return ab.slice(0, ab.indexOf("`;"))
    .replace(/\$\{escapeHtml\(players\[lastPlaceIndex\]\.name\)\}/g, "Bot Ferdinand");
}
const ERKLAERTEXT = erklaertext();

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

const ADRESSE = process.env.WD_QA_URL || "http://127.0.0.1:8099/index.html";
const BREITEN = [360, 412, 1280];

/* Der Bildschirm, wie prepareNextRound() ihn im Classic-Zweig baut:
   ein Erklaerabsatz, eine Karte fuer den Letztplatzierten mit Auswahl,
   eine Karte fuer alle anderen ohne. */
function aufbauen(erklaertext) {
  document.body.classList.add("playing");
  document.getElementById("nextRoundTitle").textContent = "Runde 8 vorbereiten";
  document.getElementById("nextRoundInfo").innerHTML = erklaertext;
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
  document.getElementById("winnerBox").classList.add("hidden");
  document.getElementById("nextRoundBox").classList.remove("hidden");
}

function messen() {
  const R = el => { const r = el.getBoundingClientRect();
    return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };

  /* Sucht einen Vorfahren, der wirklich beschneidet. Nur dann ist ein
     Ueberstand ein Fehler.

     Wichtig und beim ersten Versuch falsch gemacht: ein absolut
     positioniertes Element wird NICHT von jedem overflow-Vorfahren
     beschnitten, sondern nur von solchen ab seinem enthaltenden Block.
     Genau das ist hier der Fall - das Symbol im Trigger liegt in einem
     <span> mit overflow:hidden, aber der span ist position:static und
     damit nicht sein enthaltender Block. Wer das uebersieht, meldet
     einen Schnitt, den es nicht gibt. */
  const name = n => (n.id ? "#" + n.id : n.tagName.toLowerCase() + (n.className ? "." + String(n.className).split(" ")[0] : ""));
  const beschnitten = el => {
    const pos = getComputedStyle(el).position;
    const r = el.getBoundingClientRect();
    // Ein Element ohne Kaestchen kann nicht beschnitten werden. Ohne diese
    // Zeile meldete der Test das ausgeblendete Haekchen als beschnitten,
    // weil ein display:none-Element bei 0,0 mit 0x0 liegt und damit
    // rechnerisch ausserhalb jedes Kastens.
    if (r.width < 0.5 && r.height < 0.5) return null;
    let n = el.parentElement;
    let zaehlt = pos !== "absolute" && pos !== "fixed";
    while (n) {
      const c = getComputedStyle(n);
      // Ab dem enthaltenden Block zaehlt overflow wieder.
      if (!zaehlt && (c.position !== "static" || c.transform !== "none" || c.filter !== "none")) zaehlt = true;
      if (zaehlt && /hidden|clip|auto|scroll/.test(c.overflowX)) {
        const nr = n.getBoundingClientRect();
        if (r.left < nr.left - 0.5 || r.right > nr.right + 0.5)
          return name(n) + " overflow-x:" + c.overflowX;
      }
      if (c.position === "fixed") break;
      n = n.parentElement;
    }
    return null;
  };

  const out = {};
  const info = document.getElementById("nextRoundInfo");
  const ic = getComputedStyle(info);
  out.info = { ...R(info), zeichen: info.textContent.trim().length,
    zeilen: Math.round(info.getBoundingClientRect().height / parseFloat(ic.lineHeight)),
    farbe: ic.color };

  const karten = [...document.querySelectorAll("#nextRoundAbilities .round-prep-player")];
  out.karten = karten.map(k => ({ ...R(k), kinder: k.children.length }));
  const notiz = document.querySelector("#nextRoundAbilities .round-prep-player .round-note");
  out.notiz = { ...R(notiz), farbe: getComputedStyle(notiz).color };

  const trigger = document.querySelector("#nextRoundAbilities .v28-ability-trigger");
  if (trigger) {
    const karte = trigger.closest(".round-prep-player");
    const ikon = trigger.querySelector("img, .dd-trigger-icon, .v28-icon");
    out.trigger = { ...R(trigger), karteLinks: R(karte).l,
      ikon: ikon ? { ...R(ikon), ueberZeile: Math.max(0, R(trigger).l - R(ikon).l),
        abstandZurKarte: R(ikon).l - R(karte).l, beschnitten: beschnitten(ikon) } : null };
  }

  const p = document.querySelector(".v28-ability-picker");
  if (p && !p.classList.contains("hidden")) {
    const panel = p.querySelector(".v28-ability-picker-panel");
    const kopf = p.querySelector(".v28-ability-picker-head");
    const liste = p.querySelector(".v28-ability-picker-list");
    const zu = p.querySelector(".v28-ability-picker-close");
    const opt = p.querySelector(".v28-ability-option");
    const pr = R(panel), lr = R(liste), kr = R(kopf), zr = R(zu);
    out.picker = {
      panel: pr, kopf: kr, liste: lr, schliessen: zr,
      obenVerdeckt: Math.max(0, kr.b - lr.t),
      untenVerdeckt: Math.max(0, lr.b - zr.t),
      ueberPanel: Math.max(0, lr.b - pr.b),
      scrollt: liste.scrollHeight > liste.clientHeight + 1,
      kopfLeerOben: R(p.querySelector(".v28-ability-picker-kicker")).t - kr.t,
      kopfVorher: getComputedStyle(kopf, "::before").content
    };
    if (opt) {
      const or = R(opt);
      const ikon = opt.querySelector(".v28-icon"), haken = opt.querySelector(".v28-check");
      out.picker.zeile = {
        option: or,
        ikonUeberZeile: ikon ? Math.max(0, or.l - R(ikon).l) : null,
        ikonUeberPanel: ikon ? Math.max(0, pr.l - R(ikon).l) : null,
        ikonBeschnitten: ikon ? beschnitten(ikon) : null,
        hakenUeberZeile: haken ? Math.max(0, R(haken).r - or.r) : null,
        hakenUeberPanel: haken ? Math.max(0, R(haken).r - pr.r) : null,
        hakenBeschnitten: haken ? beschnitten(haken) : null
      };
    }
  }

  /* Der behauptete unstilisierte schwarze Kreis. */
  out.kreise = [...document.querySelectorAll("#nextRoundBox *")].filter(el => {
    const c = getComputedStyle(el), r = el.getBoundingClientRect();
    return r.width > 8 && r.width < 40 && Math.abs(r.width - r.height) < 3 &&
      parseFloat(c.borderRadius) >= r.width / 2 - 2;
  }).map(el => (el.id ? "#" + el.id : "." + String(el.className).split(" ")[0]));

  /* Fuer die Kontrastmessung: wo liegen die Textfelder im Bild. */
  out.felder = [
    { name: "nextRoundInfo", ...R(info), farbe: ic.color },
    { name: "round-note in Karte", ...R(notiz), farbe: getComputedStyle(notiz).color }
  ];
  return out;
}

/* Kontrast aus den gerenderten Bildpunkten. Der Grund wird an einem
   zweiten Bild gelesen, auf dem die Schrift unsichtbar geschaltet ist -
   sonst ist bei kleinen Feldern die haeufigste Farbe die Schrift selbst
   und der Kontrast kommt als 1 heraus. Die Textfarbe stammt aus der
   berechneten color, nicht aus dem Bild. */
async function kontraste(browser, png, felder) {
  const leser = await browser.newPage();
  await leser.setContent("<canvas id=c></canvas>");
  const werte = await leser.evaluate(async ({ b64, felder }) => {
    const bild = new Image();
    await new Promise(ok => { bild.onload = ok; bild.src = "data:image/png;base64," + b64; });
    const c = document.getElementById("c"); c.width = bild.width; c.height = bild.height;
    const ctx = c.getContext("2d"); ctx.drawImage(bild, 0, 0);
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = ([r, g, b]) => 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    const K = (a, b) => { const x = L(a), y = L(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
    return felder.map(fe => {
      if (fe.w <= 0 || fe.h <= 0) return { name: fe.name, fehlt: true };
      const d = ctx.getImageData(fe.l, fe.t, fe.w, fe.h).data;
      const zaehler = new Map();
      for (let i = 0; i < d.length; i += 4) {
        const k = `${d[i]},${d[i + 1]},${d[i + 2]}`;
        zaehler.set(k, (zaehler.get(k) || 0) + 1);
      }
      const grund = [...zaehler.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map(Number);
      const text = (fe.farbe.match(/\d+/g) || []).slice(0, 3).map(Number);
      return { name: fe.name, text: text.join(","), grund: grund.join(","), kontrast: K(text, grund) };
    });
  }, { b64: png.toString("base64"), felder });
  await leser.close();
  return werte;
}

const browser = await chromium.launch();
let maengel = 0;

for (const breite of BREITEN) {
  const seite = await browser.newPage({ viewport: { width: breite, height: 900 }, deviceScaleFactor: 1 });
  await seite.route("**/*", r => r.request().url().startsWith(new URL(ADRESSE).origin)
    ? r.continue()
    : r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await seite.goto(ADRESSE, { waitUntil: "load" });
  await seite.waitForTimeout(1500);

  await seite.evaluate(aufbauen, ERKLAERTEXT);
  await seite.waitForTimeout(700);

  // Grundbild: Schrift unsichtbar, damit die haeufigste Farbe im Feld
  // wirklich der Untergrund ist. Danach wieder zurueckgenommen.
  await seite.evaluate(() => {
    const s = document.createElement("style");
    s.id = "qa-schrift-aus";
    s.textContent = "#nextRoundBox,#nextRoundBox *{color:transparent!important;text-shadow:none!important}";
    document.head.appendChild(s);
  });
  await seite.waitForTimeout(200);
  const png = await seite.screenshot({ type: "png" });   // vor dem Picker, sonst deckt er alles zu
  await seite.evaluate(() => document.getElementById("qa-schrift-aus")?.remove());
  await seite.waitForTimeout(200);

  await seite.evaluate(() => {
    const t = document.querySelector("#nextRoundAbilities .v28-ability-trigger");
    if (t) t.click();
  });
  await seite.waitForTimeout(600);

  const m = await seite.evaluate(messen);
  const k = await kontraste(browser, png, m.felder);
  await seite.close();

  console.log(`\n================ ${breite} px ================`);
  const zeile = (ok, text) => { if (!ok) maengel++; console.log(`  ${ok ? "ok       " : "ABWEICHUNG"} ${text}`); };

  /* Warum fuenf und nicht vier: vier Zeilen sind bei 360 Pixeln nur mit
     Telegrammdeutsch zu halten ("Andere: W25, nur 6 waehlt frei"). Fuenf
     Zeilen lassen jede Regel auf ihrer eigenen Zeile stehen und bleiben
     lesbar - gemessen 101px statt 162px. */
  zeile(m.info.zeilen <= 5, `Erklaerabsatz: ${m.info.zeichen} Zeichen auf ${m.info.zeilen} Zeilen (${m.info.h}px). Soll: hoechstens 5 Zeilen.`);
  for (const kk of k) {
    const soll = 4.5;
    zeile(kk.kontrast >= soll, `Kontrast ${kk.name}: ${kk.kontrast} (Text ${kk.text} auf ${kk.grund}). Soll: >= ${soll}.`);
  }
  if (m.trigger?.ikon) {
    zeile(m.trigger.ikon.beschnitten === null,
      `Symbol der Faehigkeitszeile: ragt ${m.trigger.ikon.ueberZeile}px ueber die Zeile (gewollt), ` +
      `Abstand zur Kartenkante ${m.trigger.ikon.abstandZurKarte}px, ` +
      (m.trigger.ikon.beschnitten ? `BESCHNITTEN von ${m.trigger.ikon.beschnitten}` : "nicht beschnitten"));
    zeile(m.trigger.ikon.abstandZurKarte >= 4,
      `Luft zwischen Symbol und Kartenkante: ${m.trigger.ikon.abstandZurKarte}px. Soll: >= 4px.`);
  }
  if (m.picker?.zeile) {
    const z = m.picker.zeile;
    zeile(m.picker.obenVerdeckt === 0 && m.picker.untenVerdeckt === 0 && m.picker.ueberPanel === 0,
      `Picker-Liste: oben verdeckt ${m.picker.obenVerdeckt}px, unten ${m.picker.untenVerdeckt}px, ueber Panel ${m.picker.ueberPanel}px, scrollt ${m.picker.scrollt}.`);
    zeile(z.ikonBeschnitten === null && z.hakenBeschnitten === null,
      `Zeilenschmuck: Symbol ${z.ikonUeberZeile}px links ueber die Zeile (gewollt), ` +
      `Haken ${z.hakenUeberZeile === 0 ? "als Hintergrund in der Fassung" : z.hakenUeberZeile + "px rechts ueber die Zeile"}; ` +
      `beschnitten: ${z.ikonBeschnitten || "nein"} / ${z.hakenBeschnitten || "nein"}.`);
    zeile(z.ikonUeberPanel === 0 && z.hakenUeberPanel === 0,
      `Ueber den Panelrand hinaus: Symbol ${z.ikonUeberPanel}px, Haken ${z.hakenUeberPanel}px. Soll: 0.`);
    zeile(m.picker.kopfVorher === "none" && m.picker.kopfLeerOben <= 6,
      `Picker-Kopf: ::before ${m.picker.kopfVorher}, Leerraum ueber dem Kicker ${m.picker.kopfLeerOben}px.`);
  }
  zeile(m.kreise.length === 0, `Runde Elemente im Bildschirm: ${m.kreise.length ? m.kreise.join(", ") : "keine"}.`);
  zeile(true, `Spielerkarten: ${m.karten.map(x => `${x.h}px/${x.kinder} Kinder`).join(" und ")} - der Unterschied ist die Spielregel, kein Fehler.`);
}

await browser.close();
console.log(maengel === 0
  ? "\nAlle Sollwerte erfuellt."
  : `\n${maengel} Abweichungen ueber ${BREITEN.length} Breiten.`);
