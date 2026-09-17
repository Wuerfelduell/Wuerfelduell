// Anforderungsprüfstand für Phase 2, Schritt 1: nur Definitionen und Zustand.
// Vor der Implementierung geschrieben; keine Kampfregeln und kein Reducer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const files=['js/engine/02-definitions.js','js/engine/03-state.js'];
const forbidden=['window','document','localStorage','sessionStorage','setTimeout','setInterval','fetch','Date','performance'];
const context=vm.createContext({});
for(const name of forbidden)Object.defineProperty(context,name,{get(){throw Error(`Engine greift auf ${name} zu`);}});
vm.runInContext('Math.random=()=>{throw new Error("State-Erzeugung darf keinen Zufall verbrauchen")}',context);
for(const file of files){
  assert.ok(fs.existsSync(file),`${file} fehlt`);
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const E=context.WDEngine,D=E?.definitions;
assert.ok(D,'globalThis.WDEngine.definitions fehlt');
assert.equal(typeof E.createState,'function');
assert.equal(typeof E.validateState,'function');
assert.deepEqual(Object.keys(context),['WDEngine'],'Engine registriert ausschließlich WDEngine');
const plain=value=>JSON.parse(JSON.stringify(value));
const snapshot=value=>JSON.stringify(value);
const realIds=Array.from({length:25},(_,i)=>i+1).filter(id=>id!==6);
const modes={
  classic:{id:'classic',name:'Classic',startHp:25,startAbilityCount:1,bonusThreshold:12,bonusSlot:2,maxPlayers:8,allowBots:true,lastPlaceFreeChoices:1},
  endurance50:{id:'endurance50',name:'Endurance',startHp:50,startAbilityCount:2,bonusThreshold:30,bonusSlot:3,maxPlayers:4,allowBots:false,lastPlaceFreeChoices:2},
  overload75:{id:'overload75',name:'Overload',startHp:75,startAbilityCount:3,bonusThreshold:null,bonusSlot:null,maxPlayers:4,allowBots:false,lastPlaceFreeChoices:1},
  mayhem:{id:'mayhem',name:'Mayhem',startHp:65,startAbilityCount:2,bonusThreshold:30,bonusSlot:3,maxPlayers:6,allowBots:false,lastPlaceFreeChoices:0,bonusOnKill:true,allMasteryLevel:2}
};
assert.equal(D.RULE_VERSION,'duel-1');
assert.equal(D.STATE_VERSION,1);
assert.equal(D.START_HP,25);assert.equal(D.DICE_COUNT,5);assert.equal(D.SECOND_ABILITY_HP,12);
assert.deepEqual(plain(D.REAL_ABILITY_IDS),realIds);
assert.deepEqual(plain(D.CHOOSABLE_ABILITY_IDS),realIds.filter(id=>id!==7));
assert.deepEqual(plain(D.LOCAL_MODES),modes,'Bestehende Modusparameter einschließlich UI-Grenzen bleiben unverändert');
assert.deepEqual(Object.keys(D.ABILITIES).map(Number),[0,...realIds]);
// Datenhash aus dem freigegebenen V28.13.2-Katalog, vor dem Umbau erfasst.
assert.equal(createHash('sha256').update(snapshot(D.ABILITIES)).digest('hex'),
  '0201abd8498966ff14b7cc502727f65d7a27be14390f4ac8dad37f96b79816fc',
  'Fähigkeitsnamen und Texte müssen vollständig unverändert bleiben');
function assertFrozen(value){
  if(!value||typeof value!=='object')return;
  assert.ok(Object.isFrozen(value),'Definitionsdaten müssen rekursiv unveränderlich sein');
  for(const child of Object.values(value))assertFrozen(child);
}
assertFrozen(D);

// Die alten Browsernamen müssen exakt auf dieselben Daten zeigen.
const browserContext=vm.createContext({WDEngine:E});
const config=fs.readFileSync('js/01-config.js','utf8');
const gameData=fs.readFileSync('js/05-game-data-state.js','utf8');
const configPrefix=config.slice(0,config.indexOf('  const GAME_VERSION='));
const abilityPrefix=gameData.slice(0,gameData.indexOf('  const SEATS ='));
assert.ok(configPrefix.length>0&&abilityPrefix.length>0,'Browser-Definitionsgrenzen gefunden');
vm.runInContext(configPrefix+abilityPrefix+'\nglobalThis.aliases={START_HP,DICE_COUNT,SECOND_ABILITY_HP,REAL_ABILITY_IDS,CHOOSABLE_ABILITY_IDS,LOCAL_MODES,ABILITIES};',browserContext);
for(const key of Object.keys(browserContext.aliases))assert.strictEqual(browserContext.aliases[key],D[key],`${key}: Browser benötigt dieselbe Quelle`);

let positive=0,negative=0;
function serializable(value,seen=new Set()){
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'){assert.ok(Number.isFinite(value),'Zustand enthält nichtendliche Zahl');return;}
  assert.equal(typeof value,'object','Zustand enthält keinen JSON-Datentyp');
  assert.ok(!seen.has(value),'Zustand enthält Zyklus oder geteilte veränderliche Referenz');seen.add(value);
  const kind=Object.prototype.toString.call(value);
  assert.ok(kind==='[object Array]'||kind==='[object Object]','Sets und Fremdobjekte gehören nicht in den Zustand');
  assert.equal(Object.getOwnPropertySymbols(value).length,0,'Keine Symbolfelder im Zustand');
  for(const key of Object.keys(value))serializable(value[key],seen);
}
function objectReferences(value,all=new Set()){
  if(!value||typeof value!=='object'||all.has(value))return all;
  all.add(value);for(const child of Object.values(value))objectReferences(child,all);return all;
}
function valid(state,label){
  serializable(state);
  const before=snapshot(state),result=E.validateState(state);
  assert.equal(result?.valid,true,`${label}: ${snapshot(result)}`);
  assert.deepEqual(plain(result.errors),[],label);
  assert.equal(snapshot(state),before,`${label}: validateState mutiert Zustand`);
  assert.equal(E.validateState(plain(state)).valid,true,'JSON-Roundtrip muss ein gültiger Zustand bleiben');
  positive++;
}
function setup(modeId='classic',count=2){
  return {modeId,players:Array.from({length:count},(_,seat)=>({seat,abilities:realIds.slice(seat,seat+modes[modeId].startAbilityCount)}))};
}
function rejectSetup(input,label){
  assert.throws(()=>E.createState(input),error=>error?.name==='TypeError',label);
  negative++;
}
function rejectState(state,label){
  const result=E.validateState(state);
  assert.equal(result?.valid,false,label);
  assert.ok(Array.isArray(result.errors)&&result.errors.length>0,`${label}: verständlicher Fehler fehlt`);
  for(const error of result.errors){assert.equal(typeof error.path,'string');assert.equal(typeof error.reason,'string');assert.ok(error.reason.length>0);}
  negative++;
}

for(const modeId of Object.keys(modes))for(let count=2;count<=6;count++){
  const input=setup(modeId,count),before=snapshot(input),state=E.createState(input);
  assert.equal(snapshot(input),before,'createState darf Setup nicht verändern');
  assert.equal(state.ruleVersion,D.RULE_VERSION);assert.equal(state.stateVersion,D.STATE_VERSION);
  assert.equal(state.modeId,modeId);assert.equal(state.masteryLevel,modeId==='mayhem'?2:0);
  assert.equal(state.players.length,count);assert.equal(state.dice.length,5);
  assert.deepEqual(plain(state.turn),{number:1,currentSeat:0,phase:'idle',decision:{kind:'roll_base',seat:0}});
  assert.deepEqual(plain(state.round),{number:1,eliminationOrder:[],lastPlaceSeat:null,winnerSeat:null,result:null,preparation:[]});
  assert.deepEqual(plain(state.sequence),{action:0,event:0});
  assert.deepEqual(plain(state.dice),Array.from({length:5},()=>({value:null,locked:false,selected:false})));
  assert.equal(state.rng.drawIndex,0);assert.equal(state.rng.algorithm,'external');
  assert.equal(state.rng.seed,null);assert.equal(state.rng.state,null);
  for(let i=0;i<count;i++){
    assert.equal(state.players[i].seat,i);assert.equal(state.players[i].hp,modes[modeId].startHp);
    assert.equal(state.players[i].maxHp,modes[modeId].startHp);
    assert.deepEqual(plain(state.players[i].abilities),input.players[i].abilities);
    assert.equal(state.players[i].roundsWon,0);
    assert.deepEqual(plain(state.players[i].effects),{momentumStreak:0,lastStandUsed:false,lastStandCooldown:0,
      damageSinceLastOwnTurn:false,bloodRushPrimed:false,voluntaryHpPaidThisTurn:false,selfDamageSinceLastOwnTurn:false,
      underdogTurnActive:false,poisonTurns:0,poisonSourceSeat:null,healEffectCount:0,snakeEyesUsesThisTurn:0});
  }
  valid(state,`${modeId}/${count}`);
  const detached=E.createState(input);
  assert.equal(snapshot(detached),snapshot(state),'Gleiches Setup ergibt byteidentischen Initialzustand');
  const originalRefs=objectReferences(state),detachedRefs=objectReferences(detached),inputRefs=objectReferences(input);
  for(const ref of originalRefs){assert.ok(!detachedRefs.has(ref),'Zustandsinstanzen teilen keine Objekte');assert.ok(!inputRefs.has(ref),'Zustand übernimmt keine veränderlichen Eingabeobjekte');}
  state.players[0].hp=1;state.players[0].abilities.push(25);state.dice[0].locked=true;
  assert.equal(detached.players[0].hp,modes[modeId].startHp);
  assert.equal(detached.players[0].abilities.length,modes[modeId].startAbilityCount);
  assert.equal(detached.dice[0].locked,false,'Getrennte Instanzen dürfen Würfel nicht teilen');
  assert.equal(snapshot(input),before,'Zustandsänderungen dürfen Setup nicht ändern');
}

// Alle echten Fähigkeiten einschließlich Glück sind als Startzuweisung zulässig.
for(const id of realIds){const input=setup();input.players[0].abilities=[id];valid(E.createState(input),`Fähigkeit ${id}`);}
for(const seed of [0,0xffffffff]){
  const input={...setup(),rng:{algorithm:'mulberry32',seed,state:seed,drawIndex:0}};
  const state=E.createState(input);assert.deepEqual(plain(state.rng),input.rng);valid(state,`uint32 ${seed}`);
}
{
  const input={...setup(),startingSeat:2,roundNumber:7,rng:{algorithm:'external',seed:null,state:null,drawIndex:42}};
  input.players[0].seat=5;input.players[1].seat=2;
  const state=E.createState(input);
  assert.deepEqual(plain(state.players).map(p=>p.seat),[5,2],'Zugfolge wird nicht nach Sitznummer umsortiert');
  assert.equal(state.turn.currentSeat,2);assert.equal(state.turn.decision.seat,2);assert.equal(state.round.number,7);
  assert.deepEqual(plain(state.rng),input.rng);valid(state,'Expliziter Start, lückenhafte Sitze und RNG-Fortschritt');
}
for(const value of [null,undefined,[],0,'classic',{},new Date(),new Map(),new Set()])rejectSetup(value,'Ungültiges Setup-Objekt');
for(const count of [0,1,7,8])rejectSetup(setup('classic',count),`${count} Sitze außerhalb Engine-Grenze`);
for(const modeId of ['', 'campaign','Classic',null,7])rejectSetup({...setup(),modeId},'Ungültiger Modus');
for(const seat of [-1,6,0.5,'0',null,NaN,Infinity]){const input=setup();input.players[0].seat=seat;rejectSetup(input,'Ungültiger Sitz');}
{const input=setup();input.players[1].seat=0;rejectSetup(input,'Doppelte Sitze');}
for(const startingSeat of [5,-1,0.5,'0',null])rejectSetup({...setup(),startingSeat},'Startspieler muss belegter Sitz sein');
for(const roundNumber of [0,-1,0.5,'1',null,Infinity,Number.MAX_SAFE_INTEGER+1])rejectSetup({...setup(),roundNumber},'Ungültige Rundennummer');
for(const id of [0,6,26,-1,'1',null,undefined,NaN,Infinity]){const input=setup();input.players[0].abilities=[id];rejectSetup(input,'Ungültige Fähigkeit');}
for(const abilities of [[],[1,2],null,new Set([1])]){const input=setup();input.players[0].abilities=abilities;rejectSetup(input,'Ungültige Startfähigkeitszahl oder Struktur');}
{const input=setup('mayhem');input.players[0].abilities=[1,1];rejectSetup(input,'Doppelte Fähigkeiten');}
for(const foreign of [{profileId:'private'},{profile:{mastery:2}},{masteryLevel:2},{hp:999},{abilitiesLevels:{1:2}}]){
  const input=setup();Object.assign(input.players[0],foreign);rejectSetup(input,'Keine Profil- oder HP-Overrides im Setup');
}
for(const rng of [null,{},[],{algorithm:'other',seed:null,state:null,drawIndex:0},
  {algorithm:'external',seed:1,state:null,drawIndex:0},
  {algorithm:'mulberry32',seed:null,state:null,drawIndex:0},
  {algorithm:'mulberry32',seed:-1,state:0,drawIndex:0},
  {algorithm:'mulberry32',seed:0x100000000,state:0,drawIndex:0},
  {algorithm:'mulberry32',seed:0,state:NaN,drawIndex:0},
  {algorithm:'external',seed:null,state:null,drawIndex:-1},
  {algorithm:'external',seed:null,state:null,drawIndex:0.5},
  {algorithm:'external',seed:null,state:null,drawIndex:Number.MAX_SAFE_INTEGER+1}
])rejectSetup({...setup(),rng},'Ungültiger RNG-Fortschritt');
{const input=setup();input.self=input;rejectSetup(input,'Zyklisches Setup');}
for(const foreign of [new Date(),new Map(),new Set(),()=>{},undefined,Symbol('x'),1n,NaN,Infinity]){
  const input=setup();input.extra=foreign;rejectSetup(input,'Keine fremden oder nicht serialisierbaren Werte');
}

// Reale Entscheidungsgrenzen müssen darstellbar bleiben, auch wenn der
// Reducer erst in den nächsten Schritten kommt. Keine Timer simulieren.
{
  const input=setup('mayhem');input.players[0].abilities=[25,4];input.players[1].abilities=[25,5];
  const state=E.createState(input);
  assert.equal(state.players[0].effects.underdogTurnActive,true,'Mayhem-Starter hält Underdog bei gleichem Startleben fest');
  assert.equal(state.players[1].effects.underdogTurnActive,false,'Underdog des nächsten Spielers beginnt erst in dessen Zug');
  valid(state,'Mayhem: initialer Underdog-Lock');
  state.turn={number:1,currentSeat:0,phase:'attack_after_roll',decision:{kind:'resolve_attack',seat:0}};
  Object.assign(state.attack,{face:1,targetSeat:1,baseTotal:25,precisionUses:3});
  state.players[0].abilities=[8,20];state.players[0].effects.underdogTurnActive=false;
  state.players[0].effects.snakeEyesUsesThisTurn=4;
  valid(state,'Mayhem: drei Präzisionsnutzungen und Python-Entangle-Zähler');
}
{
  const state=plain(E.createState(setup()));
  state.turn.phase='base_select';
  state.turn.decision={kind:'choose_ability',seat:0};
  state.dice.forEach(die=>die.value=4);
  state.players[0].hp=12;state.players[0].bonusAbilityUnlocked=true;
  state.players[1].hp=12;state.players[1].bonusAbilityUnlocked=true;
  state.draft.active={seat:0,slot:2,choices:[3,4],trigger:'hp'};
  state.draft.queue=[{seat:1,slot:2,trigger:'hp'}];
  valid(state,'HP-Draft mit ausstehendem Draft ohne vorgezogene Zufallswahl');
  const invalid=plain(state);invalid.draft.queue[0].choices=[3,4];
  rejectState(invalid,'Queued Draft darf keine früh gezogenen Optionen enthalten');
  const wrongOwner=plain(state);wrongOwner.turn.decision.seat=1;
  rejectState(wrongOwner,'Entscheidungsinhaber muss zum aktiven Draft gehören');
  const ownedChoice=plain(state);ownedChoice.draft.active.choices=[1,4];
  rejectState(ownedChoice,'Draft darf keine vorhandene Fähigkeit anbieten');
}
{
  const state=plain(E.createState(setup()));
  state.turn.phase='counterattack';state.turn.decision={kind:'counterattack',seat:1};
  state.players[1].abilities=[21];
  state.counter.context={defenderSeat:1,attackerSeat:0,restoreHp:25,incomingDamage:5,lastStandTriggered:false,bloodRushActive:false};
  valid(state,'Konterentscheidung gehört dem Verteidiger');
  const invalid=plain(state);invalid.turn.decision.seat=0;
  rejectState(invalid,'Angreifer darf nicht für den Verteidiger kontern');
}
{
  const state=plain(E.createState(setup()));
  state.turn.phase='finished';state.turn.decision=null;
  state.players[1].hp=0;state.round.eliminationOrder=[1];state.round.lastPlaceSeat=1;
  state.round.winnerSeat=0;state.round.result={winnerSeat:0,reason:'last_alive'};
  valid(state,'Abgeschlossene Runde mit genau einem Überlebenden');
  const invalid=plain(state);invalid.players[1].hp=1;
  rejectState(invalid,'Rundensieg bei zwei lebenden Spielern ist ungültig');
}

const fresh=()=>plain(E.createState(setup()));
for(const invalid of [null,undefined,[],{},new Date(),new Map(),0,'state'])rejectState(invalid,'Ungültiger Zustand');
for(const change of [s=>s.ruleVersion='future',s=>s.stateVersion=999,s=>s.modeId='campaign',s=>s.masteryLevel=1,
  s=>s.players.pop(),s=>s.players[1].seat=0,s=>s.players[0].hp=NaN,s=>s.players[0].hp=26,
  s=>s.players[0].abilities=[6],s=>s.players[0].profileId='private',s=>s.dice.pop(),
  s=>s.dice[0].value=7,s=>s.dice[0].locked='yes',s=>s.rng.drawIndex=-1,s=>s.extra=1,
  s=>s.turn.currentSeat=5,s=>s.turn.decision.seat=5,s=>s.turn.decision.seat=1,
  s=>s.turn.decision.kind='roll_attack',s=>s.turn.phase='made_up',s=>s.turn.number=-1,
  s=>s.round.number=0,s=>s.round.eliminationOrder=[5],s=>s.round.winnerSeat=5,
  s=>s.players[0].effects.poisonSourceSeat=5,s=>s.players[0].effects.poisonTurns=-1,
  s=>s.sequence.action=0.5,s=>s.sequence.event=Infinity,
  s=>s.attack=()=>{},s=>s.draft=new Set(),s=>s.players[0].self=s
]){const state=fresh();change(state);rejectState(state,'Beschädigter/unerlaubter Zustand');}
console.log(`Engine-Definitionen und Zustand: ${positive} gültige Fälle, ${negative} Ablehnungen; Katalog, Modusdaten, Browser-Aliase, DOM-Freiheit und Instanztrennung grün.`);
