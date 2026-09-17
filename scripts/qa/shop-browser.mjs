/* Shop mit Kisten und Waehrung (js/47-shop.js, js/46-shop-daten.js).
 *
 * Aus der To-do "Waehrungs- und Kistensystem" (16.09.): der Trophy-Shop
 * wird zum Shop mit eigenem Kistenbereich, Kisten gegen Duellmarken oder
 * Wuerfelkerne, Dropchancen vor jedem Kauf einsehbar, aus jeder Kiste
 * genau ein Wuerfeldesign, Ergebnis erst nach Beginn der Animation
 * sichtbar, Echtgeld ein leerer Knopf ohne Wirkung.
 *
 * Geprueft wird gegen die Anforderung:
 *   1. Der Menueknopf heisst "Shop", der Shop hat die Reiter Kisten,
 *      Trophaeen und Waehrung; Kisten ist vorgewaehlt.
 *   2. Ohne Profil sagt der Kistenreiter das; mit Profil zeigt der Kopf
 *      Marken und Kerne.
 *   3. Die Chancen sind VOR dem Kauf einsehbar und entsprechen der
 *      Tabelle; leere Pools sind markiert; Legendary nirgends ueber 5 %.
 *   4. Ohne Guthaben ist kein Kaufknopf aktiv. Common nur fuer Marken,
 *      Legendary nur fuer Kerne.
 *   5. Guthaben ueber WDShop.buche, kein Testguthaben-Knopf mehr.
 *   6. Kauf: Preis wird abgebucht, die Kiste oeffnet im Shopmodus, das
 *      Ergebnis ist waehrend "warten" NICHT im DOM, danach genau eine
 *      Karte mit Seltenheit und Design aus dem Pool; Neu oder Doppelt mit
 *      Rueckgabe; unlockedDice bzw. Guthaben passen dazu.
 *   7. "Weiter" fuehrt in den Shop zurueck, Zaehler "Geoeffnet" steht auf 1,
 *      der Spielstand ist mit Schema 10 gespeichert.
 *   8. Echtgeld-Knoepfe sind ohne Wirkung: Guthaben bleibt, kein Overlay.
 *   9. Der Trophaeen-Reiter zeigt weiterhin die Kosmetik.
 *  10. Englisch: Reiter "Chests|Trophies|Currency", Menue "Shop".
 *  11. Im Leerlauf des Shops 0 DOM-Mutationen pro Sekunde.
 */
import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';
const {chromium}=await import(process.env.WD_PLAYWRIGHT||'/opt/node22/lib/node_modules/playwright/index.mjs');
const root=process.cwd(),errors=[];
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{try{
  const file=path.join(root,new URL(req.url,'http://x').pathname);let body=fs.readFileSync(file);
  if(file.endsWith('index.html'))body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|online\/01-online)\.js[^>]*><\/script>/g,'');
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ergebnisse=[];const pruefe=(n,i,s)=>ergebnisse.push([n,i,s]);
let absturz=null;const vierhundertvier=[];

async function seite(opts={}){
  const p=await browser.newPage({locale:opts.locale||'de-DE',viewport:{width:opts.breite||390,height:844},serviceWorkers:'block'});
  p.on('pageerror',e=>errors.push(e.message));
  p.on('response',r=>{if(r.status()===404)vierhundertvier.push(new URL(r.url()).pathname);});
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await p.waitForTimeout(500);
  return p;
}
const save=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('wuerfelduell_save_v1')||'{}'));
const WD_NAMEN={common:'Common',rare:'Rare',super_rare:'Super Rare',epic:'Epic',legendary:'Legendary'};

try{
  const p=await seite();
  // 1. Menue und Reiter.
  const menue=await p.evaluate(()=>document.getElementById('menuPrestigeShopBtn')?.textContent.trim()||'');
  pruefe('Menueknopf heisst "Shop"',menue,'Shop');
  await p.click('#menuPrestigeShopBtn');await p.waitForTimeout(300);
  const reiter=await p.evaluate(()=>({
    labels:[...document.querySelectorAll('#prestigeShopScreen .shop-tab-btn')].map(b=>b.textContent.trim()),
    aktiv:document.querySelector('#prestigeShopScreen .shop-tab-btn.aktiv')?.dataset.shopTab,
    titel:document.querySelector('#prestigeShopScreen .screen-title')?.textContent.trim(),
    sichtbar:!document.getElementById('prestigeShopScreen').classList.contains('hidden')}));
  pruefe('Reiter Kisten | Trophaeen | Waehrung | Daily',reiter.labels.join('|'),'Kisten|Trophäen|Währung|Daily');
  pruefe('Kisten ist vorgewaehlt',reiter.aktiv,'chests');
  pruefe('Shop-Titel heisst "Shop"',reiter.titel,'Shop');

  // 2. Ohne Profil.
  const ohne=await p.evaluate(()=>document.querySelector('#shopTabChests')?.textContent.trim()||'');
  pruefe('Ohne Profil: Hinweis statt Kisten',/Erstelle zuerst ein Profil/.test(ohne),true);
  await p.evaluate(()=>{createProfile('Prueferin');saveGameData();});
  await p.click('#prestigeShopBackBtn');await p.waitForTimeout(150);
  await p.click('#menuPrestigeShopBtn');await p.waitForTimeout(300);
  const kopf=await p.evaluate(()=>({marken:document.getElementById('shopWalletMarken')?.textContent,kerne:document.getElementById('shopWalletKerne')?.textContent,
    kisten:document.querySelectorAll('#shopTabChests .shop-kiste').length}));
  pruefe('Mit Profil: Marken 0, Kerne 0, vier Kisten',`${kopf.marken}/${kopf.kerne}/${kopf.kisten}`,'0/0/4');

  // 3. Chancen vor dem Kauf.
  const vorKauf=await p.evaluate(()=>document.querySelector('#shopTabChests .shop-kiste[data-stufe="common"] .shop-chancen')?.hidden);
  pruefe('Chancen sind zunaechst eingeklappt, aber vorhanden',vorKauf,true);
  await p.click('#shopTabChests .shop-kiste[data-stufe="common"] [data-chancen]');await p.waitForTimeout(150);
  const chancen=await p.evaluate(()=>{
    const lies=stufe=>[...document.querySelectorAll(`#shopTabChests .shop-kiste[data-stufe="${stufe}"] .shop-chancen-tabelle tr`)].map(tr=>({s:tr.dataset.seltenheit,wert:tr.children[1].textContent.trim().split(' ')[0],leer:tr.classList.contains('leer')}));
    return {common:lies('common'),offen:!document.querySelector('#shopTabChests .shop-kiste[data-stufe="common"] .shop-chancen').hidden,
      legendary:[...document.querySelectorAll('#shopTabChests .shop-chancen-tabelle tr[data-seltenheit="legendary"] td:first-of-type')].map(td=>parseFloat(td.textContent.replace(',','.')))};
  });
  pruefe('Chancen der Common-Kiste sichtbar',chancen.offen,true);
  pruefe('Common-Kiste: 75 / 20 / 4 / 0,9 / 0,1',chancen.common.map(z=>z.wert).join('/'),'75/20/4/0,9/0,1');
  pruefe('Kein Pool mehr leer: keine Zeile markiert',chancen.common.filter(z=>z.leer).map(z=>z.s).join(','),'');
  pruefe('Legendary nirgends ueber 5 %',chancen.legendary.length===4&&chancen.legendary.every(v=>v<=5),true);
  // Bei offenem Info verschwinden die Kaufknoepfe dieser Kiste, beim Schliessen kommen sie wieder.
  const offenKauf=await p.evaluate(()=>document.querySelectorAll('#shopTabChests .shop-kiste[data-stufe="common"] [data-kaufe]').length);
  await p.click('#shopTabChests .shop-kiste[data-stufe="common"] [data-chancen]');await p.waitForTimeout(150);
  const zuKauf=await p.evaluate(()=>({kauf:document.querySelectorAll('#shopTabChests .shop-kiste[data-stufe="common"] [data-kaufe]').length,chancen:document.querySelector('#shopTabChests .shop-kiste[data-stufe="common"] .shop-chancen').hidden}));
  pruefe('Offenes Info blendet die Kaufknoepfe aus',offenKauf,0);
  pruefe('Geschlossenes Info zeigt die Kaufknoepfe wieder',zuKauf.kauf===1&&zuKauf.chancen===true,true);

  // 4. Ohne Guthaben kein Kauf.
  const knoepfe=await p.evaluate(()=>{
    const alle=[...document.querySelectorAll('#shopTabChests [data-kaufe]')];
    return {aktiv:alle.filter(b=>!b.disabled).length,keys:alle.map(b=>b.dataset.kaufe)};
  });
  pruefe('Ohne Guthaben ist kein Kaufknopf aktiv',knoepfe.aktiv,0);
  pruefe('Common nur Marken, Legendary nur Kerne',knoepfe.keys.join(','),'common:marken,rare:marken,rare:kerne,epic:marken,epic:kerne,legendary:kerne');

  // 5. Guthaben ueber die Datenschicht buchen (der Testguthaben-Knopf im
  // Trainingsfenster ist seit V28.12.63 weg); der Shop zeigt es nach dem
  // erneuten Oeffnen.
  await p.click('#prestigeShopBackBtn');await p.waitForTimeout(150);
  const gebucht=await p.evaluate(()=>{const p=saveData.profiles[0];const w=WDShop.buche(p,{marken:2000,kerne:200});saveGameData();return `${w.marken}/${w.kerne}`;});
  pruefe('Datenschicht bucht 2000 Marken, 200 Kerne',gebucht,'2000/200');
  const kein=await p.evaluate(()=>document.getElementById('testGuthabenBtn'));
  pruefe('Kein Testguthaben-Knopf mehr im Trainingsfenster',kein,null);
  await p.click('#menuPrestigeShopBtn');await p.waitForTimeout(300);
  const guthaben=await p.evaluate(()=>({marken:document.getElementById('shopWalletMarken')?.textContent,kerne:document.getElementById('shopWalletKerne')?.textContent,
    aktiv:[...document.querySelectorAll('#shopTabChests [data-kaufe]')].filter(b=>!b.disabled).map(b=>b.dataset.kaufe)}));
  pruefe('Shop zeigt 2000 Marken, 200 Kerne',`${guthaben.marken}/${guthaben.kerne}`,'2000/200');
  pruefe('Mit Guthaben sind alle sechs Kaufknoepfe aktiv',guthaben.aktiv.length,6);
  // Ein Knopf, ein Bild: das Knopfbild fuellt den Knopf ohne Versatz, der
  // Text bleibt einzeilig (vorher: Bild 28px zu hoch, Text zweizeilig).
  const knopfMass=await p.evaluate(()=>[...document.querySelectorAll('#shopTabChests .shop-kaufen')].map(b=>{
    const r=b.getBoundingClientRect(),a=b.querySelector('.prestige-button-artwork').getBoundingClientRect(),s=b.querySelector('span:last-child').getBoundingClientRect();
    return {versatz:Math.round(a.top-r.top),hoehe:Math.round(a.height-r.height),zeilen:Math.round(s.height/16)};}));
  pruefe('Kaufknopf: Bild deckt den Knopf ohne Versatz',knopfMass.every(m=>m.versatz===0&&m.hoehe===0),true);
  pruefe('Kaufknopf: Text einzeilig',knopfMass.every(m=>m.zeilen===1),true);

  // 6. Kauf der Common-Kiste.
  const vorher=await save(p);
  await p.click('#shopTabChests [data-kaufe="common:marken"]');await p.waitForTimeout(200);
  const offen=await p.evaluate(()=>{const ov=document.getElementById('kistenTestOverlay');return {da:!!ov&&!ov.classList.contains('hidden'),modus:ov?.dataset.modus,stufe:ov?.dataset.stufe,
    stufenwahl:ov?.querySelector('.kisten-stufen')?.classList.contains('hidden'),marken:document.getElementById('shopWalletMarken')?.textContent};});
  pruefe('Kauf oeffnet die Kiste im Shopmodus',offen.da&&offen.modus==='shop'&&offen.stufe==='common'&&offen.stufenwahl===true,true);
  pruefe('Kauf: 250 Marken abgebucht',offen.marken,'1750');
  await p.waitForFunction(()=>document.getElementById('kistenTestOverlay').dataset.phase==='warten',null,{timeout:8000});
  const geheim=await p.evaluate(()=>document.querySelectorAll('#kistenTestOverlay .kisten-karte').length);
  pruefe('Ergebnis vor dem Oeffnen nicht im DOM',geheim,0);
  await p.evaluate(()=>document.querySelector('#kistenTestOverlay .kisten-buehne').dispatchEvent(new MouseEvent('click',{bubbles:true})));
  await p.waitForFunction(()=>document.getElementById('kistenTestOverlay').dataset.phase==='fertig',null,{timeout:12000});
  await p.waitForTimeout(200);
  const ergebnis=await p.evaluate(()=>{
    const ov=document.getElementById('kistenTestOverlay');const karten=[...ov.querySelectorAll('.kisten-karte')];
    const k=karten[0];const src=k?.querySelector('.kisten-karte-design')?.getAttribute('src')||'';
    const key=Object.entries(DICE_DESIGNS).find(([,d])=>d.previewAsset&&src.startsWith(d.previewAsset))?.[0]||null;
    return {anzahl:karten.length,gedreht:!!k?.classList.contains('gedreht'),seltenheit:k?.dataset.seltenheit,key,poolRarity:key?DICE_DESIGNS[key].rarity:null,
      ergebnisText:ov.querySelector('.kisten-ergebnis')?.textContent.trim()||'',ergebnisFarbe:ov.dataset.ergebnis,
      front:k?.querySelector('.kisten-karte-vorn-bild img')?.getAttribute('src')||'',
      seltenheitAufKarte:k?.querySelector('.kisten-karte-seltenheit')?.textContent.trim()||'',
      glow:k?parseFloat(getComputedStyle(k.querySelector('.kisten-karte-glow')).opacity):0,
      weiter:!ov.querySelector('.kisten-weiter').classList.contains('hidden'),nochmal:ov.querySelector('.kisten-nochmal').classList.contains('hidden')};
  });
  pruefe('Genau eine Karte, umgedreht',ergebnis.anzahl===1&&ergebnis.gedreht,true);
  pruefe('Design stammt aus dem Kistenpool (traegt eine rarity)',['common','rare','super_rare','epic','legendary'].includes(ergebnis.poolRarity),true);
  pruefe('Karte traegt die Seltenheit des Designs',ergebnis.seltenheit===ergebnis.poolRarity&&ergebnis.ergebnisFarbe===ergebnis.poolRarity,true);
  pruefe('Ergebniszeile sagt Neu oder Doppelt',/Neu!|Doppelt/.test(ergebnis.ergebnisText),true);
  // Der Kartenrahmen folgt dem Wuerfel, nicht der Kiste (Common-Kiste gekauft).
  const frontSoll={common:'common',rare:'rare',super_rare:'super-rare',epic:'epic',legendary:'legendary'}[ergebnis.poolRarity];
  pruefe('Seltenheit steht auf der Karte unter dem Wuerfel',ergebnis.seltenheitAufKarte.toLowerCase()===String(WD_NAMEN[ergebnis.poolRarity]||'').toLowerCase(),true);
  pruefe('Glow der Karte sichtbar',ergebnis.glow>0.5,true);
  pruefe('Kartenrahmen folgt der Wuerfelseltenheit',ergebnis.front.includes(`/${frontSoll}/chest-card-front-${frontSoll}.webp`),true);
  pruefe('Shopmodus: Weiter statt Nochmal',ergebnis.weiter&&ergebnis.nochmal,true);
  console.log(`      gezogen: ${ergebnis.key} (${ergebnis.seltenheit}) · ${ergebnis.ergebnisText}`);
  const nachher=await save(p);const prof=nachher.profiles[0];
  const dup=/Doppelt/.test(ergebnis.ergebnisText);
  pruefe('Spielstand: Design freigeschaltet (oder Duplikat mit Rueckgabe)',dup?prof.wallet.marken>1750:prof.unlockedDice.includes(ergebnis.key)&&prof.wallet.marken===1750,true);
  pruefe('Spielstand: Schema 10 mit wallet und kisten',nachher.schemaVersion>=10&&typeof prof.wallet==='object'&&typeof prof.kisten==='object',true);
  pruefe('Spielstand: vorher war das Design nicht freigeschaltet',dup||!vorher.profiles[0].unlockedDice.includes(ergebnis.key),true);

  // 7. Weiter.
  await p.click('#kistenTestOverlay .kisten-weiter');await p.waitForTimeout(250);
  const zurueck=await p.evaluate(()=>({overlay:document.getElementById('kistenTestOverlay').classList.contains('hidden'),shop:!document.getElementById('prestigeShopScreen').classList.contains('hidden'),
    geoeffnet:document.querySelector('#shopTabChests .shop-kiste[data-stufe="common"] .prestige-item-desc')?.textContent.trim()}));
  pruefe('Weiter fuehrt in den Shop zurueck',zurueck.overlay&&zurueck.shop,true);
  pruefe('Zaehler "Geoeffnet: 1"',zurueck.geoeffnet,'Geöffnet: 1');

  // 8. Echtgeld ohne Wirkung.
  await p.click('#prestigeShopScreen .shop-tab-btn[data-shop-tab="currency"]');await p.waitForTimeout(200);
  const pakete=await p.evaluate(()=>document.querySelectorAll('#shopTabCurrency [data-echtgeld]').length);
  pruefe('Vier Kern-Pakete als Vorschau',pakete,4);
  const mengen=await p.evaluate(()=>[...document.querySelectorAll('#shopTabCurrency .shop-preisschild-text')].map(e=>e.textContent.trim()).join('/'));
  pruefe('Paketmengen 35 / 200 / 500 / 1500 Kerne',mengen,'35/200/500/1500');
  // Online (17.09.): private Tische geben 0 Marken (Farmschutz), das
  // zufaellige Match ist als "bald" angekuendigt; beides steht in der Tabelle.
  const einnahmen=await p.evaluate(()=>{const z=k=>document.querySelector(`#shopTabCurrency tr[data-einnahme="${k}"]`);
    return {privat:z('online_privat')?.querySelector('td')?.textContent.trim(),bald:!!z('online_zufall_sieg')?.querySelector('.shop-einnahme-bald'),zufall:z('online_zufall_sieg')?.querySelector('td')?.textContent.trim()+'/'+z('online_zufall_niederlage')?.querySelector('td')?.textContent.trim()};});
  pruefe('Einnahmen: privates Online-Match +0',einnahmen.privat,'+0');
  pruefe('Einnahmen: zufaelliges Online-Match +60/+20 als "bald"',einnahmen.bald&&einnahmen.zufall==='+60/+20',true);
  const tisch=await p.evaluate(()=>{
    const profil=saveData.profiles[0],vorher=WDShop.wallet(profil).marken;
    players=[{profileId:profil.id,ability:1},{profileId:null,ability:2}];roundStats=[{},{}];tutorialMode=false;
    gameContext={mode:'online-classic',returnScreen:'menu',profileId:profil.id};commitRoundToStorage(0);
    const online=WDShop.wallet(profil).marken-vorher;
    gameContext={mode:'local',returnScreen:'menu',profileId:profil.id};commitRoundToStorage(0);
    const lokal=WDShop.wallet(profil).marken-vorher-online;WDShop.gutschriftText();
    return `${online}/${lokal}`;});
  pruefe('Rundenabschluss: privater Online-Tisch 0 Marken, lokales Duell +40',tisch,'0/40');
  // aria-disabled gilt Playwright als "nicht aktiv"; der Nutzer kann trotzdem
  // tippen, also wird der Tipp erzwungen und das Ergebnis gemessen.
  await p.click('#shopTabCurrency [data-echtgeld="kerne-4"]',{force:true});await p.waitForTimeout(200);
  const echtgeld=await p.evaluate(()=>({kerne:document.getElementById('shopWalletKerne')?.textContent,overlay:document.getElementById('kistenTestOverlay').classList.contains('hidden'),shop:!document.getElementById('prestigeShopScreen').classList.contains('hidden')}));
  pruefe('Echtgeld-Knopf: Guthaben unveraendert, nichts oeffnet sich',echtgeld.kerne==='200'&&echtgeld.overlay&&echtgeld.shop,true);

  // 9. Trophaeen weiterhin da.
  await p.click('#prestigeShopScreen .shop-tab-btn[data-shop-tab="trophies"]');await p.waitForTimeout(200);
  const trophaeen=await p.evaluate(()=>({items:document.querySelectorAll('#shopTabTrophies .prestige-item').length,sichtbar:!document.getElementById('shopTabTrophies').classList.contains('hidden'),kisten:document.getElementById('shopTabChests').classList.contains('hidden')}));
  pruefe('Trophaeen-Reiter zeigt die Kosmetik',trophaeen.items>0&&trophaeen.sichtbar&&trophaeen.kisten,true);
  // 9b. Daily Shop (Attrappe): vier Angebote, gesperrte Knoepfe, Guthaben bleibt.
  await p.click('#prestigeShopScreen .shop-tab-btn[data-shop-tab="daily"]');await p.waitForTimeout(250);
  const daily=await p.evaluate(()=>({angebote:document.querySelectorAll('#shopTabDaily .shop-daily-angebot').length,
    bilder:[...document.querySelectorAll('#shopTabDaily .shop-daily-img')].every(i=>i.complete&&i.naturalWidth>0),
    gesperrt:[...document.querySelectorAll('#shopTabDaily [data-daily-kauf]')].every(b=>b.getAttribute('aria-disabled')==='true'),
    marken:document.getElementById('shopWalletMarken')?.textContent}));
  await p.click('#shopTabDaily [data-daily-kauf]',{force:true});await p.waitForTimeout(150);
  const dailyDanach=await p.evaluate(()=>({marken:document.getElementById('shopWalletMarken')?.textContent,overlay:!document.getElementById('kistenTestOverlay')||document.getElementById('kistenTestOverlay').classList.contains('hidden')}));
  pruefe('Daily Shop: vier Angebote mit geladenem Bild',daily.angebote===4&&daily.bilder,true);
  pruefe('Daily Shop: Knoepfe gesperrt, Tipp aendert nichts',daily.gesperrt&&daily.marken===dailyDanach.marken&&dailyDanach.overlay,true);

  // 11. Ruhe.
  await p.click('#prestigeShopScreen .shop-tab-btn[data-shop-tab="chests"]');await p.waitForTimeout(300);
  const mut=await p.evaluate(async()=>{let n=0;const b=new MutationObserver(l=>{n+=l.length;});await new Promise(r=>setTimeout(r,300));b.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});await new Promise(r=>setTimeout(r,1000));b.disconnect();return n;});
  pruefe('Shop im Leerlauf: 0 DOM-Mutationen pro Sekunde',mut,0);
  const fremde404=vierhundertvier.filter(u=>!u.includes('/assets/ui/v28/png/chests/'));
  pruefe('Keine 404',fremde404.length,0);
  if(fremde404.length)console.log(`      404: ${[...new Set(fremde404)].join(', ')}`);
  await p.close();

  // 10. Englisch.
  const e=await seite({locale:'en-US'});
  const en=await e.evaluate(()=>document.getElementById('menuPrestigeShopBtn')?.textContent.trim()||'');
  await e.click('#menuPrestigeShopBtn');await e.waitForTimeout(300);
  const enReiter=await e.evaluate(()=>[...document.querySelectorAll('#prestigeShopScreen .shop-tab-btn')].map(b=>b.textContent.trim()).join('|'));
  pruefe('Englisch: Menue "Shop"',en,'Shop');
  pruefe('Englisch: Reiter Chests|Trophies|Currency|Daily',enReiter,'Chests|Trophies|Currency|Daily');
  await e.close();
}catch(e){absturz=e;}

const ERWARTET=45;
let fehler=ergebnisse.length<ERWARTET?1:0;
if(fehler)console.log(`ACHTUNG: nur ${ergebnisse.length} von ${ERWARTET} Zusicherungen erreicht.`);
const breite=Math.max(1,...ergebnisse.map(r=>r[0].length));
for(const [name,ist,soll] of ergebnisse){const ok=ist===soll;if(!ok)fehler++;console.log(`${ok?'  ok  ':' FEHL '} ${name.padEnd(breite)}  ist=${String(ist).padStart(5)} soll=${String(soll).padStart(5)}`);}
await browser.close();server.close();
if(absturz)console.log('\nAbbruch: '+absturz.message.split('\n')[0]+'\n'+(absturz.stack||'').split('\n').slice(1,3).join('\n'));
if(errors.length){console.log('\nSeitenfehler:\n'+errors.join('\n'));fehler++;}
console.log(fehler?`\n${fehler} Abweichung(en).`:'\nAlle Zusicherungen erfuellt.');
process.exit(fehler?1:0);
