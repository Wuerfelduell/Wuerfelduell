/* Prüfstand: lädt dieselbe Bilddatei mehr als einmal?
   ------------------------------------------------------------------
   Aufruf:  node scripts/qa/bildabrufe.mjs [breite]

   Jede Bilddatei darf im ganzen Spiel nur unter *einer* URL angefragt
   werden. Steht dieselbe Datei unter mehreren `?v=`-Schlüsseln — oder
   einmal mit und einmal ohne —, ist das für den Browser je eine eigene
   Datei: eigener Download, eigene dekodierte Bitmap.

   Der Läufer fährt die Hauptbildschirme ab, schreibt jede Bildanfrage
   mit und gruppiert nach Dateinamen. Er braucht den lokalen Server:

       npx http-server -p 8099 -c-1 --silent .

   Ausgang 0 = jede Datei genau eine URL. Ausgang 1 = Dopplung gefunden. */

import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const BASIS = "http://127.0.0.1:8099/index.html";
const BREITE = Number(process.argv[2] || 390);

/* Ein durchgespieltes Profil, damit auch Zustände hinter Fortschritt
   erreicht werden — sonst bleiben ganze Bildschirme unbesucht. */
const HAUS = ["first_blood", "push_it", "hit_hard", "blood_table", "house_always_wins",
  "snake_pit", "mirror_chamber", "double_trouble_campaign", "blood_bank", "black_table",
  "vampires_cut", "no_safety_net", "chaos_room", "three_of_a_kind", "royal_flush"];
const SAATGUT = {
  schemaVersion: 8,
  settings: { animation: "fast", botSpeed: "fast" },
  global: { completedRounds: 128 },
  profiles: [
    { id: "qa-1", name: "Durchgespielt", tagNumber: "0001",
      achievements: { grande: 1, not_today: 1, blood_money: 1 },
      stats: { rounds: 128, wins: 77, damageDealt: 4213, damageTaken: 3902 },
      campaign: { completedEncounters: HAUS, trophies: 500 } },
    { id: "qa-2", name: "Zweiter", tagNumber: "0002", achievements: {}, stats: {},
      campaign: { completedEncounters: [], trophies: 3 } }
  ],
  duoCampaigns: {}, trioCampaigns: {}
};

const SCHIRME = [
  ["hauptmenue", null],
  ["profile", "menuProfilesBtn"],
  ["achievements", "menuAchievementsBtn"],
  ["statistik", "menuStatsBtn"],
  ["trophy-shop", "menuPrestigeShopBtn"],
  ["regeln", "menuRulesBtn"],
  ["online", "menuOnlineBtn"],
  ["kampagne", "menuCampaignBtn"],
  ["einstellungen", "menuSettingsBtn"],
  ["account", "menuAccountBtn"],
  ["changelog", "menuChangelogBtn"],
  ["tutorial", "menuTutorialBtn"]
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: BREITE, height: 900 }, deviceScaleFactor: 2, locale: "de-DE" });
const seite = await ctx.newPage();

const anfragen = [];
seite.on("response", async antwort => {
  const url = new URL(antwort.url());
  if (!/\.(webp|png|svg|jpe?g|gif)$/i.test(url.pathname)) return;
  let bytes = 0;
  try { bytes = Number((await antwort.allHeaders())["content-length"] || 0); } catch (_e) {}
  anfragen.push({ datei: url.pathname.split("/").pop(), pfad: url.pathname, suche: url.search || "(ohne)", bytes, status: antwort.status() });
});

await seite.addInitScript(([schluessel, stand]) => {
  try { localStorage.setItem(schluessel, JSON.stringify(stand)); } catch (_e) {}
}, ["wuerfelduell_save_v1", SAATGUT]);

for (const [name, id] of SCHIRME) {
  await seite.goto(BASIS, { waitUntil: "networkidle" });
  if (id) {
    await seite.evaluate(i => document.getElementById(i)?.click(), id);
    await seite.waitForTimeout(700);
    // Aufklappbares öffnen, damit auch verdeckte Flächen ihre Bilder ziehen
    await seite.evaluate(() => {
      document.querySelectorAll('[aria-expanded="false"]').forEach(b => { if (b.offsetParent) b.click(); });
    });
    await seite.waitForTimeout(600);
  }
}
await browser.close();

/* Auswertung: eine Zeile je Datei, die unter mehreren URLs kam. */
const proDatei = new Map();
for (const a of anfragen) {
  if (!proDatei.has(a.datei)) proDatei.set(a.datei, { urls: new Map(), bytes: 0, fehler: [] });
  const e = proDatei.get(a.datei);
  e.urls.set(a.suche, (e.urls.get(a.suche) || 0) + 1);
  if (a.bytes) e.bytes = a.bytes;
  if (a.status >= 400) e.fehler.push(a.status);
}

const mehrfach = [...proDatei].filter(([, e]) => e.urls.size > 1)
  .sort((a, b) => b[1].urls.size - a[1].urls.size);
const kaputt = [...proDatei].filter(([, e]) => e.fehler.length);

let ueberzaehlig = 0, verschwendet = 0;
for (const [, e] of mehrfach) { ueberzaehlig += e.urls.size - 1; verschwendet += e.bytes * (e.urls.size - 1); }

console.log(`Bilddateien geladen: ${proDatei.size} (${BREITE} px, ${SCHIRME.length} Bildschirme)`);
console.log(`Dateien unter mehreren URLs: ${mehrfach.length}`);
console.log(`Überzählige Ladevorgänge: ${ueberzaehlig} = ${Math.round(verschwendet / 1024)} KB`);
if (kaputt.length) console.log(`\nFEHLENDE BILDER: ${kaputt.map(([n, e]) => `${n} (${e.fehler.join(",")})`).join(", ")}`);

if (mehrfach.length) {
  console.log("");
  for (const [name, e] of mehrfach) {
    console.log(String(e.urls.size).padStart(2), "×", String(Math.round(e.bytes / 1024)).padStart(4), "KB ",
      name.padEnd(38), [...e.urls.keys()].join("  "));
  }
}

const sauber = mehrfach.length === 0 && kaputt.length === 0;
console.log(sauber ? "\nOK — jede Bilddatei genau eine URL." : "\nNICHT SAUBER.");
process.exit(sauber ? 0 : 1);
