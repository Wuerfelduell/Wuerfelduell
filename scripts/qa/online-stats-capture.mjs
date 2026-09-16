import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {IDBFactory} from "fake-indexeddb";
const scope={window:{},crypto:webcrypto};vm.createContext(scope);
const root=new URL("../../",import.meta.url);
for(const f of ["01-contract","02-outbox","03-sync","04-collector"]){
  vm.runInContext(fs.readFileSync(new URL("js/online-stats/"+f+".js",root),"utf8"),scope);
}
const api=scope.window.WDOnlineStats,values=new Map();
const storage={get length(){return values.size;},key:i=>[...values.keys()][i],getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const uid="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222";
let session={uid},online=false,sent=[];
const indexedDB=new IDBFactory();
const options={storage,crypto:webcrypto,getSession:async()=>session,
  openOutbox:()=>api.createOutbox({indexedDB,name:"capture"}),
  send:async(r,owner)=>{if(!online)throw Error("offline");sent.push({r,owner});return {event_id:r.event_id,status:"accepted"};}};
let c=api.createCollector(options);
const ps=[{ability:1,botLevel:"human"},{ability:2,botLevel:"human"}];
const begin=(source="local")=>c.begin({source,mode_id:"classic",game_version:"28.12.53",round_number:1,players:ps,
  room_id:source==="online"?"44444444-4444-4444-8444-444444444444":null,match_id:source==="online"?"match-a":null});
c.setMainAccount(uid);
const ctx=begin();
const result=c.finish(ctx,[ps[0],{...ps[1],secondAbility:3}],[0],()=>0);
assert.equal(result.players[1].abilities[1].acquired,"later");
c.finish(ctx,ps,[0],()=>0);
await c.flush();assert.equal(sent.length,0);assert.equal(c.journalCount(uid),1);
// Sofortiges Schließen vor IndexedDB/Netz: synchrones Journal überlebt.
c=api.createCollector(options);online=true;await c.flush();
assert.equal(sent.length,1);assert.equal(sent[0].r.event_id,ctx.event_id);assert.equal(c.journalCount(uid),0);
// Derselbe Endbildschirm/RPC darf kein neues Ergebnis erzeugen.
c.finish(ctx,ps,[0],()=>0);await c.flush();assert.equal(sent.length,1);
const old=begin();session={uid:other};c.setMainAccount(other);c.finish(old,ps,[0],()=>0);
await c.flush();assert.equal(sent.length,1);assert.equal(c.journalCount(uid),1);
session={uid};c.setMainAccount(uid);await c.flush();assert.equal(sent.length,2);
const net=begin("online");c.finish(net,ps,[0],()=>0);await c.flush();assert.equal(sent.length,2);
// Ohne festes Hauptkonto kein nachträgliches Zuschlagen.
c.setMainAccount(null);const unowned=begin();c.setMainAccount(uid);
assert.equal(c.finish(unowned,ps,[0],()=>0),null);
assert.equal(begin("excluded"),null);
// Team-Ergebnis: beide Gastprofile bekommen den Teamsieg.
const team=c.begin({source:"local",mode_id:"campaign_duo",game_version:"28.12.53",round_number:1,
  players:[...ps,{ability:4,botLevel:"hard"}]});
const report=c.finish(team,[...ps,{ability:4,botLevel:"hard"}],[0,1],()=>1);
assert.equal(report.players.filter(p=>p.won).length,2);
// First Blood enthält einen Gegner ohne Fähigkeit; der Heldeneinsatz zählt trotzdem.
const rookiePlayers=[ps[0],{ability:0,botLevel:"easy"}];
const rookie=c.begin({source:"local",mode_id:"campaign_solo",game_version:"28.12.53",round_number:1,players:rookiePlayers});
assert.equal(c.finish(rookie,rookiePlayers,[0],()=>0).players[1].abilities.length,0);
// Collector bereinigt höchstens 500 Quittungen samt Journal vor dem Einreihen.
let now=1000000000;
const cleanupBox=await api.createOutbox({indexedDB,name:"journal-cleanup",now:()=>now});
const cleanupValues=new Map(),cleanupStorage={get length(){return cleanupValues.size;},key:i=>[...cleanupValues.keys()][i],getItem:k=>cleanupValues.get(k)||null,setItem:(k,v)=>cleanupValues.set(k,v),removeItem:k=>cleanupValues.delete(k)};
let cleanupSent=0;
const cleaner=api.createCollector({storage:cleanupStorage,crypto:webcrypto,getSession:async()=>({uid}),openOutbox:async()=>cleanupBox,send:async r=>{cleanupSent++;return {event_id:r.event_id,status:"accepted"};}});
for(let i=0;i<502;i++){
  const r={...result,event_id:webcrypto.randomUUID()};await cleanupBox.enqueue(uid,r);await cleanupBox.acknowledge(uid,r.event_id);
  cleanupStorage.setItem('diceduel_stats_pending_v1:'+uid+':'+r.event_id,JSON.stringify({owner:uid,report:r}));
}
now+=7*86400000+1;await cleaner.flush();assert.equal(cleanupSent,0);assert.equal(cleaner.journalCount(uid),0);
assert.equal((await cleanupBox.pruneAcknowledged()).length,2);cleanupBox.close();
// Abgewiesene Journal-Einträge kehren auch nach Neuöffnen nicht zurück.
const rejectionBox=await api.createOutbox({indexedDB,name:"journal-rejection"});
let rejectCalls=0;
const rejectionOptions={...options,storage:cleanupStorage,openOutbox:async()=>rejectionBox,send:async r=>{rejectCalls++;throw Error('DD_STATS_INVALID_REPORT');}};
const rejecting=api.createCollector(rejectionOptions);rejecting.setMainAccount(uid);
const rejectedContext=rejecting.begin({source:'local',mode_id:'classic',game_version:'28.12.61',round_number:1,players:ps});
rejecting.finish(rejectedContext,ps,[0],()=>0);await rejecting.flush();assert.equal(rejectCalls,1);assert.equal(await rejecting.rejectedCount(),1);
assert.equal(rejecting.journalCount(uid),0);await api.createCollector(rejectionOptions).flush();assert.equal(rejectCalls,1);
await rejecting.discardRejected();assert.equal(await rejecting.rejectedCount(),0);rejectionBox.close();
// Echter Spieladapter: fehlende Globale dürfen niemals den aufrufenden Kampf abbrechen.
const warnings=[],statusNode={textContent:"",setAttribute(){},addEventListener(){}};
Object.assign(scope,{localStorage:storage,navigator:{onLine:false},document:{getElementById:()=>statusNode},
  console:{warn:(...args)=>warnings.push(args)},setTimeout:()=>1,clearTimeout(){},
  gameContext:{mode:"local-classic",statsRound:{stale:true}},tutorialMode:false,campaignMode:false,
  trioCampaignMode:false,duoCampaignMode:false,localModeId:"classic",roundNumber:1,GAME_VERSION:"28.12.58"});
Object.assign(scope.window,{crypto:webcrypto,addEventListener(){}});
vm.runInContext(fs.readFileSync(new URL("js/online-stats/05-game.js",root),"utf8"),scope);
assert.doesNotThrow(()=>assert.equal(api.game.begin(),null));
assert.equal(scope.gameContext.statsRound,null);assert.equal(warnings.length,1);
assert.ok(statusNode.textContent.includes("Statistik konnte nicht gespeichert"));
scope.players=ps;assert.ok(api.game.begin());
delete scope.roundNumber;
assert.doesNotThrow(()=>assert.equal(api.game.finish([0]),null));
assert.equal(scope.gameContext.statsRound,null);assert.equal(warnings.length,2);
delete scope.gameContext;
assert.doesNotThrow(()=>assert.equal(api.game.begin(),null));
console.log("Erfassung geprüft: Gastprofile, Offline, Duplikate, Kontowechsel, Teamsieg und fehlertoleranter Spieladapter.");
