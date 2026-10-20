// Anforderungen: Ein angemeldeter Account kann sich selbst löschen, und
// alle daran hängenden Daten gehen mit. Fremde Accounts bleiben unberührt,
// anonyme Gäste und Unangemeldete werden abgewiesen, anon darf die
// Funktion gar nicht aufrufen. Läuft isoliert in PGlite, ohne Live-Projekt.
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
  create table public.dd_account_saves(user_id uuid primary key references auth.users(id) on delete cascade,payload jsonb);
  grant usage on schema public to anon,authenticated;
  insert into auth.users values
    ('11111111-1111-4111-8111-111111111111',false),
    ('22222222-2222-4222-8222-222222222222',false),
    ('33333333-3333-4333-8333-333333333333',true);
  insert into public.dd_account_saves values
    ('11111111-1111-4111-8111-111111111111','{}'),
    ('22222222-2222-4222-8222-222222222222','{}');
`);
await db.exec(fs.readFileSync(new URL("supabase/migrations/20261020090000_dd_delete_own_account.sql",root),"utf8"));
const owner="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222",guest="33333333-3333-4333-8333-333333333333";
const as=async(role,uid)=>{await db.exec("reset role");await db.query("select set_config('test.uid',$1,false)",[uid||""]);await db.exec(`set role ${role}`);};
const call=()=>db.query("select public.dd_delete_own_account()");
const count=async(table,id)=>{await db.exec("reset role");return (await db.query(`select count(*)::int n from ${table} where ${table==="auth.users"?"id":"user_id"}=$1`,[id])).rows[0].n;};
let checks=0;const check=async(name,fn)=>{await fn();console.log("OK",name);checks++;};
await check("anon darf die Funktion nicht aufrufen",async()=>{await as("anon",owner);await assert.rejects(call(),/permission denied/);});
await check("ohne Anmeldung abgewiesen",async()=>{await as("authenticated","");await assert.rejects(call(),/DD_AUTH_REQUIRED/);});
await check("anonymer Gast abgewiesen",async()=>{await as("authenticated",guest);await assert.rejects(call(),/DD_ACCOUNT_REQUIRED/);assert.equal(await count("auth.users",guest),1);});
await check("eigener Account samt Cloud-Save gelöscht",async()=>{await as("authenticated",owner);await call();assert.equal(await count("auth.users",owner),0);assert.equal(await count("public.dd_account_saves",owner),0);});
await check("fremder Account unberührt",async()=>{assert.equal(await count("auth.users",other),1);assert.equal(await count("public.dd_account_saves",other),1);});
console.log(`Account-Löschung: ${checks} Prüfungen grün.`);
