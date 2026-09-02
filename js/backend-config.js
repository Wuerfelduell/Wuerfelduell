/* Public browser configuration only.
   The Supabase publishable/anon key is designed for client apps and is protected
   by RLS. NEVER place a service_role key in this repository or in the browser. */
window.DICEDUEL_BACKEND_CONFIG=Object.freeze({
  accountProvider:"supabase",
  // Supabase now owns accounts, lobbies, Realtime match state and reconnects.
  // The Firebase implementation remains in the bundle as a config-only fallback.
  onlineProvider:"supabase",
  supabase:Object.freeze({
    projectUrl:"https://gwjmemntmldzkynyxnvd.supabase.co",
    publishableKey:"sb_publishable_FQ6oHTqpoDACjw3XeFAUoQ_hDB-jm-t",
    battleActionFunction:"battle-action",
    anonymousOnlineAuth:true
  })
});
