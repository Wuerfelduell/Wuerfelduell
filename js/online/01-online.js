import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getDatabase, ref, get, set, update, remove, onValue,
  onDisconnect, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

// Firebase bleibt in V27.4.0 bewusst nur Transport + Raum-/Presence-Layer.
// Die eigentliche Würfelduell-Engine läuft weiterhin auf dem Host-Gerät.
const firebaseConfig={
  apiKey:"AIzaSyDWVildqD4Hx8JpuY87blbcdJYawluDJ5Y",
  authDomain:"wuerfelduell-35558.firebaseapp.com",
  databaseURL:"https://wuerfelduell-35558-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId:"wuerfelduell-35558",
  storageBucket:"wuerfelduell-35558.firebasestorage.app",
  messagingSenderId:"204749035054",
  appId:"1:204749035054:web:1a2f95da48d98b67b671bf"
};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getDatabase(app);
const bridge=window.WDOnlineBridge;
const $=id=>document.getElementById(id);

const mainMenu=$("mainMenu"),onlineScreen=$("onlineScreen"),menuOnlineBtn=$("menuOnlineBtn"),onlineBackBtn=$("onlineBackBtn");
const onlineStatus=$("onlineStatus"),onlineStatusDot=$("onlineStatusDot"),onlineProfileSelect=$("onlineProfileSelect");
const onlineCreateBtn=$("onlineCreateBtn"),onlineJoinCode=$("onlineJoinCode"),onlineJoinBtn=$("onlineJoinBtn");
const onlineHome=$("onlineHome"),onlineLobby=$("onlineLobby"),onlineRoomCode=$("onlineRoomCode"),onlineCopyCodeBtn=$("onlineCopyCodeBtn");
const onlineLobbyState=$("onlineLobbyState"),onlinePlayerList=$("onlinePlayerList"),onlineReadyBtn=$("onlineReadyBtn"),onlineLeaveBtn=$("onlineLeaveBtn");
const onlineNotice=$("onlineNotice"),onlineLobbyHint=$("onlineLobbyHint"),quitConfirmBtn=$("quitConfirmBtn");

let uid=null;
let currentRoomCode=null;
let currentRoom=null;
let currentIsHost=false;
let currentHostUid="";
let currentMatchId="";
let authReady=false;
let firebaseConnected=false;
let busy=false;
let matchStartBusy=false;
let enteredMatchId=null;
let disconnectOp=null;

// Lobby und Match benutzen ab jetzt getrennte Listener. Damit zieht ein Würfelwurf
// nicht mehr jedes Mal die komplette Lobby + Match-Struktur über Firebase.
let roomUnsubscribe=null;
let metaUnsubscribe=null;
let stateUnsubscribe=null;
let playersUnsubscribe=null;
let actionUnsubscribe=null;
let visualUnsubscribe=null;
let ackUnsubscribe=null;
let connectedUnsubscribe=null;

let processingActionId=null;
let lastProcessedActionId="";
let lastVisualId="";
let hostStateSeq=0;
let localStateSeq=0;
let localProfileId=null;

function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));}
function normalizeCode(value){return String(value||"").toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,6);}
function makeCode(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out="";
  const bytes=new Uint8Array(6);
  if(globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else for(let i=0;i<bytes.length;i++) bytes[i]=Math.floor(Math.random()*256);
  for(const b of bytes) out+=chars[b%chars.length];
  return out;
}
function requestId(){return `${String(uid||"anon").slice(0,8)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;}
function selectedProfile(){
  const profiles=bridge?.getProfiles?.()||[];
  return profiles.find(p=>p.id===onlineProfileSelect.value)||profiles[0]||null;
}
function setNotice(text,type=""){
  onlineNotice.textContent=text||"";
  onlineNotice.className=`online-notice${type?` ${type}`:""}${text?"":" hidden"}`;
}
function setConnection(label,state="pending"){
  onlineStatus.textContent=label;
  onlineStatusDot.dataset.state=state;
}
function setBusy(value){
  busy=!!value;
  onlineCreateBtn.disabled=busy||!authReady||!firebaseConnected||!selectedProfile();
  onlineJoinBtn.disabled=busy||!authReady||!firebaseConnected||!selectedProfile()||normalizeCode(onlineJoinCode.value).length!==6;
  if(currentRoomCode&&currentRoom?.meta?.status==="lobby") onlineReadyBtn.disabled=busy;
}
function refreshProfiles(){
  const profiles=bridge?.getProfiles?.()||[];
  const old=onlineProfileSelect.value;
  onlineProfileSelect.innerHTML="";
  if(!profiles.length){
    const option=document.createElement("option");
    option.value="";option.textContent="Kein Profil vorhanden";onlineProfileSelect.appendChild(option);
    onlineProfileSelect.disabled=true;
    setNotice("Erstelle zuerst im Hauptmenü ein Profil, bevor du online spielst.","warn");
  }else{
    profiles.forEach(p=>{
      const option=document.createElement("option");
      option.value=p.id;option.textContent=`${p.name} #${p.tagNumber}`;onlineProfileSelect.appendChild(option);
    });
    onlineProfileSelect.disabled=false;
    if(profiles.some(p=>p.id===old)) onlineProfileSelect.value=old;
    setNotice("");
  }
  setBusy(false);
}
function showOnlineHome(){
  onlineLobby.classList.add("hidden");
  onlineHome.classList.remove("hidden");
  onlineJoinCode.value="";
  currentRoom=null;
  onlineLobbyState.textContent="";
  refreshProfiles();
}
function openOnline(){
  refreshProfiles();
  mainMenu.classList.add("hidden");
  onlineScreen.classList.remove("hidden");
  window.scrollTo?.(0,0);
}
async function closeOnline(){
  if(currentRoomCode) await leaveRoom({showHome:false});
  onlineScreen.classList.add("hidden");
  mainMenu.classList.remove("hidden");
  window.scrollTo?.(0,0);
}

function roomRef(code=currentRoomCode){return ref(db,`rooms/${code}`);}
function metaRef(code=currentRoomCode){return ref(db,`rooms/${code}/meta`);}
function playerRef(code=currentRoomCode,userUid=uid){return ref(db,`rooms/${code}/players/${userUid}`);}
function matchRef(code=currentRoomCode){return ref(db,`rooms/${code}/match`);}
function stateRef(code=currentRoomCode){return ref(db,`rooms/${code}/match/state`);}
function actionRef(code=currentRoomCode){return ref(db,`rooms/${code}/match/action`);}
function visualRef(code=currentRoomCode){return ref(db,`rooms/${code}/match/visual`);}
function ackRef(code=currentRoomCode,userUid=uid){return ref(db,`rooms/${code}/match/acks/${userUid}`);}

function detachLobbyListener(){if(roomUnsubscribe){roomUnsubscribe();roomUnsubscribe=null;}}
function detachMatchListeners(){
  [metaUnsubscribe,stateUnsubscribe,playersUnsubscribe,actionUnsubscribe,visualUnsubscribe,ackUnsubscribe].forEach(unsub=>{try{unsub?.();}catch(_){}});
  metaUnsubscribe=stateUnsubscribe=playersUnsubscribe=actionUnsubscribe=visualUnsubscribe=ackUnsubscribe=null;
}

async function prepareDisconnect(code,isHost){
  if(disconnectOp){try{await disconnectOp.cancel();}catch(_){} disconnectOp=null;}
  disconnectOp=onDisconnect(isHost?roomRef(code):playerRef(code));
  // V27.4: Lobby/Match ist weiter hostgebunden. Host weg = Raum weg; Gast weg = Gast weg.
  await disconnectOp.remove();
}

async function enterRoom(code,isHost){
  currentRoomCode=code;
  currentIsHost=!!isHost;
  onlineHome.classList.add("hidden");
  onlineLobby.classList.remove("hidden");
  onlineRoomCode.textContent=code;
  setNotice("");
  await prepareDisconnect(code,isHost);
  detachLobbyListener();
  roomUnsubscribe=onValue(roomRef(code),snapshot=>{
    if(!snapshot.exists()){
      if(currentRoomCode===code){
        resetRoomState();
        showOnlineHome();
        setNotice("Die Lobby wurde geschlossen oder der Host hat die Verbindung verloren.","warn");
      }
      return;
    }
    currentRoom=snapshot.val();
    renderLobby();
  },err=>{
    console.error("Lobby listener",err);
    setNotice("Lobby-Synchronisierung fehlgeschlagen.","error");
  });
}

function randomOnlineAbility(){
  const rolled=Math.floor(Math.random()*25)+1;
  if(rolled!==6) return {rolledAbility:rolled,ability:rolled};
  const pool=Array.isArray(window.WDOnlineBridge?.getOnlineChoicePool?.())?window.WDOnlineBridge.getOnlineChoicePool():null;
  const choices=pool?.length?pool:[1,2,3,4,5,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25];
  return {rolledAbility:6,ability:choices[Math.floor(Math.random()*choices.length)]};
}
function buildMatch(players){
  const ordered=[...players];
  if(Math.random()<0.5) ordered.reverse();
  const matchId=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const firstPlayerUid=String(ordered[0]?.uid||"");
  return {
    id:matchId,
    roomCode:currentRoomCode,
    createdAt:Date.now(),
    rules:"classic-1v1",
    startHp:25,
    firstPlayerUid,
    currentPlayerUid:firstPlayerUid,
    turnNumber:1,
    syncSchema:5,
    state:{
      schema:5,seq:0,phase:"idle",actionId:"",actionType:"",
      currentPlayerUid:firstPlayerUid,interactionOwnerUid:firstPlayerUid,
      dice:Array.from({length:5},()=>({value:null,locked:false,selected:false})),
      players:ordered.map(p=>({uid:p.uid,onlineUid:p.uid,hp:25}))
    },
    players:ordered.map(p=>{
      const rolled=randomOnlineAbility();
      return {
        uid:p.uid,name:p.name,tagNumber:p.tagNumber,diceDesign:p.diceDesign||"classic",
        cosmeticTitle:p.cosmeticTitle||"",cosmeticFrame:p.cosmeticFrame||"",
        rolledAbility:rolled.rolledAbility,ability:rolled.ability
      };
    })
  };
}
async function startMatchIfReady(players){
  if(matchStartBusy||!currentRoomCode||!uid||currentRoom?.meta?.hostUid!==uid||currentRoom?.meta?.status!=="lobby") return;
  if(players.length!==2||!players.every(p=>p.ready===true)) return;
  matchStartBusy=true;
  onlineReadyBtn.disabled=true;
  onlineLobbyHint.textContent="⚡ Beide bereit – Match wird gestartet …";
  try{
    const candidate=buildMatch(players);
    const result=await runTransaction(roomRef(),room=>{
      if(!room||room.meta?.status!=="lobby") return;
      const livePlayers=Object.entries(room.players||{}).map(([id,p])=>({uid:id,...p}));
      if(livePlayers.length!==2||!livePlayers.every(p=>p.ready===true)) return;
      room.meta={...(room.meta||{}),status:"playing",startedAt:Date.now(),matchId:candidate.id,syncSchema:5};
      room.match=candidate;
      return room;
    },{applyLocally:false});
    if(!result.committed&&currentRoom?.meta?.status==="lobby") throw new Error("MATCH_START_ABORTED");
  }catch(err){
    console.error("Start online match",err);
    setNotice("Matchstart fehlgeschlagen. Beide kurz Bereit zurücknehmen und erneut versuchen.","error");
    matchStartBusy=false;setBusy(false);
  }
}

function publishVisual(request){
  if(!currentRoomCode||!request?.id) return;
  const visual={id:String(request.id),type:String(request.type||""),actorUid:String(request.actorUid||""),baseSeq:Number(request.baseSeq)||0,startedAt:Date.now()};
  // Kleine Fire-and-forget-Nachricht: Gegner startet Animation sofort, während der
  // Host die echte Engine berechnet. Kein Warten auf diesen Write.
  set(visualRef(),visual).catch(err=>console.warn("Online visual",err));
}

async function publishHostState(rawState,request){
  if(!rawState||!currentRoomCode) throw new Error("EMPTY_HOST_STATE");
  const seq=++hostStateSeq;
  const state={...rawState,schema:5,seq,actionId:String(request?.id||rawState.actionId||""),actionType:String(request?.type||rawState.actionType||""),updatedAt:Date.now()};
  const nextUid=String(state.currentPlayerUid||"");
  // Nur zwei kleine Match-Pfade aktualisieren, nicht mehr den kompletten Raum.
  await update(matchRef(),{state,currentPlayerUid:nextUid,turnNumber:Number(state?.battle?.roundNumber)||1,lastStateAt:serverTimestamp()});
  localStateSeq=seq;
  // Der Host überspringt sein Firebase-Echo im Listener; einmal direkt an die
  // Bridge geben, damit Pending/Seq sauber quittiert werden – ohne Re-Render.
  if(currentIsHost) bridge?.applyState?.(state);
  return state;
}

async function rejectHostAction(request,reason){
  console.warn("Online action rejected",request?.type,reason);
  const actor=String(request?.actorUid||"");
  if(actor&&actor!==uid){
    await set(ackRef(currentRoomCode,actor),{id:String(request?.id||""),status:"error",reason:String(reason?.message||reason||"ACTION_REJECTED"),at:serverTimestamp()}).catch(()=>{});
  }else{
    bridge?.rejectAction?.(String(request?.id||""),"🌐 Aktion konnte nicht ausgeführt werden.");
  }
}

async function processHostAction(request,{fromFirebase=false}={}){
  if(!request?.id||processingActionId||!enteredMatchId||!currentIsHost) return;
  if(String(request.id)===lastProcessedActionId) return;
  const actor=String(request.actorUid||"");
  if(!actor||!currentRoom?.players?.[actor]){
    if(fromFirebase) await remove(actionRef()).catch(()=>{});
    return;
  }
  processingActionId=String(request.id);
  lastProcessedActionId=String(request.id);
  try{
    const baseSeq=Number(request.baseSeq)||0;
    if(baseSeq!==hostStateSeq) throw new Error(`STALE_STATE_${baseSeq}_${hostStateSeq}`);
    publishVisual(request);
    // hostExecuteAction startet die bestehende Engine synchron; dadurch sieht der
    // Host seinen Klick ohne Firebase-Roundtrip sofort. Promise wartet nur auf den
    // stabilen Endzustand der Animation/Timer.
    const state=await bridge?.hostExecuteAction?.(request);
    if(!state) throw new Error("HOST_STATE_EMPTY");
    await publishHostState(state,request);
  }catch(err){
    console.error("Host execute online action",err);
    await rejectHostAction(request,err);
  }finally{
    if(fromFirebase) await remove(actionRef()).catch(()=>{});
    processingActionId=null;
  }
}

function attachMatchListeners(match){
  detachMatchListeners();
  hostStateSeq=Number(match?.state?.seq)||0;
  localStateSeq=hostStateSeq;

  metaUnsubscribe=onValue(metaRef(),snap=>{
    if(!snap.exists()){
      // Match einfrieren statt auf lokalen Modus zurückzufallen. Sonst könnten nach
      // Host-Verlust plötzlich die normalen Offline-onclick-Handler weiterlaufen.
      bridge?.setConnected?.(false);
      setNotice("Online-Raum wurde geschlossen. Verlasse das Match über das Menü.","warn");
      return;
    }
    const meta=snap.val()||{};
    currentHostUid=String(meta.hostUid||currentHostUid||"");
    if(meta.status&&meta.status!=="playing") console.warn("Online room status",meta.status);
  });

  playersUnsubscribe=onValue(ref(db,`rooms/${currentRoomCode}/players`),snap=>{
    const livePlayers=snap.exists()?snap.val()||{}:{};
    if(currentRoom) currentRoom.players=livePlayers;
    if(enteredMatchId && Object.keys(livePlayers).length<2){
      bridge?.setConnected?.(false);
      setNotice("Der andere Spieler hat das Match verlassen.","warn");
    }
  });

  stateUnsubscribe=onValue(stateRef(),snap=>{
    if(!snap.exists()) return;
    const state=snap.val();
    const seq=Number(state?.seq)||0;
    if(seq<=localStateSeq) return;
    localStateSeq=seq;
    if(currentIsHost) hostStateSeq=Math.max(hostStateSeq,seq);
    bridge?.applyState?.(state);
  },err=>{console.error("Match state listener",err);bridge?.setConnected?.(false);});

  visualUnsubscribe=onValue(visualRef(),snap=>{
    if(!snap.exists()) return;
    const visual=snap.val();
    const id=String(visual?.id||"");
    const visualBase=Number(visual?.baseSeq)||0;
    if(!id||id===lastVisualId||visualBase<localStateSeq) return;
    lastVisualId=id;
    bridge?.previewAction?.(visual);
  });

  ackUnsubscribe=onValue(ackRef(),snap=>{
    if(!snap.exists()) return;
    const ack=snap.val()||{};
    if(ack.status==="error") bridge?.rejectAction?.(String(ack.id||""),"🌐 Aktion war nicht mehr gültig. Zustand wurde neu synchronisiert.");
  });

  if(currentIsHost){
    actionUnsubscribe=onValue(actionRef(),snap=>{
      if(!snap.exists()) return;
      const request=snap.val();
      if(!request?.id||String(request.id)===lastProcessedActionId) return;
      processHostAction(request,{fromFirebase:true});
    },err=>console.error("Action listener",err));
  }
}

function enterStartedMatch(room){
  const match=room?.match;
  const matchId=String(match?.id||room?.meta?.matchId||"");
  if(!match||!matchId||enteredMatchId===matchId) return;
  const profile=selectedProfile();
  localProfileId=profile?.id||null;
  currentHostUid=String(room?.meta?.hostUid||"");
  currentIsHost=currentHostUid===String(uid||"");
  const started=bridge?.startMatch?.(match,uid,localProfileId,currentIsHost);
  if(!started){setNotice("Online-Match konnte lokal nicht initialisiert werden.","error");return;}
  enteredMatchId=matchId;
  currentMatchId=matchId;
  hostStateSeq=Number(match?.state?.seq)||0;
  localStateSeq=hostStateSeq;
  matchStartBusy=false;

  // Ab Matchstart kein full-room onValue mehr: Lobby-Daten sind statisch genug.
  detachLobbyListener();
  attachMatchListeners(match);
}

function renderLobby(){
  if(!currentRoom||!uid) return;
  const players=Object.entries(currentRoom.players||{}).map(([id,p])=>({uid:id,...p})).sort((a,b)=>(a.joinedOrder||0)-(b.joinedOrder||0));
  const me=players.find(p=>p.uid===uid);
  const hostUid=currentRoom.meta?.hostUid;
  const isHost=hostUid===uid;
  const allReady=players.length===2&&players.every(p=>p.ready===true);
  currentHostUid=String(hostUid||"");
  currentIsHost=isHost;
  onlineLobbyState.textContent=`${players.length}/2 Spieler · ${isHost?"Du bist Host":"Gast"}`;
  onlinePlayerList.innerHTML=players.map(p=>{
    const host=p.uid===hostUid,mine=p.uid===uid;
    return `<div class="online-player${p.ready?" ready":""}"><div class="online-player-main"><strong>${escapeHtml(p.name)} <span>#${escapeHtml(p.tagNumber||"0000")}</span></strong><small>${host?"👑 Host":"🎮 Gast"}${mine?" · Du":""}</small></div><div class="online-ready-chip">${p.ready?"✓ Bereit":"Wartet"}</div></div>`;
  }).join("");
  onlineReadyBtn.textContent=me?.ready?"Bereit zurücknehmen":"✓ Bereit";
  onlineReadyBtn.classList.toggle("secondary",!!me?.ready);
  onlineReadyBtn.classList.toggle("good",!me?.ready);
  if(currentRoom.meta?.status==="playing"){
    onlineLobbyHint.textContent="⚔️ Match läuft …";
    enterStartedMatch(currentRoom);
    return;
  }
  onlineLobbyHint.textContent=allReady?"⚡ Beide Spieler sind bereit. Match startet automatisch …":players.length<2?"Teile den Raumcode. Die Lobby wartet auf Spieler 2.":"Sobald beide Bereit sind, werden Startfähigkeiten und Startspieler automatisch bestimmt und das Match beginnt.";
  if(allReady&&isHost) startMatchIfReady(players);
}

async function requestAction(type,payload={},baseSeq=0){
  if(!currentRoomCode||!uid||!enteredMatchId||!firebaseConnected) throw new Error("NO_ONLINE_MATCH");
  const actionType=String(type||"");
  if(!actionType) throw new Error("EMPTY_ACTION");
  const id=requestId();
  const request={id,type:actionType,payload:payload&&typeof payload==="object"?payload:{},actorUid:uid,baseSeq:Number(baseSeq)||localStateSeq,requestedAt:Date.now()};

  if(currentIsHost){
    // Fast path: kein Upload/Download vor dem eigenen Klick. Engine startet jetzt.
    processHostAction(request,{fromFirebase:false});
    return {requestId:id,fastPath:true};
  }

  // Gast schreibt nur ~200 Bytes auf einen dedizierten Action-Pfad. Kein Transaction
  // über den kompletten Match-State mehr. Fehler werden separat an die Bridge gemeldet.
  set(actionRef(),request).catch(err=>{
    console.error("Action write",err);
    bridge?.rejectAction?.(id,"🌐 Aktion konnte Firebase nicht erreichen.");
  });
  return {requestId:id,fastPath:false};
}
window.WDOnlineTransport=Object.freeze({requestAction});

async function createRoom(){
  const profile=selectedProfile();
  if(!uid||!profile||busy||!firebaseConnected) return;
  setBusy(true);setNotice("Lobby wird erstellt …");
  try{
    let code=null;
    for(let attempt=0;attempt<12&&!code;attempt++){
      const candidate=makeCode();
      const initial={
        meta:{hostUid:uid,status:"lobby",version:bridge?.getVersion?.()||"27.4.0",createdAt:Date.now(),maxPlayers:2,syncSchema:5},
        players:{[uid]:{name:profile.name,tagNumber:profile.tagNumber,diceDesign:profile.selectedDice||"classic",cosmeticTitle:profile.cosmeticTitle||"",cosmeticFrame:profile.cosmeticFrame||"",ready:false,joinedAt:Date.now(),joinedOrder:0}}
      };
      const result=await runTransaction(roomRef(candidate),current=>current===null?initial:undefined,{applyLocally:false});
      if(result.committed) code=candidate;
    }
    if(!code) throw new Error("Kein freier Raumcode gefunden");
    await enterRoom(code,true);
  }catch(err){console.error("Create room",err);setNotice("Lobby konnte nicht erstellt werden. Prüfe Internet/Firebase und versuche es erneut.","error");}
  finally{setBusy(false);}
}

async function joinRoom(){
  const profile=selectedProfile();
  const code=normalizeCode(onlineJoinCode.value);
  if(!uid||!profile||code.length!==6||busy||!firebaseConnected) return;
  setBusy(true);setNotice("Lobby wird gesucht …");
  try{
    const roomSnapshot=await get(roomRef(code));
    if(!roomSnapshot.exists()) throw new Error("ROOM_NOT_FOUND");
    const room=roomSnapshot.val();
    if(room?.meta?.status!=="lobby") throw new Error("ROOM_STARTED");
    const existingPlayers=room.players||{};
    if(!existingPlayers[uid]&&Object.keys(existingPlayers).length>=2) throw new Error("ROOM_FULL");

    const joinedOrder=existingPlayers[uid]?.joinedOrder??Object.keys(existingPlayers).length;
    const playerData={name:profile.name,tagNumber:profile.tagNumber,diceDesign:profile.selectedDice||"classic",cosmeticTitle:profile.cosmeticTitle||"",cosmeticFrame:profile.cosmeticFrame||"",ready:false,joinedAt:Date.now(),joinedOrder};
    // Nur den eigenen UID-Knoten schreiben. Das passt zu den sicheren Firebase-Rules
    // und verhindert, dass ein Gast jemals die Daten des Hosts überschreibt.
    await set(playerRef(code,uid),playerData);
    const finalSnapshot=await get(roomRef(code));
    if(!finalSnapshot.exists()){await remove(playerRef(code,uid)).catch(()=>{});throw new Error("ROOM_NOT_FOUND");}
    if(finalSnapshot.val()?.meta?.status!=="lobby"){await remove(playerRef(code,uid)).catch(()=>{});throw new Error("ROOM_STARTED");}
    await enterRoom(code,false);
  }catch(err){
    console.error("Join room",err);
    const codeText=String(err?.code||"").toLowerCase();
    const msg=err?.message==="ROOM_NOT_FOUND"?"Raumcode nicht gefunden.":err?.message==="ROOM_FULL"?"Diese Lobby ist bereits voll.":err?.message==="ROOM_STARTED"?"Diese Lobby ist nicht mehr offen.":codeText.includes("permission")?"Firebase verweigert den Schreibzugriff. Prüfe die Realtime-Database-Regeln.":"Beitreten fehlgeschlagen. Prüfe Verbindung und versuche es erneut.";
    setNotice(msg,"error");
  }finally{setBusy(false);}
}

async function toggleReady(){
  if(!currentRoomCode||!uid||busy||currentRoom?.meta?.status!=="lobby") return;
  const me=currentRoom?.players?.[uid];
  if(!me) return;
  setBusy(true);
  try{await update(playerRef(),{ready:!me.ready,readyChangedAt:serverTimestamp()});}
  catch(err){console.error("Ready",err);setNotice("Bereit-Status konnte nicht gespeichert werden.","error");}
  finally{setBusy(false);}
}

function resetRoomState(){
  detachLobbyListener();detachMatchListeners();
  if(disconnectOp){disconnectOp.cancel().catch(()=>{});disconnectOp=null;}
  bridge?.stopMatch?.();
  currentRoomCode=null;currentRoom=null;currentIsHost=false;currentHostUid="";currentMatchId="";enteredMatchId=null;
  processingActionId=null;lastProcessedActionId="";lastVisualId="";hostStateSeq=0;localStateSeq=0;localProfileId=null;matchStartBusy=false;
}
async function leaveRoom({showHome=true}={}){
  if(!currentRoomCode||!uid){resetRoomState();if(showHome)showOnlineHome();return;}
  const code=currentRoomCode;
  const isHost=currentIsHost||currentHostUid===uid;
  try{
    if(disconnectOp){await disconnectOp.cancel().catch(()=>{});disconnectOp=null;}
    if(isHost) await remove(roomRef(code));
    else await remove(playerRef(code));
  }catch(err){console.warn("Leave room",err);}
  resetRoomState();
  if(showHome) showOnlineHome();
}

menuOnlineBtn?.addEventListener("click",openOnline);
onlineBackBtn?.addEventListener("click",closeOnline);
onlineCreateBtn?.addEventListener("click",createRoom);
onlineJoinBtn?.addEventListener("click",joinRoom);
onlineReadyBtn?.addEventListener("click",toggleReady);
onlineLeaveBtn?.addEventListener("click",()=>leaveRoom({showHome:true}));
onlineProfileSelect?.addEventListener("change",()=>setBusy(false));
onlineJoinCode?.addEventListener("input",()=>{onlineJoinCode.value=normalizeCode(onlineJoinCode.value);setBusy(false);});
onlineJoinCode?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!onlineJoinBtn.disabled)joinRoom();});
onlineCopyCodeBtn?.addEventListener("click",async()=>{
  if(!currentRoomCode)return;
  try{await navigator.clipboard.writeText(currentRoomCode);onlineCopyCodeBtn.textContent="✓ Kopiert";setTimeout(()=>onlineCopyCodeBtn.textContent="Code kopieren",1200);}
  catch(_){setNotice(`Raumcode: ${currentRoomCode}`);}
});

// Wenn man im laufenden Online-Fight über das bestehende Spielmenü quittet, wird
// der Firebase-Raum jetzt ebenfalls sauber beendet statt als Zombie-Lobby zu bleiben.
quitConfirmBtn?.addEventListener("click",()=>{
  if(enteredMatchId) leaveRoom({showHome:false}).catch(err=>console.warn("Online quit",err));
},true);

onAuthStateChanged(auth,user=>{
  if(user){uid=user.uid;authReady=true;setBusy(false);}
});

setConnection("Firebase verbindet …","pending");
setBusy(false);
signInAnonymously(auth).catch(err=>{
  console.error("Anonymous auth",err);
  authReady=false;setConnection("Firebase-Anmeldung fehlgeschlagen","offline");
  setNotice("Anonymous Authentication konnte nicht gestartet werden. Prüfe in Firebase, ob „Anonym“ aktiviert ist.","error");
  setBusy(false);
});

// .info/connected ist genauer als nur navigator.onLine: Es zeigt, ob die echte
// Realtime-Database-Verbindung steht. Im Match sperrt die Bridge Eingaben sofort,
// statt Aktionen in einem unbekannten Zustand weiterlaufen zu lassen.
connectedUnsubscribe=onValue(ref(db,".info/connected"),snap=>{
  firebaseConnected=snap.val()===true;
  if(firebaseConnected){setConnection("Firebase verbunden","online");bridge?.setConnected?.(true);}
  else{setConnection("Firebase getrennt","offline");bridge?.setConnected?.(false);}
  setBusy(false);
});

window.addEventListener("beforeunload",()=>{try{connectedUnsubscribe?.();}catch(_){}});
