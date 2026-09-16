/* Gegenprobe fuer vorgezogene Wuerfe, ohne Netz oder Browser.
   WD_SOURCE_ROOT erlaubt denselben Pruefstand gegen den alten Checkout. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const root=process.env.WD_SOURCE_ROOT||process.cwd();
const source=readFileSync(path.join(root,'js/13-battle-actions.js'),'utf8');
const code=source.slice(0,source.indexOf('  function tickClassicSpecialDie'));
for(const duration of [430,250]){
  const calls=[],timers=[];
  const context=vm.createContext({
    dice:[{value:1},{value:4,locked:true},{value:null}],current:0,phase:'base_select',isAnimating:false,ROLL_ANIM_MS:duration,
    randDie:()=>{throw Error('Vorschau darf keine echten Wuerfe verbrauchen');},
    rollTrackedD6:()=>{calls.push('wurf');return 6;},
    renderAll:()=>calls.push('render'),
    applyTwelveHeal:()=>calls.push('heilung'),
    setTimeout:(fn,ms)=>timers.push({fn,ms})
  });
  vm.runInContext(code,context);
  let finished=0;
  context.animateIndices([0,2],()=>finished++);
  assert.equal(context.dice[0].value,6,'Wert muss vor dem ersten Timer feststehen');
  assert.equal(context.dice[2].value,6);
  assert.equal(context.dice[1].value,4,'Gesperrter Wuerfel unveraendert');
  assert(context.dice[0].rolling&&context.dice[2].rolling);
  assert.deepEqual(calls,['wurf','wurf','render']);
  assert.equal(finished,0);assert.equal(timers[0].ms,duration);
  timers.shift().fn();
  assert.equal(finished,1);assert.equal(context.isAnimating,false);
  assert.equal(context.dice[0].rolling,false);
  assert.equal(calls.filter(x=>x==='wurf').length,2,'Keine zweite Ziehung beim Aufdecken');
  assert.equal(calls.filter(x=>x==='heilung').length,1);
  assert.equal(calls.at(-1),'render','Aufdecken rendert auch ohne rendernden Finalizer');
  const indices=[];
  context.animateIndices([2],()=>finished++,{preview:()=>{throw Error('Keine Vorschauziehung');},final:i=>{indices.push(i);return 3;}});
  assert.deepEqual(indices,[2]);assert.equal(context.dice[2].value,3);
  timers.shift().fn();
  context.animateIndices([],()=>finished++);
  assert.equal(finished,3);assert.equal(timers.length,0);
}
console.log('ok: Werte vor Timer, genau eine Ziehung, Heilung beim Aufdecken, eigene Finalfunktion, 430/250 ms und leere Auswahl');

// Die echte Snapshot-Anwendung isoliert pruefen: Augen festschreiben darf
// weder den Pending-Timer loeschen noch das uebergebene Paket veraendern.
const bridge=readFileSync(path.join(root,'js/17-online-bridge.js'),'utf8');
const applyCode=bridge.slice(bridge.indexOf('  function applyStateNow('),bridge.indexOf('  function applyAuthoritativeState('));
let previews=0,cleared=0,commits=0;
// Eine stellbare Uhr und eine Timerliste: die Aufdeckung haengt jetzt daran,
// wie lange die Vorschau beim Gast schon laeuft.
let uhr=100000;const aufdeckTimer=[];
const c=vm.createContext({
  onlineSession:{isHost:false,actionPending:true,pendingTimer:123,playedCombatFxIds:new Set(),previewStart:0,revealTimer:null},
  MAIN_ROLL_ACTIONS:new Set(['primary']),isOnlineRollVisual:()=>true,
  ROLL_ANIM_MS:430,performance:{now:()=>uhr},
  setTimeout:(fn,ms)=>{aufdeckTimer.push({fn,ms});return aufdeckTimer.length;},
  clearTimeout(){},
  prepareOnlineRollCommit:()=>commits++,finishOnlineRollWindow(){},
  players:[{onlineUid:'gast',hp:25}],current:0,phase:'idle',dice:[],
  applyPlayers(){},syncLocalOnlineAchievements(){},applyBattleSnapshot(){},
  cloneJson:v=>structuredClone(v),renderAll(){},renderDice(){},restoreUiSnapshot(){},
  clearPendingAction:()=>{cleared++;c.onlineSession.actionPending=false;c.onlineSession.pendingTimer=null;},
  beginActionPreview:()=>previews++,enforceOnlineControls(){}
});
vm.runInContext(applyCode,c);
const state={settled:false,actionType:'primary',currentPlayerUid:'gast',dice:[{value:6,rolling:true}],battle:{},ui:{}};

// Der eigene Wurf: der Gast wartet seit ueber einer Wurfdauer auf die Antwort
// und hat lange genug zugesehen. Er deckt sofort auf - das ist der Gewinn.
c.onlineSession.previewStart=uhr-1200;
c.applyStateNow(state,null);
assert.equal(c.dice[0].value,6);
assert.equal(c.dice[0].rolling,false,'Nach langer Vorschau sofort aufdecken');
assert.equal(state.dice[0].rolling,true,'Eingangspaket bleibt unveraendert');
assert.equal(previews,0);assert.equal(commits,1);assert.equal(cleared,0);
assert.equal(aufdeckTimer.length,0,'Kein Aufschub noetig');
assert.equal(c.onlineSession.actionPending,true);assert.equal(c.onlineSession.pendingTimer,123);

// Der Wurf des HOSTS: dessen Zwischenstand erreicht den Gast nach rund 30 ms.
// Deckt der Gast dann sofort auf, dreht sich bei ihm gar nichts - genau das
// war der Befund aus dem Spieltest. Die Augen stehen fest, gezeigt werden sie
// erst, wenn die Vorschau so lange lief wie ein Wurf.
commits=0;c.dice=[];
c.onlineSession.previewStart=uhr-30;
c.applyStateNow(state,null);
assert.equal(c.dice[0].value,6,'Das Ergebnis steht trotzdem schon fest');
assert.equal(c.dice[0].rolling,true,'Gast dreht weiter, statt sofort aufzudecken');
assert.equal(commits,0,'Noch nicht festschreiben, es dreht sich ja noch');
assert.equal(aufdeckTimer.length,1);
assert.equal(aufdeckTimer[0].ms,400,'Aufdecken nach der restlichen Wurfdauer');
aufdeckTimer.pop().fn();
assert.equal(c.dice[0].rolling,false,'Nach dem Aufschub liegt das Ergebnis offen');
assert.equal(commits,1);

// Halb abgelaufene Vorschau: nur der Rest wird nachgedreht.
commits=0;c.dice=[];
c.onlineSession.previewStart=uhr-300;
c.applyStateNow(state,null);
assert.equal(aufdeckTimer.pop().ms,130,'Nur die Restdauer, nicht noch einmal voll');
c.dice=[];c.onlineSession.previewStart=uhr-1200;
c.applyStateNow(state,null);
commits=1;
c.applyStateNow({...state,settled:true,dice:[{value:6,rolling:false}]},null);
assert.equal(cleared,1);assert.equal(c.onlineSession.actionPending,false);
c.applyStateNow({...state,actionType:'gambling_roll'},null);
assert.equal(previews,1,'Spezialwurf bleibt auf eigenem Vorschaupfad');
c.applyStateNow({...state,dice:[{value:null,rolling:true}]},null);
assert.equal(previews,2,'Alte Zwischenstaende ohne Augen nicht als Ergebnis zeigen');
console.log('ok: Gast dreht die Restdauer nach, deckt nach langer Vorschau sofort auf, Pending/Timer bleiben, Spezialwurf und alte Pakete bleiben Vorschau');
