(() => {
  "use strict";
  const api=window.WDOnlineStats;
  // IndexedDB-Transaktionen serialisieren auch Schreibzugriffe anderer Tabs.
  // Einträge werden niemals bei Netzfehlern, Abmeldung oder Platzmangel gelöscht.
  api.createOutbox=async function({indexedDB=window.indexedDB,name="diceduel_online_stats_v1",maxPending=5000,now=Date.now}={}){
    if(!indexedDB) throw new Error("DD_STATS_STORAGE_UNAVAILABLE");
    const db=await new Promise((resolve,reject)=>{
      const request=indexedDB.open(name,1);
      request.onupgradeneeded=()=>{
        const store=request.result.createObjectStore("reports",{keyPath:"event_id"});
        store.createIndex("owner","owner");
        store.createIndex("status","status");
      };
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>resolve(request.result);
    });
    db.onversionchange=()=>db.close();
    function transaction(mode,run){
      return new Promise((resolve,reject)=>{
        const tx=db.transaction("reports",mode);
        let result,error;
        tx.oncomplete=()=>resolve(result);
        tx.onabort=()=>reject(error||tx.error||new Error("DD_STATS_STORAGE_FAILED"));
        tx.onerror=()=>{};
        const abort=err=>{error=err;tx.abort();};
        try{run(tx.objectStore("reports"),value=>{result=value;},abort);}
        catch(err){abort(err);}
      });
    }
    const ownerId=owner=>{
      if(!api.isAccountId(owner)) throw new Error("DD_STATS_ACCOUNT_REQUIRED");
      return owner.toLowerCase();
    };
    return Object.freeze({
      async enqueue(owner,input){
        owner=ownerId(owner);
        const report=api.normalizeReport(input),canonical=JSON.stringify(report);
        return transaction("readwrite",(store,done,abort)=>{
          const read=store.get(report.event_id);
          read.onsuccess=()=>{
            const existing=read.result;
            if(existing){
              if(existing.owner!==owner) return abort(new Error("DD_STATS_OWNER_CONFLICT"));
              if(existing.canonical!==canonical) return abort(new Error("DD_STATS_REPORT_CONFLICT"));
              done(existing.status);return;
            }
            const count=store.index("status").count("pending");
            count.onsuccess=()=>{
              if(count.result>=maxPending) return abort(new Error("DD_STATS_OUTBOX_FULL"));
              store.add({event_id:report.event_id,owner,status:"pending",report,canonical});
              done("pending");
            };
          };
        });
      },
      async pending(owner){
        owner=ownerId(owner);
        return transaction("readonly",(store,done)=>{
          const request=store.index("owner").getAll(owner);
          request.onsuccess=()=>done(request.result.filter(row=>row.status==="pending"));
        });
      },
      async acknowledge(owner,eventId){
        owner=ownerId(owner);
        return transaction("readwrite",(store,done,abort)=>{
          const request=store.get(eventId);
          request.onsuccess=()=>{
            if(!request.result){done(false);return;}
            const row=request.result;
            if(row.owner!==owner) return abort(new Error("DD_STATS_OWNER_CONFLICT"));
            row.status="acknowledged";row.report=null;row.acknowledgedAt=now();
            store.put(row);done(true);
          };
        });
      },
      async pruneAcknowledged(beforeRemove=()=>{}){
        return transaction("readwrite",(store,done,abort)=>{
          const removed=[],cutoff=now()-7*86400000;
          const request=store.index("status").openCursor("acknowledged");
          request.onsuccess=()=>{
            const cursor=request.result;
            if(!cursor||removed.length>=500){done(removed);return;}
            const row=cursor.value;
            // Quittungen älterer Builds bekommen einmalig einen Fristbeginn.
            if(!Number.isFinite(row.acknowledgedAt)){row.acknowledgedAt=now();cursor.update(row);}
            else if(row.acknowledgedAt<cutoff){
              const receipt={owner:row.owner,event_id:row.event_id};
              try{beforeRemove(receipt);}catch(error){abort(error);return;}
              removed.push(receipt);cursor.delete();
            }
            cursor.continue();
          };
        });
      },
      async reject(owner,eventId,code){
        owner=ownerId(owner);
        return transaction("readwrite",(store,done,abort)=>{
          const request=store.get(eventId);
          request.onsuccess=()=>{
            const row=request.result;if(!row){done(false);return;}
            if(row.owner!==owner)return abort(new Error("DD_STATS_OWNER_CONFLICT"));
            if(row.status!=="pending"){done(false);return;}
            row.status="rejected";row.rejection=code;store.put(row);done(true);
          };
        });
      },
      async rejectedCount(owner){
        owner=ownerId(owner);
        return transaction("readonly",(store,done)=>{
          const request=store.index("owner").getAll(owner);
          request.onsuccess=()=>done(request.result.filter(r=>r.status==="rejected").length);
        });
      },
      async discardRejected(owner){
        owner=ownerId(owner);
        return transaction("readwrite",(store,done)=>{
          const removed=[],request=store.index("owner").openCursor(owner);
          request.onsuccess=()=>{
            const cursor=request.result;if(!cursor){done(removed);return;}
            if(cursor.value.status==="rejected"){removed.push({owner,event_id:cursor.value.event_id});cursor.delete();}
            cursor.continue();
          };
        });
      },
      close(){db.close();}
    });
  };
})();
