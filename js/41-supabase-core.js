(() => {
  "use strict";

  const config=window.WDBackendConfig?.supabase||{};
  let clientPromise=null;

  function assertConfigured(){
    if(!config.configured) throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  async function getClient(){
    assertConfigured();
    if(!clientPromise){
      clientPromise=import(config.moduleUrl).then(module=>{
        if(typeof module.createClient!=="function") throw new Error("SUPABASE_CLIENT_LOAD_FAILED");
        return module.createClient(config.projectUrl,config.publishableKey,{
          auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
          realtime:{params:{eventsPerSecond:20}},
          global:{headers:{"x-client-info":`diceduel/${String(document.querySelector('meta[name="wd-build"]')?.content||"web")}`}}
        });
      }).catch(error=>{
        clientPromise=null;
        throw error;
      });
    }
    return clientPromise;
  }

  async function getSession(){
    const client=await getClient();
    const {data,error}=await client.auth.getSession();
    if(error) throw error;
    return data?.session||null;
  }

  async function ensureOnlineIdentity(){
    const client=await getClient();
    const existing=await getSession();
    if(existing?.user) return existing.user;
    if(config.anonymousOnlineAuth===false) throw new Error("SUPABASE_LOGIN_REQUIRED");
    const {data,error}=await client.auth.signInAnonymously({options:{data:{source:"diceduel-online"}}});
    if(error) throw error;
    if(!data?.user) throw new Error("SUPABASE_ANONYMOUS_AUTH_FAILED");
    return data.user;
  }

  window.WDSupabase=Object.freeze({
    configured:!!config.configured,
    config,
    getClient,
    getSession,
    ensureOnlineIdentity
  });
})();
