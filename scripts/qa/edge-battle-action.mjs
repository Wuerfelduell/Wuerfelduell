// Prueft den serverautoritativen Kampfschritt der Edge Function battle-action
// ohne Supabase und ohne Deno: core.js laeuft gegen die echte Engine und einen
// Speicher im RAM, der die vereinbarten RPCs dd_server_load_action und
// dd_server_commit_action nachbildet (Mitgliedschaft, Entscheidungsrecht,
// baseSeq, Idempotenz der Action-ID, privater RNG-Zustand).
//
// Was das nicht prueft: SQL-Rechte und echte Transaktionen
// (supabase/tests/30-server-autoritaet.sql) und die Engine unter Deno
// (scripts/qa/engine-deno-paritaet.mjs).
import assert from 'node:assert/strict';

for(const file of ['../../js/engine/02-definitions.js','../../js/engine/03-state.js',
  '../../js/engine/04-rules.js','../../js/engine/05-reduce.js']){
  await import(new URL(file,import.meta.url));
}
const {createBattleActionHandler,ActionError,INIT_ACTION,ENVELOPE_SCHEMA,parseRequest}=
  await import(new URL('../../supabase/functions/battle-action/core.js',import.meta.url));

const engine=globalThis.WDEngine,A=engine.actions;
const full=process.argv.includes('--full');
const seeds=full?40:8;
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const copy=value=>JSON.parse(JSON.stringify(value));

function fakeStore({modeId,members,seed}){
  const db={seq:0,state:{interactionOwnerUid:members[0].userId},rng:{seed,state:seed,drawIndex:0},
    actions:new Map(),events:[],commits:0};
  const owner=()=>String(db.state.interactionOwnerUid??db.state.currentPlayerUid??'');
  function authorize(request){
    const member=members.find(entry=>entry.userId===request.userId);
    if(!member) throw new ActionError(403,'DD_NOT_ROOM_MEMBER');
    const known=db.actions.get(request.actionId);
    if(known){
      if(JSON.stringify(known.request.payload)!==JSON.stringify(request.payload)||known.request.type!==request.type)
        throw new ActionError(409,'DD_ACTION_ID_REUSED');
      return {replay:true,result:known.result};
    }
    if(request.baseSeq!==db.seq) throw new ActionError(409,'DD_STALE_STATE');
    if(owner()!==request.userId) throw new ActionError(403,'DD_NOT_INTERACTION_OWNER');
    return {member};
  }
  return {
    db,
    async loadAction(request){
      const auth=authorize(request);
      if(auth.replay) return auth;
      const seat=db.state.seats?.find(entry=>entry.uid===request.userId)?.seat??auth.member.seat;
      return {state:copy(db.state),seq:db.seq,matchId:'match-1',seat,rng:{...db.rng},ruleVersion:'duel-1'};
    },
    async commitAction(request){
      const auth=authorize(request);
      if(auth.replay) return auth.result;
      if(request.drawIndex<db.rng.drawIndex) throw new ActionError(500,'DD_RNG_REWIND');
      db.seq++;db.commits++;
      db.state=copy(request.nextState);
      db.rng={...db.rng,state:request.rngState,drawIndex:request.drawIndex};
      db.events.push(...copy(request.events));
      const result={seq:db.seq,state:copy(request.nextState),events:copy(request.events)};
      db.actions.set(request.actionId,{request:copy(request),result});
      return result;
    },
    async loadRoom(){return {modeId,members:members.map(entry=>({...entry}))};}
  };
}

// Bot wie in engine-runde.mjs, aber nur mit dem, was ein Client sieht:
// dem oeffentlichen Umschlag.
function botMove(envelope){
  const state=envelope.engine,phase=state.turn.phase;
  if(phase==='idle'||phase==='base_ready') return {type:A.ROLL_BASE};
  if(phase==='base_select'){
    const index=state.dice.findIndex(die=>!die.locked&&!die.selected);
    return index>=0?{type:A.TOGGLE_BASE_DIE,payload:{index}}:{type:A.LOCK_SELECTED};
  }
  if(phase==='attack_target'){
    const target=state.players.find(player=>player.hp>0&&player.seat!==state.turn.currentSeat);
    return {type:A.CHOOSE_ATTACK_TARGET,payload:{targetSeat:target.seat}};
  }
  if(phase==='attack_ready'||phase==='attack_continue') return {type:A.ROLL_ATTACK};
  if(phase==='attack_after_roll') return {type:A.RESOLVE_ATTACK};
  if(phase==='gamble_attack'||phase==='gamble_retry') return {type:A.ROLL_GAMBLING};
  if(phase==='gamble_retry_offer') return {type:A.DECLINE_GAMBLING_RETRY};
  if(phase==='perfect25') return {type:A.ROLL_PERFECT25};
  if(phase==='perfect25_d4') return {type:A.ROLL_PERFECT25_D4};
  if(phase==='insurance') return {type:A.ROLL_INSURANCE};
  if(phase==='high_stakes') return {type:A.SKIP_HIGH_STAKES};
  if(phase==='counterattack') return {type:A.ROLL_COUNTERATTACK};
  if(phase==='draft_pending') return {type:A.CHOOSE_ABILITY,payload:{abilityId:state.draft.active.choices[0]}};
  if(phase==='turn_done') return {type:A.END_TURN};
  throw new Error('Unerwartete Phase '+phase);
}

const uid=index=>`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`;
const roomId='11111111-1111-4111-8111-111111111111';
let actionCounter=0;
const nextId=()=>`a-${++actionCounter}`;

async function expectError(promise,code,message){
  try{await promise;}catch(error){equal(error.code,code,message);return error;}
  assert.fail(message+': kein Fehler');
}

function assertNoSecret(envelope,seed,message){
  equal(envelope.engine.rng,{algorithm:'external',seed:null,state:null,drawIndex:envelope.engine.rng.drawIndex},message);
  check(!JSON.stringify(envelope).includes(`"seed":${seed}`),message+' (kein Seed im Umschlag)');
}

async function playMatch(modeId,playerCount,seed){
  const members=Array.from({length:playerCount},(_,seat)=>({userId:uid(seat),seat}));
  const store=fakeStore({modeId,members,seed});
  const handle=createBattleActionHandler({engine,store});
  let response=await handle({userId:uid(0),roomId,actionId:nextId(),type:INIT_ACTION,baseSeq:0,payload:{}});
  let envelope=response.body.state,actions=1,seq=response.body.seq;
  equal([envelope.schema,envelope.modeId,envelope.seats.length],[ENVELOPE_SCHEMA,modeId,playerCount],'Umschlag nach Start');
  check(engine.validateState(envelope.engine).valid,'Oeffentlicher Engine-Zustand ist gueltig');
  for(const player of envelope.engine.players)
    equal(player.abilities.length,engine.definitions.LOCAL_MODES[modeId].startAbilityCount,'Startfaehigkeiten je Modus');
  assertNoSecret(envelope,seed,'Start ohne Seed');

  while(!envelope.finished){
    if(actions>40000) throw new Error(`Kein Matchende: ${modeId} ${playerCount} Seed ${seed}`);
    const move=botMove(envelope),actor=envelope.interactionOwnerUid;
    check(!!actor,'Jede offene Entscheidung hat einen Besitzer');
    // Ein Fremder versucht gelegentlich, mit gefaelschtem Sitz zuvorzukommen.
    if(actions%97===0){
      const stranger=envelope.seats.find(entry=>entry.uid!==actor).uid;
      await expectError(handle({userId:stranger,roomId,actionId:nextId(),type:move.type,baseSeq:seq,
        payload:{...(move.payload||{}),seat:envelope.engine.turn.decision?.seat}}),'DD_NOT_INTERACTION_OWNER',
        'Fremder darf nicht fuer den Entscheider handeln');
    }
    response=await handle({userId:actor,roomId,actionId:nextId(),type:move.type,baseSeq:seq,payload:move.payload||{}});
    equal(response.body.seq,seq+1,'Jede Aktion erhoeht seq um eins');
    seq=response.body.seq;envelope=response.body.state;actions++;
  }
  assertNoSecret(envelope,seed,'Ende ohne Seed');
  check(envelope.winnerUid&&envelope.seats.some(entry=>entry.uid===envelope.winnerUid),'Sieger ist ein Mitglied');
  equal(envelope.interactionOwnerUid,'','Nach Matchende entscheidet niemand');
  equal(store.db.rng.drawIndex,envelope.engine.rng.drawIndex,'Privater und oeffentlicher Ziehungszaehler laufen gleich');
  await expectError(handle({userId:envelope.winnerUid,roomId,actionId:nextId(),type:'prepare_round',baseSeq:seq,payload:{}}),
    'DD_NOT_INTERACTION_OWNER','Nach Matchende keine weitere Runde');
  return {store,handle,envelope,seq,actions};
}

const summary=[];
for(const modeId of ['classic','endurance50','overload75']){
  for(let players=2;players<=4;players++){
    let total=0;
    for(let seed=1;seed<=seeds;seed++){
      const {actions}=await playMatch(modeId,players,(seed*2654435761)>>>0);
      total+=actions;
    }
    summary.push({modeId,players,matches:seeds,actions:total});
  }
}

// Gleicher Seed, gleiche Aktionen: gleiches Ergebnis.
{
  actionCounter=0;const first=await playMatch('classic',3,777);
  actionCounter=0;const second=await playMatch('classic',3,777);
  equal(first.envelope,second.envelope,'Gleicher Seed ergibt bitgleiches Matchende');
  equal(first.store.db.events,second.store.db.events,'Gleicher Seed ergibt dieselben Ereignisse');
}

// Einzelfaelle
{
  const members=[{userId:uid(0),seat:0},{userId:uid(1),seat:1}];
  const store=fakeStore({modeId:'classic',members,seed:42});
  const handle=createBattleActionHandler({engine,store});
  await expectError(handle({userId:uid(0),roomId,actionId:'x1',type:A.ROLL_BASE,baseSeq:0,payload:{}}),
    'MATCH_NOT_INITIALIZED','Ohne Start keine Kampfaktion');
  const init={userId:uid(0),roomId,actionId:'init',type:INIT_ACTION,baseSeq:0,payload:{}};
  const started=await handle(init);
  const again=await handle(init);
  equal([again.body.replay,store.db.commits],[true,1],'Wiederholte Action-ID wird nicht zweimal verbucht');
  equal(again.body.state,started.body.state,'Wiederholung liefert dasselbe Ergebnis');
  await expectError(handle({...init,payload:{x:1}}),'DD_ACTION_ID_REUSED','Gleiche ID mit anderer Nutzlast');
  await expectError(handle({...init,actionId:'init-2',baseSeq:1,userId:started.body.state.interactionOwnerUid}),
    'MATCH_ALREADY_INITIALIZED','Zweiter Start wird abgelehnt');
  const owner=started.body.state.interactionOwnerUid;
  await expectError(handle({userId:owner,roomId,actionId:'stale',type:A.ROLL_BASE,baseSeq:0,payload:{}}),
    'DD_STALE_STATE','Veralteter baseSeq');
  const commitsBefore=store.db.commits;
  await expectError(handle({userId:owner,roomId,actionId:'bad',type:A.RESOLVE_ATTACK,baseSeq:1,payload:{}}),
    'ACTION_REJECTED','Regelwidrige Aktion wird abgelehnt');
  equal(store.db.commits,commitsBefore,'Abgelehnte Aktion schreibt nichts');
  await expectError(handle({userId:owner,roomId,actionId:'round',type:'start_round',baseSeq:1,payload:{}}),
    'ACTION_NOT_ONLINE','Rundenvorbereitung ist online gesperrt');
  // Ein Sitz in der Nutzlast zaehlt nicht: der Server setzt den eigenen.
  const ownSeat=started.body.state.seats.find(entry=>entry.uid===owner).seat;
  const rolled=await handle({userId:owner,roomId,actionId:'seat',type:A.ROLL_BASE,baseSeq:1,payload:{seat:1-ownSeat}});
  equal(rolled.body.state.engine.turn.currentSeat,ownSeat,'Gefaelschter Sitz in der Nutzlast wird ignoriert');

  const mayhem=createBattleActionHandler({engine,store:fakeStore({modeId:'mayhem',members,seed:1})});
  await expectError(mayhem({userId:uid(0),roomId,actionId:'m',type:INIT_ACTION,baseSeq:0,payload:{}}),
    'MODE_NOT_ONLINE','Mayhem ist online nicht freigegeben');

  equal(parseRequest({roomId,actionId:'a',type:'roll_base',baseSeq:3,payload:{index:1}},uid(0)).payload,{index:1},
    'Gueltige Anfrage wird angenommen');
  for(const bad of [{roomId:'x',actionId:'a',type:'roll_base',baseSeq:0},{roomId,actionId:'',type:'roll_base',baseSeq:0},
    {roomId,actionId:'a',type:'Roll Base',baseSeq:0},{roomId,actionId:'a',type:'roll_base',baseSeq:-1}]){
    assert.throws(()=>parseRequest(bad,uid(0)),error=>error.code==='INVALID_ACTION');checks++;
  }
}

console.table(summary);
console.log(`edge-battle-action: ${checks} Pruefungen gruen`);
