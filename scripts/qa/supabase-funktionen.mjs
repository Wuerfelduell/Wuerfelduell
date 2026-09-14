/* Sind die Online-Funktionen auf der echten Datenbank angekommen?
 *
 * scripts/validate-supabase.mjs prueft nur den Quelltext. Ob eine Migration
 * wirklich eingespielt wurde, sieht man daran nicht - genau das war am
 * 14.09. der offene Punkt zu dd_touch_room.
 *
 * Diese Sonde ruft jede Funktion anonym ueber PostgREST auf und wertet nur
 * die Fehlerklasse aus:
 *
 *   PGRST202 "Could not find the function"  -> NICHT eingespielt
 *   42501 / permission denied               -> vorhanden und geschuetzt
 *   sonstiger Fehler                        -> vorhanden, andere Ursache
 *
 * Ein anonymer Aufruf DARF nicht durchgehen. Ein Erfolg waere ein Befund.
 *
 * Der publishable Key steht ohnehin im Browser und im Repo; dieses Skript
 * gibt ihn trotzdem nie aus - weder in die Ausgabe noch in eine Datei.
 */
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';

const root=process.cwd();
const konfigDatei=path.join(root,'js/backend-config.js');
if(!fs.existsSync(konfigDatei)){console.log('js/backend-config.js fehlt - ohne Projektdaten keine Sonde.');process.exit(1);}

// Die Konfigdatei setzt window.WD_BACKEND_CONFIG (oder aehnlich). In einer
// leeren Sandbox ausfuehren und nur die beiden Felder herausziehen.
const fenster={};
vm.runInNewContext(fs.readFileSync(konfigDatei,'utf8'),{window:fenster,globalThis:fenster,console:{log(){},warn(){},error(){}}},{filename:'backend-config.js'});
const finde=(o,tiefe=0)=>{
  if(!o||typeof o!=='object'||tiefe>4)return null;
  const url=o.projectUrl||o.url||o.supabaseUrl;
  const key=o.publishableKey||o.anonKey||o.key;
  if(typeof url==='string'&&url.includes('supabase')&&typeof key==='string'&&key.length>20)return {url,key};
  for(const v of Object.values(o)){const t=finde(v,tiefe+1);if(t)return t;}
  return null;
};
const cfg=finde(fenster);
if(!cfg){console.log('Keine Supabase-Projektdaten in der Konfiguration gefunden.');process.exit(1);}
console.log(`Projekt: ${new URL(cfg.url).host.split('.')[0].slice(0,4)}… (Host gekuerzt, Schluessel wird nicht ausgegeben)`);

// ACHTUNG: PostgREST loest die Funktion ueber die ARGUMENTNAMEN auf. Fehlt
// ein Pflichtargument, kommt PGRST202 "Could not find the function" - genau
// dieselbe Meldung wie bei einer fehlenden Funktion. Ein erster Entwurf
// schickte nur p_room_id und meldete dd_submit_battle_action und
// dd_publish_battle_state als FEHLEND, obwohl beide laengst da waren.
// Die Argumente muessen deshalb der Signatur in der Migration entsprechen.
const NULL_ID='00000000-0000-0000-0000-000000000000';
const FUNKTIONEN=[
  ['dd_touch_room',{p_room_id:NULL_ID}],
  ['dd_join_battle_room',{p_code:'ZZZZZZ'}],
  ['dd_set_battle_ready',{p_room_id:NULL_ID,p_ready:false}],
  ['dd_submit_battle_action',{p_room_id:NULL_ID,p_client_action_id:'probe',p_base_seq:0,p_action_type:'probe'}],
  ['dd_publish_battle_state',{p_room_id:NULL_ID,p_seq:0,p_state:{}}]
];

const bewerte=(status,text)=>{
  let code='',nachricht='';
  try{const j=JSON.parse(text);code=j.code||'';nachricht=String(j.message||'').slice(0,80);}catch{nachricht=String(text).slice(0,80);}
  if(code==='PGRST202'||/could not find the function/i.test(nachricht))return {klasse:'FEHLT',ok:false,code,nachricht};
  if(status===401||status===403||code==='42501'||/permission denied/i.test(nachricht))return {klasse:'vorhanden, geschuetzt',ok:true,code,nachricht};
  if(status>=200&&status<300)return {klasse:'ANONYM DURCHGEGANGEN',ok:false,code,nachricht};
  return {klasse:'vorhanden, anderer Fehler',ok:true,code,nachricht};
};

let fehler=0;
for(const [name,args] of FUNKTIONEN){
  let status=0,text='';
  try{
    const antwort=await fetch(`${cfg.url}/rest/v1/rpc/${name}`,{
      method:'POST',
      headers:{'apikey':cfg.key,'Authorization':`Bearer ${cfg.key}`,'Content-Type':'application/json'},
      body:JSON.stringify(args)
    });
    status=antwort.status;text=await antwort.text();
  }catch(e){
    console.log(`  ?      ${name.padEnd(26)} nicht erreichbar: ${e.message.split('\n')[0].slice(0,60)}`);
    fehler++;continue;
  }
  const b=bewerte(status,text);
  if(!b.ok)fehler++;
  console.log(`  ${b.ok?'ok  ':'FEHL'}   ${name.padEnd(26)} HTTP ${status}  ${b.klasse}${b.code?`  (${b.code})`:''}`);
}

console.log(fehler
  ? `\n${fehler} Funktion(en) nicht wie erwartet. "FEHLT" heisst: Migration nicht eingespielt.`
  : '\nAlle Funktionen sind auf der Datenbank und weisen anonyme Aufrufe ab.');
process.exit(fehler?1:0);
