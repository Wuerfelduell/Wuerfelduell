// Anforderungen vor der Umsetzung: kein verlorener Offline-Eintrag,
// keine Doppelwertung und kein Versand unter einem anderen Hauptkonto.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {IDBFactory} from "fake-indexeddb";
import {webcrypto} from "node:crypto";

const root=new URL("../../",import.meta.url);
const scope={window:{},crypto:webcrypto};
vm.createContext(scope);
for(const file of ["01-contract.js","02-outbox.js","03-sync.js"]){
  vm.runInContext(fs.readFileSync(new URL("js/online-stats/"+file,root),"utf8"),scope);
}
const api=scope.window.WDOnlineStats;
const account="11111111-1111-4111-8111-111111111111";
const other="22222222-2222-4222-8222-222222222222";
const report=()=>({
  schema_version:1,event_id:webcrypto.randomUUID(),source:"local",
  game_version:"28.12.50",mode_id:"classic",round_number:1,
  room_id:null,match_id:null,
  players:[
    {seat:0,is_bot:false,won:true,abilities:[{id:1,level:0,acquired:"start"}]},
    {seat:1,is_bot:false,won:false,abilities:[{id:2,level:1,acquired:"later"}]}
  ]
});
let count=0;
async function check(name,fn){await fn();console.log("OK",name);count++;}
await check("Nur erlaubte Felder verlassen das Gerät",()=>{
  const input=report();input.email="private@example.invalid";input.players[0].name="Privat";
  const clean=api.normalizeReport(input);
  assert.ok(!JSON.stringify(clean).includes("Privat"));
  assert.ok(!JSON.stringify(clean).includes("private@"));
  assert.equal(clean.players.length,2);
});
await check("Ungültige/abgebrochene Ergebnisse zählen nicht",()=>{
  for(const mutate of [
    r=>r.players.forEach(p=>p.won=false),
    r=>r.players.forEach(p=>p.won=true),
    r=>r.players[1].seat=0,
    r=>r.players[0].abilities.push({...r.players[0].abilities[0]}),
    r=>r.players[0].abilities[0].id=26,
    r=>r.players[0].abilities[0].level=3,
    r=>r.players[0].is_bot="false",
    r=>r.players.forEach(p=>p.is_bot=true),
    r=>r.source="old_import"
  ]){const r=report();mutate(r);assert.throws(()=>api.normalizeReport(r));}
});
const indexedDB=new IDBFactory();
const open=()=>api.createOutbox({indexedDB,name:"stats-test"});
let box=await open();
await check("Einträge überleben Neuöffnen und werden nicht doppelt angelegt",async()=>{
  const r=report();
  await box.enqueue(account,r);await box.enqueue(account,r);
  box.close();box=await open();
  assert.equal((await box.pending(account)).length,1);
  assert.equal((await box.pending(other)).length,0);
});
await check("Gleiche Kennung mit anderem Inhalt wird abgelehnt",async()=>{
  const [{report:r}]=await box.pending(account);
  r.players[0].abilities[0].id=4;
  await assert.rejects(box.enqueue(account,r),/CONFLICT/);
});
await check("Zwei Tabs verlieren keine Meldung",async()=>{
  const second=await open();
  await Promise.all([box.enqueue(account,report()),second.enqueue(account,report())]);
  assert.equal((await box.pending(account)).length,3);
  second.close();
});
await check("Netzfehler erhalten die Warteschlange",async()=>{
  const sync=api.createSync({outbox:box,getSession:async()=>({uid:account}),send:async()=>{throw Error("offline");}});
  assert.equal((await sync.flush()).status,"retry");
  assert.equal((await box.pending(account)).length,3);
});
await check("Keine Übertragung ohne Hauptkonto",async()=>{
  let sent=0;
  const sync=api.createSync({outbox:box,getSession:async()=>null,send:async()=>{sent++;}});
  assert.equal((await sync.flush()).status,"signed_out");assert.equal(sent,0);
});
await check("Kontowechsel während Versand leert keine fremden Einträge",async()=>{
  let uid=account;
  const sync=api.createSync({outbox:box,getSession:async()=>({uid}),send:async r=>{uid=other;return {event_id:r.event_id,status:"accepted"};}});
  assert.equal((await sync.flush()).status,"account_changed");
  assert.equal((await box.pending(account)).length,2);
});
await check("Unbestätigte oder falsche Antwort löscht nichts",async()=>{
  const sync=api.createSync({outbox:box,getSession:async()=>({uid:account}),send:async()=>({event_id:webcrypto.randomUUID(),status:"accepted"})});
  assert.equal((await sync.flush()).status,"retry");assert.equal((await box.pending(account)).length,2);
});
await check("Bestätigung und Duplikat leeren nur bestätigte Einträge",async()=>{
  const sync=api.createSync({outbox:box,getSession:async()=>({uid:account}),send:async r=>({event_id:r.event_id,status:"duplicate"})});
  await Promise.all([sync.flush(),sync.flush()]);
  assert.equal((await box.pending(account)).length,0);
});
await check("Bestätigte Kennung wird nach Reload nicht wieder eingereiht",async()=>{
  const r=report();await box.enqueue(account,r);await box.acknowledge(account,r.event_id);
  box.close();box=await open();await box.enqueue(account,r);
  assert.equal((await box.pending(account)).length,0);
});
await check("Fremdes Konto darf denselben lokalen Kampf nicht übernehmen",async()=>{
  const r=report();await box.enqueue(account,r);
  await assert.rejects(box.enqueue(other,r),/OWNER/);
});
await check("Volle Warteschlange verwirft keine alten Einträge",async()=>{
  const small=await api.createOutbox({indexedDB,name:"small",maxPending:1});
  await small.enqueue(account,report());
  await assert.rejects(small.enqueue(account,report()),/FULL/);
  assert.equal((await small.pending(account)).length,1);small.close();
});
await check("Quittungen: sieben Tage, maximal 500, ausstehende bleiben",async()=>{
  let now=1000000000;
  const b=await api.createOutbox({indexedDB,name:"retention",now:()=>now});
  for(let i=0;i<502;i++){const r=report();await b.enqueue(account,r);await b.acknowledge(account,r.event_id);}
  const pending=report();await b.enqueue(account,pending);
  now+=7*86400000;assert.equal((await b.pruneAcknowledged()).length,0);
  now++;assert.equal((await b.pruneAcknowledged()).length,500);
  assert.equal((await b.pruneAcknowledged()).length,2);
  assert.equal((await b.pending(account)).length,1);b.close();
});
await check("Abgewiesene werden übersprungen; Verwerfen bleibt kontogebunden",async()=>{
  const b=await api.createOutbox({indexedDB,name:"rejected"});
  const bad=report();await b.enqueue(account,bad);
  for(const code of ["DD_STATS_INVALID_REPORT","DD_STATS_OWNER_CONFLICT","DD_STATS_REPORT_CONFLICT"]){
    const good=report();await b.enqueue(account,good);
    const sync=api.createSync({outbox:b,getSession:async()=>({uid:account}),send:async r=>{
      if(r.event_id===bad.event_id)throw {message:code};return {event_id:r.event_id,status:"accepted"};
    }});
    assert.equal((await sync.flush()).status,"complete");
    assert.equal((await b.pending(account)).length,0);
    assert.equal(await b.rejectedCount(account),1);
    await b.discardRejected(account);await b.enqueue(account,bad);
  }
  await b.reject(account,bad.event_id,"DD_STATS_INVALID_REPORT");
  const foreign=report();await b.enqueue(other,foreign);await b.reject(other,foreign.event_id,"DD_STATS_REPORT_CONFLICT");
  const pending=report();await b.enqueue(account,pending);
  await b.discardRejected(account);
  assert.equal(await b.rejectedCount(account),0);assert.equal(await b.rejectedCount(other),1);
  assert.equal((await b.pending(account)).length,1);
  const retry=api.createSync({outbox:b,getSession:async()=>({uid:account}),send:async()=>{throw Error("DD_STATS_RATE_LIMIT");}});
  assert.equal((await retry.flush()).status,"retry");assert.equal((await b.pending(account)).length,1);b.close();
});
box.close();
console.log(count+" Online-Statistik-Prüfgruppen bestanden.");
