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
await db.close();
console.log(checks+" Datenbank-Prüfgruppen bestanden.");
