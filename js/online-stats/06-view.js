(() => {
  "use strict";
  const api=window.WDOnlineStats,section=document.getElementById("globalStatsSection");
  if(!section)return;
  const enabled=()=>window.WDBackendConfig?.accountProvider==="supabase";
  const el=id=>document.getElementById(id),tr=s=>window.t?window.t(s):s;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let cache=null,loading=null;
  function state(kind,text){
    section.dataset.state=kind;el("globalStatsState").textContent=tr(text);
    el("globalStatsState").setAttribute("role",kind==="error"?"alert":"status");
    el("globalStatsRefresh").textContent=tr(kind==="error"?"Wiederholen":"Aktualisieren");
  }
  function render(){
    if(!cache)return;
    const all=el("globalStatsVersions").checked,bots=el("globalStatsBots").checked;
    const source=el("globalStatsSource").value,mode=el("globalStatsMode").value;
    const balance=GAME_VERSION.split('.').slice(0,2).join('.');
    const totals=new Map();
    for(const row of cache.rows){
      if(!bots&&row.is_bot!==false)continue;
      if(!all&&row.game_version.split('.').slice(0,2).join('.')!==balance)continue;
      if(source!=="both"&&row.source!==source)continue;
      if(mode==="campaign"&&!row.mode_id.startsWith("campaign_"))continue;
      if(mode==="boss"&&!row.mode_id.startsWith("boss_rush_"))continue;
      if(mode==="duel"&&!["classic","endurance50","overload75","mayhem"].includes(row.mode_id))continue;
      const item=totals.get(row.ability_id)||{id:row.ability_id,uses:0,wins:0,levels:[{uses:0,wins:0},{uses:0,wins:0},{uses:0,wins:0}]};
      item.uses+=Number(row.uses);item.wins+=Number(row.wins);
      item.levels[row.ability_level].uses+=Number(row.uses);item.levels[row.ability_level].wins+=Number(row.wins);
      totals.set(item.id,item);
    }
    const rows=[...totals.values()].filter(r=>r.uses>0);
    const rate=r=>r.uses?r.wins/r.uses:0,sort=el("globalStatsSort").value;
    rows.sort((a,b)=>sort==="uses"?b.uses-a.uses||a.id-b.id:
      Number(a.uses<30)-Number(b.uses<30)||rate(b)-rate(a)||b.uses-a.uses||a.id-b.id);
    const percent=r=>r.uses?`${Math.round(rate(r)*1000)/10}%`:"–";
    el("globalStatsMeta").innerHTML=`<span>${escape(tr("Gemeldete Kämpfe insgesamt"))}: <strong>${cache.count}</strong></span> <span>${escape(tr("Geladen um"))}: <time>${escape(new Date(cache.at).toLocaleTimeString())}</time></span>`;
    el("globalStatsList").innerHTML=rows.length?`<div class="global-stat-grid global-stat-header"><span>${escape(tr("Fähigkeit"))}</span><span>${escape(tr("Einsätze"))}</span><span>${escape(tr("Siege"))}</span><span>${escape(tr("Winrate"))}</span></div>`+rows.map(r=>
      `<details data-ability="${r.id}"><summary class="global-stat-grid"><span class="global-stat-name" translate="no">${escape(window.t(ABILITIES[r.id]?.name||String(r.id),"en"))}</span><span>${r.uses}</span><span>${r.wins}</span><span>${percent(r)}</span>${r.uses<30?`<small class="global-stat-sample">${escape(tr("kleine Stichprobe"))}</small>`:""}</summary><div class="global-stat-levels">${r.levels.map((level,i)=>`<div class="global-stat-grid"><span>${escape(tr("Level "+i))}</span><span>${level.uses}</span><span>${level.wins}</span><span>${percent(level)}</span></div>`).join("")}</div></details>`).join(""):"";
    state(rows.length?"ready":"empty",rows.length?"":"noch keine Meldungen");
  }
  async function open(force=false){
    section.hidden=!enabled();if(section.hidden)return;
    if(navigator.onLine===false){state("offline","Offline – bitte später aktualisieren.");return;}
    if(loading)return loading;
    if(!force&&cache&&Date.now()-cache.at<600000){render();return;}
    state("loading","Fähigkeitsstatistik wird geladen.");el("globalStatsRefresh").disabled=true;
    loading=(async()=>{
      try{
        const client=await window.WDSupabase.getClient();
        const [stats,total]=await Promise.all([client.rpc("dd_global_ability_stats"),client.rpc("dd_global_stats_count")]);
        if(stats.error||total.error)throw stats.error||total.error;
        if(!Array.isArray(stats.data)||!Number.isSafeInteger(Number(total.data))||Number(total.data)<0)throw Error("Invalid aggregate");
        for(const r of stats.data){
          if(!Number.isInteger(r.ability_id)||r.ability_id<1||r.ability_id>25||![0,1,2].includes(r.ability_level)||
            typeof r.game_version!=="string"||typeof r.mode_id!=="string"||
            !Number.isSafeInteger(Number(r.uses))||!Number.isSafeInteger(Number(r.wins))||Number(r.uses)<0||Number(r.wins)<0||Number(r.wins)>Number(r.uses))throw Error("Invalid aggregate");
        }
        cache={rows:stats.data,count:Number(total.data),at:Date.now()};render();
      }catch(_){state(navigator.onLine===false?"offline":"error",navigator.onLine===false?"Offline – bitte später aktualisieren.":"Fähigkeitsstatistik konnte nicht geladen werden.");}
      finally{loading=null;el("globalStatsRefresh").disabled=false;}
    })();
    return loading;
  }
  for(const id of ["globalStatsVersions","globalStatsBots","globalStatsSource","globalStatsMode","globalStatsSort"])el(id).addEventListener("change",render);
  el("globalStatsRefresh").addEventListener("click",()=>open(true));
  section.hidden=!enabled();
  api.view=Object.freeze({open});
})();
