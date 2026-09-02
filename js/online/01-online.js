const isSupabaseOnline=window.WDBackendConfig?.onlineProvider==="supabase";
let initializeApp,getAuth,onAuthStateChanged,signInAnonymously,getDatabase,ref,get,set,update,remove,onValue,onChildAdded,onDisconnect,runTransaction,serverTimestamp;

// Firebase wird nur noch beim ausdrücklichen Fallback geladen. Dadurch hängt der
// Supabase-Start weder funktional noch beim CDN-Laden vom alten Transport ab.
if(!isSupabaseOnline){
  const [appModule,authModule,databaseModule]=await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js")
  ]);
  ({initializeApp}=appModule);
  ({getAuth,onAuthStateChanged,signInAnonymously}=authModule);
  ({getDatabase,ref,get,set,update,remove,onValue,onChildAdded,onDisconnect,runTransaction,serverTimestamp}=databaseModule);
}

const firebaseConfig={
  apiKey:"AIzaSyDWVildqD4Hx8JpuY87blbcdJYawluDJ5Y",
  authDomain:"wuerfelduell-35558.firebaseapp.com",
  databaseURL:"https://wuerfelduell-35558-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId:"wuerfelduell-35558",
  storageBucket:"wuerfelduell-35558.firebasestorage.app",
  messagingSenderId:"204749035054",
  appId:"1:204749035054:web:1a2f95da48d98b67b671bf"
};

const app=isSupabaseOnline?null:initializeApp(firebaseConfig);
const auth=isSupabaseOnline?null:getAuth(app);
const db=isSupabaseOnline?null:getDatabase(app);
const bridge=window.WDOnlineBridge;
let supabaseBackend=window.WDSupabaseBattleBackend;
function getSupabaseBackend(){
  supabaseBackend=supabaseBackend||window.WDSupabaseBattleBackend||null;
  return supabaseBackend;
}
const $=id=>document.getElementById(id);

const mainMenu=$("mainMenu"),onlineScreen=$("onlineScreen"),menuOnlineBtn=$("menuOnlineBtn"),onlineBackBtn=$("onlineBackBtn");
const onlineStatus=$("onlineStatus"),onlineStatusDot=$("onlineStatusDot"),onlineProfileSelect=$("onlineProfileSelect"),onlineMaxPlayersSelect=$("onlineMaxPlayersSelect"),onlineModeSelect=$("onlineModeSelect");
const onlineCreateBtn=$("onlineCreateBtn"),onlineJoinCode=$("onlineJoinCode"),onlineJoinBtn=$("onlineJoinBtn");
const onlineHome=$("onlineHome"),onlineLobby=$("onlineLobby"),onlineRoomCode=$("onlineRoomCode"),onlineCopyCodeBtn=$("onlineCopyCodeBtn");
const onlineLobbyState=$("onlineLobbyState"),onlinePlayerList=$("onlinePlayerList"),onlineReadyBtn=$("onlineReadyBtn"),onlineLeaveBtn=$("onlineLeaveBtn");
const onlineNotice=$("onlineNotice"),onlineLobbyHint=$("onlineLobbyHint"),quitConfirmBtn=$("quitConfirmBtn");
const game=$("game"),winnerBox=$("winnerBox"),nextRoundPrepBtn=$("nextRoundPrepBtn"),restartBtn=$("restartBtn");
const onlineMainMenuBtn=$("onlineMainMenuBtn"),onlinePostMatchStatus=$("onlinePostMatchStatus");

let uid=null;
let currentRoomCode=null;
let currentRoomId=null;
let currentRoom=null;
let currentIsHost=false;
let currentHostUid="";
let currentMatchId="";
let authReady=false;
let transportConnected=false;
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
let postMatchUnsubscribe=null;
let connectedUnsubscribe=null;

let processingActionId=null;
let lastProcessedActionId="";
let lastVisualId="";
let hostActionQueue=[];
let hostEngineDraining=false;
let hostQueuedActionIds=new Set();
let hostProcessedActionIds=new Set();
let hostPublishChain=Promise.resolve();
let hostStateSeq=0;
let localStateSeq=0;
let localProfileId=null;
let postMatchEnded=false;
let postMatchTransitionBusy=false;
let postMatchChoices={};
let handledSupabaseEvents=new Set();
let handledSupabaseRejections=new Set();
let resumeAttempted=false;
let supabaseAuthSubscription=null;
let supabaseAuthPromise=null;

function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));}
function normalizeCode(value){return String(value||"").toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,6);}
function clampLobbySize(value){return Math.max(2,Math.min(4,Number(value)||2));}
function desiredLobbySize(){return clampLobbySize(onlineMaxPlayersSelect?.value||2);}
function desiredMode(){return String(onlineModeSelect?.value||"classic");}
function onlineModeRules(id=desiredMode()){return ({classic:{id:"classic",name:"Classic",hp:25,abilities:1},endurance50:{id:"endurance50",name:"Endurance",hp:50,abilities:2},overload75:{id:"overload75",name:"Overload",hp:75,abilities:3}})[id]||({id:"classic",name:"Classic",hp:25,abilities:1});}
function shuffledPlayers(players){
  const out=[...(players||[])];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
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
function onlineProfilePayload(profile){
  const resolved=bridge?.resolveProfileCosmetics?.(profile?.id)||{dice:profile?.selectedDice||"classic",attackFx:profile?.selectedAttackFx||"classic"};
  return {
    profileId:String(profile?.id||""),
    name:String(profile?.name||"Spieler").slice(0,24),
    tagNumber:String(profile?.tagNumber||"0000").padStart(4,"0").slice(-4),
    diceDesign:resolved.dice||profile?.selectedDice||"classic",
    attackFx:resolved.attackFx||profile?.selectedAttackFx||"classic",
    cosmeticTitle:profile?.cosmeticTitle||"",
    cosmeticFrame:profile?.cosmeticFrame||""
  };
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
  onlineCreateBtn.disabled=busy||!authReady||!transportConnected||!selectedProfile();
  if(onlineMaxPlayersSelect) onlineMaxPlayersSelect.disabled=busy;
  if(onlineModeSelect) onlineModeSelect.disabled=busy||!!currentRoomCode;
  onlineJoinBtn.disabled=busy||!authReady||!transportConnected||!selectedProfile()||normalizeCode(onlineJoinCode.value).length!==6;
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
async function resumeSupabaseSession(){
  if(!isSupabaseOnline||resumeAttempted||currentRoomCode||!getSupabaseBackend()) return;
  resumeAttempted=true;
  try{
    const active=await supabaseBackend.reconnectRoom();
    if(!active) return;
    uid=String(active.uid||uid||"");
    authReady=!!uid;
    setNotice("Laufende Supabase-Lobby wird wieder verbunden …");
    await enterRoom(String(active.code||active.snapshot?.code||""),String(active.snapshot?.meta?.hostUid||"")===uid,{roomId:active.id,snapshot:active.snapshot});
  }catch(error){
    console.warn("Supabase reconnect",error);
  }
}
async function openOnline(){
  refreshProfiles();
  mainMenu.classList.add("hidden");
  onlineScreen.classList.remove("hidden");
  window.scrollTo?.(0,0);
  if(isSupabaseOnline){
    if(!authReady) await startSupabaseAuth();
    if(authReady) await resumeSupabaseSession();
  }
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
function actionsRef(code=currentRoomCode){return ref(db,`rooms/${code}/match/actions`);}
function actionItemRef(id,code=currentRoomCode){return ref(db,`rooms/${code}/match/actions/${id}`);}
function visualRef(code=currentRoomCode){return ref(db,`rooms/${code}/match/visual`);}
function ackRef(code=currentRoomCode,userUid=uid){return ref(db,`rooms/${code}/match/acks/${userUid}`);}
function postMatchRef(code=currentRoomCode){return ref(db,`rooms/${code}/match/postMatch`);}
function postMatchChoiceRef(code=currentRoomCode,userUid=uid){return ref(db,`rooms/${code}/match/postMatch/${userUid}`);}

function detachLobbyListener(){if(roomUnsubscribe){roomUnsubscribe();roomUnsubscribe=null;}}
function detachMatchListeners(){
  [metaUnsubscribe,stateUnsubscribe,playersUnsubscribe,actionUnsubscribe,visualUnsubscribe,ackUnsubscribe,postMatchUnsubscribe].forEach(unsub=>{try{unsub?.();}catch(_){}});
  metaUnsubscribe=stateUnsubscribe=playersUnsubscribe=actionUnsubscribe=visualUnsubscribe=ackUnsubscribe=postMatchUnsubscribe=null;
}

async function prepareDisconnect(code,isHost){
  if(isSupabaseOnline) return;
  if(disconnectOp){try{await disconnectOp.cancel();}catch(_){} disconnectOp=null;}
  disconnectOp=onDisconnect(isHost?roomRef(code):playerRef(code));
  // V27.4: Lobby/Match ist weiter hostgebunden. Host weg = Raum weg; Gast weg = Gast weg.
  await disconnectOp.remove();
}

async function enterRoom(code,isHost,{roomId=null,snapshot=null}={}){
  currentRoomCode=code;
  currentRoomId=roomId||snapshot?.id||currentRoomId;
  currentIsHost=!!isHost;
  onlineHome.classList.add("hidden");
  onlineLobby.classList.remove("hidden");
  onlineRoomCode.textContent=code;
  setNotice("");
  await prepareDisconnect(code,isHost);
  detachLobbyListener();
  if(isSupabaseOnline){
    if(!getSupabaseBackend()||!currentRoomId) throw new Error("SUPABASE_BATTLE_BACKEND_MISSING");
    if(snapshot) handleSupabaseSnapshot(snapshot);
    roomUnsubscribe=await supabaseBackend.subscribeRoom(currentRoomId,handleSupabaseSnapshot,(status,error)=>{
      if(status==="SUBSCRIBED"){
        transportConnected=true;
        setConnection("Supabase Live verbunden","online");
        bridge?.setConnected?.(true);
      }else if(["CHANNEL_ERROR","TIMED_OUT","CLOSED","ERROR"].includes(String(status||""))){
        transportConnected=false;
        setConnection("Supabase Live getrennt","offline");
        bridge?.setConnected?.(false);
        if(error){
          console.error("Supabase room subscription",error);
          if(/DD_NOT_ROOM_MEMBER|DD_ROOM_NOT_FOUND/i.test(String(error?.message||""))){
            resetRoomState();
            showOnlineHome();
            setNotice("Die Lobby wurde geschlossen.","warn");
          }
        }
      }
      setBusy(false);
    });
    return;
  }
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

function handleSupabaseSnapshot(snapshot){
  if(!isSupabaseOnline) return;
  if(!snapshot){
    if(currentRoomCode){
      resetRoomState();
      showOnlineHome();
      setNotice("Die Lobby wurde geschlossen.","warn");
    }
    return;
  }
  currentRoom=snapshot;
  currentRoomId=String(snapshot.id||currentRoomId||"");
  currentRoomCode=String(snapshot.code||currentRoomCode||"");
  currentHostUid=String(snapshot.meta?.hostUid||currentHostUid||"");
  currentIsHost=currentHostUid===String(uid||"");
  if(snapshot.meta?.status==="lobby"&&enteredMatchId){
    transitionBackToLobbyView().catch(err=>console.error("Return to Supabase lobby",err));
    return;
  }
  if(snapshot.meta?.status==="playing"&&enteredMatchId){
    handleSupabaseMatchSnapshot(snapshot);
    return;
  }
  renderLobby();
}

function randomOnlineAbility(){
  const rolled=Math.floor(Math.random()*25)+1;
  if(rolled!==6) return {rolledAbility:rolled,ability:rolled};
  const pool=Array.isArray(window.WDOnlineBridge?.getOnlineChoicePool?.())?window.WDOnlineBridge.getOnlineChoicePool():null;
  const choices=pool?.length?pool:[1,2,3,4,5,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25];
  return {rolledAbility:6,ability:choices[Math.floor(Math.random()*choices.length)]};
}
function buildMatch(players){
  const ordered=shuffledPlayers(players);
  const rules=onlineModeRules(currentRoom?.meta?.modeId||desiredMode());
  const matchId=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const firstPlayerUid=String(ordered[0]?.uid||"");
  return {
    id:matchId,roomCode:currentRoomCode,createdAt:Date.now(),modeId:rules.id,modeName:rules.name,
    rules:`${rules.id}-${ordered.length}p`,startHp:rules.hp,startAbilityCount:rules.abilities,
    firstPlayerUid,currentPlayerUid:firstPlayerUid,turnNumber:1,syncSchema:7,
    state:{schema:7,seq:0,phase:"idle",actionId:"",actionType:"",currentPlayerUid:firstPlayerUid,interactionOwnerUid:firstPlayerUid,dice:Array.from({length:5},()=>({value:null,locked:false,selected:false})),players:ordered.map(p=>({uid:p.uid,onlineUid:p.uid,hp:rules.hp,maxHp:rules.hp}))},
    players:ordered.map(p=>{
      const rolls=Array.from({length:rules.abilities},()=>randomOnlineAbility());
      const unique=[];for(const r of rolls){if(!unique.some(x=>x.ability===r.ability))unique.push(r);else{let rr=randomOnlineAbility();let guard=0;while(unique.some(x=>x.ability===rr.ability)&&guard++<50)rr=randomOnlineAbility();unique.push(rr);}}
      return {uid:p.uid,name:p.name,tagNumber:p.tagNumber,diceDesign:p.diceDesign||"classic",attackFx:p.attackFx||"classic",cosmeticTitle:p.cosmeticTitle||"",cosmeticFrame:p.cosmeticFrame||"",rolledAbility:unique[0].rolledAbility,ability:unique[0].ability,abilities:unique.map(x=>x.ability),rolledAbilities:unique.map(x=>x.rolledAbility)};
    })
  };
}

async function startMatchIfReady(players){
  if(matchStartBusy||!currentRoomCode||!uid||currentRoom?.meta?.hostUid!==uid||currentRoom?.meta?.status!=="lobby") return;
  const expected=clampLobbySize(currentRoom?.meta?.maxPlayers||2);
  if(players.length!==expected||!players.every(p=>p.ready===true)) return;
  matchStartBusy=true;
  onlineReadyBtn.disabled=true;
  onlineLobbyHint.textContent=`⚡ Alle ${expected} bereit – Match wird gestartet …`;
  try{
    const candidate=buildMatch(players);
    if(isSupabaseOnline){
      await supabaseBackend.startMatch(currentRoomId,candidate);
      return;
    }
    const result=await runTransaction(roomRef(),room=>{
      if(!room||room.meta?.status!=="lobby") return;
      const livePlayers=Object.entries(room.players||{}).map(([id,p])=>({uid:id,...p}));
      const expected=clampLobbySize(room.meta?.maxPlayers||2);
      if(livePlayers.length!==expected||!livePlayers.every(p=>p.ready===true)) return;
      room.meta={...(room.meta||{}),status:"playing",startedAt:Date.now(),matchId:candidate.id,syncSchema:6};
      room.match=candidate;
      return room;
    },{applyLocally:false});
    if(!result.committed&&currentRoom?.meta?.status==="lobby") throw new Error("MATCH_START_ABORTED");
  }catch(err){
    console.error("Start online match",err);
    setNotice("Matchstart fehlgeschlagen. Alle kurz Bereit zurücknehmen und erneut versuchen.","error");
    matchStartBusy=false;setBusy(false);
  }
}

function publishVisual(request){
  if(!currentRoomCode||!request?.id) return;
  const visual={kind:"action_visual",id:String(request.id),type:String(request.type||""),actorUid:String(request.actorUid||""),baseSeq:Number(request.baseSeq)||0,startedAt:Date.now()};
  // Kleine Fire-and-forget-Nachricht: Gegner startet Animation sofort, während der
  // Host die echte Engine berechnet. Kein Warten auf diesen Write.
  if(isSupabaseOnline){
    supabaseBackend.emitEvent(currentRoomId,visual).catch(err=>console.warn("Supabase visual",err));
    return;
  }
  set(visualRef(),visual).catch(err=>console.warn("Online visual",err));
}

function stageHostState(rawState,request){
  if(!rawState||!currentRoomCode) throw new Error("EMPTY_HOST_STATE");
  // Die logische Sequenz wird SOFORT vergeben, sobald die Host-Engine stabil ist.
  // Firebase-Publishing läuft danach seriell im Hintergrund. Dadurch hängt kein
  // lokaler Folgebutton mehr an Netzwerklatenz.
  const seq=++hostStateSeq;
  const state={...rawState,schema:6,seq,actionId:String(request?.id||rawState.actionId||""),actionType:String(request?.type||rawState.actionType||""),updatedAt:Date.now()};
  const nextUid=String(state.currentPlayerUid||"");
  localStateSeq=seq;
  if(currentIsHost){
    bridge?.applyState?.(state);
    syncPostMatchState(state);
  }

  hostPublishChain=hostPublishChain.then(async()=>{
    if(!currentRoomCode||!enteredMatchId) return;
    if(isSupabaseOnline){
      await supabaseBackend.publishState(currentRoomId,{seq,state,actionId:state.actionId,actionType:state.actionType});
      return;
    }
    await update(matchRef(),{state,currentPlayerUid:nextUid,turnNumber:Number(state?.battle?.roundNumber)||1,lastStateAt:serverTimestamp()});
  }).catch(err=>{
    console.error("Host state publish",err);
    bridge?.setConnected?.(false);
    setNotice(`Match-State konnte nicht zu ${isSupabaseOnline?"Supabase":"Firebase"} gesendet werden. Match wurde eingefroren.`,"error");
  });
  return state;
}

async function rejectHostAction(request,reason,{fromSupabase=false}={}){
  console.warn("Online action rejected",request?.type,reason);
  const actor=String(request?.actorUid||"");
  if(fromSupabase){
    await supabaseBackend.resolveAction(currentRoomId,String(request?.id||""),"rejected",String(reason?.message||reason||"ACTION_REJECTED")).catch(()=>{});
    if(actor===uid) bridge?.rejectAction?.(String(request?.id||""),"🌐 Aktion konnte nicht ausgeführt werden.");
    return;
  }
  if(actor&&actor!==uid){
    await set(ackRef(currentRoomCode,actor),{id:String(request?.id||""),status:"error",reason:String(reason?.message||reason||"ACTION_REJECTED"),at:serverTimestamp()}).catch(()=>{});
  }else{
    bridge?.rejectAction?.(String(request?.id||""),"🌐 Aktion konnte nicht ausgeführt werden.");
  }
}

function enqueueHostAction(request,{fromFirebase=false,fromSupabase=false,actionKey=""}={}){
  if(!request?.id||!enteredMatchId||!currentIsHost) return false;
  const id=String(request.id);
  if(id===lastProcessedActionId||hostQueuedActionIds.has(id)||hostProcessedActionIds.has(id)) return false;
  const actor=String(request.actorUid||"");
  if(!actor||!currentRoom?.players?.[actor]){
    if(fromFirebase) remove(actionItemRef(actionKey||id)).catch(()=>{});
    if(fromSupabase) supabaseBackend.resolveAction(currentRoomId,id,"rejected","DD_UNKNOWN_ACTOR").catch(()=>{});
    return false;
  }
  hostQueuedActionIds.add(id);
  hostActionQueue.push({request,fromFirebase,fromSupabase,actionKey:String(actionKey||id)});

  // Jede Gast-Aktion besitzt ihren eigenen Firebase-Knoten. Dadurch können schnelle
  // Folgeaktionen niemals eine noch nicht gelöschte Vorgängeraktion überschreiben.
  if(fromFirebase) remove(actionItemRef(actionKey||id)).catch(err=>console.warn("Action cleanup",err));
  drainHostActionQueue();
  return true;
}

async function drainHostActionQueue(){
  if(hostEngineDraining||!currentIsHost||!enteredMatchId) return;
  hostEngineDraining=true;
  try{
    while(hostActionQueue.length&&currentIsHost&&enteredMatchId){
      const item=hostActionQueue.shift();
      const request=item.request;
      const id=String(request?.id||"");
      processingActionId=id;
      try{
        const baseSeq=Number(request.baseSeq)||0;
        // Gäste dürfen nur auf genau dem State handeln, den sie zuletzt bestätigt
        // bekommen haben. Lokale Host-Aktionen dürfen dagegen bereits auf einem neu
        // entstandenen Modal klicken, während dessen Snapshot noch zu Firebase fließt.
        if((item.fromFirebase||item.fromSupabase) && baseSeq!==hostStateSeq) throw new Error(`STALE_STATE_${baseSeq}_${hostStateSeq}`);
        publishVisual(request);
        const rawState=await bridge?.hostExecuteAction?.(request);
        if(!rawState) throw new Error("HOST_STATE_EMPTY");
        stageHostState(rawState,request);
        lastProcessedActionId=id;
      }catch(err){
        console.error("Host execute online action",err);
        await rejectHostAction(request,err,{fromSupabase:item.fromSupabase});
      }finally{
        hostProcessedActionIds.add(id);
        hostQueuedActionIds.delete(id);
        processingActionId=null;
      }
    }
  }finally{
    hostEngineDraining=false;
    if(hostActionQueue.length&&currentIsHost&&enteredMatchId) queueMicrotask(drainHostActionQueue);
  }
}

function hidePostMatchControls(){
  postMatchEnded=false;
  postMatchChoices={};
  postMatchTransitionBusy=false;
  onlinePostMatchStatus?.classList.add("hidden");
  if(onlinePostMatchStatus) onlinePostMatchStatus.textContent="";
  onlineMainMenuBtn?.classList.add("hidden");
}

function renderPostMatchControls(){
  if(!postMatchEnded) return;
  nextRoundPrepBtn.classList.remove("hidden");
  restartBtn.classList.remove("hidden");
  onlineMainMenuBtn?.classList.remove("hidden");
  nextRoundPrepBtn.textContent="🔁 Noch ein Spiel";
  restartBtn.textContent="↩ Zur Lobby";
  nextRoundPrepBtn.disabled=false;
  restartBtn.disabled=false;
  if(onlineMainMenuBtn) onlineMainMenuBtn.disabled=false;

  const mine=String(postMatchChoices?.[uid]||"");
  const ids=Object.keys(currentRoom?.players||{});
  const rematchCount=ids.filter(id=>String(postMatchChoices?.[id]||"")==="rematch").length;
  if(mine==="rematch"){
    nextRoundPrepBtn.textContent=`✓ Noch ein Spiel · ${rematchCount}/${Math.max(2,ids.length)}`;
    nextRoundPrepBtn.disabled=true;
  }
  if(onlinePostMatchStatus){
    let text="";
    if(rematchCount===ids.length&&ids.length>=2) text="Alle wollen ein Rematch – neues Match startet …";
    else if(mine==="rematch") text=`Rematch angefragt – ${rematchCount}/${Math.max(2,ids.length)} Spieler bereit.`;
    else if(rematchCount>0) text=`${rematchCount} Spieler möchten noch ein Spiel.`;
    onlinePostMatchStatus.textContent=text;
    onlinePostMatchStatus.classList.toggle("hidden",!text);
  }
}

function syncPostMatchState(state){
  const ended=!!state?.ui?.winner?.open;
  postMatchEnded=ended;
  if(!ended){hidePostMatchControls();return;}
  renderPostMatchControls();
  if(currentIsHost) evaluatePostMatchChoices().catch(err=>console.warn("Post-match evaluate",err));
}

async function transitionBackToLobbyView(){
  if(!currentRoomCode||!uid) return;
  const code=currentRoomCode;
  const isHost=currentIsHost;
  detachMatchListeners();
  bridge?.stopMatch?.();
  currentMatchId="";enteredMatchId=null;processingActionId=null;lastProcessedActionId="";lastVisualId="";
  hostStateSeq=0;localStateSeq=0;hostActionQueue=[];hostEngineDraining=false;hostQueuedActionIds.clear();hostPublishChain=Promise.resolve();
  hostProcessedActionIds.clear();
  hidePostMatchControls();
  winnerBox?.classList.add("hidden");
  game?.classList.add("hidden");
  document.body.classList.remove("playing","bot-acting","online-roll-window","online-remote-roll-preview","online-dice-snap");
  mainMenu?.classList.add("hidden");
  onlineScreen?.classList.remove("hidden");
  if(isSupabaseOnline){
    onlineHome?.classList.add("hidden");
    onlineLobby?.classList.remove("hidden");
    if(onlineRoomCode) onlineRoomCode.textContent=code;
    renderLobby();
    return;
  }
  await enterRoom(code,isHost);
}

async function resetFinishedMatchToLobby({rematch=false,force=false}={}){
  if(postMatchTransitionBusy||!currentIsHost||!currentRoomCode||!enteredMatchId) return;
  postMatchTransitionBusy=true;
  try{
    const expectedMatchId=String(enteredMatchId);
    if(isSupabaseOnline){
      await supabaseBackend.resetLobby(currentRoomId,{matchId:expectedMatchId,rematch,force});
      return;
    }
    const result=await runTransaction(roomRef(),room=>{
      if(!room||room.meta?.status!=="playing") return;
      const liveMatchId=String(room.meta?.matchId||room.match?.id||"");
      if(liveMatchId!==expectedMatchId) return;
      const ids=Object.keys(room.players||{});
      const choices=room.match?.postMatch||{};
      if(!force){
        if(rematch){
          if(ids.length<2||ids.length>4||!ids.every(id=>choices[id]==="rematch")) return;
        }else{
          if(!ids.some(id=>choices[id]==="lobby")) return;
        }
      }
      room.meta={...(room.meta||{}),status:"lobby",matchId:"",lastMatchId:expectedMatchId,lastMatchEndedAt:Date.now()};
      ids.forEach(id=>{
        room.players[id]={...(room.players[id]||{}),ready:!!rematch,readyChangedAt:Date.now()};
      });
      delete room.match;
      return room;
    },{applyLocally:false});
    if(!result.committed) postMatchTransitionBusy=false;
  }catch(err){
    postMatchTransitionBusy=false;
    console.error("Post-match lobby reset",err);
    setNotice("Matchabschluss konnte nicht synchronisiert werden.","error");
  }
}

async function evaluatePostMatchChoices(){
  if(!currentIsHost||!postMatchEnded||postMatchTransitionBusy) return;
  const values=Object.values(postMatchChoices||{}).map(String);
  if(values.includes("lobby")){await resetFinishedMatchToLobby({rematch:false});return;}
  const playerIds=Object.keys(currentRoom?.players||{});
  const playerCount=playerIds.length;
  if(playerCount>=2&&playerCount<=4&&playerIds.every(id=>String(postMatchChoices?.[id]||"")==="rematch")) await resetFinishedMatchToLobby({rematch:true});
}

async function choosePostMatch(choice){
  if(!postMatchEnded||!enteredMatchId||!currentRoomCode||!uid||postMatchTransitionBusy) return;
  if(choice!=="rematch"&&choice!=="lobby") return;
  try{
    postMatchChoices={...(postMatchChoices||{}),[uid]:choice};
    renderPostMatchControls();
    if(isSupabaseOnline){
      await supabaseBackend.setPostMatchChoice(currentRoomId,choice);
      if(currentIsHost) await evaluatePostMatchChoices();
      return;
    }
    await set(postMatchChoiceRef(),choice);
    if(currentIsHost) await evaluatePostMatchChoices();
  }catch(err){
    console.error("Post-match choice",err);
    setNotice("Auswahl nach dem Match konnte nicht synchronisiert werden.","error");
  }
}

async function exitOnlineToMainMenu(){
  if(!enteredMatchId&&!currentRoomCode) return;
  try{await leaveRoom({showHome:false});}catch(err){console.warn("Online main menu leave",err);}
  onlineScreen?.classList.add("hidden");
  if(window.WDAppNav?.openMainMenu) window.WDAppNav.openMainMenu();
  else{
    game?.classList.add("hidden");
    winnerBox?.classList.add("hidden");
    document.body.classList.remove("playing","bot-acting");
    mainMenu?.classList.remove("hidden");
  }
}

function handleSupabaseMatchSnapshot(room){
  if(!isSupabaseOnline||!enteredMatchId||!room) return;
  const match=room.match||{};
  currentRoom=room;
  currentHostUid=String(room.meta?.hostUid||currentHostUid||"");
  currentIsHost=currentHostUid===String(uid||"");

  const livePlayers=room.players&&typeof room.players==="object"?room.players:{};
  const expectedPlayers=Math.max(2,Array.isArray(match.players)?match.players.length:clampLobbySize(room.meta?.maxPlayers||2));
  if(Object.keys(livePlayers).length<expectedPlayers){
    if(postMatchEnded&&currentIsHost){
      resetFinishedMatchToLobby({rematch:false,force:true}).catch(err=>console.error("Opponent left after Supabase match",err));
    }else{
      bridge?.setConnected?.(false);
      setNotice("Ein Spieler hat das Match verlassen. Das Match wurde eingefroren.","warn");
    }
  }

  const state=match.state;
  const seq=Number(state?.seq)||0;
  if(state&&seq>localStateSeq){
    localStateSeq=seq;
    if(currentIsHost) hostStateSeq=Math.max(hostStateSeq,seq);
    bridge?.applyState?.(state);
    syncPostMatchState(state);
  }

  for(const event of Array.isArray(room.events)?room.events:[]){
    const rowId=String(event?.rowId||event?.id||"");
    if(!rowId||handledSupabaseEvents.has(rowId)) continue;
    handledSupabaseEvents.add(rowId);
    const eventBase=Number(event?.baseSeq)||0;
    if(event?.kind==="action_visual"&&eventBase>=localStateSeq){
      lastVisualId=String(event.id||lastVisualId||"");
      bridge?.previewAction?.(event);
    }
  }

  for(const action of Array.isArray(room.actions)?room.actions:[]){
    const id=String(action?.id||"");
    if(!id) continue;
    if(action.status==="rejected"&&action.actorUid===uid&&!handledSupabaseRejections.has(id)){
      handledSupabaseRejections.add(id);
      if((Number(action.baseSeq)||0)>=localStateSeq){
        bridge?.rejectAction?.(id,"🌐 Aktion war nicht mehr gültig. Zustand wurde neu synchronisiert.");
      }
    }
    if(currentIsHost&&action.status==="queued") enqueueHostAction(action,{fromSupabase:true});
  }

  postMatchChoices=room.postMatch&&typeof room.postMatch==="object"?room.postMatch:{};
  if(postMatchEnded) renderPostMatchControls();
  if(currentIsHost&&postMatchEnded) evaluatePostMatchChoices().catch(err=>console.warn("Supabase post-match choices",err));
}

function attachMatchListeners(match){
  detachMatchListeners();
  hostStateSeq=Number(match?.state?.seq)||0;
  localStateSeq=hostStateSeq;

  if(isSupabaseOnline){
    handleSupabaseMatchSnapshot(currentRoom);
    return;
  }

  metaUnsubscribe=onValue(metaRef(),snap=>{
    if(!snap.exists()){
      if(postMatchEnded){
        exitOnlineToMainMenu().catch(err=>console.warn("Post-match room closed",err));
        return;
      }
      // Match einfrieren statt auf lokalen Modus zurückzufallen. Sonst könnten nach
      // Host-Verlust plötzlich die normalen Offline-onclick-Handler weiterlaufen.
      bridge?.setConnected?.(false);
      setNotice("Online-Raum wurde geschlossen. Verlasse das Match über das Menü.","warn");
      return;
    }
    const meta=snap.val()||{};
    currentHostUid=String(meta.hostUid||currentHostUid||"");
    if(meta.status==="lobby"&&enteredMatchId){
      transitionBackToLobbyView().catch(err=>console.error("Return to lobby",err));
      return;
    }
    if(meta.status&&meta.status!=="playing") console.warn("Online room status",meta.status);
  });

  playersUnsubscribe=onValue(ref(db,`rooms/${currentRoomCode}/players`),snap=>{
    const livePlayers=snap.exists()?snap.val()||{}:{};
    if(currentRoom) currentRoom.players=livePlayers;
    const expectedPlayers=Math.max(2,Array.isArray(match?.players)?match.players.length:clampLobbySize(currentRoom?.meta?.maxPlayers||2));
    if(enteredMatchId && Object.keys(livePlayers).length<expectedPlayers){
      if(postMatchEnded&&currentIsHost){
        resetFinishedMatchToLobby({rematch:false,force:true}).catch(err=>console.error("Opponent left after match",err));
      }else{
        bridge?.setConnected?.(false);
        setNotice("Ein Spieler hat das Match verlassen. Das Match wurde eingefroren.","warn");
      }
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
    syncPostMatchState(state);
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

  postMatchUnsubscribe=onValue(postMatchRef(),snap=>{
    postMatchChoices=snap.exists()?snap.val()||{}:{};
    if(postMatchEnded) renderPostMatchControls();
    if(currentIsHost&&postMatchEnded) evaluatePostMatchChoices().catch(err=>console.warn("Post-match choices",err));
  },err=>console.warn("Post-match listener",err));

  if(currentIsHost){
    actionUnsubscribe=onChildAdded(actionsRef(),snap=>{
      if(!snap.exists()) return;
      const request=snap.val();
      if(!request?.id||String(request.id)===lastProcessedActionId) return;
      enqueueHostAction(request,{fromFirebase:true,actionKey:snap.key||request.id});
    },err=>console.error("Action listener",err));
  }
}

function enterStartedMatch(room){
  const match=room?.match;
  const matchId=String(match?.id||room?.meta?.matchId||"");
  if(!match||!matchId||enteredMatchId===matchId) return;
  const memberProfileId=String(room?.players?.[uid]?.profileId||"");
  const profiles=bridge?.getProfiles?.()||[];
  const profile=profiles.find(entry=>String(entry?.id||"")===memberProfileId)||selectedProfile();
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
  postMatchEnded=false;postMatchTransitionBusy=false;postMatchChoices={};hidePostMatchControls();
  syncPostMatchState(match?.state||{});

  // Firebase trennt ab Matchstart den großen Raum-Listener. Supabase behält einen
  // gebündelten Realtime-Snapshot für State, Actions, Events und Reconnect.
  if(!isSupabaseOnline) detachLobbyListener();
  attachMatchListeners(match);
}

function renderLobby(){
  if(!currentRoom||!uid) return;
  const players=Object.entries(currentRoom.players||{}).map(([id,p])=>({uid:id,...p})).sort((a,b)=>(a.joinedOrder||0)-(b.joinedOrder||0));
  const me=players.find(p=>p.uid===uid);
  const hostUid=currentRoom.meta?.hostUid;
  const isHost=hostUid===uid;
  const expected=clampLobbySize(currentRoom.meta?.maxPlayers||2);
  if(onlineModeSelect) onlineModeSelect.value=String(currentRoom.meta?.modeId||"classic");
  const allReady=players.length===expected&&players.every(p=>p.ready===true);
  currentHostUid=String(hostUid||"");
  currentIsHost=isHost;
  const mode=onlineModeRules(currentRoom?.meta?.modeId||"classic");
  onlineLobbyState.textContent=`${players.length}/${expected} Spieler · ${mode.name} ${mode.hp} HP · ${isHost?"Du bist Host":"Gast"}`;
  onlinePlayerList.classList.toggle("four-player",expected===4);
  onlinePlayerList.innerHTML=players.map(p=>{
    const host=p.uid===hostUid,mine=p.uid===uid;
    const fxName=bridge?.getAttackFxName?.(p.attackFx||"classic")||"Arc Shot";return `<div class="online-player${p.ready?" ready":""}"><div class="online-player-main"><strong>${escapeHtml(p.name)} <span>#${escapeHtml(p.tagNumber||"0000")}</span></strong><small>${host?"👑 Host":"🎮 Gast"}${mine?" · Du":""} · ✨ ${escapeHtml(fxName)}</small></div><div class="online-ready-chip">${p.ready?"✓ Bereit":"Wartet"}</div></div>`;
  }).join("");
  onlineReadyBtn.textContent=me?.ready?"Bereit zurücknehmen":"✓ Bereit";
  onlineReadyBtn.classList.toggle("secondary",!!me?.ready);
  onlineReadyBtn.classList.toggle("good",!me?.ready);
  if(currentRoom.meta?.status==="playing"){
    onlineLobbyHint.textContent="⚔️ Match läuft …";
    enterStartedMatch(currentRoom);
    return;
  }
  onlineLobbyHint.textContent=allReady?`⚡ Alle ${expected} Spieler sind bereit. Match startet automatisch …`:players.length<expected?`Teile den Raumcode. Es fehlen noch ${expected-players.length} Spieler.`:`Sobald alle ${expected} Spieler Bereit sind, werden Startfähigkeiten und Startspieler automatisch bestimmt und das Match beginnt.`;
  if(allReady&&isHost) startMatchIfReady(players);
}

async function requestAction(type,payload={},baseSeq=0){
  if(!currentRoomCode||!uid||!enteredMatchId||!transportConnected) throw new Error("NO_ONLINE_MATCH");
  const actionType=String(type||"");
  if(!actionType) throw new Error("EMPTY_ACTION");
  const id=requestId();
  const request={id,type:actionType,payload:payload&&typeof payload==="object"?payload:{},actorUid:uid,baseSeq:Number(baseSeq)||localStateSeq,requestedAt:Date.now()};

  if(currentIsHost){
    // Fast path: Host-Aktion geht direkt in die lokale Engine-Queue. Der nächste
    // Spezialbutton darf schon reagieren, während ältere States seriell publishen.
    if(!enqueueHostAction(request,{fromFirebase:false})) throw new Error("HOST_ACTION_QUEUE_REJECTED");
    return {requestId:id,fastPath:true};
  }

  if(isSupabaseOnline){
    await supabaseBackend.submitAction(currentRoomId,request);
    return {requestId:id,fastPath:false};
  }

  // Gast schreibt nur ~200 Bytes auf einen dedizierten Action-Pfad. Kein Transaction
  // über den kompletten Match-State mehr. Fehler werden separat an die Bridge gemeldet.
  set(actionItemRef(id),request).catch(err=>{
    console.error("Action write",err);
    bridge?.rejectAction?.(id,"🌐 Aktion konnte Firebase nicht erreichen.");
  });
  return {requestId:id,fastPath:false};
}
window.WDOnlineTransport=Object.freeze({requestAction});

async function createRoom(){
  const profile=selectedProfile();
  if(!uid||!profile||busy||!transportConnected) return;
  setBusy(true);setNotice("Lobby wird erstellt …");
  try{
    if(isSupabaseOnline){
      const created=await supabaseBackend.createRoom({
        maxPlayers:desiredLobbySize(),
        modeId:desiredMode(),
        gameVersion:bridge?.getVersion?.()||"unknown",
        profile:onlineProfilePayload(profile)
      });
      await enterRoom(String(created.code||created.snapshot?.code||""),true,{roomId:created.id,snapshot:created.snapshot});
      return;
    }
    let code=null;
    const maxPlayers=desiredLobbySize();
    for(let attempt=0;attempt<12&&!code;attempt++){
      const candidate=makeCode();
      const initial={
        meta:{hostUid:uid,status:"lobby",version:bridge?.getVersion?.()||"27.6.0",createdAt:Date.now(),maxPlayers,modeId:desiredMode(),syncSchema:7},
        players:{[uid]:{...onlineProfilePayload(profile),ready:false,joinedAt:Date.now(),joinedOrder:0}}
      };
      const result=await runTransaction(roomRef(candidate),current=>current===null?initial:undefined,{applyLocally:false});
      if(result.committed) code=candidate;
    }
    if(!code) throw new Error("Kein freier Raumcode gefunden");
    await enterRoom(code,true);
  }catch(err){console.error("Create room",err);setNotice(`Lobby konnte nicht erstellt werden. Prüfe Internet/${isSupabaseOnline?"Supabase":"Firebase"} und versuche es erneut.`,"error");}
  finally{setBusy(false);}
}

async function joinRoom(){
  const profile=selectedProfile();
  const code=normalizeCode(onlineJoinCode.value);
  if(!uid||!profile||code.length!==6||busy||!transportConnected) return;
  setBusy(true);setNotice("Lobby wird gesucht …");
  try{
    if(isSupabaseOnline){
      let joined;
      try{joined=await supabaseBackend.joinRoom(code,onlineProfilePayload(profile));}
      catch(error){
        if(!/DD_ROOM_STARTED/i.test(String(error?.message||""))) throw error;
        joined=await supabaseBackend.reconnectRoom(code);
        if(!joined) throw error;
      }
      await enterRoom(String(joined.code||code),String(joined.snapshot?.meta?.hostUid||"")===uid,{roomId:joined.id,snapshot:joined.snapshot});
      return;
    }
    const roomSnapshot=await get(roomRef(code));
    if(!roomSnapshot.exists()) throw new Error("ROOM_NOT_FOUND");
    const room=roomSnapshot.val();
    if(room?.meta?.status!=="lobby") throw new Error("ROOM_STARTED");
    const existingPlayers=room.players||{};
    const maxPlayers=clampLobbySize(room?.meta?.maxPlayers||2);
    if(!existingPlayers[uid]&&Object.keys(existingPlayers).length>=maxPlayers) throw new Error("ROOM_FULL");

    const joinedOrder=existingPlayers[uid]?.joinedOrder??Object.keys(existingPlayers).length;
    const playerData={...onlineProfilePayload(profile),ready:false,joinedAt:Date.now(),joinedOrder};
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
    const errorText=String(err?.message||"");
    const msg=/ROOM_NOT_FOUND/i.test(errorText)?"Raumcode nicht gefunden.":/ROOM_FULL/i.test(errorText)?"Diese Lobby ist bereits voll.":/ROOM_STARTED/i.test(errorText)?"Diese Lobby läuft bereits und kann nur von vorhandenen Spielern wieder verbunden werden.":codeText.includes("permission")||/permission denied/i.test(errorText)?`${isSupabaseOnline?"Supabase":"Firebase"} verweigert den Zugriff. Bitte erneut anmelden.`:"Beitreten fehlgeschlagen. Prüfe Verbindung und versuche es erneut.";
    setNotice(msg,"error");
  }finally{setBusy(false);}
}

async function toggleReady(){
  if(!currentRoomCode||!uid||busy||currentRoom?.meta?.status!=="lobby") return;
  const me=currentRoom?.players?.[uid];
  if(!me) return;
  setBusy(true);
  try{
    if(isSupabaseOnline) await supabaseBackend.setReady(currentRoomId,!me.ready);
    else await update(playerRef(),{ready:!me.ready,readyChangedAt:serverTimestamp()});
  }
  catch(err){console.error("Ready",err);setNotice("Bereit-Status konnte nicht gespeichert werden.","error");}
  finally{setBusy(false);}
}

function resetRoomState(){
  detachLobbyListener();detachMatchListeners();
  if(disconnectOp){disconnectOp.cancel().catch(()=>{});disconnectOp=null;}
  bridge?.stopMatch?.();
  currentRoomCode=null;currentRoomId=null;currentRoom=null;currentIsHost=false;currentHostUid="";currentMatchId="";enteredMatchId=null;
  processingActionId=null;lastProcessedActionId="";lastVisualId="";hostStateSeq=0;localStateSeq=0;localProfileId=null;matchStartBusy=false;
  postMatchEnded=false;postMatchTransitionBusy=false;postMatchChoices={};hidePostMatchControls();
  handledSupabaseEvents.clear();handledSupabaseRejections.clear();
  hostActionQueue=[];hostEngineDraining=false;hostQueuedActionIds.clear();hostProcessedActionIds.clear();hostPublishChain=Promise.resolve();
}
async function leaveRoom({showHome=true}={}){
  if(!currentRoomCode||!uid){resetRoomState();if(showHome)showOnlineHome();return;}
  const code=currentRoomCode;
  const isHost=currentIsHost||currentHostUid===uid;
  try{
    if(isSupabaseOnline){
      await supabaseBackend.leaveRoom(currentRoomId);
    }else{
    if(disconnectOp){await disconnectOp.cancel().catch(()=>{});disconnectOp=null;}
    if(isHost) await remove(roomRef(code));
    else await remove(playerRef(code));
    }
  }catch(err){console.warn("Leave room",err);}
  resetRoomState();
  if(showHome) showOnlineHome();
}

nextRoundPrepBtn?.addEventListener("click",event=>{
  if(!enteredMatchId||!postMatchEnded) return;
  event.preventDefault();event.stopImmediatePropagation();
  choosePostMatch("rematch");
},true);
restartBtn?.addEventListener("click",event=>{
  if(!enteredMatchId||!postMatchEnded) return;
  event.preventDefault();event.stopImmediatePropagation();
  choosePostMatch("lobby");
},true);
onlineMainMenuBtn?.addEventListener("click",event=>{
  if(!enteredMatchId||!postMatchEnded) return;
  event.preventDefault();event.stopImmediatePropagation();
  exitOnlineToMainMenu();
},true);

menuOnlineBtn?.addEventListener("click",openOnline);
onlineBackBtn?.addEventListener("click",closeOnline);
onlineCreateBtn?.addEventListener("click",createRoom);
onlineJoinBtn?.addEventListener("click",joinRoom);
onlineReadyBtn?.addEventListener("click",toggleReady);
onlineLeaveBtn?.addEventListener("click",()=>leaveRoom({showHome:true}));
onlineProfileSelect?.addEventListener("change",()=>setBusy(false));
onlineMaxPlayersSelect?.addEventListener("change",()=>setBusy(false));
onlineJoinCode?.addEventListener("input",()=>{onlineJoinCode.value=normalizeCode(onlineJoinCode.value);setBusy(false);});
onlineJoinCode?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!onlineJoinBtn.disabled)joinRoom();});
onlineCopyCodeBtn?.addEventListener("click",async()=>{
  if(!currentRoomCode)return;
  try{await navigator.clipboard.writeText(currentRoomCode);onlineCopyCodeBtn.textContent="✓ Kopiert";setTimeout(()=>onlineCopyCodeBtn.textContent="Code kopieren",1200);}
  catch(_){setNotice(`Raumcode: ${currentRoomCode}`);}
});

// Wenn man im laufenden Online-Fight über das bestehende Spielmenü quittet, wird
// der aktive Backend-Raum ebenfalls sauber verlassen.
quitConfirmBtn?.addEventListener("click",()=>{
  if(enteredMatchId) leaveRoom({showHome:false}).catch(err=>console.warn("Online quit",err));
},true);

if(!isSupabaseOnline){
  onAuthStateChanged(auth,user=>{
    if(user){uid=user.uid;authReady=true;setBusy(false);}
  });
}

function firebaseErrorDetails(err){
  const code=String(err?.code||"unknown");
  const message=String(err?.message||"Unbekannter Firebase-Fehler").replace(/\s+/g," ").trim();
  const host=String(location.hostname||"unbekannt");
  const protocol=String(location.protocol||"");
  window.__WD_FIREBASE_DIAG__={
    at:new Date().toISOString(),
    code,
    message,
    host,
    protocol,
    online:navigator.onLine,
    authDomain:firebaseConfig.authDomain,
    projectId:firebaseConfig.projectId
  };
  return {code,message,host,protocol};
}

let authAttempt=0;
async function startAnonymousAuth({retry=false}={}){
  authAttempt+=1;
  setConnection(retry?"Firebase-Anmeldung wird erneut versucht …":"Firebase verbindet …","pending");
  setBusy(false);
  try{
    await signInAnonymously(auth);
  }catch(err){
    console.error("Anonymous auth",err);
    authReady=false;
    const info=firebaseErrorDetails(err);
    setConnection(`Firebase-Fehler · ${info.code}`,"offline");
    setNotice(`Firebase Auth fehlgeschlagen · ${info.code} · ${info.message} · Host: ${info.host}`,"error");
    setBusy(false);

    // Ein einmaliger Retry fängt kurze Mobile-/Cache-/Netzwerk-Hänger ab.
    // Konfigurationsfehler werden nicht endlos wiederholt.
    const transient=new Set(["auth/network-request-failed","auth/internal-error","auth/too-many-requests"]);
    if(!retry && transient.has(info.code)){
      setTimeout(()=>startAnonymousAuth({retry:true}),1800);
    }
  }
}

async function startSupabaseAuth(){
  if(supabaseAuthPromise) return supabaseAuthPromise;
  supabaseAuthPromise=(async()=>{
    setConnection("Supabase verbindet …","pending");
    setBusy(false);
    try{
      if(!getSupabaseBackend()) throw new Error("SUPABASE_BATTLE_BACKEND_MISSING");
      const identity=await supabaseBackend.identity();
      uid=String(identity?.uid||"");
      if(!uid) throw new Error("SUPABASE_IDENTITY_MISSING");
      authReady=true;
      transportConnected=navigator.onLine!==false;
      setConnection(identity?.anonymous?"Supabase verbunden · Gastkonto":"Supabase verbunden","online");
      bridge?.setConnected?.(true);
    }catch(error){
      console.error("Supabase online auth",error);
      authReady=false;
      transportConnected=false;
      setConnection("Supabase-Verbindung fehlgeschlagen","offline");
      setNotice(`Supabase-Anmeldung fehlgeschlagen · ${String(error?.message||error||"Unbekannter Fehler")}`,"error");
    }
    setBusy(false);
  })();
  try{await supabaseAuthPromise;}finally{supabaseAuthPromise=null;}
}

async function primeSupabaseAuth(){
  try{
    const root=window.WDSupabase;
    if(!root?.configured) return;
    const session=await root.getSession();
    const user=session?.user||null;
    if(user){
      uid=String(user.id||"");
      authReady=!!uid;
      transportConnected=authReady&&navigator.onLine!==false;
      setConnection(user.is_anonymous?"Supabase verbunden · Gastkonto":"Supabase verbunden",transportConnected?"online":"offline");
    }else{
      setConnection("Supabase bereit","pending");
    }
    const client=await root.getClient();
    supabaseAuthSubscription=client.auth.onAuthStateChange((_event,nextSession)=>{
      const nextUser=nextSession?.user||null;
      const nextUid=String(nextUser?.id||"");
      if(currentRoomCode&&uid&&nextUid!==uid){
        resetRoomState();
        showOnlineHome();
        setNotice("Account gewechselt. Die vorige Online-Lobby wurde lokal getrennt.","warn");
      }
      uid=nextUid||null;
      authReady=!!nextUid;
      transportConnected=authReady&&navigator.onLine!==false;
      resumeAttempted=false;
      if(authReady) setConnection(nextUser?.is_anonymous?"Supabase verbunden · Gastkonto":"Supabase verbunden",transportConnected?"online":"offline");
      else setConnection("Supabase bereit","pending");
      bridge?.setConnected?.(transportConnected);
      setBusy(false);
    }).data?.subscription||null;
  }catch(error){
    console.warn("Supabase session probe",error);
    setConnection("Supabase bereit","pending");
  }
}

if(isSupabaseOnline){
  primeSupabaseAuth();
  window.addEventListener("online",()=>{
    transportConnected=true;
    bridge?.setConnected?.(true);
    startSupabaseAuth();
  });
  window.addEventListener("offline",()=>{
    transportConnected=false;
    setConnection("Offline","offline");
    bridge?.setConnected?.(false);
    setBusy(false);
  });
}else{
  startAnonymousAuth();

  // .info/connected ist genauer als nur navigator.onLine: Es zeigt, ob die echte
  // Realtime-Database-Verbindung steht. Im Match sperrt die Bridge Eingaben sofort,
  // statt Aktionen in einem unbekannten Zustand weiterlaufen zu lassen.
  connectedUnsubscribe=onValue(ref(db,".info/connected"),snap=>{
    transportConnected=snap.val()===true;
    if(transportConnected){setConnection("Firebase verbunden","online");bridge?.setConnected?.(true);}
    else{setConnection("Firebase getrennt","offline");bridge?.setConnected?.(false);}
    setBusy(false);
  });
}

window.addEventListener("beforeunload",()=>{
  try{connectedUnsubscribe?.();}catch(_){}
  try{supabaseAuthSubscription?.unsubscribe?.();}catch(_){}
});
