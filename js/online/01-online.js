import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getDatabase, ref, get, set, update, remove, onValue,
  onDisconnect, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

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
const onlineNotice=$("onlineNotice"),onlineLobbyHint=$("onlineLobbyHint");

let uid=null;
let currentRoomCode=null;
let currentRoom=null;
let currentIsHost=false;
let roomUnsubscribe=null;
let disconnectOp=null;
let authReady=false;
let busy=false;
let matchStartBusy=false;
let enteredMatchId=null;

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
  onlineCreateBtn.disabled=busy||!authReady||!selectedProfile();
  onlineJoinBtn.disabled=busy||!authReady||!selectedProfile()||normalizeCode(onlineJoinCode.value).length!==6;
  if(currentRoomCode) onlineReadyBtn.disabled=busy;
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
  if(currentRoomCode) await leaveRoom();
  onlineScreen.classList.add("hidden");
  mainMenu.classList.remove("hidden");
  window.scrollTo?.(0,0);
}
function roomRef(code=currentRoomCode){return ref(db,`rooms/${code}`);}
function playerRef(code=currentRoomCode,userUid=uid){return ref(db,`rooms/${code}/players/${userUid}`);}

async function prepareDisconnect(code,isHost){
  if(disconnectOp){try{await disconnectOp.cancel();}catch(_){}}
  disconnectOp=onDisconnect(isHost?roomRef(code):playerRef(code));
  if(isHost) await disconnectOp.remove();
  else await disconnectOp.remove();
}

async function enterRoom(code,isHost){
  currentRoomCode=code;
  currentIsHost=!!isHost;
  onlineHome.classList.add("hidden");
  onlineLobby.classList.remove("hidden");
  onlineRoomCode.textContent=code;
  setNotice("");
  await prepareDisconnect(code,isHost);
  if(roomUnsubscribe) roomUnsubscribe();
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
    syncSchema:2,
    players:ordered.map(p=>{
      const rolled=randomOnlineAbility();
      return {
        uid:p.uid,
        name:p.name,
        tagNumber:p.tagNumber,
        diceDesign:p.diceDesign||"classic",
        cosmeticTitle:p.cosmeticTitle||"",
        cosmeticFrame:p.cosmeticFrame||"",
        rolledAbility:rolled.rolledAbility,
        ability:rolled.ability
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
      room.meta={...(room.meta||{}),status:"playing",startedAt:Date.now(),matchId:candidate.id};
      room.match=candidate;
      return room;
    },{applyLocally:false});
    if(!result.committed && currentRoom?.meta?.status==="lobby") throw new Error("MATCH_START_ABORTED");
  }catch(err){
    console.error("Start online match",err);
    setNotice("Matchstart fehlgeschlagen. Beide kurz Bereit zurücknehmen und erneut versuchen.","error");
    matchStartBusy=false;
    setBusy(false);
  }
}
function enterStartedMatch(){
  const match=currentRoom?.match;
  const matchId=String(match?.id||currentRoom?.meta?.matchId||"");
  if(!match||!matchId||enteredMatchId===matchId) return;
  const localProfile=selectedProfile();
  const started=bridge?.startMatch?.(match,uid,localProfile?.id||null);
  if(!started){
    setNotice("Online-Match konnte lokal nicht initialisiert werden.","error");
    return;
  }
  enteredMatchId=matchId;
  matchStartBusy=false;
}

function renderLobby(){
  if(!currentRoom||!uid) return;
  const players=Object.entries(currentRoom.players||{}).map(([id,p])=>({uid:id,...p})).sort((a,b)=>(a.joinedOrder||0)-(b.joinedOrder||0));
  const me=players.find(p=>p.uid===uid);
  const hostUid=currentRoom.meta?.hostUid;
  const isHost=hostUid===uid;
  const allReady=players.length===2&&players.every(p=>p.ready===true);
  onlineLobbyState.textContent=`${players.length}/2 Spieler · ${isHost?"Du bist Host":"Gast"}`;
  onlinePlayerList.innerHTML=players.map(p=>{
    const host=p.uid===hostUid;
    const mine=p.uid===uid;
    return `<div class="online-player${p.ready?" ready":""}">
      <div class="online-player-main"><strong>${escapeHtml(p.name)} <span>#${escapeHtml(p.tagNumber||"0000")}</span></strong><small>${host?"👑 Host":"🎮 Gast"}${mine?" · Du":""}</small></div>
      <div class="online-ready-chip">${p.ready?"✓ Bereit":"Wartet"}</div>
    </div>`;
  }).join("");
  onlineReadyBtn.textContent=me?.ready?"Bereit zurücknehmen":"✓ Bereit";
  onlineReadyBtn.classList.toggle("secondary",!!me?.ready);
  onlineReadyBtn.classList.toggle("good",!me?.ready);
  if(currentRoom.meta?.status==="playing"){
    onlineLobbyHint.textContent="⚔️ Match startet …";
    enterStartedMatch();
    return;
  }
  onlineLobbyHint.textContent=allReady
    ? "⚡ Beide Spieler sind bereit. Match startet automatisch …"
    : players.length<2
      ? "Teile den Raumcode. Die Lobby wartet auf Spieler 2."
      : "Sobald beide Bereit sind, werden Startfähigkeiten und Startspieler automatisch bestimmt und das Match beginnt.";
  if(allReady&&isHost) startMatchIfReady(players);
}

async function createRoom(){
  const profile=selectedProfile();
  if(!uid||!profile||busy) return;
  setBusy(true);setNotice("Lobby wird erstellt …");
  try{
    let code=null;
    for(let attempt=0;attempt<12&&!code;attempt++){
      const candidate=makeCode();
      const initial={
        meta:{hostUid:uid,status:"lobby",version:bridge?.getVersion?.()||"27.2.4",createdAt:Date.now(),maxPlayers:2},
        players:{[uid]:{name:profile.name,tagNumber:profile.tagNumber,diceDesign:profile.selectedDice||"classic",cosmeticTitle:profile.cosmeticTitle||"",cosmeticFrame:profile.cosmeticFrame||"",ready:false,joinedAt:Date.now(),joinedOrder:0}}
      };
      const result=await runTransaction(roomRef(candidate),current=>current===null?initial:undefined,{applyLocally:false});
      if(result.committed) code=candidate;
    }
    if(!code) throw new Error("Kein freier Raumcode gefunden");
    await enterRoom(code,true);
  }catch(err){
    console.error("Create room",err);
    setNotice("Lobby konnte nicht erstellt werden. Prüfe Internet/Firebase und versuche es erneut.","error");
  }finally{setBusy(false);}
}

async function joinRoom(){
  const profile=selectedProfile();
  const code=normalizeCode(onlineJoinCode.value);
  if(!uid||!profile||code.length!==6||busy) return;
  setBusy(true);setNotice("Lobby wird gesucht …");
  try{
    // Erst den echten Serverzustand laden. Eine Realtime-Database-Transaction kann
    // auf einem frischen Gastgerät zunächst mit lokalem `null` starten; wenn wir
    // dieses `null` als "Raum fehlt" behandeln, wird eine gültige Lobby abgebrochen.
    const roomSnapshot=await get(roomRef(code));
    if(!roomSnapshot.exists()) throw new Error("ROOM_NOT_FOUND");

    const room=roomSnapshot.val();
    if(room?.meta?.status!=="lobby") throw new Error("ROOM_STARTED");

    const existingPlayers=room.players||{};
    if(!existingPlayers[uid]&&Object.keys(existingPlayers).length>=2) throw new Error("ROOM_FULL");

    const playerData={
      name:profile.name,
      tagNumber:profile.tagNumber,
      diceDesign:profile.selectedDice||"classic",
      cosmeticTitle:profile.cosmeticTitle||"",
      cosmeticFrame:profile.cosmeticFrame||"",
      ready:false,
      joinedAt:Date.now()
    };

    // Nur die Spielerliste transaktional ändern. Falls die Transaction lokal mit
    // `null` beginnt, darf sie einen Kandidaten erzeugen; Firebase gleicht ihn
    // anschließend mit dem Serverzustand ab und wiederholt bei einem Konflikt.
    const playersRef=ref(db,`rooms/${code}/players`);
    const result=await runTransaction(playersRef,players=>{
      const nextPlayers=players||{};
      const ids=Object.keys(nextPlayers);
      if(!nextPlayers[uid]&&ids.length>=2) return;
      const joinedOrder=nextPlayers[uid]?.joinedOrder ?? ids.length;
      nextPlayers[uid]={...playerData,joinedOrder};
      return nextPlayers;
    },{applyLocally:false});

    if(!result.committed){
      const latest=await get(roomRef(code));
      if(!latest.exists()) throw new Error("ROOM_NOT_FOUND");
      const latestRoom=latest.val();
      if(latestRoom.meta?.status!=="lobby") throw new Error("ROOM_STARTED");
      if(!latestRoom.players?.[uid]&&Object.keys(latestRoom.players||{}).length>=2) throw new Error("ROOM_FULL");
      throw new Error("JOIN_ABORTED");
    }

    // Race-Schutz: Falls der Host die Lobby genau während des Joins beendet hat,
    // keinen verwaisten Gast-Eintrag stehen lassen.
    const finalSnapshot=await get(roomRef(code));
    if(!finalSnapshot.exists()){
      await remove(playerRef(code,uid)).catch(()=>{});
      throw new Error("ROOM_NOT_FOUND");
    }
    if(finalSnapshot.val()?.meta?.status!=="lobby"){
      await remove(playerRef(code,uid)).catch(()=>{});
      throw new Error("ROOM_STARTED");
    }

    await enterRoom(code,false);
  }catch(err){
    console.error("Join room",err);
    const codeText=String(err?.code||"").toLowerCase();
    const msg=
      err?.message==="ROOM_NOT_FOUND"?"Raumcode nicht gefunden.":
      err?.message==="ROOM_FULL"?"Diese Lobby ist bereits voll.":
      err?.message==="ROOM_STARTED"?"Diese Lobby ist nicht mehr offen.":
      codeText.includes("permission")?"Firebase verweigert den Schreibzugriff. Prüfe die Realtime-Database-Regeln.":
      "Beitreten fehlgeschlagen. Prüfe Verbindung und versuche es erneut.";
    setNotice(msg,"error");
  }finally{setBusy(false);}
}

async function toggleReady(){
  if(!currentRoomCode||!uid||busy) return;
  const me=currentRoom?.players?.[uid];
  if(!me) return;
  setBusy(true);
  try{await update(playerRef(),{ready:!me.ready,readyChangedAt:serverTimestamp()});}
  catch(err){console.error("Ready",err);setNotice("Bereit-Status konnte nicht gespeichert werden.","error");}
  finally{setBusy(false);}
}

function resetRoomState(){
  if(roomUnsubscribe){roomUnsubscribe();roomUnsubscribe=null;}
  if(disconnectOp){disconnectOp.cancel().catch(()=>{});disconnectOp=null;}
  currentRoomCode=null;currentRoom=null;currentIsHost=false;
}
async function leaveRoom(){
  if(!currentRoomCode||!uid){resetRoomState();return;}
  const code=currentRoomCode;
  const isHost=currentIsHost||currentRoom?.meta?.hostUid===uid;
  try{
    if(disconnectOp){await disconnectOp.cancel().catch(()=>{});disconnectOp=null;}
    if(isHost) await remove(roomRef(code));
    else await remove(playerRef(code));
  }catch(err){console.warn("Leave room",err);}
  resetRoomState();
  showOnlineHome();
}

menuOnlineBtn?.addEventListener("click",openOnline);
onlineBackBtn?.addEventListener("click",closeOnline);
onlineCreateBtn?.addEventListener("click",createRoom);
onlineJoinBtn?.addEventListener("click",joinRoom);
onlineReadyBtn?.addEventListener("click",toggleReady);
onlineLeaveBtn?.addEventListener("click",leaveRoom);
onlineProfileSelect?.addEventListener("change",()=>setBusy(false));
onlineJoinCode?.addEventListener("input",()=>{onlineJoinCode.value=normalizeCode(onlineJoinCode.value);setBusy(false);});
onlineJoinCode?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!onlineJoinBtn.disabled) joinRoom();});
onlineCopyCodeBtn?.addEventListener("click",async()=>{
  if(!currentRoomCode) return;
  try{await navigator.clipboard.writeText(currentRoomCode);onlineCopyCodeBtn.textContent="✓ Kopiert";setTimeout(()=>onlineCopyCodeBtn.textContent="Code kopieren",1200);}
  catch(_){setNotice(`Raumcode: ${currentRoomCode}`);}
});

window.addEventListener("online",()=>{if(authReady)setConnection("Firebase verbunden","online");});
window.addEventListener("offline",()=>setConnection("Keine Internetverbindung","offline"));

onAuthStateChanged(auth,user=>{
  if(user){
    uid=user.uid;authReady=true;setConnection("Firebase verbunden","online");setBusy(false);
  }
});

setConnection("Firebase verbindet …","pending");
setBusy(false);
signInAnonymously(auth).catch(err=>{
  console.error("Anonymous auth",err);
  authReady=false;setConnection("Firebase-Anmeldung fehlgeschlagen","offline");
  setNotice("Anonymous Authentication konnte nicht gestartet werden. Prüfe in Firebase, ob „Anonym“ aktiviert ist.","error");
  setBusy(false);
});
