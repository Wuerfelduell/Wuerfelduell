/* Im sichtbaren Spiel darf kein rohes Emoji stehen.
 *
 * js/36-emoji-sprite-pass.js ersetzt Emojis im DOM durch Sprites, per
 * MutationObserver auch in Flaechen, die erst spaeter aufgehen. Dieses Skript
 * prueft, dass dabei nichts durchrutscht.
 *
 * WICHTIG fuer alle, die hier "aufraeumen" wollen: die Emojis im Markup sind
 * kein Schmutz, sondern die QUELLE. Fuer Elemente, die nicht in ID_ICONS
 * stehen, liest der Pass das Emoji und leitet daraus das Sprite ab. Wer es
 * aus index.html loescht, nimmt der Stelle ihr Symbol.
 *
 * Gemessen wird der gerenderte Baum, nicht der Quelltext. Der Quelltext
 * zaehlt ueber 900 Vorkommen; die stecken fast alle in addLog-Zeilen (#log
 * ist dauerhaft "hidden" und ausserdem uebersprungen), in den Sprachpaketen
 * als Suchschluessel und in der ICONS-Tabelle des Passes selbst.
 *
 * Die Testumgebung ist bewusst ausgenommen (TEST_SELECTOR im Pass) und wird
 * nur nachrichtlich gemeldet.
 */
import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';
const {chromium}=await import(process.env.WD_PLAYWRIGHT||'/opt/node22/lib/node_modules/playwright/index.mjs');
const root=process.cwd(),errors=[];
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
let ohnePass=false;
const server=createServer((req,res)=>{try{
  const file=path.join(root,new URL(req.url,'http://x').pathname);let body=fs.readFileSync(file);
  if(file.endsWith('index.html')){
    body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|online\/01-online)\.js[^>]*><\/script>/g,'');
    if(ohnePass)body=body.replace(/<script[^>]+src="js\/36-emoji-sprite-pass\.js[^>]*><\/script>/g,'');
  }
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/tmp/chromium',args:['--no-sandbox']});

const TESTLAB='#testLabAbilityModal,#abilityMasteryLabModal,#testLabWorkbench,#tutorialHubLabBtn,[id^=testLab],[id^=abilityMasteryLab],.test-lab-workbench';

async function durchlauf(){
  const p=await browser.newPage({locale:'de-DE',viewport:{width:390,height:844},serviceWorkers:'block'});
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await p.waitForTimeout(700);
  const gefunden=await p.evaluate(async TESTLAB=>{
    // Jede Flaeche aufmachen, in der laut Markup ein Emoji steckt: Overlays,
    // Siegkarte, Zielwahl. Nur .hidden zu entfernen genuegt hier, weil es um
    // bereits vorhandenen Text geht und nicht um nachgeladene Inhalte.
    ['gamblingModal','gamblingRetryActions','counterModal','tutorialHubModal',
     'testLabAbilityModal','setup','game','campaignTargetBox','winnerBox',
     'nextRoundBox','onlineMainMenuBtn','mainMenu']
      .forEach(id=>document.getElementById(id)?.classList.remove('hidden'));
    await new Promise(r=>setTimeout(r,900));
    const treffer=[];
    const lauf=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    for(let n=lauf.nextNode();n;n=lauf.nextNode()){
      const text=n.nodeValue;
      if(!text||!/\p{Extended_Pictographic}/u.test(text))continue;
      const el=n.parentElement;
      if(!el||el.closest('#log,script,style,template'))continue;
      treffer.push({
        wo:(el.id?'#'+el.id:'.'+String(el.className||'').split(' ')[0]),
        testumgebung:!!el.closest(TESTLAB),
        zeichen:[...new Set(text.match(/\p{Extended_Pictographic}/gu))].join(''),
        text:text.trim().slice(0,46)
      });
    }
    return {treffer,sprites:document.querySelectorAll('.dd-emoji-sprite').length};
  },TESTLAB);
  await p.close();
  return gefunden;
}

let fehler=0;
try{
  // Gegenprobe: OHNE den Pass muss reichlich uebrig bleiben. Sonst misst das
  // Skript nichts und jede Null waere wertlos. Eine Positivkontrolle durch
  // Einsetzen taugt nicht - der Observer wandelt das eingesetzte Emoji binnen
  // Millisekunden selbst um; genau daran ist ein erster Entwurf gescheitert.
  ohnePass=true;
  const ohne=await durchlauf();
  console.log(`Gegenprobe ohne Sprite-Pass: ${ohne.treffer.length} rohe Emojis, ${ohne.sprites} Sprites`);
  if(ohne.treffer.length<8||ohne.sprites>0){
    console.log('FEHL: Die Gegenprobe ist nicht plausibel - das Skript misst nicht, was es soll.');
    fehler++;
  }

  ohnePass=false;
  const mit=await durchlauf();
  const echt=mit.treffer.filter(t=>!t.testumgebung);
  const labor=mit.treffer.filter(t=>t.testumgebung);
  console.log(`Mit Sprite-Pass:             ${mit.treffer.length} rohe Emojis, ${mit.sprites} Sprites`);
  console.log(`\nIm Spiel (zaehlt):           ${echt.length}`);
  for(const t of echt)console.log(`   ${t.zeichen}  ${t.wo.padEnd(24)} "${t.text}"`);
  console.log(`In der Testumgebung (vom Pass bewusst ausgenommen): ${labor.length}`);
  for(const t of labor)console.log(`   ${t.zeichen}  ${t.wo.padEnd(24)} "${t.text}"`);
  if(echt.length){console.log('\nFEHL: Im sichtbaren Spiel steht ein rohes Emoji.');fehler++;}
}catch(e){console.log('Abbruch:',e.message.split('\n')[0]);fehler++;}

await browser.close();server.close();
if(errors.length){console.log('\nSeitenfehler:\n'+errors.join('\n'));fehler++;}
console.log(fehler?`\n${fehler} Abweichung(en).`:'\nAlle Zusicherungen erfuellt.');
process.exit(fehler?1:0);
