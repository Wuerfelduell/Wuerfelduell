(() => {
  "use strict";
  const api=window.WDOnlineStats;
  // Keine Timer/Anmeldung beim Laden. Der spätere Spieladapter entscheidet,
  // wann er flush nach Kampfende, Wiederverbindung und Anmeldung aufruft.
  api.createSync=function({outbox,getSession,send,prune=true,onSettled=()=>{}}){
    let running=null;
    async function run(){
      if(prune)await outbox.pruneAcknowledged();
      const initial=await getSession();
      if(!initial?.uid) return {status:"signed_out",sent:0};
      const owner=initial.uid;
      let sent=0;
      for(const row of await outbox.pending(owner)){
        if((await getSession())?.uid!==owner) return {status:"account_changed",sent};
        try{
          const reply=await send(row.report,owner);
          if(reply?.event_id!==row.event_id||!["accepted","duplicate"].includes(reply?.status)){
            throw new Error("DD_STATS_ACK_MISMATCH");
          }
          await outbox.acknowledge(owner,row.event_id);sent++;
          await onSettled(owner,row.event_id);
        }catch(error){
          const code=String(error?.message||error).match(/^DD_STATS_(INVALID_REPORT|OWNER_CONFLICT|REPORT_CONFLICT)$/)?.[0];
          if(!code)return {status:"retry",sent,error};
          await outbox.reject(owner,row.event_id,code);
          await onSettled(owner,row.event_id);
        }
      }
      return {status:"complete",sent};
    }
    return Object.freeze({
      flush(){
        if(!running) running=run().finally(()=>{running=null;});
        return running;
      }
    });
  };

  // p_account_id bindet auch den RPC an das beim Einreihen gewählte Konto.
  // Ein Sessionwechsel zwischen Prüfung und HTTP-Aufruf wird serverseitig
  // abgewiesen; die Meldung bleibt für das ursprüngliche Konto erhalten.
  api.createSupabaseSender=client=>async(report,owner)=>{
    const {data,error}=await client.rpc("dd_submit_stats_report",{p_account_id:owner,p_report:report});
    if(error) throw error;
    return data;
  };
})();
