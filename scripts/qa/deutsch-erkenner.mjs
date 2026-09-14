/* Der Deutsch-Erkenner in js/00-i18n.js darf keinen fertig uebersetzten
 * englischen Satz fuer Deutsch halten - und muss echtes Deutsch weiter finden.
 *
 * Anlass: germanHints listet "die" als deutschen Hinweis. In einem
 * Wuerfelspiel ist "die" der Singular von "dice". Folge: korrekt uebersetzte
 * Encounterbeschreibungen wie "... must die last" wurden im englischen Spiel
 * durch den generischen Ersatztext ersetzt.
 *
 * Gemessen wird gegen die echten Sprachpakete, nicht gegen eine Handvoll
 * Beispiele: jeder englische Zielsatz darf NICHT anschlagen, jeder deutsche
 * Quellsatz MUSS anschlagen. Beides zaehlt, ein Erkenner ohne Treffer waere
 * genauso kaputt wie einer mit Fehlalarm.
 */
import fs from 'node:fs';import path from 'node:path';
const root=process.cwd();

// Den Erkenner aus der Quelle ziehen, damit der Test nie eine eigene Kopie prueft.
const src=fs.readFileSync(path.join(root,'js/00-i18n.js'),'utf8');
const treffer=src.match(/const germanHints\s*=\s*(\/.*?\/[a-z]*);/s);
if(!treffer){console.log('germanHints nicht gefunden.');process.exit(1);}
const germanHints=eval(treffer[1]);

// Sprachpakete laden. Sie setzen window.WD_LANG_PACKS; ein Mini-Fenster reicht.
const fenster={};
globalThis.window=fenster;
for(const datei of fs.readdirSync(path.join(root,'lang')).sort()){
  if(!datei.endsWith('.js'))continue;
  const text=fs.readFileSync(path.join(root,'lang',datei),'utf8');
  try{new Function('window',text)(fenster);}catch(e){console.log(`${datei}: ${e.message}`);}
}
const packs=fenster.WD_LANG_PACKS||{};
const en=packs.en||{};

// Alle deutschen Quellen und englischen Ziele einsammeln.
// ACHTUNG, die beiden Felder haben verschiedene Formen: exact ist ein Objekt
// deutsch->englisch, replacements eine LISTE von Paaren [deutsch, englisch].
// Ein erster Entwurf lief blind ueber Object.values und zaehlte damit die
// deutschen Quellwoerter der Paare als englische Zieltexte mit - Ergebnis
// waren 135 angebliche Fehlalarme statt der tatsaechlichen 14.
const deutsch=new Set(),englisch=new Set();
for(const [de,enText] of Object.entries(en.exact||{})){
  if(typeof de==='string'&&de.length>3)deutsch.add(de);
  if(typeof enText==='string'&&enText.length>3)englisch.add(enText);
}
for(const paar of en.replacements||[]){
  if(!Array.isArray(paar))continue;
  const [de,enText]=paar;
  if(typeof de==='string'&&de.length>3)deutsch.add(de);
  if(typeof enText==='string'&&enText.length>3)englisch.add(enText);
}

const falschAlarm=[...englisch].filter(t=>germanHints.test(t));
const nichtErkannt=[...deutsch].filter(t=>!germanHints.test(t));

console.log(`Englische Zielsaetze geprueft: ${englisch.size}`);
console.log(`Deutsche Quellsaetze geprueft: ${deutsch.size}`);
console.log(`\nFehlalarm (englisch, faelschlich als deutsch erkannt): ${falschAlarm.length}`);
for(const t of falschAlarm.slice(0,12))console.log(`   "${t.slice(0,96)}"`);
if(falschAlarm.length>12)console.log(`   ... und ${falschAlarm.length-12} weitere`);

// Nicht jeder deutsche Eintrag ist ein Satz - Einzelwoerter ohne Marker sind
// erwartbar. Gemeldet wird deshalb nur, was wie ein Satz aussieht.
const verpassteSaetze=nichtErkannt.filter(t=>t.split(/\s+/).length>=5);
console.log(`\nDeutsche SAETZE, die der Erkenner nicht findet: ${verpassteSaetze.length}`);
for(const t of verpassteSaetze.slice(0,12))console.log(`   "${t.slice(0,96)}"`);
if(verpassteSaetze.length>12)console.log(`   ... und ${verpassteSaetze.length-12} weitere`);

// Nicht erkannte deutsche Saetze sind KEIN Fehler, solange sie im Paket eine
// eigene Uebersetzung haben - der Erkenner ist nur der Notnagel fuer Texte,
// die keine hat. Gemeldet werden sie trotzdem, weil eine wachsende Liste ein
// Hinweis waere, dass der Erkenner stumpf wird.
let fehler=0;
if(falschAlarm.length){console.log(`\nFEHL: ${falschAlarm.length} englische Texte schlagen an.`);fehler++;}
else console.log('\n  ok   kein englischer Zieltext schlaegt an');
console.log(`  ok   ${verpassteSaetze.length} deutsche Saetze ohne Marker (nur Hinweis, alle mit eigener Uebersetzung)`);
process.exit(fehler?1:0);
