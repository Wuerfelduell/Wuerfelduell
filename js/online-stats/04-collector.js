(() => {
  "use strict";
  const api=window.WDOnlineStats;
  const MAIN="diceduel_stats_main_v1",PREFIX="diceduel_stats_pending_v1:";
  const ids=p=>[...new Set([p.ability,p.secondAbility,p.thirdAbility,p.fourthAbility].filter(id=>Number.isInteger(id)&&id>=1&&id<=25))];
  api.createCollector=function({storage,crypto,getSession,openOutbox,send}){
    let boxPromise=null,running=null;
    const box=()=>boxPromise||(boxPromise=openOutbox().catch(e=>{boxPromise=null;throw e;}));
    function entries(owner){
      const found=[];
      for(let i=0;i<storage.length;i++){
        const key=storage.key(i);
        if(key?.startsWith(PREFIX+owner+":")) found.push({key,...JSON.parse(storage.getItem(key))});
      }
      return found;
    }
    return Object.freeze({
      setMainAccount(uid){
        if(uid==null) storage.removeItem(MAIN);
        else if(api.isAccountId(uid)) storage.setItem(MAIN,uid);
        else throw Error("DD_STATS_ACCOUNT_REQUIRED");
      },
      mainAccount(){return storage.getItem(MAIN);},
      journalCount(owner){return entries(owner).length;},
      begin(input){
        if(!["local","online"].includes(input.source)) return null;
        return {...input,players:undefined,event_id:crypto.randomUUID(),
          owner:input.source==="local"?storage.getItem(MAIN):null,
          start:input.players.map(ids),report:null};
      },
      finish(context,players,winners,levelFor){
        if(!context||(context.source==="local"&&!context.owner)) return null;
        if(!context.report){
          context.report=api.normalizeReport({
            schema_version:1,event_id:context.event_id,source:context.source,
            mode_id:context.mode_id,game_version:context.game_version,
            round_number:context.round_number,room_id:context.room_id??null,match_id:context.match_id??null,
            players:players.map((p,seat)=>({
              seat,is_bot:p.botLevel!=="human",won:winners.includes(seat),
              abilities:ids(p).map(id=>({id,level:levelFor(id,seat),
                acquired:context.start?.[seat]?.includes(id)?"start":"later"}))
            }))
          });
        }
        if(context.source==="local"){
          // Synchron schreiben, bevor Ende/Navigation das Dokument verlassen.
          storage.setItem(PREFIX+context.owner+":"+context.event_id,JSON.stringify({owner:context.owner,report:context.report}));
        }
        return context.report;
      },
      flush(){
        if(running) return running;
        running=(async()=>{
          const session=await getSession();
          if(!session?.uid) return {status:"signed_out",sent:0};
          const owner=session.uid,outbox=await box();
          let enqueueError=null;
          for(const row of entries(owner)){
            try{
              const state=await outbox.enqueue(owner,row.report);
              if(state==="acknowledged") storage.removeItem(row.key);
            }catch(error){enqueueError=error;break;}
          }
          const sync=api.createSync({outbox,getSession,send:async(report,account)=>{
            const result=await send(report,account);
            if(result?.event_id===report.event_id&&["accepted","duplicate"].includes(result.status)){
              storage.removeItem(PREFIX+account+":"+report.event_id);
            }
            return result;
          }});
          const result=await sync.flush();
          if(enqueueError&&result.status==="complete")throw enqueueError;
          return result;
        })().finally(()=>{running=null;});
        return running;
      }
    });
  };
})();
