// Schritt 1: dieselben Daten im Browser; das laufende Duell bleibt unverändert.
// Anforderung vor Umsetzung: vier Modi, DE/EN, fünf Breiten, ruhiger Leerlauf.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createServer} from 'node:http';
import {chromium} from 'playwright';

const engine = vm.createContext({});
for(const file of ['02-definitions.js','03-state.js']){
  vm.runInContext(fs.readFileSync(`js/engine/${file}`,'utf8'),engine,{filename:file});
}
const definitions=JSON.stringify(engine.WDEngine.definitions);
const fixtures=[];
for(const modeId of ['classic','endurance50','overload75','mayhem']){
  for(let count=2;count<=6;count++){
    fixtures.push({modeId,players:Array.from({length:count},(_,seat)=>({
      seat,abilities:[1,2,3].slice(0,engine.WDEngine.definitions.LOCAL_MODES[modeId].startAbilityCount)
    }))});
  }
}
engine.input=JSON.stringify(fixtures);
const states=vm.runInContext('JSON.stringify(JSON.parse(input).map(setup=>WDEngine.createState(setup)))',engine);
const root=process.cwd(),errors=[],missing=[];
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{
  try{
    const file=path.join(root,new URL(req.url,'http://x').pathname);
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    res.end(fs.readFileSync(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined),args:['--no-sandbox']});
  for(const locale of ['de-DE','en-US'])for(const width of [320,360,390,412,1280]){
    const page=await browser.newPage({viewport:{width,height:844},locale,serviceWorkers:'block'});
    page.setDefaultTimeout(15000);
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()===404)missing.push(response.url());});
    await page.route(/\/js\/(?:backend-config|41-supabase-core|42-supabase-account|43-supabase-battle|online\/01-online)\.js/,route=>route.fulfill({contentType:'text/javascript',body:''}));
    await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.fulfill({body:''}));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.waitForFunction(()=>typeof globalThis.WDEngine?.createState==='function'&&typeof createProfile==='function');
    assert.equal(await page.locator('html').getAttribute('lang'),locale.slice(0,2));
    const data=await page.evaluate(fixtures=>({
      definitions:JSON.stringify(WDEngine.definitions),
      states:JSON.stringify(fixtures.map(setup=>WDEngine.createState(setup))),
      aliases:ABILITIES===WDEngine.definitions.ABILITIES&&LOCAL_MODES===WDEngine.definitions.LOCAL_MODES
    }),fixtures);
    assert.equal(data.definitions,definitions,'Browser lädt dieselben Definitionen');
    assert.equal(data.states,states,'20 Startzustände sind in Browser und Node byteidentisch');
    assert.equal(data.aliases,true,'Browser verwendet dieselben Objekte');
    await page.evaluate(()=>{createProfile('Prüfung 1');createProfile('Prüfung 2');});
    for(const modeId of ['classic','endurance50','overload75','mayhem']){
      const started=await page.evaluate(modeId=>{
        openMainMenu(true);
        document.getElementById('menuPlayBtn').click();
        localModeSelect.value=modeId;applyLocalModeSetup();
        playerCount.value='2';makeNameFields();
        WDRng.useSeed(12345);rollSetupAbilities();
        for(let i=0;i<2;i++)if(setupAbilityRolls[i]===6)document.getElementById('abilityChoice'+i).value=CHOOSABLE_ABILITY_IDS[0];
        updateStartAvailability();
        if(startGameBtn.disabled)throw Error('Spielstart gesperrt: '+modeId);
        startGameBtn.click();
        return {hp:players.map(player=>player.hp),abilities:players.map((_,i)=>playerAbilities(i).length),mode:localModeId,phase};
      },modeId);
      const rules=engine.WDEngine.definitions.LOCAL_MODES[modeId];
      assert.deepEqual(started,{hp:[rules.startHp,rules.startHp],abilities:[rules.startAbilityCount,rules.startAbilityCount],mode:modeId,phase:'idle'});
      assert.equal(await page.locator('#game').isVisible(),true);
      await page.waitForTimeout(400);
      const layout=await page.evaluate(async()=>{
        let mutations=0;
        const observer=new MutationObserver(entries=>mutations+=entries.length);
        observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
        await new Promise(resolve=>setTimeout(resolve,1000));observer.disconnect();
        return {mutations,overflow:document.documentElement.scrollWidth-innerWidth};
      });
      assert.equal(layout.mutations,0,`${modeId}/${locale}/${width}: Leerlauf`);
      assert.ok(layout.overflow<=1,`${modeId}/${locale}/${width}: Überlauf ${layout.overflow}`);
    }
    await page.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log('Engine-Daten: 20 Startzustände byteidentisch in Browser/Node; 40 Kampfansichten (4 Modi × DE/EN × 5 Breiten) ohne JS-Fehler, 404, Überlauf oder Leerlaufmutationen. Keine Reducer-Matchparität in Schritt 1.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
