// Führt die neue Migration mit PostgreSQL (PGlite) isoliert aus.
// Keine Verbindung zu einem Live-Projekt und keine echten Benutzer.
import assert from "node:assert/strict";
import fs from "node:fs";
import {PGlite} from "@electric-sql/pglite";
const db=new PGlite();
const root=new URL("../../",import.meta.url);
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users(id uuid primary key,is_anonymous boolean default false);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('test.uid',true),'')::uuid;
  $$;
  create table public.dd_battle_rooms(id uuid primary key,host_user_id uuid,match_id text,mode_id text,game_version text,max_players int);
  create table public.dd_battle_states(room_id uuid primary key,match_id text,state jsonb);
  insert into auth.users values
    ('11111111-1111-4111-8111-111111111111',false),
    ('22222222-2222-4222-8222-222222222222',false),
    ('33333333-3333-4333-8333-333333333333',true);
  insert into public.dd_battle_rooms values
    ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','match-a','classic','28.12.50',2);
`);
const migration=fs.readdirSync(new URL("supabase/migrations/",root)).find(p=>p.endsWith("_online_stats_foundation.sql"));
assert.ok(migration);
await db.exec(fs.readFileSync(new URL("supabase/migrations/"+migration,root),"utf8"));
await db.exec(fs.readFileSync(new URL("supabase/migrations/20260916143946_online_stats_unarmed_bots.sql",root),"utf8"));
const owner="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222";
const local=id=>({schema_version:1,event_id:id,source:"local",game_version:"28.12.50",mode_id:"classic",round_number:1,room_id:null,match_id:null,players:[
  {seat:0,is_bot:false,won:true,abilities:[{id:1,level:0,acquired:"start"}]},
  {seat:1,is_bot:false,won:false,abilities:[{id:2,level:1,acquired:"later"}]}
]});
const setUser=async uid=>{await db.query("select set_config('test.uid',$1,false)",[uid]);await db.exec("set role authenticated");};
const submit=async(report,account=owner)=>(await db.query("select public.dd_submit_stats_report($1::uuid,$2::jsonb) as result",[account,JSON.stringify(report)])).rows[0].result;
let checks=0;
async function check(name,fn){await fn();console.log("OK",name);checks++;}
const r=local("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
await setUser(owner);
await check("Erstmeldung und Wiederholung zählen genau einmal",async()=>{
  assert.equal((await submit(r)).status,"accepted");
  assert.equal((await submit(r)).status,"duplicate");
  const rows=(await db.query("select * from public.dd_global_ability_stats()")).rows;
  assert.equal(rows.length,2);assert.equal(Number(rows.find(x=>x.ability_id===1).uses),1);
});
await check("Widersprüchliche Wiederholung wird nicht überschrieben",async()=>{
  const changed=structuredClone(r);changed.players[0].abilities[0].id=3;
  await assert.rejects(submit(changed),/DD_STATS_REPORT_CONFLICT/);
});
await check("Fremder Benutzer und fremdes Hauptkonto werden abgewiesen",async()=>{
  await setUser(other);
  await assert.rejects(submit(r),/DD_STATS_ACCOUNT_REQUIRED/);
  await assert.rejects(submit(r,other),/DD_STATS_OWNER_CONFLICT/);
  await setUser(owner);
});
await check("Gastidentität ist kein Hauptkonto",async()=>{
  const guest="33333333-3333-4333-8333-333333333333";
  await setUser(guest);await assert.rejects(submit(r,guest),/DD_STATS_ACCOUNT_REQUIRED/);
  await setUser(owner);
});
await check("Ungültige Meldungen werden vollständig zurückgerollt",async()=>{
  for(const mutate of [
    x=>x.players.forEach(p=>p.won=false),
    x=>x.players[0].name="Privat",
    x=>x.players[1].seat=0,
    x=>x.players[0].abilities.push({...x.players[0].abilities[0]}),
    x=>x.players[0].abilities[0].id=26,
    x=>x.players[0].abilities[0].level=3,
    x=>x.players[0].won="true",
    x=>x.mode_id=null,
    x=>delete x.players[0].is_bot,
    x=>x.source="old_import"
  ]){
    const bad=local("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");mutate(bad);
    await assert.rejects(submit(bad),/DD_STATS_INVALID_REPORT/);
  }
});
const online={...local("cccccccc-cccc-4ccc-8ccc-cccccccccccc"),source:"online",room_id:"44444444-4444-4444-8444-444444444444",match_id:"match-a"};
await db.exec("reset role");
await db.query("insert into public.dd_battle_states values ($1,'match-a',$2::jsonb)",[online.room_id,JSON.stringify({statsReport:online,settled:true,ui:{winner:{open:true}}})]);
await setUser(owner);
await check("Online meldet nur der Host des passenden Matches",async()=>{
  await setUser(other);await assert.rejects(submit(online,other),/DD_STATS_NOT_HOST/);
  await setUser(owner);
  await assert.rejects(submit({...online,match_id:"fremd"}),/DD_STATS_NOT_HOST/);
  assert.equal((await submit(online)).status,"accepted");
});
await check("Online-Duplikat mit anderer Ereignis-ID zählt nicht erneut",async()=>{
  assert.equal((await submit({...online,event_id:"dddddddd-dddd-4ddd-8ddd-dddddddddddd"})).status,"duplicate");
});
await check("Archiv und Wiederholung überleben das Löschen des Raums",async()=>{
  await db.exec("reset role;delete from public.dd_battle_rooms");await setUser(owner);
  assert.equal((await submit(online)).status,"duplicate");
});
await check("Öffentlich nur Fähigkeitszahlen, keine Einzelmeldungen",async()=>{
  await db.exec("set role anon");
  const rows=(await db.query("select * from public.dd_global_ability_stats()")).rows;
  assert.equal(rows.length,4);
  assert.ok(rows.every(x=>!Object.keys(x).some(k=>/account|owner|name|event|room|match_id|seat/.test(k))));
  await assert.rejects(db.query("select * from dd_stats_private.reports"),/permission denied/);
  await assert.rejects(submit(r),/permission denied/);
  await db.exec("set role authenticated");
  await assert.rejects(db.query("select * from dd_stats_private.ability_uses"),/permission denied/);
});
await db.exec("reset role");
const captureFile=fs.readdirSync(new URL("supabase/migrations/",root)).find(p=>p.endsWith("_online_stats_capture.sql"));
await db.exec(fs.readFileSync(new URL("supabase/migrations/"+captureFile,root),"utf8"));
await db.exec(fs.readFileSync(new URL("supabase/migrations/20260916160029_online_stats_capture_fail_open.sql",root),"utf8"));
const retention=fs.readdirSync(new URL("supabase/migrations/",root)).find(p=>p.endsWith("_online_stats_retention.sql"));
if(retention)await db.exec(fs.readFileSync(new URL("supabase/migrations/"+retention,root),"utf8"));
await db.query("insert into public.dd_battle_rooms values ($1,$2,'match-b','classic','28.12.50',2)",[online.room_id,owner]);
await db.query("update public.dd_battle_states set match_id='match-b',state='{}' where room_id=$1",[online.room_id]);
const finalReport={...online,event_id:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",match_id:"match-b"};
const finalState={settled:true,ui:{winner:{open:true}},battle:{roundNumber:1,roundWinnerIndex:0},players:[{},{}],statsReport:finalReport};
await check("Finaler State und Statistik werden atomar gespeichert",async()=>{
  await db.query("update public.dd_battle_states set state=$1 where room_id=$2",[JSON.stringify(finalState),online.room_id]);
  assert.equal(Number((await db.query("select count(*) as n from dd_stats_private.reports where event_id=$1",[finalReport.event_id])).rows[0].n),1);
  await db.query("update public.dd_battle_states set state=$1 where room_id=$2",[JSON.stringify(finalState),online.room_id]);
  assert.equal(Number((await db.query("select count(*) as n from dd_stats_private.reports where event_id=$1",[finalReport.event_id])).rows[0].n),1);
});
await check("Abweichender Report blockiert erneute Veröffentlichung nicht",async()=>{
  const changed=structuredClone(finalState);changed.statsReport.players[0].abilities[0].level=2;
  await db.query("update public.dd_battle_states set state=$1 where room_id=$2",[JSON.stringify(changed),online.room_id]);
  assert.deepEqual((await db.query("select state from public.dd_battle_states where room_id=$1",[online.room_id])).rows[0].state,changed);
  assert.equal(Number((await db.query("select count(*) as n from dd_stats_private.reports where event_id=$1",[finalReport.event_id])).rows[0].n),1);
  const errors=(await db.query("select * from dd_stats_private.capture_errors where match_id='match-b'")).rows;
  assert.equal(errors.length,1);assert.equal(errors[0].sqlerrm,"DD_STATS_REPORT_CONFLICT");assert.equal(errors[0].sqlstate,"P0001");
});
await check("Ungültige Rundennummer speichert State und genau einen Diagnoseeintrag",async()=>{
  const room="55555555-5555-4555-8555-555555555555";
  await db.query("insert into public.dd_battle_rooms values ($1,$2,'match-invalid','classic','28.12.50',2)",[room,owner]);
  const bad=structuredClone(finalState);
  Object.assign(bad.statsReport,{event_id:"66666666-6666-4666-8666-666666666666",room_id:room,match_id:"match-invalid",round_number:2});
  await db.query("insert into public.dd_battle_states values ($1,'match-invalid',$2)",[room,JSON.stringify(bad)]);
  assert.deepEqual((await db.query("select state from public.dd_battle_states where room_id=$1",[room])).rows[0].state,bad);
  assert.equal(Number((await db.query("select count(*) as n from dd_stats_private.reports where room_id=$1",[room])).rows[0].n),0);
  const errors=(await db.query("select * from dd_stats_private.capture_errors where room_id=$1",[room])).rows;
  assert.equal(errors.length,1);assert.equal(errors[0].round_number,1);
  assert.equal(errors[0].sqlerrm,"DD_STATS_INVALID_FINAL_STATE");assert.ok(errors[0].created_at);
});
await check("Diagnosetabelle ist für beide Client-Rollen gesperrt",async()=>{
  for(const role of ["anon","authenticated"]){
    await db.exec("set role "+role);
    await assert.rejects(db.query("select * from dd_stats_private.capture_errors"),/permission denied/);
    await assert.rejects(db.query("insert into dd_stats_private.capture_errors(sqlstate,sqlerrm) values ('P0001','test')"),/permission denied/);
  }
  await db.exec("reset role");
});
await check("Auch ein Ausfall der Diagnosetabelle blockiert den State nicht",async()=>{
  await db.exec("alter table dd_stats_private.capture_errors add constraint test_log_failure check(false) not valid");
  const bad=structuredClone(finalState);bad.statsReport.round_number=9;
  await db.query("update public.dd_battle_states set state=$1 where room_id=$2",[JSON.stringify(bad),online.room_id]);
  assert.deepEqual((await db.query("select state from public.dd_battle_states where room_id=$1",[online.room_id])).rows[0].state,bad);
  await db.exec("alter table dd_stats_private.capture_errors drop constraint test_log_failure");
});
await check("Fehleraufbewahrung: jüngste 20 pro Match und höchstens 30 Tage",async()=>{
  await db.exec("delete from dd_stats_private.capture_errors");
  await db.query(`insert into dd_stats_private.capture_errors(room_id,match_id,sqlstate,sqlerrm,created_at)
    values ($1,'old','P0001','31 days',now()-interval '31 days'),($1,'old','P0001','29 days',now()-interval '29 days')`,[online.room_id]);
  const bad=structuredClone(finalState);bad.statsReport.round_number=7;
  for(let i=0;i<25;i++)await db.query("update public.dd_battle_states set state=$1 where room_id=$2",[JSON.stringify(bad),online.room_id]);
  assert.equal((await db.query("select * from dd_stats_private.capture_errors where match_id='match-b'")).rows.length,20);
  assert.deepEqual((await db.query("select sqlerrm from dd_stats_private.capture_errors where match_id='old'")).rows.map(r=>r.sqlerrm),["29 days"]);
});
await check("Fehlschlagendes Aufräumen blockiert den Spielzustand nicht",async()=>{
  await db.exec(`create function dd_stats_private.test_delete_failure() returns trigger language plpgsql as $$begin raise exception 'cleanup failed'; end;$$;
    create trigger test_delete_failure before delete on dd_stats_private.capture_errors for each row execute function dd_stats_private.test_delete_failure()`);
  const bad=structuredClone(finalState);bad.statsReport.round_number=8;
  await db.query("update public.dd_battle_states set state=$1 where room_id=$2",[JSON.stringify(bad),online.room_id]);
  assert.deepEqual((await db.query("select state from public.dd_battle_states where room_id=$1",[online.room_id])).rows[0].state,bad);
  await db.exec("drop trigger test_delete_failure on dd_stats_private.capture_errors;drop function dd_stats_private.test_delete_failure()");
});
await check("Öffentliche Kampfzahl zählt Reports statt Fähigkeitseinsätze",async()=>{
  const n=Number((await db.query("select count(*) as n from dd_stats_private.reports")).rows[0].n);
  await db.exec("set role anon");
  assert.equal(Number((await db.query("select public.dd_global_stats_count() as n")).rows[0].n),n);
  await db.exec("reset role");
});
await check("Raum löschen nach finalem State erhält die Statistik",async()=>{
  await db.query("delete from public.dd_battle_rooms where id=$1",[online.room_id]);
  assert.equal(Number((await db.query("select count(*) as n from dd_stats_private.reports where event_id=$1",[finalReport.event_id])).rows[0].n),1);
});
await check("Team-Siege zählen alle beteiligten Gastprofile",async()=>{
  const team={...local("ffffffff-ffff-4fff-8fff-ffffffffffff"),mode_id:"campaign_duo"};
  team.players[1].won=true;
  team.players.push({seat:2,is_bot:true,won:false,abilities:[{id:4,level:0,acquired:"start"}]});
  await setUser(owner);assert.equal((await submit(team)).status,"accepted");
});
await check("First Blood zählt den Helden trotz Gegner ohne Fähigkeit",async()=>{
  const rookie={...local("01234567-89ab-4cde-8fab-0123456789ab"),mode_id:"campaign_solo"};
  rookie.players[1].is_bot=true;rookie.players[1].abilities=[];
  assert.equal((await submit(rookie)).status,"accepted");
  const bad=structuredClone(rookie);bad.event_id="12345678-9abc-4def-8abc-123456789abc";bad.players[0].abilities=[];
  await assert.rejects(submit(bad),/DD_STATS_INVALID_REPORT/);
});
await db.close();
console.log(checks+" Datenbank-Prüfgruppen bestanden.");
