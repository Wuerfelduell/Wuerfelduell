import assert from 'node:assert/strict';

for(const file of ['../../js/engine/02-definitions.js','../../js/engine/03-state.js',
  '../../js/engine/04-rules.js','../../js/engine/05-reduce.js']){
  await import(new URL(file,import.meta.url));
}

const {createState,validateState,reduce,actions:A,definitions:D}=globalThis.WDEngine;
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
function abilitiesFor(modeId,wanted){
  return [...new Set([...wanted,...D.CHOOSABLE_ABILITY_IDS])].slice(0,D.LOCAL_MODES[modeId].startAbilityCount);
}
function duel(modeId='classic',count=2,wanted=[5],seed=12345){
  return createState({modeId,players:Array.from({length:count},(_,seat)=>({
    seat,abilities:abilitiesFor(modeId,wanted)
  })),rng:{algorithm:'mulberry32',seed,state:seed,drawIndex:0}});
}
function preparedBase(modeId,values,wanted=[5]){
  const state=duel(modeId,2,wanted);
  state.turn.phase='base_select';state.turn.decision={kind:'select_base',seat:0};
  state.dice.forEach((die,index)=>{die.value=values[index];die.selected=true;});
  state.base.lastRollIndices=[0,1,2,3,4];
  return state;
}
function attackState(modeId,wanted=[13],targetHp=D.LOCAL_MODES[modeId].startHp){
  const state=duel(modeId,2,wanted);
  state.players[1].hp=targetHp;
  state.turn.phase='attack_ready';state.turn.decision={kind:'roll_attack',seat:0};
  state.attack.face=6;state.attack.targetSeat=1;state.attack.baseTotal=30;state.attack.source='normal';
  return state;
}
function act(state,type,extra={},rng){
  return reduce(state,{type,seat:state.turn.decision?.seat??state.turn.currentSeat,...extra},rng);
}
function resolveOneHit(state,rollFace=6,rng=()=>0){
  state=act(state,A.ROLL_ATTACK,{},sequence([face(rollFace),face(1),face(2),face(3),face(4)])).state;
  state=act(state,A.RESOLVE_ATTACK,{},rng).state;
  if(state.turn.phase==='attack_continue'){
    const open=state.dice.filter(die=>!die.locked).length;
    state=act(state,A.ROLL_ATTACK,{},sequence(Array(open).fill(face(1)))).state;
    state=act(state,A.RESOLVE_ATTACK,{},rng).state;
  }
  return state;
}

{
  let state=preparedBase('mayhem',[6,5,5,5,5],[12,5]);
  state=act(state,A.LOCK_SELECTED).state;
  state=act(state,A.ROLL_GAMBLING,{},sequence([face(4)])).state;
  equal([state.attack.face,state.attack.source,state.turn.phase],[4,'gambling','attack_ready'],
    'Gambling Man bestimmt mit dem D6 die Angriffszahl');
  state=act(state,A.ROLL_ATTACK,{},sequence([face(1),face(2),face(3),face(5),face(6)])).state;
  state=act(state,A.RESOLVE_ATTACK).state;
  equal(state.turn.phase,'gamble_retry_offer','Null Treffer bieten Gambling Twice an');
  state=act(state,A.ACCEPT_GAMBLING_RETRY).state;
  state=act(state,A.ROLL_GAMBLING,{},sequence([face(5)])).state;
  equal([state.attack.face,state.special.gambling.retryUsed],[5,true],'Gambling Twice setzt eine neue Angriffszahl');
}

{
  let state=preparedBase('mayhem',[6,5,5,5,5],[12,3]);
  state=act(state,A.LOCK_SELECTED).state;
  const rng=sequence([face(1),face(4)]);
  state=act(state,A.ROLL_GAMBLING,{},rng).state;
  equal([state.attack.face,rng.count()],[4,2],'Gambling Man Level 2 schliesst die Eins mit echter Neuziehung aus');
}

{
  let state=preparedBase('classic',[5,5,5,5,5],[15]);
  state=act(state,A.LOCK_SELECTED).state;
  state=act(state,A.ROLL_PERFECT25,{},sequence([face(4)])).state;
  equal(state.turn.phase,'perfect25_d4','Perfect 25 gibt nach bestandenem D6 den D4 frei');
  state=act(state,A.ROLL_PERFECT25_D4,{},sequence([.625])).state;
  equal([state.attack.face,state.attack.source],[3,'perfect25'],'Perfect 25 nutzt den D4 als Angriffszahl');
}

{
  let state=resolveOneHit(attackState('classic',[13]));
  equal(state.turn.phase,'high_stakes','High Stakes blockiert vor dem Schaden');
  state=act(state,A.ROLL_HIGH_STAKES,{},sequence([face(6)])).state;
  equal(state.players[1].hp,16,'High Stakes Level 0 erhoeht sechs Rohschaden um 50 Prozent');
  state=resolveOneHit(attackState('mayhem',[13,3]));
  state=act(state,A.ROLL_HIGH_STAKES,{},sequence([face(6)])).state;
  equal(state.players[1].hp,55,'High Stakes Level 2 erhoeht eine Sechs um 75 Prozent');
  state=resolveOneHit(attackState('classic',[13]));
  state=act(state,A.SKIP_HIGH_STAKES).state;
  equal(state.players[1].hp,19,'High Stakes kann ohne Zufallsziehung uebersprungen werden');
}

{
  let state=preparedBase('mayhem',[4,5,5,5,5],[5,3]);
  state.players[0].hp=31;
  state=act(state,A.LOCK_SELECTED,{},sequence(Array(32).fill(0))).state;
  equal([state.turn.phase,state.draft.continuation],['draft_pending','finish_base'],
    'HP-Draft blockiert Jump Ahead vor der Angriffsinitialisierung');
  const choice=state.draft.active.choices[0];
  state=act(state,A.CHOOSE_ABILITY,{abilityId:choice},sequence([face(4)])).state;
  equal([state.turn.phase,state.attack.face,state.players[0].abilities.includes(choice)],['attack_ready',1,true],
    'finish_base setzt erst nach der Draftwahl mit dem Angriff fort');
}

{
  let state=attackState('endurance50',[5,3],31);
  state.attack.face=2;state.attack.baseTotal=27;
  state=resolveOneHit(state,2,sequence(Array(64).fill(0)));
  equal(state.draft.continuation,'finish_attack','Angriffsschaden speichert finish_attack');
  state=act(state,A.CHOOSE_ABILITY,{abilityId:state.draft.active.choices[0]}).state;
  equal(state.turn.phase,'turn_done','finish_attack beendet den Angriff nach der Draftwahl');

  state=attackState('endurance50',[5,3],31);
  state.players[1].abilities=abilitiesFor('endurance50',[21,3]);
  state.attack.face=5;state.attack.baseTotal=30;
  state=resolveOneHit(state,5,sequence(Array(64).fill(0)));
  equal([state.turn.phase,state.draft.continuation],["draft_pending","start_counter"],
    'Gleichzeitiger HP-Draft merkt den vorgemerkten Counterattack');
  state=act(state,A.CHOOSE_ABILITY,{abilityId:state.draft.active.choices[0]}).state;
  equal([state.turn.phase,state.turn.decision.seat],['counterattack',1],
    'start_counter oeffnet den Gegenangriff erst nach der Draftwahl');
}

{
  let state=duel('mayhem',3,[5,3]);
  state.turn.phase='turn_done';state.turn.decision={kind:'end_turn',seat:0};
  state.players[1].hp=3;state.players[1].effects.poisonTurns=1;state.players[1].effects.poisonSourceSeat=0;
  state.players[2].effects.lastStandUsed=true;state.players[2].effects.lastStandCooldown=1;
  state.players[2].effects.damageSinceLastOwnTurn=true;
  state.players[2].abilities=[14,23,25];state.players[2].bonusAbilityUnlocked=true;
  state=act(state,A.END_TURN).state;
  equal([state.players[1].hp,state.turn.currentSeat,state.turn.phase],[0,2,'draft_pending'],
    'Zugwechsel verarbeitet Gift und springt zum naechsten lebenden Sitz');
  equal([state.players[2].effects.lastStandUsed,state.players[2].effects.lastStandCooldown],[false,0],
    'Zugstart laesst Last Stand nach der Abklingzeit wieder zu');
  equal([state.players[2].effects.bloodRushPrimed,state.players[2].effects.underdogTurnActive],[true,true],
    'Zugstart bereitet Blood Rush und die Underdog-Zugsperre vor');
  state=act(state,A.CHOOSE_ABILITY,{abilityId:state.draft.active.choices[0]}).state;
  equal([state.turn.phase,state.turn.decision.seat],['idle',2],'Gift-Kill-Draft kehrt zum vorbereiteten Zug zurueck');
}

{
  let state=duel('classic',2,[5]);
  state.players[1].hp=0;state.round.eliminationOrder=[1];state.round.lastPlaceSeat=1;
  state.turn.phase='turn_done';state.turn.decision={kind:'end_turn',seat:0};
  state=act(state,A.END_TURN).state;
  equal(state.round.result,{winnerSeat:0,reason:'last_alive'},'Siegerpruefung speichert last_alive');
  state=act(state,A.PREPARE_ROUND,{},sequence([.21])).state;
  equal(state.round.preparation.map(entry=>entry.freeChoices),[1,1],
    'Classic gibt bei W25=6 und letztem Platz freie Startwahlen');
  state=act(state,A.CHOOSE_START_ABILITIES,{abilities:[8]}).state;
  state=act(state,A.CHOOSE_START_ABILITIES,{abilities:[9]}).state;
  state=act(state,A.START_ROUND,{},sequence([.9])).state;
  equal([state.round.number,state.turn.currentSeat,state.players.find(p=>p.seat===1).abilities],[2,1,[9]],
    'Rundenstart setzt Faehigkeiten und den letzten Platz als Starter');
}

{
  let state=duel('classic',2,[5]);
  state.players.forEach(player=>{player.hp=0;});
  state.round.eliminationOrder=[0,1];state.round.lastPlaceSeat=0;
  state.turn.phase='turn_done';state.turn.decision={kind:'end_turn',seat:0};
  state=act(state,A.END_TURN).state;
  equal(state.round.result,{winnerSeat:null,reason:'draw'},'Siegerpruefung speichert den Gleichstand ohne Ueberlebenden');
}

{
  for(const modeId of Object.keys(D.LOCAL_MODES)){
    let state=duel(modeId,4,modeId==='mayhem'?[5,13]:[5],700+checks);
    for(const seat of [3,2,1]) state.players.find(player=>player.seat===seat).hp=0;
    state.round.eliminationOrder=[3,2,1];state.round.lastPlaceSeat=3;
    state.turn.phase='turn_done';state.turn.decision={kind:'end_turn',seat:0};
    state=act(state,A.END_TURN).state;
    state=act(state,A.PREPARE_ROUND).state;
    while(state.turn.decision.kind==='choose_start_abilities'){
      const entry=state.round.preparation.find(item=>item.seat===state.turn.decision.seat);
      state=act(state,A.CHOOSE_START_ABILITIES,{abilities:D.CHOOSABLE_ABILITY_IDS.slice(0,entry.freeChoices)}).state;
    }
    state=act(state,A.START_ROUND).state;
    equal(state.players.map(player=>player.abilities.length),Array(4).fill(D.LOCAL_MODES[modeId].startAbilityCount),
      `${modeId} verteilt die modusspezifische Zahl neuer Startfaehigkeiten`);
    equal(state.turn.currentSeat,3,`${modeId} laesst den letzten Platz die neue Sitzreihenfolge beginnen`);
    equal(new Set(state.players.map(player=>player.seat)).size,4,`${modeId} behaelt alle Sitze in der neuen Reihenfolge`);
  }
}

function playRound(modeId,playerCount,seed){
  let state=duel(modeId,playerCount,modeId==='mayhem'?[5,13]:[5],seed);
  for(let step=0;step<20000&&!state.round.result;step++){
    const phase=state.turn.phase;
    let result;
    if(phase==='idle'||phase==='base_ready') result=act(state,A.ROLL_BASE);
    else if(phase==='base_select'){
      const index=state.dice.findIndex(die=>!die.locked&&!die.selected);
      result=index>=0?act(state,A.TOGGLE_BASE_DIE,{index}):act(state,A.LOCK_SELECTED);
    }else if(phase==='attack_target'){
      const target=state.players.find(player=>player.hp>0&&player.seat!==state.turn.currentSeat);
      result=act(state,A.CHOOSE_ATTACK_TARGET,{targetSeat:target.seat});
    }else if(phase==='attack_ready'||phase==='attack_continue') result=act(state,A.ROLL_ATTACK);
    else if(phase==='attack_after_roll') result=act(state,A.RESOLVE_ATTACK);
    else if(phase==='gamble_attack'||phase==='gamble_retry') result=act(state,A.ROLL_GAMBLING);
    else if(phase==='gamble_retry_offer') result=act(state,A.DECLINE_GAMBLING_RETRY);
    else if(phase==='perfect25') result=act(state,A.ROLL_PERFECT25);
    else if(phase==='perfect25_d4') result=act(state,A.ROLL_PERFECT25_D4);
    else if(phase==='insurance') result=act(state,A.ROLL_INSURANCE);
    else if(phase==='high_stakes') result=act(state,A.SKIP_HIGH_STAKES);
    else if(phase==='counterattack') result=act(state,A.ROLL_COUNTERATTACK);
    else if(phase==='draft_pending') result=act(state,A.CHOOSE_ABILITY,{abilityId:state.draft.active.choices[0]});
    else if(phase==='turn_done') result=act(state,A.END_TURN);
    else throw new Error(`Unerwartete Phase ${phase}`);
    assert.equal(result.rejected,undefined,`Aktion in ${phase} darf nicht abgelehnt werden`);
    state=result.state;
    assert.equal(validateState(state).valid,true,`Zustand nach ${phase} muss gueltig sein`);
  }
  check(state.round.result!==null,`${modeId} mit ${playerCount} Spielern endet mit festem Seed`);
  equal(state.round.result.reason,'last_alive',`${modeId} mit ${playerCount} Spielern hat genau einen Sieger`);
  return state;
}

{
  let state=preparedBase('classic',[2,3,4,5,6],[18]);
  state.players[0].hp=12;
  state.dice.forEach((die,index)=>{die.selected=index===0;});
  state=act(state,A.USE_LOADED_DICE,{},sequence(Array(32).fill(0))).state;
  equal([state.players[0].hp,state.turn.phase,state.draft.continuation],[10,'draft_pending','resume_base_select'],
    'Loaded Dice oeffnet den HP-Draft sofort');
  state=act(state,A.CHOOSE_ABILITY,{abilityId:state.draft.active.choices[0]}).state;
  equal(state.turn.phase,'base_select','Loaded-Dice-Draft setzt die Basiswahl fort');

  state=attackState('classic',[11],13);
  state.players[0].hp=13;
  state=act(state,A.USE_BLOOD_PRICE,{},sequence(Array(32).fill(0))).state;
  equal([state.players[0].hp,state.turn.phase,state.draft.continuation],[10,'draft_pending','resume_attack_ready'],
    'Blutpreis oeffnet den HP-Draft sofort');
  state=act(state,A.CHOOSE_ABILITY,{abilityId:state.draft.active.choices[0]}).state;
  equal(state.turn.phase,'attack_ready','Blutpreis-Draft setzt den Angriff fort');
}

{
  let state=preparedBase('classic',[5,5,5,5,5],[10]);
  state.players[0].effects.momentumStreak=2;
  state=act(state,A.LOCK_SELECTED).state;
  equal([state.turn.phase,state.players[0].effects.momentumStreak],['turn_done',0],
    'Exakt 25 ohne Angriff beendet die Momentum-Serie');
}

{
  let state=preparedBase('mayhem',[2,2,1,4,5],[3,20]);
  state=act(state,A.USE_LUCK_REROLL,{},sequence([face(2)])).state;
  let result=act(state,A.USE_SNAKE_EYES,{},sequence([face(3),face(4),face(5)]));
  equal(result.events.find(event=>event.type==='DiceRolled')?.indices,[0,1,2],
    'Glueckswurf kann den dritten Wuerfel fuer Snake Eyes erzeugen');

  state=preparedBase('mayhem',[2,2,2,1,5],[3,20]);
  state=act(state,A.USE_LUCK_REROLL,{},sequence([face(2)])).state;
  result=act(state,A.USE_SNAKE_EYES,{},sequence([face(1),face(3),face(4),face(5)]));
  equal(result.events.find(event=>event.type==='DiceRolled')?.indices,[0,1,2,3],
    'Glueckswurf nimmt auch den vierten gleichen Wuerfel in Snake Eyes auf');
}

{
  let state=duel('mayhem',2,[25,9]);
  state.players[0].effects.damageSinceLastOwnTurn=true;
  state.turn.phase='turn_done';state.turn.decision={kind:'end_turn',seat:0};
  state=act(state,A.END_TURN).state;
  state.turn.phase='turn_done';state.turn.decision={kind:'end_turn',seat:1};
  state=act(state,A.END_TURN).state;
  equal(state.players[0].effects.bloodRushPrimed,false,
    'Schaden vor dem Erhalt von Blood Rush erzeugt keine spaetere Vormerkung');

  state=duel('mayhem',2,[25,9]);
  state.players[0].hp=30;state.players[0].bonusAbilityUnlocked=true;
  state.players[0].effects.damageSinceLastOwnTurn=true;state.players[0].effects.selfDamageSinceLastOwnTurn=true;
  state.players[0].effects.bloodRushPrimed=true;state.players[0].effects.voluntaryHpPaidThisTurn=true;
  state.draft.active={seat:0,slot:3,trigger:'hp',choices:[23,10]};state.draft.continuation='resume_base_select';
  state.turn.phase='draft_pending';state.turn.decision={kind:'choose_ability',seat:0};
  state=act(state,A.CHOOSE_ABILITY,{abilityId:23}).state;
  equal([state.players[0].effects.damageSinceLastOwnTurn,state.players[0].effects.selfDamageSinceLastOwnTurn,
    state.players[0].effects.bloodRushPrimed,state.players[0].effects.voluntaryHpPaidThisTurn],[false,false,false,false],
    'Blood Rush uebernimmt beim Erwerb keine frueheren Schadensmarker');
}

{
  let state=duel('mayhem',2,[5,3]);
  state.turn.phase='turn_done';state.turn.decision={kind:'end_turn',seat:0};
  state.attack.face=4;state.attack.targetSeat=1;state.attack.baseTotal=29;
  state.players[1].hp=3;state.players[1].effects.poisonTurns=1;state.players[1].effects.poisonSourceSeat=0;
  state=act(state,A.END_TURN).state;
  equal([state.turn.phase,state.round.winnerSeat,state.attack.targetSeat],['round_preparation',0,null],
    'Gift-KO des letzten Gegners bereinigt den abgeschlossenen Angriffszustand');
}

{
  let state=attackState('mayhem',[5,3],1);
  state.attack.face=6;state.attack.baseTotal=30;
  state=resolveOneHit(state,6,sequence(Array(32).fill(0)));
  equal([state.players[1].hp,state.draft.active,state.draft.queue.length],[0,null,0],
    'Rundenbeendender Kill erzeugt keinen Bonusfaehigkeits-Draft');
}

function checkRoundStartOrder(playerCount,seed){
  let state=playRound('classic',playerCount,seed);
  const oldOrder=state.players.map(player=>player.seat);
  const oldOpponent=new Map(oldOrder.map((seat,index)=>[seat,oldOrder[(index+1)%oldOrder.length]]));
  let result=reduce(state,{type:A.PREPARE_ROUND,seat:state.turn.decision.seat},()=>0.25);
  check(!result.rejected,`Rundenvorbereitung fuer Reihenfolgepruefung wird akzeptiert: ${result.reason||''}`);
  state=result.state;
  while(state.turn.decision?.kind==='choose_start_abilities'){
    const entry=state.round.preparation.find(item=>item.seat===state.turn.decision.seat);
    const abilities=D.CHOOSABLE_ABILITY_IDS.filter(id=>!entry.abilities.includes(id)).slice(0,entry.freeChoices);
    result=reduce(state,{type:A.CHOOSE_START_ABILITIES,seat:entry.seat,abilities},()=>0.25);
    check(!result.rejected,'Freie Startfaehigkeit fuer Reihenfolgepruefung wird akzeptiert');
    state=result.state;
  }
  let draws=0;
  result=reduce(state,{type:A.START_ROUND,seat:state.turn.decision.seat},()=>{draws++;return 0.999999;});
  check(!result.rejected,'Rundenstart fuer Reihenfolgepruefung wird akzeptiert');
  const order=result.state.players.map(player=>player.seat);
  check(order.every((seat,index)=>oldOpponent.get(seat)!==order[(index+1)%order.length]),
    `${playerCount} Sitze behalten beim Rundenstart keinen direkten Nachfolger`);
  equal(draws,150*(playerCount-1)+1,`${playerCount} Sitze nutzen nach 150 Shuffles genau eine Fallback-Rotation`);
  const reversed=oldOrder.slice().reverse(),offset=playerCount-1;
  equal(order,reversed.slice(offset).concat(reversed.slice(0,offset)),
    `${playerCount} Sitze verwenden dieselbe Fallback-Reihenfolge wie der Browser`);
}

function checkGamblingRetry(){
  const state=duel('mayhem',3,[12,17,23],0x5a12);
  const active=state.players.find(player=>player.seat===state.turn.currentSeat);
  const target=state.players.find(player=>player.seat!==active.seat).seat;
  active.effects.momentumStreak=4;
  state.turn.phase='gamble_retry';state.turn.decision={kind:'gambling_retry',seat:active.seat};
  state.special.gambling={baseTotal:29,retryUsed:false,retryPending:true};
  Object.assign(state.attack,{face:6,targetSeat:target,hits:3,damage:9,firstRoll:false,currentRollNewHits:2,
    rollCount:2,masteryRollCount:2,normalHits:1,exactFaceHits:1,wildcardHits:1,lastRollIndices:[0,1],
    powerUsed:true,powerUses:2,precisionUses:2,momentumBonus:3,bloodPriceNeighbors:[target],
    bloodPricePaidThisRoll:2,bloodPriceWasPreActivatedThisRoll:true,bloodRushActive:true,doubleTapApplied:true,
    wildcardFace:2,wildcardSecondRollArmed:true,wildcardTriggered:true,masteryL2BonusesApplied:true,
    source:'gambling',baseTotal:29});
  state.dice=state.dice.map((die,index)=>({value:index+1,locked:index<2,selected:false}));
  check(validateState(state).valid,'Gambling-Retry-Ausgangszustand ist gueltig');
  const draws=[0.4,0.8];
  const result=reduce(state,{type:A.ROLL_GAMBLING,seat:active.seat},()=>draws.shift());
  check(!result.rejected,'Gambling-Retry wird akzeptiert');
  const next=result.state;
  equal(next.turn.phase,'attack_ready','Gambling-Retry geht direkt auf attack_ready');
  equal(next.attack.targetSeat,target,'Gambling-Retry behaelt das Ziel');
  equal(next.attack.face,3,'Gambling-Retry uebernimmt nur die neue Zielzahl');
  equal([next.attack.powerUsed,next.attack.powerUses],[true,2],'Gambling-Retry behaelt Attack-Power-Nutzungen');
  equal([next.attack.momentumBonus,active.effects.momentumStreak],[3,4],'Gambling-Retry behaelt Momentum-Bonus und -Serie');
  equal([next.attack.bloodRushActive,next.attack.doubleTapApplied],[true,true],'Gambling-Retry behaelt Blood Rush und Double Tap');
  equal([next.attack.hits,next.attack.damage,next.attack.rollCount,next.attack.masteryRollCount],[0,0,0,0],
    'Gambling-Retry setzt Treffer, Schaden und Wurfzaehler zurueck');
  equal([next.attack.precisionUses,next.attack.bloodPricePaidThisRoll,next.attack.bloodPriceWasPreActivatedThisRoll],
    [0,0,false],'Gambling-Retry setzt Precision und Blutpreis-Felder zurueck');
  equal(next.attack.wildcardFace,5,'Gambling-Retry wuerfelt die Wildcard neu');
  check(next.dice.every(die=>die.value===null&&!die.locked&&!die.selected),'Gambling-Retry setzt die Wuerfel zurueck');
}

checkRoundStartOrder(3,0x5a10);
checkRoundStartOrder(4,0x5a11);
checkGamblingRetry();

for(const [modeId,count,seed] of [['classic',2,101],['classic',4,202],['mayhem',2,303],['mayhem',4,404]]){
  playRound(modeId,count,seed);
}

{
  const state=duel('classic',2,[5]),before=JSON.stringify(state);
  let draws=0;
  const rejected=act(state,A.ROLL_HIGH_STAKES,{},()=>{draws++;return 0;});
  equal([rejected.rejected,draws],[true,0],'Abgelehnte Spezialaktion verbraucht keine Ziehung');
  equal(JSON.stringify(state),before,'Ablehnung laesst den Eingang unveraendert');
  const roundTrip=JSON.parse(JSON.stringify(playRound('classic',2,505)));
  check(validateState(roundTrip).valid,'Vollstaendige Runde uebersteht die JSON-Rundreise');
}

console.log(`Engine-Runde: ${checks} Pruefungen gruen.`);
