(() => {
  "use strict";
  const api=window.WDOnlineStats;
  let collector,timer=null,delay=5000;
  const tr=text=>window.t?window.t(text):text;
  function status(text,error=false){
    const el=document.getElementById("onlineStatsStatus");
    if(el){el.textContent=tr(text);el.setAttribute("role",error?"alert":"status");}
  }
  function get(){
    if(!collector)collector=api.createCollector({
      storage:localStorage,crypto:window.crypto,
      getSession:()=>window.WDSupabaseAccountBackend?.getSession?.()||Promise.resolve(null),
      openOutbox:()=>api.createOutbox(),
      send:async(report,owner)=>api.createSupabaseSender(await window.WDSupabase.getClient())(report,owner)
    });
    return collector;
  }
  function safely(fn){
    try{return fn();}
    catch(error){console.warn("Statistik-Erfassung",error);status("Statistik konnte nicht gespeichert werden. Bitte Speicherplatz prüfen und erneut versuchen.",true);return null;}
  }
  async function flush(){
    if(timer){clearTimeout(timer);timer=null;}
    if(navigator.onLine===false){status("Fähigkeitsstatistik wartet auf eine Internetverbindung.");return;}
    try{
      const result=await get().flush();
      if(result.status==="retry") throw result.error;
      delay=5000;
      if(result.status==="signed_out")status("Für globale Fähigkeitsstatistik bitte mit einem Hauptkonto anmelden.");
      else if(result.status==="account_changed")schedule();
      else status("Fähigkeitsstatistik synchronisiert. Lokale Gastprofile zählen mit.");
    }catch(error){
      console.warn("Statistik-Synchronisierung",error);
      status("Fähigkeitsstatistik wartet auf Übertragung. Erneuter Versuch folgt.",true);
      timer=setTimeout(flush,delay);delay=Math.min(delay*2,60000);
    }
  }
  function schedule(){if(!timer)timer=setTimeout(flush,0);}
  api.game=Object.freeze({
    setMainAccount(session){
      safely(()=>get().setMainAccount(session?.uid||null));
      if(session)schedule();
      else status("Für globale Fähigkeitsstatistik bitte mit einem Hauptkonto anmelden.");
    },
    begin(){
      const mode=String(gameContext?.mode||"");
      const excluded=tutorialMode||mode==="test-lab"||mode==="menu"||mode==="setup";
      if(excluded){gameContext.statsRound=null;return;}
      const online=mode.startsWith("online-");
      const modeId=campaignMode?(mode.includes("boss-rush")?(trioCampaignMode?"boss_rush_trio":"boss_rush_duo"):(trioCampaignMode?"campaign_trio":duoCampaignMode?"campaign_duo":"campaign_solo")):localModeId;
      gameContext.statsRound=safely(()=>get().begin({
        source:online?"online":"local",mode_id:modeId,game_version:GAME_VERSION,
        round_number:Math.max(1,Number(roundNumber)||1),players,
        room_id:online?gameContext.statsRoomId:null,match_id:online?gameContext.statsMatchId:null
      }));
    },
    finish(winners){
      if(tutorialMode||gameContext?.mode==="test-lab")return null;
      if(gameContext?.statsRound&&!gameContext.statsRound.report)gameContext.statsRound.round_number=Math.max(1,Number(roundNumber)||1);
      const report=safely(()=>get().finish(gameContext?.statsRound,players,winners,
        (id,index)=>Math.max(0,Math.min(2,Number(window.WDMastery?.abilityLevelForPlayer?.(id,index))||0))));
      if(report?.source==="local")schedule();
      return report;
    },
    retry(){
      // Ein synchron fehlgeschlagener Journal-Schreibvorgang kann erneut versucht werden.
      const context=gameContext?.statsRound;
      if(context?.report?.source==="local")safely(()=>get().finish(context,players,[],()=>0));
      return flush();
    },
    flush
  });
  window.addEventListener("online",schedule);
  window.addEventListener("offline",()=>{if(timer)clearTimeout(timer);timer=null;});
  document.getElementById("onlineStatsRetry")?.addEventListener("click",()=>api.game.retry());
  // Bereits angemeldete Konten werden durch Account.refresh zugeordnet.
  // Vor dessen erster erfolgreicher Antwort bleibt eine Offline-Zuordnung erhalten.
  schedule();
  if(navigator.onLine!==false)window.WDSupabaseAccountBackend?.getSession?.()
    .then(session=>api.game.setMainAccount(session)).catch(()=>{});
})();
