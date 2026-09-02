(() => {
  "use strict";

  const supplied=(window.DICEDUEL_BACKEND_CONFIG&&typeof window.DICEDUEL_BACKEND_CONFIG==="object")
    ? window.DICEDUEL_BACKEND_CONFIG
    : {};
  const rawSupabase=(supplied.supabase&&typeof supplied.supabase==="object")?supplied.supabase:{};
  const projectUrl=String(rawSupabase.projectUrl||"").trim().replace(/\/$/,"");
  const publishableKey=String(rawSupabase.publishableKey||"").trim();

  function jwtRole(token){
    if(!token||!token.includes(".")) return "";
    try{
      const body=token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
      const padded=body+"=".repeat((4-body.length%4)%4);
      return String(JSON.parse(atob(padded))?.role||"");
    }catch(_err){return "";}
  }

  const unsafeSecret=/service[_-]?role/i.test(publishableKey)||jwtRole(publishableKey)==="service_role";
  const configured=/^https:\/\/[a-z0-9-]+(?:\.supabase\.co|\.[a-z0-9.-]+)$/i.test(projectUrl)
    && publishableKey.length>=20
    && !unsafeSecret;
  const requestedAccount=String(supplied.accountProvider||"mock-local").toLowerCase();
  const requestedOnline=String(supplied.onlineProvider||"firebase").toLowerCase();

  const config={
    schema:1,
    accountProvider:requestedAccount==="supabase"&&configured?"supabase":"mock-local",
    onlineProvider:requestedOnline==="supabase"&&configured?"supabase":"firebase",
    supabase:Object.freeze({
      configured,
      projectUrl,
      publishableKey:unsafeSecret?"":publishableKey,
      moduleUrl:String(rawSupabase.moduleUrl||"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.114.0/+esm"),
      battleActionFunction:String(rawSupabase.battleActionFunction||"battle-action"),
      anonymousOnlineAuth:rawSupabase.anonymousOnlineAuth!==false
    })
  };

  if(unsafeSecret){
    console.error("[DiceDuel] Supabase service-role keys are forbidden in the browser configuration.");
  }else if((requestedAccount==="supabase"||requestedOnline==="supabase")&&!configured){
    console.warn("[DiceDuel] Supabase was requested but no valid project URL/publishable key is configured; safe fallbacks stay active.");
  }

  window.WDBackendConfig=Object.freeze(config);
})();
