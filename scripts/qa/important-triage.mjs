/* Triage der Diagnose-Funde.
   ==================================================================
   important-diagnose.mjs liefert tausende Paare. Die meisten davon sind
   Elementformen, die ein Selektor zwar zulaesst, die das Spiel aber nie
   baut. Diese Datei sortiert nach dem, was zaehlt:

   1. Laufzeit-Plausibilitaet. Die Klassen, die JavaScript zur Laufzeit
      setzt (classList.add/toggle, className=, class="..." in Vorlagen),
      stehen in einer Liste. Ein Fund, dessen Regel-Subjekt nur aus
      solchen Klassen plus Klassen des Konkurrenten besteht, ist genau
      das Muster der drei bekannten Faelle: Zustandsklasse trifft
      Grundregel. Er bekommt die hoechste Stufe.
   2. Gefaehrlichkeit der Eigenschaft. display, visibility, opacity,
      pointer-events, position, width/height, z-index, transform,
      border-color, background, color vor allem anderen.
   3. Anzahl Breiten, auf denen es abweicht.

   Aufruf:
     node scripts/qa/important-triage.mjs [laufzeit-klassen.txt] [diagnose.json]
*/
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const klassenPfad = process.argv[2] || "/var/tmp/laufzeit-klassen.txt";
const jsonPfad = process.argv[3] || path.join(wurzel, ".qa", "important-diagnose.json");
const laufzeit = new Set(readFileSync(klassenPfad, "utf8").split(/\r?\n/).filter(Boolean));
const funde = JSON.parse(readFileSync(jsonPfad, "utf8"));

const GEFAHR = { display: 10, visibility: 10, opacity: 9, "pointer-events": 9, position: 8, "z-index": 8,
  width: 7, height: 7, "min-width": 6, "max-width": 6, "min-height": 6, "max-height": 6, transform: 7,
  "border-image-source": 7, "border-image-slice": 6, "border-image-width": 6,
  "background-image": 6, "background-color": 6, color: 6, "border-top-color": 5, "border-right-color": 5,
  "border-bottom-color": 5, "border-left-color": 5, "box-shadow": 5, filter: 5, "font-size": 4,
  padding: 3, margin: 3, inset: 5, top: 5, left: 5, right: 5, bottom: 5, overflow: 6, "overflow-x": 6, "overflow-y": 6 };
const gefahr = p => GEFAHR[p] ?? (p.startsWith("border-") ? 4 : p.startsWith("padding-") || p.startsWith("margin-") ? 3 : 2);

const subjektKlassen = sel => {
  const teile = sel.trim().split(/\s*[>+~]\s*|\s+/).filter(Boolean);
  const sub = teile[teile.length - 1] || "";
  return (sub.match(/\.[\w-]+/g) || []).map(s => s.slice(1));
};
const zustandsanteil = sel => {
  const k = subjektKlassen(sel);
  if (!k.length) return 0;
  return k.filter(x => laufzeit.has(x)).length / k.length;
};

const bewertet = funde.map(g => {
  const zs = zustandsanteil(g.regel);
  const hatZustand = subjektKlassen(g.regel).some(x => laufzeit.has(x));
  const stufe = (g.grad === "A" && hatZustand) ? 1 : (hatZustand ? 2 : (g.grad === "A" ? 3 : 4));
  const punkte = (5 - stufe) * 100 + gefahr(g.prop) * 5 + g.breiten.length;
  return { ...g, stufe, zs, punkte };
}).sort((a, b) => b.punkte - a.punkte);

const stufen = [1, 2, 3, 4].map(s => bewertet.filter(b => b.stufe === s).length);
console.log(`${bewertet.length} Funde. Stufe 1 (Zustandsklasse + geteiltes Token): ${stufen[0]} · Stufe 2 (Zustandsklasse, Grad B): ${stufen[1]} · Stufe 3 (geteiltes Token, keine Zustandsklasse): ${stufen[2]} · Stufe 4: ${stufen[3]}\n`);
const zeige = (liste, n, titel) => {
  console.log(`=== ${titel} (${liste.length}, zeige ${Math.min(n, liste.length)}) ===`);
  for (const g of liste.slice(0, n)) {
    console.log(`\n${g.regel}${g.medien ? "   @" + g.medien.slice(1) : ""}`);
    console.log(`   ${g.prop}: ${g.wertRegel}   [${g.breiten.join("/")}px]`);
    for (const [ks, w] of g.konkurrenten.slice(0, 3)) console.log(`   ← ${ks}${w.wichtig ? " [!important]" : ""}   alt ${String(w.alt).slice(0, 40)} → neu ${String(w.neu).slice(0, 40)}`);
    if (g.konkurrenten.length > 3) console.log(`   … +${g.konkurrenten.length - 3} Konkurrenten`);
  }
  console.log("");
};
zeige(bewertet.filter(b => b.stufe === 1), 60, "STUFE 1");
zeige(bewertet.filter(b => b.stufe === 2), 30, "STUFE 2");
// Verdichtung: welche Regel-Selektoren (ohne Eigenschaft) tauchen in Stufe 1/2 auf?
const regeln = new Map();
for (const b of bewertet.filter(b => b.stufe <= 2)) { const k = b.regel; regeln.set(k, (regeln.get(k) || 0) + 1); }
console.log(`=== Betroffene Regeln in Stufe 1+2: ${regeln.size} ===`);
for (const [r, n] of [...regeln.entries()].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(3)}  ${r}`);
