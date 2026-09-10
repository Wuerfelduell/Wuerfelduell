/* Versionswechsel: nur die echten Marker anfassen.
   ------------------------------------------------------------------
   Aufruf:  node scripts/bump-version.mjs 28.12.0

   Warum es dieses Skript gibt: bis V28.7.3 wurde eine Version mit
   `sed 's/alt/neu/g' index.html` hochgezogen. Das trifft aber nicht nur
   die Marker, sondern jedes Vorkommen der Zeichenkette — also auch die
   Ueberschrift eines Changelog-Eintrags. So wurde derselbe Eintrag
   zweimal umetikettiert (V28.7.1 -> V28.7.2 -> V28.7.3), und die
   Release-Notizen von 28.7.1 und 28.7.2 waren verschwunden, bevor sie
   jemand vermisst hat.

   Dieses Skript aendert deshalb ausschliesslich benannte Stellen und
   fasst den Changelog nie an. Es schreibt auch keinen Eintrag — das
   bleibt Handarbeit, denn nur der Autor weiss, was das Release
   ausmacht. `scripts/verify-build.mjs` prueft danach, dass der neueste
   Eintrag zur Version passt.

   Was NICHT angefasst wird: die Bild-`?v=` in HTML, Manifest und CSS sowie
   ASSET_REV in js/01-config.js. Alle Bild-URLs teilen diesen einen
   Cache-Schluessel. Bei einer Asset-Revision muessen ASSET_REV und alle
   Bild-Queries in HTML, Manifest und CSS gemeinsam aktualisiert werden; ein
   App-Versionswechsel allein aendert den Bild-Cache nicht. */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argumente = process.argv.slice(2);
const assetModus = argumente[0] === "--assets";
const ziel = assetModus ? argumente[1] : argumente[0];

if (!/^\d+\.\d+\.\d+$/.test(ziel || "")) {
  console.error("Aufruf: node scripts/bump-version.mjs <major.minor.patch>");
  console.error("        node scripts/bump-version.mjs --assets <major.minor.patch>");
  process.exit(1);
}

const roh = (wert) => wert.replaceAll(".", "\\.");

/* --assets: die Bildrevision anheben.
   ------------------------------------------------------------------
   Alle Bilder teilen einen Cache-Schluessel. Seine Quelle ist ASSET_REV
   in js/01-config.js, aber CSS kann keine JS-Konstante lesen, also steht
   derselbe Wert zusaetzlich als Literal in index.html, manifest.json und
   in jeder CSS-Quelle, die ein Bild einbindet. Das von Hand gleichzuhalten
   ist genau die Arbeit, an der es schon einmal gescheitert ist: bis
   V28.11.28 liefen zwoelf Phasenkonstanten auseinander und dieselbe Datei
   wurde unter bis zu sieben Adressen geladen.

   Dieser Modus setzt alle Stellen in einem Zug. Er faengt bei den
   Bildern an und ruehrt die App-Version nicht an - die beiden sind
   bewusst entkoppelt. */
if (assetModus) {
  const configPfad = path.join(root, "js/01-config.js");
  const config = await readFile(configPfad, "utf8");
  const jetzt = config.match(/ASSET_REV\s*=\s*"([^"]+)"/)?.[1];
  if (!jetzt) {
    console.error("js/01-config.js: ASSET_REV nicht gefunden.");
    process.exit(1);
  }
  if (jetzt === ziel) {
    console.error(`ASSET_REV steht bereits auf ${ziel}.`);
    process.exit(1);
  }

  const bildMuster = new RegExp(`(\\.(?:webp|png|svg|jpe?g|gif)\\?v=)${roh(jetzt)}\\b`, "g");
  const dateien = ["index.html", "manifest.json"];
  for (const name of (await readdir(path.join(root, "src/styles/legacy"))).sort()) {
    if (name.endsWith(".css")) dateien.push(`src/styles/legacy/${name}`);
  }

  let stellen = 0;
  const geschrieben = [];
  for (const datei of dateien) {
    const text = await readFile(path.join(root, datei), "utf8");
    const treffer = [...text.matchAll(bildMuster)].length;
    if (!treffer) continue;
    await writeFile(path.join(root, datei), text.replace(bildMuster, `$1${ziel}`));
    stellen += treffer;
    geschrieben.push(`${datei} (${treffer})`);
  }
  await writeFile(configPfad, config.replace(/(ASSET_REV\s*=\s*")[^"]+(")/, `$1${ziel}$2`));

  /* Bleibt irgendwo der alte Schluessel stehen, waere die Datei ab sofort
     unter zwei Adressen abrufbar - genau der Fehler, den dieser Modus
     verhindern soll. Lieber abbrechen als still halb umstellen. */
  const reste = [];
  for (const datei of [...dateien, "js/01-config.js"]) {
    const text = await readFile(path.join(root, datei), "utf8");
    if (new RegExp(`\\?v=${roh(jetzt)}\\b`).test(text)) reste.push(datei);
  }
  if (reste.length) {
    console.error(`Alter Bildschluessel ${jetzt} steht noch in: ${reste.join(", ")}`);
    process.exit(1);
  }

  console.log(`Bildrevision ${jetzt} -> ${ziel}: ${stellen} Stellen plus ASSET_REV.`);
  console.log(geschrieben.map(z => `  ${z}`).join("\n"));
  console.log("Die App-Version bleibt unveraendert. Jetzt:");
  console.log("  node scripts/build-styles.mjs && node scripts/verify-build.mjs");
  process.exit(0);
}
const heute = new Date().toISOString().slice(0, 10);

const alt = JSON.parse(await readFile(path.join(root, "version.json"), "utf8")).version;
if (alt === ziel) {
  console.error(`version.json steht bereits auf ${ziel}.`);
  process.exit(1);
}

/* Jede Regel nennt Datei, Muster und Ersatz. Trifft ein Muster nicht
   genau einmal, bricht der Lauf ab: eine stillschweigend uebersprungene
   Stelle ist genau der Mischbuild, vor dem js/19-build-integrity.js
   spaeter warnt. */
const regeln = [
  ["version.json", /("version":\s*")[^"]+(")/, `$1${ziel}$2`, 1],
  ["version.json", /("releaseDate":\s*")[^"]+(")/, `$1${heute}$2`, 1],
  ["package.json", /("version":\s*")[^"]+(")/, `$1${ziel}$2`, 1],
  ["js/01-config.js", /(GAME_VERSION\s*=\s*")[^"]+(")/, `$1${ziel}$2`, 1],
  ["sw.js", /(CACHE_VERSION\s*=\s*")[^"]+(")/, `$1${ziel}$2`, 1],
  ["index.html", /(name="wd-build"\s+content=")[^"]+(")/, `$1${ziel}$2`, 1],
  ["index.html", /(<title>DiceDuel · V)[\d.]+(<\/title>)/, `$1${ziel}$2`, 1],
  // Der Footer im HTML ist nur der Startwert; js/01-config.js schreibt ihn
  // beim Laden aus GAME_VERSION neu. Trotzdem mitziehen, damit er vor dem
  // ersten Frame nicht falsch dasteht.
  ["index.html", /(version-footer">DICEDUEL · VERSION )[\d.]+/, `$1${ziel}`, 1],
  // Cache-Busting der eigenen Dateien. Bewusst auf js/, lang/ und css/
  // eingeschraenkt - Changelog-Ueberschriften und Bild-Revisionen bleiben
  // damit ausserhalb der Reichweite.
  ["index.html", new RegExp(`((?:src|href)="(?:js|lang|css)/[^"?]+\\?v=)${roh(alt)}(")`, "g"), `$1${ziel}$2`, "viele"]
];

const geladen = new Map();
const lies = async (datei) => {
  if (!geladen.has(datei)) geladen.set(datei, await readFile(path.join(root, datei), "utf8"));
  return geladen.get(datei);
};

let ersetzungen = 0;
for (const [datei, muster, ersatz, erwartet] of regeln) {
  const text = await lies(datei);
  const treffer = [...text.matchAll(muster.global ? muster : new RegExp(muster.source, muster.flags + "g"))].length;
  if (erwartet === 1 && treffer !== 1) {
    console.error(`${datei}: ${muster} trifft ${treffer}-mal, erwartet genau einmal.`);
    process.exit(1);
  }
  if (!treffer) {
    console.error(`${datei}: ${muster} trifft nirgends.`);
    process.exit(1);
  }
  geladen.set(datei, text.replace(muster, ersatz));
  ersetzungen += treffer;
}

for (const [datei, text] of geladen) await writeFile(path.join(root, datei), text);

console.log(`${alt} -> ${ziel}: ${ersetzungen} Stellen in ${geladen.size} Dateien.`);
console.log("Der Changelog wurde nicht angefasst. Trage den Eintrag fuer");
console.log(`V${ziel} von Hand in index.html nach, dann:`);
console.log("  node scripts/build-styles.mjs && node scripts/verify-build.mjs");
