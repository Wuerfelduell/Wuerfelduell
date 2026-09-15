/* Ein Freischalt- oder Ereignis-Popup darf nie hinter einem Kampf-Overlay
 * verschwinden.
 *
 * Anlass: ein Spieler hat am 14.09. gemeldet, der L2-Freischaltpopup fuer
 * Brutale Einsen sei nicht gekommen. Er kam - das Counterattack-Overlay lag
 * darueber. Der Kampflog ist in index.html fest auf "hidden", es gab also
 * keinen zweiten Kanal, auf dem die Meldung haette ankommen koennen.
 *
 * Anforderung: die Meldeschichten - Ereignis-Popup, Schadenszahl,
 * Heilzahl und die beiden Vollbild-Tints - liegen ueber JEDEM Overlay, das
 * waehrend eines Kampfes aufgehen kann, und bleiben dabei klickdurchlaessig,
 * damit sie die Wuerfelknoepfe darunter nicht blockieren. Untereinander
 * gilt: Freischaltung schlaegt Zahl, Achievement-Toast bleibt ganz oben.
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
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/tmp/chromium',args:['--no-sandbox']});
const p=await browser.newPage({locale:'de-DE',viewport:{width:390,height:844},serviceWorkers:'block'});
p.on('pageerror',e=>errors.push(e.message));
const ergebnisse=[];const pruefe=(n,i,s)=>ergebnisse.push([n,i,s]);
let absturz=null;
try{
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);

  // Alle Overlays, die waehrend eines Kampfes aufgehen koennen.
  const overlays=['counterModal','gamblingModal','highStakesModal','insuranceModal',
                  'perfect25Modal','perfect25D4Modal','secondAbilityModal'];
  const werte=await p.evaluate(overlays=>{
    const zahl=el=>{
      if(!el)return null;
      const z=getComputedStyle(el).zIndex;
      return z==='auto'?null:Number(z);
    };
    const popup=document.getElementById('eventPopup');
    const out={popup:zahl(popup),popupPointerEvents:getComputedStyle(popup).pointerEvents,overlays:{}};
    for(const id of overlays){
      const el=document.getElementById(id);
      out.overlays[id]=el?zahl(el):'fehlt';
    }
    // Der Achievement-Toast gilt als Obergrenze: er soll oben bleiben.
    out.toast=zahl(document.getElementById('achievementToastLayer'));
    // Schaden, Heilung und die beiden Vollbild-Tints melden Zahlen und
    // muessen ebenfalls durch ein offenes Overlay durchkommen.
    out.melder={};out.melderPointer={};
    for(const id of ['damageFx','healFx','damageTint','healTint']){
      const el=document.getElementById(id);
      out.melder[id]=zahl(el);
      out.melderPointer[id]=el?getComputedStyle(el).pointerEvents:null;
    }
    return out;
  },overlays);

  const hoechstesOverlay=Math.max(...Object.values(werte.overlays).filter(z=>typeof z==='number'));
  for(const [id,z] of Object.entries(werte.overlays)){
    if(z==='fehlt'){pruefe(`${id} existiert`,false,true);continue;}
    pruefe(`Popup liegt ueber ${id}`,werte.popup!=null&&z!=null&&werte.popup>z,true);
  }
  for(const [id,z] of Object.entries(werte.melder)){
    pruefe(`${id} liegt ueber allen Overlays`,z!=null&&z>hoechstesOverlay,true);
    pruefe(`${id} blockiert keine Klicks`,werte.melderPointer[id]==='none',true);
    pruefe(`${id} liegt unter dem Popup`,z!=null&&z<werte.popup,true);
  }
  pruefe('Popup blockiert keine Klicks',werte.popupPointerEvents==='none',true);
  if(werte.toast!=null)pruefe('Achievement-Toast bleibt ueber dem Popup',werte.toast>werte.popup,true);

  // Fuer die Kartenzahlen braucht es einen echten Kampf - playDamageAnimation
  // sucht sich die Karte ueber players[]. Ohne das laeuft der Fall ins Leere
  // und meldet "fehlt", was wie ein Fehler aussieht, aber keiner waere.
  const ids=await p.evaluate(()=>{
    const a=createProfile('Alpha'),b=createProfile('Bravo');
    [a,b].forEach(x=>x.campaign.completedEncounters.push('black_table'));
    saveGameData();return[a.id,b.id];
  });
  await p.evaluate(ids=>{
    duoProfile1Id=ids[0];duoProfile2Id=ids[1];
    openDuoCampaignScreen();
    duoProfile1Select.value=ids[0];duoProfile2Select.value=ids[1];
    renderDuoCampaign();
    duoAbility1Select.value='3';duoAbility2Select.value='3';
    window.WDDuoBossRush.refreshButton();
  },ids);
  await p.click('#duoBossRushStartBtn');await p.waitForTimeout(400);
  await p.locator('[data-rush-path]').first().click();await p.waitForTimeout(800);

  // Die Schadens- und Heilzahl AN DER SPIELERKARTE (.damage-pop / .heal-pop)
  // ist eine eigene Schicht: sie wird in die Karte gehaengt und steckt damit
  // in deren Stapelkontext. Am 15.09. gemeldet: das Counterattack-Overlay
  // liegt darueber. Geprueft wird ueber die echten Animationsfunktionen.
  const kartenZahlen=await p.evaluate(()=>{
    document.getElementById('counterModal').classList.remove('hidden');
    const modalZ=Number(getComputedStyle(document.getElementById('counterModal')).zIndex);
    const ziel=players.findIndex(x=>x?.campaignTeam==='hero');
    playDamageAnimation(ziel,14);
    playHealAnimation(ziel,7);
    const werte={modalZ,gefunden:{}};
    for(const klasse of ['damage-pop','heal-pop']){
      const el=document.querySelector('.'+klasse);
      if(!el){werte.gefunden[klasse]='fehlt';continue;}
      const z=getComputedStyle(el).zIndex;
      // Entscheidend ist nicht die eigene z-index-Zahl, sondern ob ein
      // Vorfahre einen Stapelkontext aufmacht, der unter dem Overlay liegt.
      let kontext=null;
      for(let e=el.parentElement;e&&e!==document.body;e=e.parentElement){
        const cs=getComputedStyle(e);
        if(cs.position!=='static'&&cs.zIndex!=='auto'){kontext={wo:(e.id?'#'+e.id:'.'+String(e.className).split(' ')[0]),z:Number(cs.zIndex)};break;}
        if(cs.transform!=='none'||cs.filter!=='none'||cs.isolation==='isolate'||cs.opacity!=='1'){kontext={wo:(e.id?'#'+e.id:'.'+String(e.className).split(' ')[0]),z:'neuer Kontext ohne z-index'};break;}
      }
      werte.gefunden[klasse]={z,elternKontext:kontext,
        obenAuf:kontext===null?Number(z)>modalZ:(typeof kontext.z==='number'?kontext.z>modalZ:false)};
    }
    return werte;
  });
  for(const [klasse,w] of Object.entries(kartenZahlen.gefunden)){
    if(w==='fehlt'){pruefe(`${klasse} wird erzeugt`,false,true);continue;}
    pruefe(`${klasse} liegt ueber dem Kampf-Overlay`,w.obenAuf===true,true);
    if(w.obenAuf!==true)console.log(`      ${klasse}: z=${w.z}, eingesperrt von ${JSON.stringify(w.elternKontext)} (Overlay liegt auf ${kartenZahlen.modalZ})`);
  }

  // Sichtprobe: Overlay auf, Popup an - ist die Popup-Flaeche zu sehen?
  const sichtbar=await p.evaluate(()=>{
    const modal=document.getElementById('counterModal');
    modal.classList.remove('hidden');
    const popup=document.getElementById('eventPopup');
    const panel=document.getElementById('eventPopupText');
    panel.textContent='Brutale Einsen L2 unlocked!';
    popup.className='win active';popup.style.opacity='1';
    const r=panel.getBoundingClientRect();
    const oben=document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2);
    // pointer-events:none haelt das Popup aus elementsFromPoint heraus; der
    // Vergleich laeuft deshalb ueber die Stapelreihenfolge, nicht ueber Treffer.
    return {panelSichtbar:r.width>0&&r.height>0,
            hinterOverlay:oben.some(el=>el.id==='counterModal'&&
              Number(getComputedStyle(el).zIndex)>Number(getComputedStyle(popup).zIndex))};
  });
  pruefe('Popup-Flaeche hat Groesse',sichtbar.panelSichtbar,true);
  pruefe('Popup steckt nicht hinter dem Overlay',sichtbar.hinterOverlay===false,true);

}catch(e){absturz=e;}finally{
  const ERWARTET=25;
  let fehler=ergebnisse.length<ERWARTET?1:0;
  if(fehler)console.log(`ACHTUNG: nur ${ergebnisse.length} von ${ERWARTET} Zusicherungen erreicht.`);
  const breite=Math.max(1,...ergebnisse.map(r=>r[0].length));
  for(const [name,ist,soll] of ergebnisse){
    const ok=ist===soll;if(!ok)fehler++;
    console.log(`${ok?'  ok  ':' FEHL '} ${name.padEnd(breite)}  ist=${String(ist).padStart(5)} soll=${String(soll).padStart(5)}`);
  }
  await browser.close();server.close();
  if(absturz)console.log('\nAbbruch: '+absturz.message.split('\n')[0]);
  if(errors.length){console.log('\nSeitenfehler:\n'+errors.join('\n'));fehler++;}
  if(fehler){console.log(`\n${fehler} Abweichung(en).`);process.exit(1);}
  console.log('\nAlle Zusicherungen erfuellt.');
}
