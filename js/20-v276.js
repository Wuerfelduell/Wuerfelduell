(()=>{
  const $=id=>document.getElementById(id);
  function esc(v){return String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&','<':'<','>':'>',"'":'&#39;','"':'"'}[ch]));}

  function randomPick(list,fallback){return Array.isArray(list)&&list.length?list[Math.floor(Math.random()*list.length)]:fallback;}
  window.WDV276={
    resolveProfileCosmetics(profile){
      if(!profile) return {dice:'classic',attackFx:'classic',killFx:'classic'};
      const rr=profile.cosmeticRandomizer||{};
      return {
        dice:rr.dice?randomPick(profile.unlockedDice,'classic'):(profile.selectedDice||'classic'),
        attackFx:rr.attackFx?randomPick(profile.unlockedAttackFx,'classic'):(profile.selectedAttackFx||'classic'),
        killFx:rr.killFx?randomPick(profile.unlockedKillFx,'classic'):(profile.selectedKillFx||'classic')
      };
    }
  };

  let cosmeticProfileId="";

  function cosmeticOverlay(){
    let overlay=$("cosmeticMenu");
    if(overlay) return overlay;
    overlay=document.createElement("div");
    overlay.id="cosmeticMenu";
    overlay.className="utility-overlay hidden";
    overlay.innerHTML=`<div class="utility-panel cosmetic-menu-panel">
      <div class="utility-kicker">Profil</div>
      <div class="utility-title" id="cosmeticMenuTitle">Kosmetik</div>
      <div id="cosmeticMenuBody" class="cosmetic-menu-body"></div>
      <div class="utility-actions"><button type="button" id="cosmeticMenuClose" class="secondary">Schließen</button></div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click",event=>{if(event.target===overlay) closeCosmeticMenu();});
    overlay.querySelector("#cosmeticMenuClose").addEventListener("click",closeCosmeticMenu);
    return overlay;
  }

  function closeCosmeticMenu(){
    cosmeticOverlay().classList.add("hidden");
    cosmeticProfileId="";
  }

  function bindCosmeticControls(root, profileId){
    root.querySelectorAll("[data-random]").forEach(el=>el.addEventListener("change",()=>{
      const q=getProfile(profileId); if(!q) return;
      q.cosmeticRandomizer=q.cosmeticRandomizer||{};
      q.cosmeticRandomizer[el.dataset.random]=!!el.checked;
      saveGameData();
    }));
    root.querySelectorAll("[data-showcase]").forEach(el=>el.addEventListener("change",()=>{
      const q=getProfile(profileId); if(!q) return;
      let arr=Array.isArray(q.achievementShowcase)?[...q.achievementShowcase]:[];
      const id=el.dataset.showcase;
      if(el.checked&&!arr.includes(id)){
        if(arr.length>=3){el.checked=false;return;}
        arr.push(id);
      }else if(!el.checked) arr=arr.filter(x=>x!==id);
      q.achievementShowcase=arr.slice(0,3);
      saveGameData();
    }));
  }

  function cosmeticMenuHtml(p){
    const ownedAch=Object.keys(p.achievements||{});
    const showcase=new Set((p.achievementShowcase||[]).slice(0,3));
    const chips=ownedAch.length
      ? ownedAch.map(id=>`<label class="v276-showcase-chip"><input type="checkbox" data-showcase="${esc(id)}" ${showcase.has(id)?"checked":""}><span>${esc(ACHIEVEMENTS[id]?.name||id)}</span></label>`).join("")
      : `<div class="cosmetic-menu-empty">Noch keine Achievements freigeschaltet.</div>`;
    return `<div class="cosmetic-menu-block">
        <div class="unlock-strip-title">Zufällige Kosmetik</div>
        <div class="v276-toggle-row">
          <label class="v276-showcase-chip"><input type="checkbox" data-random="dice" ${p.cosmeticRandomizer?.dice?"checked":""}><span>Würfel</span></label>
          <label class="v276-showcase-chip"><input type="checkbox" data-random="attackFx" ${p.cosmeticRandomizer?.attackFx?"checked":""}><span>Angriffseffekt</span></label>
        </div>
      </div>
      <div class="cosmetic-menu-block">
        <div class="unlock-strip-title">Achievement-Anzeige · max. 3</div>
        <div class="v276-showcase-list">${chips}</div>
      </div>`;
  }

  function openCosmeticMenu(profileId){
    const p=getProfile(profileId); if(!p) return;
    cosmeticProfileId=profileId;
    const overlay=cosmeticOverlay();
    overlay.querySelector("#cosmeticMenuTitle").textContent=`Kosmetik · ${p.name} #${p.tagNumber}`;
    const body=overlay.querySelector("#cosmeticMenuBody");
    body.innerHTML=cosmeticMenuHtml(p);
    bindCosmeticControls(body, profileId);
    overlay.classList.remove("hidden");
  }

  function decorateProfiles(){
    const list=$("profileList"); if(!list||typeof saveData==="undefined") return;
    list.querySelectorAll(".profile-card").forEach(card=>{
      if(card.querySelector(".v276-cosmetic-open")) return;
      card.querySelector(".v276-profile-extra")?.remove();
      const p=getProfile(card.dataset.profileId); if(!p) return;
      const button=document.createElement("button");
      button.type="button";
      button.className="secondary v276-cosmetic-open";
      button.textContent="Kosmetik";
      button.addEventListener("click",()=>openCosmeticMenu(card.dataset.profileId));
      const actions=card.querySelector(".profile-actions");
      if(actions) actions.insertAdjacentElement("afterend", button);
      else card.appendChild(button);
    });
  }

  function decorateAwards(){
    const box=$('winnerBox'),statsBox=$('roundStatsBox'); if(!box||box.classList.contains('hidden')||box.querySelector('.v276-awards')) return;
    if(typeof roundStats==='undefined'||!Array.isArray(roundStats)||typeof players==='undefined') return;
    const candidates=players.map((p,i)=>({i,p,s:roundStats[i]||{}}));
    const best=(key)=>[...candidates].sort((a,b)=>(Number(b.s[key])||0)-(Number(a.s[key])||0))[0];
    const awards=[];
    const violent=best('damage'); if((violent?.s.damage||0)>0) awards.push(['💥 Most Violent',violent.p.name,`${violent.s.damage} Schaden`]);
    const unlucky=best('ones'); if((unlucky?.s.ones||0)>0) awards.push(['😭 Unluckiest Bastard',unlucky.p.name,`${unlucky.s.ones} Einser`]);
    const sponge=best('damageTaken'); if((sponge?.s.damageTaken||0)>0) awards.push(['🧽 Damage Sponge',sponge.p.name,`${sponge.s.damageTaken} kassiert`]);
    const god=best('sixes'); if((god?.s.sixes||0)>0) awards.push(['🎲 Dice God',god.p.name,`${god.s.sixes} Sechser`]);
    if(!awards.length) return;
    const wrap=document.createElement('div');wrap.className='v276-awards';wrap.innerHTML=`<div class="round-stats-title">Match Awards</div><div class="v276-award-grid">${awards.slice(0,4).map(a=>`<div class="v276-award"><strong>${esc(a[0])}</strong><span>${esc(a[1])}</span><small>${esc(a[2])}</small></div>`).join('')}</div>`;
    statsBox?.after(wrap);
  }

  function updateHotDice(){
    const dice=$('dice'); if(!dice||typeof players==='undefined'||typeof current==='undefined') return;
    const streak=Number(players[current]?.hotDiceStreak)||0;
    dice.classList.toggle('hot-dice',streak>=3);
    dice.classList.toggle('hot-dice-strong',streak>=4);
    dice.classList.toggle('hot-dice-max',streak>=5);
    dice.dataset.hotStreak=String(streak);
  }

  const observer=new MutationObserver(()=>{decorateProfiles();decorateAwards();updateHotDice();});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  setInterval(()=>{decorateProfiles();decorateAwards();updateHotDice();},700);
  queueMicrotask(()=>{decorateProfiles();decorateAwards();updateHotDice();});
})();
