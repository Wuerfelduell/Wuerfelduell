/* Kistenziehung (js/46-shop-daten.js): Chancen, Duplikate, Schutz, Preise.
 *
 * Aus der To-do "Waehrungs- und Kistensystem" und den Nachtraegen vom
 * 16.09.: Duplikate ab Kiste 1 mit Marken-Rueckgabe nach Seltenheit,
 * Schutzsystem ja, aber nicht fuer Legendary, Pool sind nur die
 * Artwork-Designs mit rarity, Kerne vorerst nicht sammelbar.
 *
 * Geprueft wird gegen die Anforderung, nicht gegen die Umsetzung:
 *   1. Jede Chancenzeile summiert auf 100, Legendary ist nirgends ueber 5.
 *   2. 200.000 Ziehungen je Kiste treffen die Tabelle auf +-0,6
 *      Prozentpunkte (gemessen an der GEWUERFELTEN Seltenheit, denn die
 *      leeren Pools fallen danach zurueck).
 *   3. Leerer Pool faellt eine Stufe tiefer, nie hoeher; mit vollem Pool
 *      kommt jede Seltenheit auch wirklich als Design an.
 *   4. Duplikat ab der ersten Kiste: bereits besessenes Design schaltet
 *      nichts frei und bringt die Rueckgabe seiner Seltenheit.
 *   5. Schutz: ab 10 Oeffnungen ohne Epic+ steigt Epic um 2 pp je
 *      Oeffnung bis +10, Common sinkt entsprechend, Legendary bleibt exakt;
 *      ein Epic setzt den Zaehler zurueck.
 *   6. Kauf: Preis wird abgebucht, ohne Guthaben passiert nichts, falsche
 *      Waehrung wird abgelehnt (Common nur Marken, Legendary nur Kerne).
 *   7. Gutschriften: die Betraege aus der Tabelle landen im Guthaben.
 *   8. Der echte Datenstand: 15 Common und 7 Rare in DICE_DESIGNS, kein
 *      Design mit eigenem Unlock traegt eine rarity.
 */
import {readFileSync} from "node:fs";
import vm from "node:vm";

const ergebnisse=[];const pruefe=(n,i,s)=>ergebnisse.push([n,i,s]);

function laden(designs){
  const ctx=vm.createContext({window:{},DICE_DESIGNS:designs,console,Math,Number,Object,Array,Set,Date,String});
  vm.runInContext(readFileSync("js/46-shop-daten.js","utf8"),ctx);
  return ctx.window.WDShop;
}
// Deterministischer Zufall (mulberry32), damit die Messung wiederholbar ist.
function zufall(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const profil=()=>({id:"p1",name:"Prueferin",unlockedDice:["classic","classic_v2"],wallet:{marken:0,kerne:0},kisten:null});

// Pool wie im Spiel heute: 15 Common, 7 Rare, Rest leer.
const heute={};
for(let i=1;i<=15;i++)heute[`c${i}`]={name:`Common ${i}`,rarity:"common",previewAsset:"x"};
for(let i=1;i<=7;i++)heute[`r${i}`]={name:`Rare ${i}`,rarity:"rare",previewAsset:"x"};
heute.classic={name:"Classic"};heute.sapphire_crown={name:"Sapphire Crown",unlockText:"Boss"};
// Voller Pool fuer die Stufenpruefung.
const voll={...heute};
["super_rare","epic","legendary"].forEach(r=>{for(let i=1;i<=3;i++)voll[`${r}${i}`]={name:`${r} ${i}`,rarity:r,previewAsset:"x"};});

const S=laden(heute),V=laden(voll);

// 1. Tabelle.
for(const stufe of S.STUFEN){
  const z=S.CHANCEN[stufe];const summe=S.SELTENHEITEN.reduce((a,k)=>a+z[k],0);
  pruefe(`Chancen ${stufe} summieren auf 100`,Math.abs(summe-100)<1e-9,true);
}
pruefe("Legendary nirgends ueber 5 %",S.STUFEN.every(s=>S.CHANCEN[s].legendary<=5),true);

// 2. Verteilung der gewuerfelten Seltenheit, ohne Schutz (Profil frisch je Zug).
const N=200000;
for(const stufe of S.STUFEN){
  const rnd=zufall(7+stufe.length);const zaehler={};
  for(let i=0;i<N;i++){const p=profil();const e=V.ziehe(p,stufe,rnd);zaehler[e.gewuerfelt]=(zaehler[e.gewuerfelt]||0)+1;}
  const abw=S.SELTENHEITEN.map(k=>Math.abs((zaehler[k]||0)/N*100-S.CHANCEN[stufe][k]));
  pruefe(`Ziehung ${stufe} trifft die Tabelle (+-0,6 pp)`,Math.max(...abw)<=0.6,true);
  console.log(`      ${stufe.padEnd(9)} `+S.SELTENHEITEN.map(k=>`${k}=${((zaehler[k]||0)/N*100).toFixed(2)}`).join("  "));
}

// 3. Rueckfall bei leerem Pool.
{
  const rnd=zufall(99);let tiefer=0,hoeher=0,treffer=0,n=0;
  for(let i=0;i<50000;i++){const p=profil();const e=S.ziehe(p,"legendary",rnd);n++;
    const gi=S.SELTENHEITEN.indexOf(e.gewuerfelt),si=S.SELTENHEITEN.indexOf(e.seltenheit);
    if(si<gi)tiefer++;if(si>gi)hoeher++;if(!["common","rare"].includes(e.seltenheit))treffer++;}
  pruefe("Leerer Pool: nie eine Stufe hoeher",hoeher,0);
  pruefe("Leerer Pool: Rueckfall landet nur in Common oder Rare",treffer,0);
  pruefe("Leerer Pool: Rueckfall kommt bei der Legendary-Kiste tatsaechlich vor",tiefer>0,true);
  const rnd2=zufall(5);const gesehen=new Set();
  for(let i=0;i<20000;i++){const p=profil();gesehen.add(V.ziehe(p,"legendary",rnd2).seltenheit);}
  pruefe("Voller Pool: jede Seltenheit kommt als Design an",S.SELTENHEITEN.every(k=>gesehen.has(k)),true);
}

// 4. Duplikate.
{
  const p=profil();p.unlockedDice.push(...Object.keys(heute).filter(k=>heute[k].rarity==="common"));
  // Alle Commons besessen: Ziehung mit erzwungenem Common-Wurf.
  const e=S.ziehe(p,"common",()=>0.01);
  pruefe("Duplikat: Common-Wurf auf besessenem Pool ist ein Duplikat",e.duplikat&&e.seltenheit==="common",true);
  pruefe("Duplikat: Rueckgabe 60 Marken fuer Common",p.wallet.marken,60);
  pruefe("Duplikat: schaltet nichts Neues frei",p.unlockedDice.length,2+15);
  const q=profil();q.unlockedDice.push(...Object.keys(heute).filter(k=>heute[k].rarity==="rare"));
  const f=S.ziehe(q,"rare",()=>0.6); // 0.6*100=60 -> innerhalb rare (50..85)
  pruefe("Duplikat: Rueckgabe 150 Marken fuer Rare",f.duplikat&&q.wallet.marken===150,true);
  pruefe("Rueckgabe-Staffel wie vorgegeben",[S.RUECKGABE.common,S.RUECKGABE.rare,S.RUECKGABE.super_rare,S.RUECKGABE.epic,S.RUECKGABE.legendary].join("/"),"60/150/400/800/2000");
  const r=profil();const g=S.ziehe(r,"common",()=>0.01);
  pruefe("Erste Kiste ohne Besitz: kein Duplikat, Design freigeschaltet",!g.duplikat&&r.unlockedDice.includes(g.designKey),true);
}

// 5. Schutz.
{
  const p=profil();
  pruefe("Schutz: bei 0 Oeffnungen kein Bonus",S.chancen("common",p).schutzBonus,0);
  p.kisten={geoeffnet:{},ohneEpic:9};pruefe("Schutz: bei 9 Oeffnungen noch kein Bonus",S.chancen("common",p).schutzBonus,0);
  p.kisten={geoeffnet:{},ohneEpic:10};const c10=S.chancen("common",p);
  pruefe("Schutz: bei 10 Oeffnungen +2 pp Epic",c10.epic,2.9);
  pruefe("Schutz: Common sinkt um dieselben 2 pp",c10.common,73);
  pruefe("Schutz: Legendary bleibt exakt",c10.legendary,0.1);
  p.kisten={geoeffnet:{},ohneEpic:14};pruefe("Schutz: bei 14 Oeffnungen +10 pp",S.chancen("common",p).schutzBonus,10);
  p.kisten={geoeffnet:{},ohneEpic:40};const c40=S.chancen("common",p);
  pruefe("Schutz: Deckel bei +10 pp",c40.schutzBonus,10);
  pruefe("Schutz: Summe bleibt 100",+(S.SELTENHEITEN.reduce((a,k)=>a+c40[k],0)).toFixed(6),100);
  // Zaehler: Common-Zug erhoeht, Epic setzt zurueck (voller Pool, Wurf in den Epic-Bereich).
  const q=profil();V.ziehe(q,"common",()=>0.01);V.ziehe(q,"common",()=>0.01);
  pruefe("Schutz: zwei Oeffnungen ohne Epic zaehlen 2",q.kisten.ohneEpic,2);
  const e=V.ziehe(q,"legendary",()=>0.80); // 10+25+30=65 .. 95 -> epic
  pruefe("Schutz: Epic setzt den Zaehler zurueck",e.seltenheit==="epic"&&q.kisten.ohneEpic===0,true);
  // Mit Schutz muss die Epic-Quote messbar steigen.
  const rnd=zufall(11);let mit=0,ohne=0;
  for(let i=0;i<100000;i++){const a=profil();a.kisten={geoeffnet:{},ohneEpic:14};if(V.ziehe(a,"common",rnd).gewuerfelt==="epic")mit++;
    const b=profil();if(V.ziehe(b,"common",rnd).gewuerfelt==="epic")ohne++;}
  pruefe("Schutz: Epic-Quote mit +10 pp liegt um 10,9 % (+-0,6)",Math.abs(mit/1000-10.9)<=0.6,true);
  console.log(`      Epic-Quote: mit Schutz ${(mit/1000).toFixed(2)} %, ohne ${(ohne/1000).toFixed(2)} %`);
}

// 6. Kauf.
{
  const p=profil();p.wallet.marken=249;
  pruefe("Kauf: ohne Guthaben abgelehnt",!!S.kaufe(p,"common","marken").fehler&&p.wallet.marken===249,true);
  p.wallet.marken=250;const e=S.kaufe(p,"common","marken",()=>0.01);
  pruefe("Kauf: 250 Marken abgebucht",!e.fehler&&p.wallet.marken===0,true);
  pruefe("Kauf: Oeffnung gezaehlt",p.kisten.geoeffnet.common,1);
  p.wallet.kerne=500;
  pruefe("Kauf: Common gibt es nicht fuer Kerne",!!S.kaufe(p,"common","kerne").fehler,true);
  p.wallet.marken=99999;
  pruefe("Kauf: Legendary gibt es nicht fuer Marken",!!S.kaufe(p,"legendary","marken").fehler&&p.wallet.marken===99999,true);
  const l=S.kaufe(p,"legendary","kerne",()=>0.01);
  pruefe("Kauf: Legendary fuer 180 Kerne",!l.fehler&&p.wallet.kerne===320,true);
  pruefe("Preise wie vorgegeben",`${S.KISTEN.common.marken}/${S.KISTEN.rare.marken}+${S.KISTEN.rare.kerne}/${S.KISTEN.epic.marken}+${S.KISTEN.epic.kerne}/${S.KISTEN.legendary.kerne}`,"250/600+30/1500+75/180");
}

// 7. Gutschriften.
{
  const p=profil();
  const summe=["duell_sieg","duell_niederlage","encounter_erst","encounter_wieder","weltboss_erst"].reduce((a,k)=>a+S.verdiene(p,k),0);
  pruefe("Gutschriften: 40+15+80+20+250 = 405",summe===405&&p.wallet.marken===405,true);
  pruefe("Gutschriften: unbekanntes Ereignis bucht nichts",S.verdiene(p,"unsinn"),0);
  const text=S.gutschriftText();
  pruefe("Gutschriften: Text nennt jede Buchung und leert danach",text.split("Duellmarken").length-1===5&&S.gutschriftText()==="",true);
}

// 8. Echter Datenstand.
{
  const src=readFileSync("js/05-game-data-state.js","utf8");
  const m=src.match(/const DICE_DESIGNS = \{([\s\S]*?)\n  \};/)[1];
  const zeilen=[...m.matchAll(/^\s+([a-z0-9_]+):\{(.*)$/gm)].map(x=>({key:x[1],rest:x[2]}));
  const mitRarity=zeilen.filter(z=>/rarity:"/.test(z.rest));
  const common=mitRarity.filter(z=>/rarity:"common"/.test(z.rest)).length,rare=mitRarity.filter(z=>/rarity:"rare"/.test(z.rest)).length;
  pruefe("Datenstand: 15 Common im Pool",common,15);
  pruefe("Datenstand: 7 Rare im Pool",rare,7);
  const eigenerWeg=zeilen.filter(z=>/unlockText:/.test(z.rest)||["classic","classic_v2","sapphire_crown","amethyst_rift"].includes(z.key));
  pruefe("Datenstand: Designs mit eigenem Unlock tragen keine rarity",eigenerWeg.every(z=>!/rarity:/.test(z.rest)),true);
  const css=zeilen.filter(z=>!/previewAsset/.test(z.rest));
  pruefe("Datenstand: CSS-Designs tragen keine rarity",css.every(z=>!/rarity:/.test(z.rest)),true);
}

const ERWARTET=44;
let fehler=ergebnisse.length<ERWARTET?1:0;
if(fehler)console.log(`ACHTUNG: nur ${ergebnisse.length} von ${ERWARTET} Zusicherungen erreicht.`);
const breite=Math.max(1,...ergebnisse.map(r=>r[0].length));
for(const [name,ist,soll] of ergebnisse){const ok=ist===soll;if(!ok)fehler++;console.log(`${ok?"  ok  ":" FEHL "} ${name.padEnd(breite)}  ist=${String(ist).padStart(6)} soll=${String(soll).padStart(6)}`);}
console.log(fehler?`\n${fehler} Abweichung(en).`:"\nAlle Zusicherungen erfuellt.");
process.exit(fehler?1:0);
