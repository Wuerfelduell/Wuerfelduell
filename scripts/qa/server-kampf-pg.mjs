// Ende-zu-Ende ohne Supabase-Stack: die Logik der Edge Function (core.js) mit
// der echten Engine gegen ein echtes Postgres mit allen Migrationen. Der Store
// ruft dd_server_load_action / dd_server_commit_action als service_role auf,
// genau wie index.ts. Lobby, Bereit und Start laufen als authenticated wie im
// Browser. Prueft damit die Naht, die edge-battle-action.mjs (RAM-Nachbau)
// und 30-server-autoritaet.sql (SQL allein) jeweils nur von einer Seite sehen.
//
// Aufruf: node scripts/qa/server-kampf-pg.mjs   (braucht initdb/psql; als root
// den Benutzer postgres)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..');
for(const file of ['js/engine/02-definitions.js','js/engine/03-state.js','js/engine/04-rules.js','js/engine/05-reduce.js'])
  await import(path.join(root,file));
const {createBattleActionHandler,ActionError,INIT_ACTION}=await import(path.join(root,'supabase/functions/battle-action/core.js'));
const engine=globalThis.WDEngine,A=engine.actions;

const bin=['/usr/lib/postgresql'].flatMap(base=>fs.existsSync(base)?fs.readdirSync(base).map(v=>path.join(base,v,'bin')):[])
  .find(dir=>fs.existsSync(path.join(dir,'initdb')));
if(!bin){console.error('Kein Postgres gefunden (initdb).');process.exit(2);}
const asRoot=process.getuid?.()===0;
const dir=fs.mkdtempSync(path.join('/var/tmp','wd-serverkampf-'));
const port=String(process.env.WD_PG_PORT||5466);
if(asRoot) execFileSync('chown',['postgres:postgres',dir]);
const run=(cmd,args,opts={})=>asRoot
  ? spawnSync('su',['postgres','-c',[cmd,...args].map(a=>`'${a.replace(/'/g,"'\\''")}'`).join(' ')],{encoding:'utf8',...opts})
  : spawnSync(cmd,args,{encoding:'utf8',...opts});
function stop(){run(path.join(bin,'pg_ctl'),['-D',dir+'/data','-m','immediate','stop']);fs.rmSync(dir,{recursive:true,force:true});}
process.on('exit',stop);

let r=run(path.join(bin,'initdb'),['-D',dir+'/data','-U','postgres','--auth=trust']);
assert.equal(r.status,0,r.stderr);
r=run(path.join(bin,'pg_ctl'),['-D',dir+'/data','-o',`-k ${dir} -p ${port} -c listen_addresses=`,'-l',dir+'/log','start','-w']);
assert.equal(r.status,0,r.stderr);

let fileCounter=0;
function sql(text){
  const file=path.join(dir,`q${++fileCounter}.sql`);
  fs.writeFileSync(file,'\\set ON_ERROR_STOP 1\n'+text);
  if(asRoot) execFileSync('chown',['postgres:postgres',file]);
  const result=run('psql',['-h',dir,'-p',port,'-U','postgres','-d','postgres','-qtAX','-f',file]);
  fs.rmSync(file,{force:true});
  if(result.status!==0){
    const message=result.stderr||'';
    const code=/DD_[A-Z_]+/.exec(message)?.[0];
    const error=new ActionError(code==='DD_STALE_STATE'?409:403,code||'SQL_FAILED',message.trim());
    throw error;
  }
  return result.stdout.trim();
}
const J=value=>`$J$${JSON.stringify(value)}$J$::jsonb`;
const L=value=>`'${String(value).replace(/'/g,"''")}'`;

const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
sql(fs.readFileSync(path.join(root,'supabase/tests/00-bootstrap.sql'),'utf8'));
for(const file of migrations) sql(fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8'));

const uid=n=>`cccccccc-0000-4000-8000-${String(n).padStart(12,'0')}`;
const as=(user,body)=>sql(`set role authenticated; set wd.uid=${L(user)};\n${body}`);

const store={
  async loadAction(q){
    return JSON.parse(sql(`set role service_role; select public.dd_server_load_action(${L(q.roomId)},${L(q.userId)},${L(q.actionId)},${q.baseSeq},${L(q.type)},${J(q.payload)});`));
  },
  async commitAction(q){
    return JSON.parse(sql(`set role service_role; select public.dd_server_commit_action(${L(q.roomId)},${L(q.userId)},${L(q.actionId)},${q.baseSeq},${L(q.type)},${J(q.payload)},${J(q.nextState)},${q.rngState},${q.drawIndex},${J(q.events)});`));
  },
  async loadRoom(roomId){
    const row=JSON.parse(sql(`select json_build_object('modeId',r.mode_id,'members',(select json_agg(json_build_object('userId',m.user_id,'seat',m.seat)) from public.dd_battle_members m where m.room_id=r.id)) from public.dd_battle_rooms r where r.id=${L(roomId)};`));
    return row;
  }
};
const handle=createBattleActionHandler({engine,store});

function botMove(state){
  const phase=state.turn.phase;
  if(phase==='idle'||phase==='base_ready') return {type:A.ROLL_BASE};
  if(phase==='base_select'){
    const index=state.dice.findIndex(die=>!die.locked&&!die.selected);
    return index>=0?{type:A.TOGGLE_BASE_DIE,payload:{index}}:{type:A.LOCK_SELECTED};
  }
  if(phase==='attack_target') return {type:A.CHOOSE_ATTACK_TARGET,payload:{targetSeat:state.players.find(p=>p.hp>0&&p.seat!==state.turn.currentSeat).seat}};
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
  throw new Error('Phase '+phase);
}

let checks=0,ids=0;
const check=(v,m)=>{assert.ok(v,m);checks++;};
const results=[];
for(const [modeId,players] of [['classic',2],['endurance50',3],['overload75',4]]){
  const users=Array.from({length:players},(_,i)=>uid(results.length*10+i+1));
  sql(`insert into auth.users(id,email,is_anonymous) values ${users.map(u=>`(${L(u)},${L(u+'@t')},false)`).join(',')};`);
  const room=as(users[0],`select id from public.dd_create_battle_room(${players},${L(modeId)},'test','{}');`);
  // Den Raumcode bekommt der Gast im echten Spiel vom Host, nicht aus der Tabelle.
  const code=sql(`select code from public.dd_battle_rooms where id=${L(room)};`);
  for(const u of users.slice(1)) as(u,`select 1 from public.dd_join_battle_room(${L(code)},'{}');`);
  as(users[0],`select public.dd_set_battle_authority(${L(room)},'server');`);
  for(const u of users) as(u,`select 1 from public.dd_set_battle_ready(${L(room)},true);`);
  as(users[0],`select 1 from public.dd_start_battle(${L(room)},${J({id:'m-'+modeId,state:{interactionOwnerUid:users[0]}})});`);

  let response=await handle({userId:users[0],roomId:room,actionId:`a${++ids}`,type:INIT_ACTION,baseSeq:0,payload:{}});
  let {seq,state}=response.body,actions=1;
  while(!state.finished){
    const move=botMove(state.engine);
    response=await handle({userId:state.interactionOwnerUid,roomId:room,actionId:`a${++ids}`,type:move.type,baseSeq:seq,payload:move.payload||{}});
    seq=response.body.seq;state=response.body.state;actions++;
    assert.ok(actions<20000,'kein Matchende');
  }
  // Was ein Mitspieler ueber die Browserrechte sieht.
  const snapshot=as(users[1],`select public.dd_get_battle_snapshot(${L(room)})::text;`);
  check(!/"seed"\s*:\s*\d/.test(snapshot)&&!/rng_state/.test(snapshot),'Schnappschuss ohne Seed');
  const visible=JSON.parse(as(users[1],`select state::text from public.dd_battle_states where room_id=${L(room)};`));
  assert.deepEqual(visible,state);checks++;
  const counts=JSON.parse(sql(`select json_build_object('seq',(select seq from public.dd_battle_states where room_id=${L(room)}),'actions',(select count(*) from public.dd_battle_actions where room_id=${L(room)}),'draws',(select draw_index from dd_battle_private.match_rng where room_id=${L(room)}));`));
  assert.deepEqual([counts.seq,counts.actions,counts.draws],[seq,actions,state.engine.rng.drawIndex]);checks++;
  // Wiederholung der letzten Aktion: dasselbe Ergebnis, kein neuer Zug.
  const again=await handle({userId:users[0],roomId:room,actionId:`a${ids}`,type:'end_turn',baseSeq:seq-1,payload:{}}).catch(e=>e);
  check(again.body?.replay===true||again.code==='DD_ACTION_ID_REUSED','Wiederholte Action-ID wird nicht neu gerechnet');
  // Host-Publish ist gesperrt.
  const publish=(()=>{try{as(users[0],`select public.dd_publish_battle_state(${L(room)},${seq+1},'{}'::jsonb,'','');`);return 'ok';}catch(e){return e.code;}})();
  assert.equal(publish,'DD_SERVER_AUTHORITATIVE');checks++;
  results.push({modeId,players,actions,seq,draws:counts.draws});
}
console.table(results);
console.log(`server-kampf-pg: ${checks} Pruefungen gruen, ${results.reduce((s,r)=>s+r.actions,0)} Aktionen ueber echtes Postgres`);
