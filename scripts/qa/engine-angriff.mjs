import assert from 'node:assert/strict';

for(const file of ['../../js/engine/02-definitions.js','../../js/engine/03-state.js',
  '../../js/engine/04-rules.js','../../js/engine/05-reduce.js']){
  await import(new URL(file,import.meta.url));
}

const {createState,validateState,reduce,actions:A,definitions}=globalThis.WDEngine;
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const face=value=>(value-.5)/6;
function sequence(values){
  let index=0;
  const random=()=>{
    assert.ok(index<values.length,'Der feste Zufallsvorrat ist erschoepft');
    return values[index++];
  };
  random.count=()=>index;
  return random;
}
function fill(modeId,abilities,fallback=[1,2,3]){
  const required=definitions.LOCAL_MODES[modeId].startAbilityCount;
  return [...new Set([...abilities,...fallback])].slice(0,required);
}
function attackState({modeId='classic',abilities=[1],defenderAbilities=[3],playerCount=2,faceValue=3,
  targetSeat=1,hp=[],source='normal'}={}){
  const players=Array.from({length:playerCount},(_,seat)=>({
    seat,abilities:fill(modeId,seat===0?abilities:(seat===1?defenderAbilities:[3]),[1,2,3,4,5])
  }));
  const state=createState({modeId,players,rng:{algorithm:'external',seed:null,state:null,drawIndex:0}});
  hp.forEach((value,seat)=>{if(value!==undefined) state.players[seat].hp=value;});
  state.turn.phase='attack_ready';state.turn.decision={kind:'roll_attack',seat:0};
  state.attack.face=faceValue;state.attack.targetSeat=targetSeat;state.attack.baseTotal=Math.min(30,25+faceValue);
  state.attack.source=source;
  check(validateState(state).valid,'Vorbereiteter Angriffszustand ist gueltig');
  return state;
}
function targetState({modeId='classic',abilities=[1],playerCount=4,faceValue=3}={}){
  const players=Array.from({length:playerCount},(_,seat)=>({seat,abilities:fill(modeId,seat===0?abilities:[3])}));
  const state=createState({modeId,players,rng:{algorithm:'external',seed:null,state:null,drawIndex:0}});
  state.turn.phase='attack_target';state.turn.decision={kind:'choose_attack_target',seat:0};
  state.attack.face=faceValue;state.attack.targetSeat=null;state.attack.baseTotal=25+faceValue;state.attack.source='normal';
  check(validateState(state).valid,'Vorbereitete Zielwahl ist gueltig');
  return state;
}
function act(state,type,extra={},rng=()=>0){
  return reduce(state,{type,seat:state.turn.decision?.seat??state.turn.currentSeat,...extra},rng);
}
function oneHitThenStop(state,hitFace,missFaces){
  let result=act(state,A.ROLL_ATTACK,{},sequence([face(hitFace),...missFaces.slice(0,4).map(face)]));
  state=result.state;
  result=act(state,A.RESOLVE_ATTACK,{},sequence(Array(64).fill(0)));state=result.state;
  if(state.turn.phase==='attack_continue'){
    const open=state.dice.filter(die=>!die.locked).length;
    result=act(state,A.ROLL_ATTACK,{},sequence(missFaces.slice(0,open).map(face)));state=result.state;
    result=act(state,A.RESOLVE_ATTACK,{},sequence(Array(64).fill(0)));state=result.state;
  }
  return {state,events:result.events};
}

{
  const original=targetState({abilities:[17]}),before=JSON.stringify(original),rng=sequence([face(4)]);
  const rejected=act(original,A.CHOOSE_ATTACK_TARGET,{targetSeat:0},rng);
  equal(rejected.rejected,true,'Eigenes Angriffsziel wird abgelehnt');
  equal(JSON.stringify(rejected.state),before,'Ablehnung veraendert den Zustand nicht');
  equal(rng.count(),0,'Ablehnung verbraucht keinen Zufall');
  const chosen=act(original,A.CHOOSE_ATTACK_TARGET,{targetSeat:3},rng);
  equal([chosen.state.attack.targetSeat,chosen.state.attack.wildcardFace,chosen.state.turn.phase],[3,4,'attack_ready'],
    'Vier Spieler waehlen das Ziel vor der Wildcard-Ziehung');
  equal(chosen.events.map(event=>event.type),['AttackTargetSelected','AttackReadied','DecisionRequired'],
    'Zielwahl erzeugt die stabile Angriffsfolge');
}

{
  let state=attackState({abilities:[1],faceValue:1});
  let result=act(state,A.ROLL_ATTACK,{},sequence([face(1),face(2),face(3),face(4),face(5)]));state=result.state;
  equal([state.attack.hits,state.attack.damage],[2,6],'Brutale Einsen treffen auf Eins und Zwei mit je drei Schaden');
  equal(result.events.map(event=>event.type),['AttackRolled','HitsResolved','DecisionRequired'],
    'Angriffswurf meldet Wurf, Treffer und Entscheidung');
  state=act(state,A.RESOLVE_ATTACK).state;
  state=act(state,A.ROLL_ATTACK,{},sequence([face(3),face(4),face(5)])).state;
  const finished=act(state,A.RESOLVE_ATTACK);
  equal(finished.state.players[1].hp,19,'Hauptschaden wird nach dem ersten Nullwurf angewendet');
  check(finished.events.some(event=>event.type==='DamageApplied'&&event.amount===6),'Hauptschaden hat ein Ereignis');
  equal(finished.state.turn.phase,'turn_done','Angriff endet in turn_done');
}

{
  let state=attackState({abilities:[4],faceValue:6});
  state=act(state,A.ROLL_ATTACK,{},sequence([face(1),face(2),face(3),face(4),face(5)])).state;
  const powered=act(state,A.USE_ATTACK_POWER,{},sequence([face(6),face(6),face(1),face(2),face(3)]));
  equal([powered.state.attack.hits,powered.state.attack.powerUses],[2,1],'Zweite Chance wuerfelt alle Fehlschlaege einmal neu');
  equal(powered.state.rng.drawIndex,10,'Zweite Chance zaehlt ihre fuenf Ziehungen');
}

{
  let state=attackState({abilities:[8],faceValue:6});
  state=act(state,A.ROLL_ATTACK,{},sequence([face(5),face(1),face(2),face(3),face(4)])).state;
  const precise=act(state,A.RESOLVE_ATTACK);
  equal([precise.state.attack.hits,precise.state.attack.damage,precise.state.attack.precisionUses],[1,5,1],
    'Praezision rettet erst den abschliessenden Nullwurf mit Nachbarschaden');
  equal(precise.state.turn.phase,'attack_continue','Praezision laesst verbleibende Wuerfel weiterlaufen');
}

{
  let state=attackState({modeId:'mayhem',abilities:[11,23],defenderAbilities:[3,4],faceValue:3});
  state=act(state,A.USE_BLOOD_PRICE).state;
  equal([state.players[0].hp,state.attack.bloodRushActive],[62,true],'Blutpreis aktiviert Blood Rush durch freiwillige Zahlung');
  const rolled=act(state,A.ROLL_ATTACK,{},sequence([face(2),face(3),face(4),face(6),face(6)]));
  equal([rolled.state.attack.hits,rolled.state.attack.damage],[3,12],
    'Blutpreis-Nachbarn erhalten den Blood-Rush-Bonus pro Treffer');
}

{
  let state=attackState({modeId:'mayhem',abilities:[11,1],defenderAbilities:[3,4],faceValue:3});
  state=act(state,A.ROLL_ATTACK,{},sequence([face(2),face(5),face(5),face(5),face(5)])).state;
  const credited=act(state,A.USE_BLOOD_PRICE);
  equal([credited.state.players[0].hp,credited.state.attack.hits,credited.state.attack.damage],[60,1,3],
    'Blood Credit bezahlt nach dem Wurf und sichert Nachbartreffer');
}

{
  let state=attackState({modeId:'mayhem',abilities:[11,3],defenderAbilities:[4,5],faceValue:3});
  state.players[0].effects.healEffectCount=1;
  state=act(state,A.USE_BLOOD_PRICE).state;
  const pact=act(state,A.ROLL_ATTACK,{},sequence([face(6),face(6),face(6),face(6),face(6)]));
  equal(pact.state.players[0].hp,64,'Blood Pact erstattet bei null Treffern zwei der drei bezahlten HP');
  equal(pact.state.players[0].effects.healEffectCount,1,'Blood Pact ist eine direkte Gutschrift und kein Heileffekt');
  check(pact.events.some(event=>event.type==='Healed'&&event.source==='blood_pact'&&event.amount===2),
    'Blood Pact meldet die Erstattung als Heilung');
}

{
  let state=attackState({modeId:'mayhem',abilities:[5,3],defenderAbilities:[21,1],faceValue:5,hp:[3,65]});
  state=oneHitThenStop(state,5,[2,3,4,6]).state;
  const counter=act(state,A.ROLL_COUNTERATTACK,{},sequence([face(1),face(1),face(1),face(1),face(1)]));
  equal(counter.state.players[0].hp,0,'Counterattack kann den Angreifer ausschalten');
  equal([counter.state.draft.active,counter.state.draft.queue],[null,[]],
    'Counterattack-Kill oeffnet in lokalen Modi keinen Kill-Draft');
}

{
  let state=attackState({modeId:'mayhem',abilities:[23,1],defenderAbilities:[3,4],faceValue:4});
  state=act(state,A.ROLL_ATTACK,{},sequence([face(1),face(1),face(1),face(1),face(1)])).state;
  const harmed=act(state,A.USE_BLOOD_RUSH_SELF_HARM);
  equal([harmed.state.players[0].hp,harmed.state.attack.bloodRushActive],[64,true],
    'Self Harm aktiviert Blood Rush fuer einen HP');
}

{
  let state=attackState({abilities:[24],faceValue:2});
  state=act(state,A.ROLL_ATTACK,{},sequence([face(2),face(2),face(3),face(4),face(5)])).state;
  const resolved=act(state,A.RESOLVE_ATTACK);
  equal(resolved.state.players[1].hp,17,'Double Tap beendet bewusst bei zwei Treffern und addiert vier Schaden');
  equal(resolved.state.attack.doubleTapApplied,true,'Double Tap wird nur einmal angewendet');
}

{
  let state=attackState({abilities:[10],faceValue:3});state.players[0].effects.momentumStreak=3;
  state=act(state,A.ROLL_ATTACK,{},sequence([face(3),face(1),face(1),face(1),face(1)])).state;
  equal(state.attack.damage,5,'Momentum addiert seinen gedeckelten Serienbonus pro Treffer');
  state=attackState({abilities:[9],faceValue:3,hp:[10]});
  state=act(state,A.ROLL_ATTACK,{},sequence([face(3),face(1),face(1),face(1),face(1)])).state;
  equal(state.attack.damage,5,'Rache addiert bei zehn HP zwei Schaden pro Treffer');
  state=attackState({abilities:[25],faceValue:3,hp:[10,20]});
  state=act(state,A.ROLL_ATTACK,{},sequence([face(3),face(1),face(1),face(1),face(1)])).state;
  equal(state.attack.damage,4,'Underdog addiert als eindeutig Schwaechster einen Schaden pro Treffer');
}

{
  let state=attackState({modeId:'mayhem',abilities:[17,3],defenderAbilities:[4,5],faceValue:3});
  state.attack.wildcardFace=5;
  state=act(state,A.ROLL_ATTACK,{},sequence([face(5),face(1),face(1),face(1),face(1)])).state;
  equal([state.attack.hits,state.attack.wildcardHits,state.attack.wildcardFace],[1,1,5],
    'Wildcard zaehlt im ersten Angriffswurf als Treffer');
  state=act(state,A.RESOLVE_ATTACK).state;
  state=act(state,A.ROLL_ATTACK,{},sequence([face(5),face(1),face(1),face(1)])).state;
  equal([state.attack.hits,state.attack.wildcardHits],[2,2],'Wildcard Level 1 gilt auch im zweiten Angriffswurf');
}

{
  let state=attackState({modeId:'mayhem',abilities:[17,3],defenderAbilities:[4,5],faceValue:3});
  state.attack.wildcardFace=6;
  const result=oneHitThenStop(state,3,[1,2,4,5]);
  equal(result.state.players[1].hp,60,'Joker addiert bei ungetroffener Wildcard zwei Schaden pro normalem Treffer');
}

{
  let state=attackState({modeId:'mayhem',abilities:[20,3],defenderAbilities:[4,5],faceValue:4});
  state=act(state,A.ROLL_ATTACK,{},sequence([face(2),face(2),face(2),face(4),face(6)])).state;
  const bitten=act(state,A.USE_SNAKE_EYES,{},sequence([face(4),face(4),face(1)]));
  equal([bitten.state.attack.hits,bitten.state.attack.damage,bitten.state.players[0].effects.snakeEyesUsesThisTurn],[3,12,1],
    'Snake Bite wuerfelt den Drilling neu und uebernimmt neue Angriffstreffer');
}

{
  const state=attackState({abilities:[2],faceValue:4,hp:[20,25]});
  const finished=oneHitThenStop(state,4,[1,2,3,5]);
  equal([finished.state.players[0].hp,finished.state.players[1].hp],[22,21],
    'Lifesteal heilt die Haelfte des tatsaechlichen Hauptschadens');
  check(finished.events.some(event=>event.type==='Healed'&&event.amount===2),'Lifesteal meldet Heilung');
}

{
  const state=attackState({abilities:[16],playerCount:4,faceValue:3});
  const finished=oneHitThenStop(state,3,[1,2,4,5]);
  equal([finished.state.players[1].hp,finished.state.players[2].hp],[22,24],
    'Ricochet trifft nach dem Hauptziel den naechsten anderen Sitz');
  check(finished.events.some(event=>event.type==='RicochetApplied'&&event.targetSeat===2&&event.amount===1),
    'Ricochet hat ein stabiles Ereignis');
}

{
  let state=attackState({modeId:'mayhem',abilities:[1,2],defenderAbilities:[3,4],playerCount:4,faceValue:1,hp:[65,3,10,10]});
  state.players[1].effects.poisonTurns=2;state.players[1].effects.poisonSourceSeat=0;
  state=act(state,A.ROLL_ATTACK,{},sequence([face(1),face(3),face(4),face(5),face(6)])).state;
  state=act(state,A.RESOLVE_ATTACK).state;
  state=act(state,A.ROLL_ATTACK,{},sequence([face(3),face(4),face(5),face(6)])).state;
  const result=act(state,A.RESOLVE_ATTACK,{},sequence(Array(64).fill(0)));
  equal(result.state.round.eliminationOrder[0],1,'Hauptziel wird in Ausscheidereihenfolge eingetragen');
  equal(result.state.players[2].hp,7,'Toxic Bomb trifft den benachbarten Nicht-Quellspieler');
  check(result.events.some(event=>event.type==='ToxicBombApplied'),'Toxic Bomb hat ein eigenes Ereignis');
}

{
  let state=attackState({modeId:'mayhem',abilities:[1,2],defenderAbilities:[14,3],faceValue:1,hp:[65,2]});
  state=act(state,A.ROLL_ATTACK,{},sequence([face(1),face(3),face(4),face(5),face(6)])).state;
  state=act(state,A.RESOLVE_ATTACK).state;
  state=act(state,A.ROLL_ATTACK,{},sequence([face(3),face(4),face(5),face(6)])).state;
  const result=act(state,A.RESOLVE_ATTACK);
  equal(result.state.players[1].hp,6,'Last Stand bleibt in Mayhem auf sechs HP');
  check(result.events.some(event=>event.type==='LastStandTriggered'&&event.hp===6),'Mayhem-Last-Stand meldet sechs HP');
}

{
  let state=attackState({abilities:[5],defenderAbilities:[21],faceValue:5});
  state=act(state,A.ROLL_ATTACK,{},sequence([face(5),face(1),face(2),face(3),face(4)])).state;
  state=act(state,A.RESOLVE_ATTACK).state;
  state=act(state,A.ROLL_ATTACK,{},sequence([face(1),face(2),face(3),face(4)])).state;
  const opened=act(state,A.RESOLVE_ATTACK);state=opened.state;
  equal([state.turn.phase,state.turn.decision.seat],['counterattack',1],'Fuenf Rohschaden starten den eigenen Angriff des Verteidigers');
  check(opened.events.some(event=>event.type==='CounterattackStarted'),'Counterattack-Start hat ein Ereignis');
  const counter=act(state,A.ROLL_COUNTERATTACK,{},sequence([face(6),face(6),face(6),face(6),face(6)]));
  equal(counter.state.turn.phase,'turn_done','Nulltreffer beendet Counterattack und Angriff');
  check(counter.events.some(event=>event.type==='CounterattackResolved'),'Counterattack-Aufloesung wird gemeldet');
}

{
  let state=attackState({modeId:'mayhem',abilities:[5,3],defenderAbilities:[21,22],faceValue:5,hp:[65,60]});
  let opened=oneHitThenStop(state,5,[1,2,3,4]);state=opened.state;
  equal(state.turn.phase,'counterattack','Mayhem oeffnet Counterattack nach fuenf Rohschaden');
  const counter=act(state,A.ROLL_COUNTERATTACK,{},sequence([face(6),face(6),face(6),face(3),face(4)]));
  equal(counter.state.players[1].hp,57,'12 heilt im Counterattack-Wurf mit drei Sechsen zwei HP');
  check(counter.events.some(event=>event.type==='Healed'&&event.source==='twelve_counter'&&event.amount===2),
    'Counterattack-Heilung hat ein Ereignis');
}

{
  let state=attackState({modeId:'mayhem',abilities:[5,3],defenderAbilities:[21,1],faceValue:5});
  state=oneHitThenStop(state,5,[3,3,3,3]).state;
  const counter=act(state,A.ROLL_COUNTERATTACK,{},sequence([face(1),face(1),face(1),face(1),face(1)]));
  equal(counter.state.players[1].hp,65,'Perfect Parry stellt den Zustand vor dem Hauptangriff wieder her');
  equal(counter.state.players[0].hp,50,'Brutale Einsen machen auch im Counterattack drei Schaden je Treffer');
}

{
  const state=attackState({abilities:[13],faceValue:6});
  const blocked=oneHitThenStop(state,6,[1,2,3,4]);
  equal([blocked.state.turn.phase,blocked.state.special.highStakes.rawDamage],['high_stakes',6],
    'High Stakes blockiert vor der Schadensanwendung fuer Schritt 4');
  equal(blocked.state.players[1].hp,25,'Blockiertes High Stakes wendet noch keinen Schaden an');
}

{
  const state=attackState({modeId:'endurance50',abilities:[5],defenderAbilities:[3],faceValue:2,hp:[50,31]});
  const blocked=oneHitThenStop(state,2,[1,3,4,5]);
  equal(blocked.state.turn.phase,'draft_pending','HP-Schwelle blockiert die Angriffsfortsetzung fuer Schritt 4');
  equal({seat:blocked.state.draft.active?.seat,slot:blocked.state.draft.active?.slot,trigger:blocked.state.draft.active?.trigger},
    {seat:1,slot:3,trigger:'hp'},'Draft-Fortsetzung speichert Sitz, Slot und Ausloeser');
  equal(blocked.state.draft.continuation,'finish_attack','Draft merkt die Fortsetzung nach dem Angriff');
}

{
  const state=attackState({modeId:'endurance50',abilities:[5],defenderAbilities:[3],faceValue:2,hp:[50,29]});
  const blocked=oneHitThenStop(state,2,[1,3,4,5]);
  equal(blocked.state.turn.phase,'draft_pending','HP-Draft greift auch ohne Schwellenuebertritt von oben');
  equal(blocked.state.draft.active?.trigger,'hp','HP-Draft bleibt bis zur Wahl aktiv');
}

{
  const state=attackState({modeId:'mayhem',abilities:[5,3],defenderAbilities:[4,8],faceValue:5,hp:[65,4]});
  const killed=oneHitThenStop(state,5,[1,2,3,4]);
  equal(killed.state.turn.phase,'turn_done','Rundenentscheidender Kill beendet den Zug ohne Faehigkeitsdraft');
  equal(killed.state.draft.active,null,'Nach Rundenende bleibt kein gewaehlter Draft fuer die naechste Runde');
  equal(killed.state.players[0].abilities,[5,3],'Der Sieger nimmt keine nach Rundenende gewaehlte Faehigkeit mit');
  equal(killed.state.round.eliminationOrder,[1],'Kill schreibt die Ausscheidereihenfolge fort');
}

{
  const abilityIds=new Set();
  for(const abilityId of definitions.REAL_ABILITY_IDS){
    let state=attackState({abilities:[abilityId],faceValue:6});abilityIds.add(abilityId);
    const result=act(state,A.ROLL_ATTACK,{},sequence([face(1),face(2),face(3),face(4),face(5)]));
    check(result.events.some(event=>event.type==='AttackRolled'),`Faehigkeit ${abilityId} wird in einem Angriffszustand ausgefuehrt`);
  }
  equal([...abilityIds].sort((a,b)=>a-b),definitions.REAL_ABILITY_IDS.slice().sort((a,b)=>a-b),
    'Alle 24 echten Faehigkeiten werden im Angriffspruefstand beruehrt');
}

{
  const state=attackState({modeId:'mayhem',abilities:[17,24],defenderAbilities:[14,21],playerCount:4,faceValue:4});
  const copy=JSON.parse(JSON.stringify(state));
  equal(validateState(copy).valid,true,'Mayhem-Angriff ueberlebt die JSON-Rundreise');
  equal(JSON.stringify(copy),JSON.stringify(state),'JSON-Rundreise ist byteweise stabil');
}

console.log(`engine-angriff: ${checks} Pruefungen erfolgreich`);
