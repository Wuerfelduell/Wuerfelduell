(()=>{
  "use strict";
  const USERS_KEY="diceduel_cloud_mock_users_v1",SESSION_KEY="diceduel_cloud_mock_session_v1",CLOUD_PREFIX="diceduel_cloud_mock_save_v1_";
  const isFileBuild=()=>location.protocol==="file:";
  const el=id=>document.getElementById(id);
  const now=()=>Date.now();
  const clone=obj=>JSON.parse(JSON.stringify(obj));
  const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||"")||fallback;}catch(_){return fallback;}};
  const writeJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  async function sha256(text){
    if(!crypto?.subtle)throw new Error("Secure hashing is unavailable in this browser.");
    const bytes=new TextEncoder().encode(String(text));
    const digest=await crypto.subtle.digest("SHA-256",bytes);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  const uidFor=async email=>(await sha256(email.trim().toLowerCase())).slice(0,24);
  const mockBackend={
    kind:"mock-local",label:"LOCAL MOCK",
    async register({name,email,password}){
      name=String(name||"").trim().slice(0,24);email=String(email||"").trim().toLowerCase();password=String(password||"");
      if(!name)throw new Error("Enter a display name.");if(!/^\S+@\S+\.\S+$/.test(email))throw new Error("Enter a valid email.");if(password.length<8)throw new Error("Password must have at least 8 characters.");
      const users=readJson(USERS_KEY,{});if(users[email])throw new Error("A local test account with this email already exists.");
      const uid=await uidFor(email),passwordHash=await sha256(password);
      users[email]={uid,email,name,passwordHash,createdAt:now()};writeJson(USERS_KEY,users);writeJson(SESSION_KEY,{uid,email,name});return {uid,email,name};
    },
    async login({email,password}){
      email=String(email||"").trim().toLowerCase();const users=readJson(USERS_KEY,{}),user=users[email];if(!user)throw new Error("Local test account not found.");
      if(await sha256(String(password||""))!==user.passwordHash)throw new Error("Wrong password.");const session={uid:user.uid,email:user.email,name:user.name};writeJson(SESSION_KEY,session);return session;
    },
    async logout(){localStorage.removeItem(SESSION_KEY);},async getSession(){return readJson(SESSION_KEY,null);},
    async pushSave(uid,payload){const stored={...payload,revision:Number(payload?.revision)||1};writeJson(CLOUD_PREFIX+uid,stored);return stored;},async pullSave(uid){return readJson(CLOUD_PREFIX+uid,null);}
  };
  let backend=mockBackend,backendAuthCleanup=null;
  function localTimestamp(){return Number(saveData?.cloudMeta?.lastModified)||0;}
  function snapshot(){return {schema:2,lastModified:localTimestamp()||now(),gameVersion:String(saveData?.lastGameVersion||"unknown"),save:clone(saveData)};}
  function describe(payload){if(!payload)return"No save";const s=payload.save||payload;return `${s?.profiles?.length||0} profile(s) · ${payload.gameVersion||s?.lastGameVersion||"?"}`;}
  function formatTime(ts){if(!ts)return"Never";try{return new Date(ts).toLocaleString();}catch(_){return String(ts);}}
  function message(text,type=""){const box=el("cloudAccountMessage");if(!box)return;box.textContent=text;box.className=`cloud-account-message ${type}`.trim();box.classList.remove("hidden");}
  function clearMessage(){el("cloudAccountMessage")?.classList.add("hidden");}
  function updateBackendUi(){
    const status=el("cloudBackendStatus")?.querySelector("span");
    if(status)status.textContent=backend.kind==="supabase"?"SUPABASE · Auth + revisionsgeschützter Cloud-Save":"LOCAL MOCK · Supabase noch nicht konfiguriert";
    const register=el("cloudRegisterBtn"),login=el("cloudLoginBtn"),hint=el("cloudSyncHint");
    if(register)register.textContent=backend.kind==="supabase"?"Account erstellen":"Lokalen Test-Account erstellen";
    if(login)login.textContent=backend.kind==="supabase"?"Einloggen":"Lokaler Test-Login";
    if(hint)hint.textContent=backend.kind==="supabase"?"Cloud-Saves werden mit Revisionsprüfung gespeichert. Local Save bleibt Offline-Fallback.":"Supabase ist vorbereitet, aber ohne Projekt-URL und Publishable Key bleibt dieses lokale Test-Backend aktiv.";
  }
  async function refresh(){
    const session=await backend.getSession();el("cloudLoggedOut")?.classList.toggle("hidden",!!session);el("cloudLoggedIn")?.classList.toggle("hidden",!session);updateBackendUi();
    if(!session)return;
    el("cloudAccountIdentity").textContent=`${session.name} · ${session.email||"Online identity"}`;
    const local=snapshot(),remote=await backend.pullSave(session.uid);
    el("cloudLocalTime").textContent=formatTime(local.lastModified);el("cloudLocalMeta").textContent=describe(local);
    el("cloudRemoteTime").textContent=remote?formatTime(remote.lastModified):"No cloud save yet";el("cloudRemoteMeta").textContent=remote?`${describe(remote)} · Rev. ${remote.revision||1}`:"Upload your local save to create one.";
  }
  function noteLocalSave(data){data.cloudMeta=data.cloudMeta&&typeof data.cloudMeta==="object"?data.cloudMeta:{};data.cloudMeta.lastModified=now();data.cloudMeta.device="local";}
  async function upload(){
    clearMessage();const session=await backend.getSession();if(!session)return;const local=snapshot(),remote=await backend.pullSave(session.uid);
    if(remote&&Number(remote.lastModified)>Number(local.lastModified)&&!confirm("The cloud save is newer than your local save. Overwrite it anyway?"))return;
    try{
      const stored=await backend.pushSave(session.uid,local,{expectedRevision:remote?.revision??null});
      if(saveData?.cloudMeta&&stored?.revision)saveData.cloudMeta.cloudRevision=stored.revision;
      message("Local save securely uploaded to cloud storage.","good");await refresh();
    }catch(error){
      if(error?.code==="DD_SAVE_CONFLICT")message("Cloud save changed on another device. Refresh and compare before uploading again.","error");
      else throw error;
    }
  }
  async function download(){
    clearMessage();const session=await backend.getSession();if(!session)return;const remote=await backend.pullSave(session.uid);if(!remote?.save){message("No cloud save exists yet.","error");return;}
    const local=snapshot();if(Number(local.lastModified)>Number(remote.lastModified)&&!confirm("Your local save is newer. Replace it with the cloud save?"))return;
    try{saveData=hydrateSave(clone(remote.save));saveData.cloudMeta=saveData.cloudMeta||{};saveData.cloudMeta.lastModified=Number(remote.lastModified)||now();saveData.cloudMeta.cloudRevision=Number(remote.revision)||1;localStorage.setItem(SAVE_KEY,JSON.stringify(saveData));message("Cloud save loaded. Reloading DiceDuel…","good");setTimeout(()=>location.reload(),500);}catch(err){message(err?.message||"Cloud save could not be loaded.","error");}
  }
  function installBackend(next){
    if(!next||typeof next.login!=="function"||typeof next.pushSave!=="function")return false;
    try{backendAuthCleanup?.();}catch(_err){}
    backendAuthCleanup=null;backend=next;
    if(typeof backend.onAuthStateChange==="function")backendAuthCleanup=backend.onAuthStateChange(()=>refresh().catch(error=>message(error?.message||"Account refresh failed.","error")));
    updateBackendUi();
    refresh().catch(error=>message(error?.message||"Backend initialization failed.","error"));
    return true;
  }
  function wire(){
    const menu=el("menuAccountBtn");if(menu&&isFileBuild())menu.style.display="none";
    updateBackendUi();
    el("cloudRegisterBtn")?.addEventListener("click",async()=>{try{clearMessage();const result=await backend.register({name:el("cloudRegisterName")?.value,email:el("cloudRegisterEmail")?.value,password:el("cloudRegisterPassword")?.value});el("cloudRegisterPassword").value="";message(result?.pendingConfirmation?"Account created. Confirm the email before logging in.":backend.kind==="supabase"?"DiceDuel account created.":"Local test account created.","good");await refresh();}catch(err){message(err.message,"error");}});
    el("cloudLoginBtn")?.addEventListener("click",async()=>{try{clearMessage();await backend.login({email:el("cloudLoginEmail")?.value,password:el("cloudLoginPassword")?.value});el("cloudLoginPassword").value="";message(backend.kind==="supabase"?"Logged in to DiceDuel Cloud.":"Logged in to the local mock backend.","good");await refresh();}catch(err){message(err.message,"error");}});
    el("cloudLogoutBtn")?.addEventListener("click",async()=>{await backend.logout();message("Logged out.");await refresh();});el("cloudUploadBtn")?.addEventListener("click",()=>upload().catch(error=>message(error?.message||"Cloud upload failed.","error")));el("cloudDownloadBtn")?.addEventListener("click",()=>download().catch(error=>message(error?.message||"Cloud download failed.","error")));
  }
  function open(openFrontScreen){if(isFileBuild())return;clearMessage();refresh().catch(error=>message(error?.message||"Account refresh failed.","error"));openFrontScreen?.(el("accountScreen"));}
  window.WDCloudBackend=Object.freeze({get current(){return backend;},set:installBackend});
  window.WDCloudAccount=Object.freeze({open,noteLocalSave,refresh,get backend(){return backend;}});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wire,{once:true});else wire();
})();
