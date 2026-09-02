(() => {
  "use strict";

  const root=window.WDSupabase;
  if(window.WDBackendConfig?.accountProvider!=="supabase"||!root?.configured) return;

  const DEVICE_KEY="diceduel_device_id_v1";
  const clone=value=>JSON.parse(JSON.stringify(value));

  function deviceId(){
    try{
      let value=localStorage.getItem(DEVICE_KEY);
      if(!value){
        value=globalThis.crypto?.randomUUID?.()||`web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(DEVICE_KEY,value);
      }
      return value;
    }catch(_err){return "web-ephemeral";}
  }

  function displayName(user,fallback="Player"){
    return String(user?.user_metadata?.display_name||user?.user_metadata?.name||fallback).trim().slice(0,24)||"Player";
  }

  function sessionShape(session){
    const user=session?.user;
    if(!user) return null;
    return {uid:user.id,email:String(user.email||""),name:displayName(user)};
  }

  function mapSave(row){
    if(!row) return null;
    const clientTime=Date.parse(row.client_modified_at||"");
    const serverTime=Date.parse(row.server_updated_at||"");
    return {
      schema:2,
      save:clone(row.payload||{}),
      lastModified:Number.isFinite(clientTime)?clientTime:(Number.isFinite(serverTime)?serverTime:0),
      gameVersion:String(row.game_version||"unknown"),
      saveSchema:Number(row.save_schema)||1,
      revision:Number(row.revision)||1,
      deviceId:String(row.device_id||"")
    };
  }

  const backend={
    kind:"supabase",
    label:"SUPABASE CLOUD",
    async register({name,email,password}){
      name=String(name||"").trim().slice(0,24);
      email=String(email||"").trim().toLowerCase();
      password=String(password||"");
      if(!name) throw new Error("Enter a display name.");
      if(!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email.");
      if(password.length<8) throw new Error("Password must have at least 8 characters.");
      const client=await root.getClient();
      const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:name}}});
      if(error) throw error;
      return {
        uid:data?.user?.id||"",
        email:data?.user?.email||email,
        name,
        pendingConfirmation:!data?.session
      };
    },
    async login({email,password}){
      const client=await root.getClient();
      const {data,error}=await client.auth.signInWithPassword({
        email:String(email||"").trim().toLowerCase(),
        password:String(password||"")
      });
      if(error) throw error;
      const session=sessionShape(data?.session);
      if(!session) throw new Error("SUPABASE_SESSION_MISSING");
      return session;
    },
    async logout(){
      const client=await root.getClient();
      const {error}=await client.auth.signOut();
      if(error) throw error;
    },
    async getSession(){return sessionShape(await root.getSession());},
    onAuthStateChange(callback){
      let subscription=null;
      root.getClient().then(client=>{
        subscription=client.auth.onAuthStateChange((_event,session)=>callback?.(sessionShape(session))).data?.subscription||null;
      }).catch(error=>console.warn("Supabase auth listener",error));
      return ()=>subscription?.unsubscribe?.();
    },
    async pushSave(_uid,payload,{expectedRevision=null}={}){
      const client=await root.getClient();
      const source=payload?.save||payload||{};
      const modified=new Date(Number(payload?.lastModified)||Date.now()).toISOString();
      const {data,error}=await client.rpc("dd_put_account_save",{
        p_payload:source,
        p_game_version:String(payload?.gameVersion||source?.lastGameVersion||"unknown"),
        p_save_schema:Number(source?.schemaVersion)||1,
        p_client_modified_at:modified,
        p_device_id:deviceId(),
        p_expected_revision:expectedRevision==null?null:Number(expectedRevision)
      });
      if(error){
        if(/DD_SAVE_CONFLICT/i.test(String(error.message||""))) error.code="DD_SAVE_CONFLICT";
        throw error;
      }
      return mapSave(Array.isArray(data)?data[0]:data);
    },
    async pullSave(){
      const client=await root.getClient();
      const {data,error}=await client
        .from("dd_account_saves")
        .select("payload,game_version,save_schema,client_modified_at,server_updated_at,revision,device_id")
        .maybeSingle();
      if(error) throw error;
      return mapSave(data);
    }
  };

  window.WDSupabaseAccountBackend=Object.freeze(backend);
  window.WDCloudBackend?.set?.(backend);
})();
