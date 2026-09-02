import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=relative=>readFile(path.join(root,relative),"utf8");
const files={
  html:await read("index.html"),
  publicConfig:await read("js/backend-config.js"),
  runtimeConfig:await read("js/40-backend-config.js"),
  core:await read("js/41-supabase-core.js"),
  account:await read("js/42-supabase-account.js"),
  battle:await read("js/43-supabase-battle.js"),
  online:await read("js/online/01-online.js"),
  migration:await read("supabase/migrations/20260902170000_diceduel_backend_foundation.sql"),
  edge:await read("supabase/functions/battle-action/index.ts"),
  supabaseConfig:await read("supabase/config.toml")
};
const errors=[];
const expect=(condition,message)=>{if(!condition)errors.push(message);};

const scriptOrder=[
  "js/backend-config.js",
  "js/40-backend-config.js",
  "js/41-supabase-core.js",
  "js/25-cloud-account.js",
  "js/42-supabase-account.js",
  "js/43-supabase-battle.js",
  "js/online/01-online.js"
].map(file=>files.html.indexOf(file));
expect(scriptOrder.every(index=>index>=0),"one or more backend scripts are missing from index.html");
expect(scriptOrder.every((index,i)=>i===0||index>scriptOrder[i-1]),"backend scripts load in an unsafe order");

expect(/accountProvider:\s*"supabase"/.test(files.publicConfig),"account provider is not prepared for Supabase");
expect(/onlineProvider:\s*"supabase"/.test(files.publicConfig),"Supabase online provider is not active");
expect(/service[_-]?role/.test(files.runtimeConfig),"runtime config does not reject service-role browser keys");
expect(/signInAnonymously/.test(files.core),"anonymous online identity support is missing");
expect(/dd_put_account_save/.test(files.account),"Supabase account adapter does not use protected save RPC");
expect(/DD_SAVE_CONFLICT/.test(files.account),"cloud save conflict handling is missing");
expect(/user\.is_anonymous/.test(files.account),"anonymous online identities leak into the cloud-account UI");
expect(/dd_submit_battle_action/.test(files.edge),"Edge Function does not submit through the validated action RPC");
expect(/auth\.getUser\(token\)/.test(files.edge),"Edge Function does not validate the caller JWT");
expect(/verify_jwt\s*=\s*false/.test(files.supabaseConfig)&&/auth\.getUser\(token\)/.test(files.edge),"manual JWT mode is not paired with explicit token validation");

const tables=["dd_accounts","dd_account_saves","dd_battle_rooms","dd_battle_members","dd_battle_states","dd_battle_actions","dd_battle_events","dd_battle_post_match"];
for(const table of tables){
  expect(new RegExp(`create table if not exists public\\.${table}\\b`).test(files.migration),`missing Supabase table ${table}`);
  expect(new RegExp(`alter table public\\.${table} enable row level security`).test(files.migration),`RLS is not enabled for ${table}`);
}
const rpcs=["dd_put_account_save","dd_create_battle_room","dd_join_battle_room","dd_set_battle_ready","dd_start_battle","dd_submit_battle_action","dd_publish_battle_state","dd_resolve_battle_action","dd_emit_battle_event","dd_set_post_match_choice","dd_reset_battle_lobby","dd_leave_battle_room","dd_get_battle_snapshot"];
for(const rpc of rpcs){
  expect(new RegExp(`create or replace function public\\.${rpc}\\b`).test(files.migration),`missing RPC ${rpc}`);
  expect(new RegExp(`grant execute on function public\\.${rpc}\\(`).test(files.migration),`authenticated role is not granted ${rpc}`);
}
expect(/revoke all on public\.dd_accounts,public\.dd_account_saves/.test(files.migration),"direct table mutations are not revoked");
expect(/grant select on public\.dd_accounts,public\.dd_account_saves/.test(files.migration),"authorized Realtime/select access is missing");
expect(/interactionOwnerUid/.test(files.migration)&&/DD_STALE_STATE/.test(files.migration),"battle action ownership/sequence validation is missing");
expect(/revision=v_revision\+1/.test(files.migration),"cloud save revision increment is missing");
expect(/stage:"online-ready"/.test(files.battle),"battle adapter is not marked online-ready");
expect(/reconnectRoom/.test(files.battle)&&/dd_battle_members/.test(files.battle),"Supabase battle reconnect support is missing");
expect(/dd_submit_battle_action/.test(files.battle)&&!/functions\.invoke/.test(files.battle),"browser battle actions are not using the protected RPC directly");
expect(/isSupabaseOnline/.test(files.online)&&/subscribeRoom/.test(files.online)&&/handleSupabaseMatchSnapshot/.test(files.online),"online controller is not connected to Supabase Realtime");
expect(/if\(!isSupabaseOnline\)[\s\S]*import\("https:\/\/www\.gstatic\.com\/firebasejs/.test(files.online),"Firebase fallback is not lazy-loaded behind the provider switch");

function runRuntimeConfig(supplied){
  const context={
    window:{DICEDUEL_BACKEND_CONFIG:supplied},
    atob:value=>Buffer.from(value,"base64").toString("utf8"),
    console:{warn(){},error(){}}
  };
  vm.runInNewContext(files.runtimeConfig,context,{filename:"40-backend-config.js"});
  return context.window.WDBackendConfig;
}
const fallback=runRuntimeConfig({accountProvider:"supabase",onlineProvider:"supabase",supabase:{projectUrl:"",publishableKey:""}});
expect(fallback.accountProvider==="mock-local"&&fallback.onlineProvider==="firebase","missing Supabase config does not fall back safely");
const active=runRuntimeConfig({accountProvider:"supabase",onlineProvider:"supabase",supabase:{projectUrl:"https://example.supabase.co",publishableKey:`sb_publishable_${"x".repeat(32)}`}});
expect(active.accountProvider==="supabase"&&active.onlineProvider==="supabase","valid public Supabase config does not activate providers");
const secretPayload=Buffer.from(JSON.stringify({role:"service_role"})).toString("base64url");
const rejected=runRuntimeConfig({accountProvider:"supabase",supabase:{projectUrl:"https://example.supabase.co",publishableKey:`x.${secretPayload}.x`}});
expect(!rejected.supabase.configured&&rejected.accountProvider==="mock-local","service-role JWT is not rejected from browser config");

if(errors.length){
  console.error(errors.map(error=>`- ${error}`).join("\n"));
  process.exitCode=1;
}else{
  console.log(`Supabase online verified: ${tables.length} RLS tables, ${rpcs.length} protected RPCs, Realtime lobby/match/reconnect, safe Firebase fallback.`);
}
