import assert from 'node:assert/strict';

for(const file of ['../../js/engine/02-definitions.js','../../js/engine/03-state.js',
  '../../js/engine/04-rules.js','../../js/engine/05-reduce.js']){
  await import(new URL(file,import.meta.url));
}

const {createState,validateState,reduce,actions:A}=globalThis.WDEngine;
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const face=n=>(n-.5)/6;
function sequence(values){
  let index=0;
  const random=()=>{
    assert.ok(index<values.length,'Der feste Zufallsvorrat ist erschoepft');
    return values[index++];
  };
  random.count=()=>index;
  return random;
}
function stateWith(abilities,{modeId='classic',hp,secondAbilities}={}){
  const required=globalThis.WDEngine.definitions.LOCAL_MODES[modeId].startAbilityCount;
  const fill=(list,fallback)=>[...new Set([...list,...fallback])].slice(0,required);
  const state=createState({modeId,players:[
    {seat:0,abilities:fill(abilities,[1,2,3])},
    {seat:1,abilities:fill(secondAbilities||[2],[2,3,4])}
  ],rng:{algorithm:'external',seed:null,state:null,drawIndex:0}});
  if(hp!==undefined) state.players[0].hp=hp;
  return state;
}
function prepared(values,abilities,options={}){
  const state=stateWith(abilities,options);
  state.turn.phase='base_select';state.turn.decision={kind:'select_base',seat:0};
  state.dice.forEach((die,index)=>{die.value=values[index];die.locked=false;die.selected=true;});
  state.base.lastRollIndices=[0,1,2,3,4];
  check(validateState(state).valid,'Vorbereiteter Zustand muss gueltig sein');
  return state;
}
function act(state,type,extra={},rng=()=>0){return reduce(state,{type,seat:0,...extra},rng);}

{
  const state=stateWith([1]),before=JSON.stringify(state),rng=sequence([face(1),face(2),face(3),face(4),face(6)]);
  const result=act(state,A.ROLL_BASE,{},rng);
  equal(JSON.stringify(state),before,'Der Eingang bleibt unveraendert');
  equal(result.state.dice.map(die=>die.value),[1,2,3,4,6],'Basiswurf nutzt fuenf feste Ziehungen');
  equal(result.events.map(event=>event.type),['TurnStarted','DiceRolled','DecisionRequired'],'Startwurf erzeugt stabile Ereignisfolge');
  equal(result.events.map(event=>event.id),['event-1','event-2','event-3'],'Ereignis-IDs sind stabil und monoton');
  equal(result.state.rng.drawIndex,5,'Ziehungszaehler folgt dem Basiswurf');
  equal(rng.count(),5,'Der Zufallsgeber wird exakt fuenfmal gelesen');
  check(validateState(result.state).valid,'Basiswurfzustand besteht validateState');
}

{
  let state=stateWith([1]),rng=sequence([face(1),face(2),face(3),face(4),face(5),face(6)]);
  state=act(state,A.ROLL_BASE,{},rng).state;
  for(const index of [0,1,2,3]) state=act(state,A.TOGGLE_BASE_DIE,{index}).state;
  const locked=act(state,A.LOCK_SELECTED).state;
  equal(locked.turn.phase,'base_ready','Teilweises Locken fordert den naechsten Basiswurf');
  const rerolled=act(locked,A.ROLL_BASE,{},rng).state;
  equal(rerolled.dice.map(die=>die.value),[1,2,3,4,6],'Nur nicht gelockte Wuerfel werden neu gewuerfelt');
  equal(rerolled.base.lastRollIndices,[4],'Der letzte Wurf enthaelt nur neu gewuerfelte Indizes');
}

{
  let state=stateWith([3]),rng=sequence([face(1),face(2),face(3),face(4),face(5),0,face(2)]);
  state=act(state,A.ROLL_BASE,{},rng).state;
  const result=act(state,A.USE_LUCK_REROLL,{},rng);
  equal(result.state.dice[0].value,2,'Glueckswurf kann keine neue Eins ergeben');
  equal(result.state.base.luckRerollUses,1,'Glueckswurf wird einmal gezaehlt');
  equal(rng.count(),7,'Ausgeschlossene Einsen verbrauchen weitere Ziehungen');
}

{
  let state=stateWith([3,1],{modeId:'mayhem'}),rng=sequence([face(1),face(2),face(3),face(4),face(5),face(2),face(3)]);
  state=act(state,A.ROLL_BASE,{},rng).state;
  state=act(state,A.USE_LUCK_REROLL,{},rng).state;
  state=act(state,A.USE_LUCK_REROLL,{},rng).state;
  equal(state.dice[0].value,3,'Mayhem erlaubt Reroll the Reroll');
  equal(state.base.luckRerollSecondUsed,true,'Mayhem merkt den zweiten Wurf desselben Wuerfels');
}

{
  let state=stateWith([18]),rng=sequence([face(2),face(3),face(4),face(6),face(1)]);
  state=act(state,A.ROLL_BASE,{},rng).state;
  state=act(state,A.TOGGLE_BASE_DIE,{index:0}).state;
  const beforeDraws=state.rng.drawIndex,result=act(state,A.USE_LOADED_DICE);
  equal(result.state.dice[0].value,5,'Loaded Dice dreht den ausgewaehlten Wuerfel auf fuenf');
  equal(result.state.players[0].hp,23,'Loaded Dice kostet auf Level 0 zwei HP');
  equal(result.state.rng.drawIndex,beforeDraws,'Loaded Dice verbraucht keinen Zufall');
  check(result.events.some(event=>event.type==='DieChanged'),'Loaded Dice meldet die Wuerfelaenderung');
}

{
  let state=stateWith([18,23],{modeId:'mayhem'}),rng=sequence([face(1),face(2),face(3),face(4),face(6)]);
  state=act(state,A.ROLL_BASE,{},rng).state;
  state=act(state,A.TOGGLE_BASE_DIE,{index:0}).state;
  state=act(state,A.USE_LOADED_DICE).state;
  state=act(state,A.TOGGLE_BASE_DIE,{index:0}).state;
  state=act(state,A.TOGGLE_BASE_DIE,{index:1}).state;
  state=act(state,A.USE_LOADED_DICE).state;
  equal(state.players[0].hp,62,'Loaded Dice kostet in Mayhem beim zweiten Einsatz nur einen HP');
  equal(state.base.loadedDiceUses,2,'Mayhem erlaubt zwei Loaded-Dice-Einsaetze');
}

{
  let state=stateWith([20]),rng=sequence([face(2),face(2),face(2),face(4),face(5),face(1),face(3),face(6)]);
  state=act(state,A.ROLL_BASE,{},rng).state;
  const result=act(state,A.USE_SNAKE_EYES,{},rng);
  equal(result.state.dice.map(die=>die.value),[1,3,6,4,5],'Snake Eyes wuerfelt genau den Drilling neu');
  equal(result.state.base.lastRollIndices,[0,1,2,3,4],'Snake Eyes behaelt den Basiswurfkontext fuer spaetere Glueckswuerfe');
  equal(result.state.players[0].effects.snakeEyesUsesThisTurn,1,'Snake-Eyes-Nutzung wird gezaehlt');
}

{
  let state=stateWith([22],{hp:23}),rng=sequence([face(6),face(6),face(1),face(2),face(3)]);
  const result=act(state,A.ROLL_BASE,{},rng);
  equal(result.state.players[0].hp,24,'12 heilt bei zwei Sechsen einen HP');
  check(result.events.some(event=>event.type==='Healed'&&event.amount===1),'Heilung wird als Ereignis ausgegeben');
}

{
  let state=stateWith([22,1],{modeId:'mayhem',hp:60}),rng=sequence([face(6),face(6),face(6),face(2),face(3)]);
  const result=act(state,A.ROLL_BASE,{},rng);
  equal(result.state.players[0].hp,62,'12 heilt in Mayhem bei drei Sechsen zwei HP');
  equal(result.state.players[0].effects.healEffectCount,1,'Mayhem-Heilausloesungen bleiben serialisiert');
}

{
  let state=stateWith([22,1],{modeId:'mayhem',hp:60});
  state.players[0].effects.healEffectCount=1;
  const result=act(state,A.ROLL_BASE,{},sequence([face(6),face(6),face(1),face(2),face(3)]));
  equal(result.state.players[0].hp,62,'12 nutzt beim zweiten Heileffekt den Level-2-Bonus');
  equal(result.state.players[0].effects.healEffectCount,2,'12 laeuft ueber den gemeinsamen Heileffekt-Zaehler');
}

{
  const exact25=act(prepared([5,5,5,5,5],[1]),A.LOCK_SELECTED);
  equal(exact25.state.turn.phase,'turn_done','Exakt 25 endet ohne passende Faehigkeit den Zug');
  const normal=act(prepared([6,5,5,5,5],[1]),A.LOCK_SELECTED);
  equal([normal.state.turn.phase,normal.state.attack.face,normal.state.attack.targetSeat],['attack_ready',1,1],'26 bereitet einen Angriff auf Einsen vor');
  const advance=act(prepared([5,5,5,5,5],[5]),A.LOCK_SELECTED);
  equal([advance.state.turn.phase,advance.state.attack.face,advance.state.attack.source],['attack_ready',1,'advance'],'Angriffsvorsprung greift schon bei 25 an');
  const gambling=act(prepared([6,5,5,5,5],[12]),A.LOCK_SELECTED);
  equal(gambling.state.turn.phase,'gamble_attack','Gambling Man uebergibt an den Spezialwuerfel-Schritt');
  const perfect=act(prepared([5,5,5,5,5],[15]),A.LOCK_SELECTED);
  equal(perfect.state.turn.phase,'perfect25','Perfect 25 uebergibt an den Spezialwuerfel-Schritt');
}

{
  const state=prepared([4,4,4,4,4],[14],{hp:4});
  const result=act(state,A.LOCK_SELECTED);
  equal(result.state.players[0].hp,1,'Last Stand faengt toedlichen Basisschaden bei einem HP ab');
  equal(result.state.players[0].effects.lastStandUsed,true,'Last Stand ist danach verbraucht');
  check(result.events.some(event=>event.type==='LastStandTriggered'),'Last Stand hat ein eigenes Ereignis');
}

{
  const state=prepared([1,1,1,1,1],[14,3],{modeId:'mayhem',hp:4});
  const result=act(state,A.LOCK_SELECTED);
  equal(result.state.players[0].hp,6,'Last Stand faengt toedlichen Basisschaden in Mayhem bei sechs HP ab');
  check(result.events.some(event=>event.type==='LastStandTriggered'&&event.hp===6),
    'Mayhem-Last-Stand meldet die sechs verbleibenden HP');
}

{
  let state=prepared([4,4,4,4,4],[19]);
  state=act(state,A.LOCK_SELECTED).state;
  equal(state.turn.phase,'insurance','Insurance blockiert die automatische Schadensfolge');
  const rng=sequence([face(5)]),result=act(state,A.ROLL_INSURANCE,{},rng);
  equal(result.state.players[0].hp,23,'Insurance halbiert fuenf Eigenschaden abgerundet');
  equal(result.state.turn.phase,'turn_done','Insurance setzt die Basisfolge fort');
}

{
  let state=prepared([4,5,5,5,5],[5,19],{modeId:'mayhem'});
  state=act(state,A.LOCK_SELECTED).state;
  equal(state.turn.phase,'insurance','Jump Ahead 24 oeffnet zuerst Insurance');
  const result=act(state,A.ROLL_INSURANCE,{},sequence([face(6)]));
  equal(result.state.players[0].hp,65,'Insurance Level 2 blockiert mit einer Sechs vollstaendig');
  equal([result.state.turn.phase,result.state.attack.face],['attack_ready',1],'Nach Insurance beginnt der Jump-Ahead-Angriff');
}

{
  const classic=prepared([4,4,4,4,4],[10]);classic.players[0].effects.momentumStreak=3;
  equal(act(classic,A.LOCK_SELECTED).state.players[0].effects.momentumStreak,0,'Momentum bricht auf Level 0 vollstaendig ab');
  const mayhem=prepared([4,4,4,4,4],[10,1],{modeId:'mayhem'});mayhem.players[0].effects.momentumStreak=3;
  equal(act(mayhem,A.LOCK_SELECTED).state.players[0].effects.momentumStreak,2,'Momentum verliert in Mayhem nur eine Stufe');
}

{
  let state=prepared([6,5,5,5,5],[11]);
  state=act(state,A.LOCK_SELECTED).state;
  const result=act(state,A.USE_BLOOD_PRICE);
  equal(result.state.attack.bloodPriceNeighbors,[2],'Blutpreis kennt am Rand nur die vorhandene Nachbarzahl');
  equal(result.state.players[0].hp,22,'Blutpreis kostet drei HP');
  equal(result.state.attack.bloodPricePaidThisRoll,3,'Blutpreis bleibt fuer den Angriff serialisiert');
}

{
  let state=prepared([6,5,5,5,5],[11,23],{modeId:'mayhem'});
  state=act(state,A.LOCK_SELECTED).state;
  const result=act(state,A.USE_BLOOD_PRICE);
  equal(result.state.attack.bloodRushActive,true,'Freiwilliger Blutpreis aktiviert Blood Rush im laufenden Angriff');
  equal(result.state.players[0].effects.voluntaryHpPaidThisTurn,false,'Aktiviertes Blood Rush verbraucht die freiwillige Zahlungsvormerkung');
}

{
  const state=stateWith([1]),before=JSON.stringify(state);
  let calls=0;const forbidden=()=>{calls++;throw new Error('Zufall darf nicht gelesen werden');};
  const wrongPhase=act(state,A.LOCK_SELECTED,{},forbidden);
  equal(wrongPhase.rejected,true,'Falsche Phase wird abgelehnt');
  equal(wrongPhase.state,state,'Ablehnung gibt den unveraenderten Eingang zurueck');
  equal(calls,0,'Ablehnung verbraucht keinen Zufall');
  equal(JSON.stringify(state),before,'Ablehnung veraendert den Eingang nicht');
  const wrongSeat=reduce(state,{type:A.ROLL_BASE,seat:1},forbidden);
  equal(wrongSeat.reason,'Falscher Aktionsinhaber','Falscher Spieler wird stabil begruendet');
  equal(calls,0,'Auch falscher Spieler verbraucht keinen Zufall');
  const unknown=reduce(state,{type:'nicht_vorhanden',seat:0},forbidden);
  equal(unknown.reason,'Unbekannter Aktionstyp','Unbekannte Aktion wird stabil begruendet');
  equal(calls,0,'Unbekannte Aktion verbraucht keinen Zufall');
}

{
  const noAbility=prepared([1,2,3,4,5],[1]);
  const rejected=act(noAbility,A.USE_LUCK_REROLL,{},()=>{throw new Error('kein RNG');});
  equal(rejected.rejected,true,'Fehlende Faehigkeit wird abgelehnt');
  const lowHp=prepared([1,2,3,4,6],[18],{hp:2});
  lowHp.dice.forEach((die,index)=>{die.selected=index===0;});
  const refused=act(lowHp,A.USE_LOADED_DICE);
  equal(refused.reason,'Nicht genug HP fuer Loaded Dice','Freiwillige Zahlung darf nicht toedlich sein');
}

{
  for(const randomValue of [0,1-Number.EPSILON]){
    const result=act(stateWith([1]),A.ROLL_BASE,{},sequence(Array(5).fill(randomValue)));
    check(validateState(result.state).valid,'Zufallsgrenze erzeugt gueltige Wuerfel');
  }
  equal(act(stateWith([1]),A.ROLL_BASE,{},sequence(Array(5).fill(0))).state.dice.map(d=>d.value),[1,1,1,1,1],'Untere RNG-Grenze ist inklusive');
  equal(act(stateWith([1]),A.ROLL_BASE,{},sequence(Array(5).fill(1-Number.EPSILON))).state.dice.map(d=>d.value),[6,6,6,6,6],'Obere RNG-Grenze bleibt unter eins');
  assert.throws(()=>act(stateWith([1]),A.ROLL_BASE,{},sequence([1])),/\[0, 1\)/);
  checks++;
}

{
  const result=act(stateWith([7]),A.ROLL_BASE,{},sequence([0,1-Number.EPSILON,face(3),face(4),face(5)]));
  equal(result.state.dice[0].value,6,'Glueck BETA erweitert den Sechserbereich an der unteren RNG-Grenze');
  equal(result.state.dice[1].value,5,'Glueck BETA bildet die obere RNG-Grenze auf fuenf ab');
}

{
  const starts={classic:25,endurance50:50,overload75:75,mayhem:65};
  for(const [modeId,startHp] of Object.entries(starts)){
    const result=act(prepared([4,4,4,4,4],[1],{modeId}),A.LOCK_SELECTED);
    equal(result.state.players[0].hp,startHp-5,`${modeId} verwendet seinen HP-Parametersatz`);
    check(validateState(result.state).valid,`${modeId} bleibt nach Basisschaden gueltig`);
  }
}

{
  const players=[3,5,1,4,0,2].map((seat,index)=>({seat,abilities:[index===0?5:2]}));
  const state=createState({modeId:'classic',players,startingSeat:3});
  state.players.find(player=>player.seat===5).hp=0;
  state.turn.phase='base_select';state.turn.decision={kind:'select_base',seat:3};
  state.dice.forEach(die=>{die.value=5;die.selected=true;});
  const result=reduce(state,{type:A.LOCK_SELECTED,seat:3});
  equal([result.state.turn.phase,result.state.attack.targetSeat],['attack_target',null],
    'Mehr als zwei lebende Spieler blockieren an der Zielwahl');
  equal(result.events.find(event=>event.type==='AttackTargetRequired')?.targetSeats,[1,4,0,2],
    'Die Zielwahl folgt der lebenden Zugreihenfolge');
  check(validateState(result.state).valid,'Sechs-Spieler-Basiszustand besteht validateState');
}

{
  const result=act(stateWith([1]),A.ROLL_BASE,{},sequence([face(1),face(2),face(3),face(4),face(5)]));
  const roundTrip=JSON.parse(JSON.stringify(result));
  equal(roundTrip,result,'Reducer-Ergebnis uebersteht die JSON-Rundreise bytegetreu');
  check(validateState(roundTrip.state).valid,'JSON-Rundreise besteht validateState');
}

console.log(`Engine-Basis: ${checks} Pruefungen gruen.`);
