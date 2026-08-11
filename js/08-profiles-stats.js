  function renderAllAbilities(){
    const rows=[];

    for(let roll=1;roll<=25;roll++){
      if(roll===6){
        rows.push(`
          <div class="ability-list-item">
            <div class="ability-list-head"><span class="ability-list-number">6</span><span>Freie Wahl</span></div>
            <div class="ability-list-desc">Beim Fähigkeitswurf darfst du eine erlaubte Fähigkeit frei auswählen. Glück (7) kann nicht über Freie Wahl genommen werden.</div>
          </div>
        `);
        continue;
      }

      const ability=ABILITIES[roll];
      if(!ability) continue;

      rows.push(`
        <div class="ability-list-item">
          <div class="ability-list-head"><span class="ability-list-number">${roll}</span><span>${escapeHtml(ability.name)}</span></div>
          <div class="ability-list-desc">${escapeHtml(ability.desc)}</div>
        </div>
      `);
    }

    allAbilitiesList.innerHTML=rows.join("");
  }

  function shuffledCopy(arr){
    const copy=[...arr];
    for(let i=copy.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }

  function opponentMapForOrder(list){
    const map=new Map();
    if(!list?.length) return map;
    for(let i=0;i<list.length;i++){
      map.set(list[i],list[(i+1)%list.length]);
    }
    return map;
  }

  function orderHasSameDirectOpponent(oldMap,candidate){
    if(candidate.length<3) return false;
    const newMap=opponentMapForOrder(candidate);
    for(const p of candidate){
      if(oldMap.get(p)===newMap.get(p)) return true;
    }
    return false;
  }

  function randomizePlayerOrder(avoidSameOpponent=false){
    if(players.length<=1) return;

    const oldOrder=[...players];

    if(!avoidSameOpponent || players.length<3){
      // Erster Spielstart: echter Fisher-Yates-Shuffle.
      // Falls zufällig exakt dieselbe Reihenfolge entsteht, einmal neu versuchen.
      let candidate=shuffledCopy(oldOrder);
      if(players.length>2 && candidate.every((p,i)=>p===oldOrder[i])){
        candidate=shuffledCopy(oldOrder);
      }
      players=candidate;
      return;
    }

    const oldMap=opponentMapForOrder(oldOrder);

    // Erst viele echte Zufalls-Shuffles probieren.
    for(let attempt=0;attempt<150;attempt++){
      const candidate=shuffledCopy(oldOrder);
      if(!orderHasSameDirectOpponent(oldMap,candidate)){
        players=candidate;
        return;
      }
    }

    // Garantierter Fallback für 3+ Spieler:
    // Kreisrichtung umdrehen. Dadurch hat jeder einen anderen Nachfolger.
    let candidate=[...oldOrder].reverse();

    // Zufällige Rotation ändert die Gegner nicht, aber die sichtbare Reihenfolge.
    const offset=Math.floor(Math.random()*candidate.length);
    candidate=candidate.slice(offset).concat(candidate.slice(0,offset));
    players=candidate;
  }


  function prestigeItemOwned(profile,item){
    if(!profile||!item) return false;
    if(item.type==="dice") return profile.unlockedDice.includes(item.value);
    return profile.prestigeCosmetics?.owned?.includes(item.id);
  }
  function prestigeItemEquipped(profile,item){
    if(!profile||!item) return false;
    if(item.type==="dice") return profile.selectedDice===item.value;
    if(item.type==="title") return profile.prestigeCosmetics?.selectedTitle===item.id;
    if(item.type==="frame") return profile.prestigeCosmetics?.selectedFrame===item.id;
    return false;
  }
  function renderPrestigeShop(){
    const profiles=saveData.profiles||[],old=prestigeShopProfileSelect.value||profiles[0]?.id||"";prestigeShopProfileSelect.innerHTML="";
    if(!profiles.length){const o=document.createElement("option");o.value="";o.textContent="Kein Profil vorhanden";prestigeShopProfileSelect.appendChild(o);prestigeShopTrophies.textContent="🏆 0";prestigeEquipped.textContent="Erstelle zuerst ein Profil.";prestigeShopList.innerHTML="";return;}
    profiles.forEach(p=>{const o=document.createElement("option");o.value=p.id;o.textContent=`${p.name} #${p.tagNumber}`;prestigeShopProfileSelect.appendChild(o);});prestigeShopProfileSelect.value=getProfile(old)?old:profiles[0].id;
    const profile=getProfile(prestigeShopProfileSelect.value),trophies=Math.max(0,profile?.campaign?.trophies||0);prestigeShopTrophies.textContent=`🏆 ${trophies}`;
    const title=profileCosmeticTitle(profile)||"Kein Titel",frame=profileCosmeticFrame(profile)||"Standard",dice=DICE_DESIGNS[profile.selectedDice]?.name||"Classic";
    prestigeEquipped.innerHTML=`<strong>Aktiv:</strong> 🏷 ${escapeHtml(title)} · 🖼 ${escapeHtml(frame)} · 🎲 ${escapeHtml(dice)}<div class="prestige-reset-row"><button type="button" class="secondary" data-reset-cosmetic="title">Titel entfernen</button><button type="button" class="secondary" data-reset-cosmetic="frame">Rahmen entfernen</button></div>`;
    prestigeShopList.innerHTML=PRESTIGE_SHOP_ITEMS.map(item=>{const owned=prestigeItemOwned(profile,item),equipped=prestigeItemEquipped(profile,item),afford=trophies>=item.cost;const typeName=item.type==="dice"?"Würfel":item.type==="frame"?"Rahmen":"Titel";const button=equipped?`<button disabled>✓ Aktiv</button>`:owned?`<button class="good" data-shop-equip="${item.id}">Ausrüsten</button>`:`<button class="gold" data-shop-buy="${item.id}" ${afford?"":"disabled"}>🏆 ${item.cost} · Kaufen</button>`;return `<div class="prestige-item${owned?" owned":""}${item.cost>=25?" expensive":""}"><div class="prestige-item-kicker">${typeName} · 🏆 ${item.cost}</div><div class="prestige-item-name">${escapeHtml(item.name)}</div><div class="prestige-item-desc">${escapeHtml(item.desc)}</div>${button}</div>`;}).join("");
    prestigeShopList.querySelectorAll("[data-shop-buy]").forEach(btn=>btn.onclick=()=>{const item=PRESTIGE_SHOP_ITEMS.find(x=>x.id===btn.dataset.shopBuy),p=getProfile(prestigeShopProfileSelect.value);if(!p||!item||prestigeItemOwned(p,item)||(p.campaign.trophies||0)<item.cost)return;p.campaign.trophies-=item.cost;if(!p.prestigeCosmetics)p.prestigeCosmetics={owned:[],selectedTitle:null,selectedFrame:null};if(!p.prestigeCosmetics.owned.includes(item.id))p.prestigeCosmetics.owned.push(item.id);if(item.type==="dice"&&!p.unlockedDice.includes(item.value))p.unlockedDice.push(item.value);saveGameData();renderPrestigeShop();renderProfiles();});
    prestigeShopList.querySelectorAll("[data-shop-equip]").forEach(btn=>btn.onclick=()=>{const item=PRESTIGE_SHOP_ITEMS.find(x=>x.id===btn.dataset.shopEquip),p=getProfile(prestigeShopProfileSelect.value);if(!p||!item||!prestigeItemOwned(p,item))return;if(item.type==="dice")p.selectedDice=item.value;if(item.type==="title")p.prestigeCosmetics.selectedTitle=item.id;if(item.type==="frame")p.prestigeCosmetics.selectedFrame=item.id;saveGameData();renderPrestigeShop();renderProfiles();});
    prestigeEquipped.querySelectorAll("[data-reset-cosmetic]").forEach(btn=>btn.onclick=()=>{const p=getProfile(prestigeShopProfileSelect.value);if(!p)return;if(btn.dataset.resetCosmetic==="title")p.prestigeCosmetics.selectedTitle=null;else p.prestigeCosmetics.selectedFrame=null;saveGameData();renderPrestigeShop();renderProfiles();});
  }

  function renderProfiles(){
    if(!saveData.profiles.length){
      profileList.innerHTML=`<div class="profile-empty">Noch kein Profil. Erstelle dein erstes Profil – Classic ist sofort freigeschaltet.</div>`;
      return;
    }

    profileList.innerHTML=saveData.profiles.map(p=>{
      const unlocked=Object.entries(DICE_DESIGNS).map(([key,d])=>{const unlockedNow=p.unlockedDice.includes(key);const shopItem=PRESTIGE_SHOP_ITEMS.find(x=>x.type==="dice"&&x.value===key);const req=DICE_UNLOCK_ACHIEVEMENT[key]?ACHIEVEMENTS[DICE_UNLOCK_ACHIEVEMENT[key]]?.name:(shopItem?`Trophy Shop · ${shopItem.cost} 🏆`:"");return `<span class="unlock-chip${unlockedNow?"":" locked"}">${unlockedNow?"✓":"🔒"} ${escapeHtml(d.name)}${!unlockedNow&&req?` · ${escapeHtml(req)}`:""}</span>`;}).join("");
      const diceOptions=p.unlockedDice.filter(k=>DICE_DESIGNS[k]).map(k=>`<option value="${k}"${p.selectedDice===k?" selected":""}>🎲 ${escapeHtml(DICE_DESIGNS[k].name)}</option>`).join("");
      const winrate=p.stats.rounds?Math.round((p.stats.wins/p.stats.rounds)*100):0;
      return `<div class="profile-card${profileCosmeticFrame(p)?` frame-${profileCosmeticFrame(p)}`:""}" data-profile-id="${escapeHtml(p.id)}">
        <div class="profile-card-top"><div class="profile-identity"><div class="profile-name-line">${escapeHtml(p.name)} <span class="battle-tag">#${escapeHtml(p.tagNumber)}</span></div>${profileCosmeticTitle(p)?`<div class="profile-title-badge">${escapeHtml(profileCosmeticTitle(p))}</div>`:""}<div class="profile-mini">${p.stats.rounds} Runden · ${p.stats.wins} Siege · ${winrate}% Winrate · ${Object.keys(p.achievements).length} Achievements · 🏆 ${p.campaign?.trophies||0}</div></div></div>
        <div class="profile-actions"><div><label>Name</label><input class="profile-name-edit" maxlength="24" value="${escapeHtml(p.name)}"></div><div><label>Würfeldesign</label><select class="profile-dice-edit">${diceOptions}</select></div><button class="profile-delete">Löschen</button></div>
        <div class="unlock-strip">${unlocked}</div>
      </div>`;
    }).join("");

    profileList.querySelectorAll(".profile-card").forEach(card=>{
      const id=card.dataset.profileId;
      const nameInput=card.querySelector(".profile-name-edit");
      const diceSelect=card.querySelector(".profile-dice-edit");
      const del=card.querySelector(".profile-delete");

      nameInput.onchange=()=>{
        const p=getProfile(id); if(!p) return;
        const clean=nameInput.value.trim().slice(0,24);
        if(!clean){nameInput.value=p.name;return;}
        p.name=clean; saveGameData(); renderProfiles();
      };
      diceSelect.onchange=()=>{
        const p=getProfile(id); if(!p) return;
        if(p.unlockedDice.includes(diceSelect.value)){p.selectedDice=diceSelect.value;saveGameData();renderProfiles();}
      };
      del.onclick=()=>{
        const p=getProfile(id); if(!p) return;
        if(!confirm(`Profil ${profileLabel(p)} wirklich löschen? Achievements und Statistiken dieses Profils gehen verloren.`)) return;
        saveData.profiles=saveData.profiles.filter(x=>x.id!==id);saveGameData();renderProfiles();renderAchievements();renderStats();makeNameFields();
      };
    });
  }

  function renderAchievements(){
    const profiles=saveData.profiles;
    achievementList.innerHTML=Object.entries(ACHIEVEMENTS).map(([id,a])=>{
      const reward=a.rewardDice?`<span class="achievement-reward">🎲 ${escapeHtml(DICE_DESIGNS[a.rewardDice]?.name||a.rewardDice)}</span>`:"";
      const owners=profiles.length?profiles.map(p=>`<span class="achievement-owner${p.achievements[id]?" done":""}">${p.achievements[id]?"✓":"○"} ${escapeHtml(p.name)} <span class="battle-tag">#${escapeHtml(p.tagNumber)}</span></span>`).join(""):`<span class="achievement-owner">Noch keine Profile</span>`;
      return `<div class="achievement-card"><div class="achievement-head"><div class="achievement-name">🏆 ${escapeHtml(a.name)}</div>${reward}</div><div class="achievement-desc">${escapeHtml(a.desc)}</div><div class="achievement-owners">${owners}</div></div>`;
    }).join("");
  }

  function aggregateAbilityStats(){
    const totals={};
    REAL_ABILITY_IDS.forEach(id=>totals[id]=emptyAbilityStat());
    saveData.profiles.forEach(p=>{
      REAL_ABILITY_IDS.forEach(id=>{
        const s={...emptyAbilityStat(),...(p.stats.abilities[String(id)]||{})};
        Object.keys(totals[id]).forEach(k=>totals[id][k]+=Number(s[k]||0));
      });
    });
    return totals;
  }

  function renderStats(){
    const profiles=saveData.profiles;
    const totals=aggregateAbilityStats();
    const totalRounds=saveData.global?.completedRounds||0;
    const totalWins=profiles.reduce((s,p)=>s+p.stats.wins,0);
    const totalDamage=profiles.reduce((s,p)=>s+p.stats.damageDealt,0);
    const achievementCount=profiles.reduce((s,p)=>s+Object.keys(p.achievements).length,0);

    const mostChosen=REAL_ABILITY_IDS.map(id=>({id,...totals[id]})).sort((a,b)=>b.chosen-a.chosen)[0];
    const mostWins=REAL_ABILITY_IDS.map(id=>({id,...totals[id]})).sort((a,b)=>b.wins-a.wins)[0];
    const bestRate=REAL_ABILITY_IDS.map(id=>({id,...totals[id],rate:totals[id].equipped?totals[id].wins/totals[id].equipped:0})).filter(x=>x.equipped>=3).sort((a,b)=>b.rate-a.rate)[0];

    statsKpis.innerHTML=`
      <div class="stats-kpi"><div class="stats-kpi-label">Profile</div><div class="stats-kpi-value">${profiles.length}</div></div>
      <div class="stats-kpi"><div class="stats-kpi-label">Runden</div><div class="stats-kpi-value">${totalRounds}</div></div>
      <div class="stats-kpi"><div class="stats-kpi-label">Schaden</div><div class="stats-kpi-value">${totalDamage}</div></div>
      <div class="stats-kpi"><div class="stats-kpi-label">Meist gewählt</div><div class="stats-kpi-value">${mostChosen&&mostChosen.chosen?escapeHtml(ABILITIES[mostChosen.id].name):"–"}</div></div>
      <div class="stats-kpi"><div class="stats-kpi-label">Meiste Siege</div><div class="stats-kpi-value">${mostWins&&mostWins.wins?escapeHtml(ABILITIES[mostWins.id].name):"–"}</div></div>
      <div class="stats-kpi"><div class="stats-kpi-label">Best Winrate ≥3</div><div class="stats-kpi-value">${bestRate?`${escapeHtml(ABILITIES[bestRate.id].name)} ${Math.round(bestRate.rate*100)}%`:"–"}</div></div>`;

    profileStatsList.innerHTML=profiles.length?profiles.map(p=>{
      const wr=p.stats.rounds?Math.round(p.stats.wins/p.stats.rounds*100):0;
      return `<div class="profile-stats-card"><strong>${escapeHtml(p.name)} <span class="battle-tag">#${escapeHtml(p.tagNumber)}</span></strong><div class="profile-stats-line"><span>Runden ${p.stats.rounds} · Siege ${p.stats.wins} · ${wr}%</span><span>🏆 ${Object.keys(p.achievements).length}</span></div><div class="profile-stats-line"><span>⚔ ${p.stats.damageDealt} Schaden · 💀 ${p.stats.kills} Kills</span><span>⚅ ${p.stats.sixes} · ⚀ ${p.stats.ones}</span></div><div class="profile-stats-line"><span>❤️ ${p.stats.healed} geheilt · 💔 ${p.stats.damageTaken} kassiert</span><span>🤡 ${p.stats.selfDamage} · Peak ${p.stats.maxTurnDamage}</span></div></div>`;
    }).join(""):`<div class="profile-empty">Noch keine abgeschlossenen Profil-Runden.</div>`;

    const rows=REAL_ABILITY_IDS.map(id=>({id,...totals[id]})).sort((a,b)=>b.equipped-a.equipped||a.id-b.id);
    abilityStatsList.innerHTML=`<div class="ability-stat-row header"><span>Fähigkeit</span><span>Runden</span><span>Wahl</span><span>Siege</span><span>Winrate</span></div>`+rows.map(s=>{
      const wr=s.equipped?Math.round(s.wins/s.equipped*100):0;
      return `<div class="ability-stat-row"><span class="ability-stat-name">${s.id} · ${escapeHtml(ABILITIES[s.id].name)}</span><span>${s.equipped}</span><span>${s.chosen}</span><span>${s.wins}</span><span>${s.equipped?wr+"%":"–"}</span></div>`;
    }).join("");
  }

  function enqueueAchievementToast(profile,achievement){
    achievementToastQueue.push({profile:{name:profile.name,tagNumber:profile.tagNumber},achievement});
    showNextAchievementToast();
  }

  function showNextAchievementToast(){
    if(achievementToastBusy||!achievementToastQueue.length) return;
    achievementToastBusy=true;
    const {profile,achievement}=achievementToastQueue.shift();
    const reward=achievement.rewardDice?`<div class="achievement-toast-reward">🎲 ${escapeHtml(DICE_DESIGNS[achievement.rewardDice]?.name||achievement.rewardDice)} freigeschaltet!</div>`:"";
    achievementToastLayer.innerHTML=`<div class="achievement-toast"><div class="achievement-toast-kicker">ACHIEVEMENT UNLOCKED</div><div class="achievement-toast-title">🏆 ${escapeHtml(achievement.name)}</div><div class="achievement-toast-profile">${escapeHtml(profile.name)} <span class="battle-tag">#${escapeHtml(profile.tagNumber)}</span></div>${reward}</div>`;
    setTimeout(()=>{achievementToastLayer.innerHTML="";achievementToastBusy=false;showNextAchievementToast();},3250);
  }

  function unlockAchievementForPlayer(index,id){
    const profile=profileForPlayer(index);
    const achievement=ACHIEVEMENTS[id];
    if(!profile||!achievement||profile.achievements[id]) return false;
    profile.achievements[id]=Date.now();
    if(achievement.rewardDice && !profile.unlockedDice.includes(achievement.rewardDice)) profile.unlockedDice.push(achievement.rewardDice);
    saveGameData();
    enqueueAchievementToast(profile,achievement);
    renderAchievements();

    const originalExtra=["obsidian","gold","blood","arcane","emerald"].every(k=>profile.unlockedDice.includes(k));
    if(originalExtra && id!=="dice_goblin" && !profile.achievements.dice_goblin){
      setTimeout(()=>unlockAchievementForPlayer(index,"dice_goblin"),40);
    }
    const allExtra=Object.keys(DICE_UNLOCK_ACHIEVEMENT).every(k=>profile.unlockedDice.includes(k));
    if(allExtra && id!=="chromatic_menace" && !profile.achievements.chromatic_menace){
      setTimeout(()=>unlockAchievementForPlayer(index,"chromatic_menace"),80);
    }
    return true;
  }

  function recordVoluntaryHp(index,amount){
    if(index==null||!roundStats[index]||amount<=0) return;
    roundStats[index].voluntaryHp+=amount;
    if(roundStats[index].voluntaryHp>=9) unlockAchievementForPlayer(index,"blood_money");
    if(roundStats[index].voluntaryHp>=12) unlockAchievementForPlayer(index,"no_blood_left");
  }

  function commitRoundToStorage(winnerIndex){
    saveData.global.completedRounds=(saveData.global.completedRounds||0)+1;
    players.forEach((p,i)=>{
      const profile=profileForPlayer(i);
      if(!profile) return;
      const rs=roundStats[i]||{};
      const s=profile.stats;
      s.rounds++;
      s.damageDealt+=rs.damage||0;
      s.damageTaken+=rs.damageTaken||0;
      s.selfDamage+=rs.selfDamage||0;
      s.healed+=rs.healed||0;
      s.ones+=rs.ones||0;
      s.sixes+=rs.sixes||0;
      s.kills+=rs.kills||0;
      s.maxTurnDamage=Math.max(s.maxTurnDamage||0,rs.maxTurnDamage||0);

      const win=i===winnerIndex;
      if(win){s.wins++;s.currentWinStreak=(s.currentWinStreak||0)+1;s.bestWinStreak=Math.max(s.bestWinStreak||0,s.currentWinStreak);}
      else{s.currentWinStreak=0;}

      const primary=abilityStatFor(profile,p.ability);
      primary.equipped++;primary.primary++;
      if(p.primaryWasChosen) primary.chosen++;
      if(win) primary.wins++;

      [[p.secondAbility,p.secondAbilityWasChosen],[p.thirdAbility,p.thirdAbilityWasChosen]].forEach(([id,wasChosen])=>{
        if(id==null) return;
        const secondary=abilityStatFor(profile,id);
        secondary.equipped++;secondary.secondary++;
        if(wasChosen!==false) secondary.chosen++;
        if(win) secondary.wins++;
      });

      if(win && s.currentWinStreak>=3) unlockAchievementForPlayer(i,"hat_trick");
    });
    saveGameData();
    renderStats();
  }

  function checkRoundWinnerAchievements(winnerIndex){
    const p=players[winnerIndex];
    if(!p?.profileId) return;
    if(p.roundLastStandTriggered) unlockAchievementForPlayer(winnerIndex,"not_today");
    if(p.hp===1) unlockAchievementForPlayer(winnerIndex,"one_hp_wonder");
    if(p.hp>=maxHpForPlayer(p)) unlockAchievementForPlayer(winnerIndex,"untouchable");
    if(p.secondAbility!=null) unlockAchievementForPlayer(winnerIndex,"dual_wielding");
    const rs=roundStats[winnerIndex]||{};
    if((rs.damageTaken||0)>=25) unlockAchievementForPlayer(winnerIndex,"damage_magnet");
    if((rs.selfDamage||0)===0 && (rs.voluntaryHp||0)===0) unlockAchievementForPlayer(winnerIndex,"clean_sheet");
    if((rs.maxTurnDamage||0)>=20) unlockAchievementForPlayer(winnerIndex,"heavy_hitter");
    if((rs.kills||0)>=3) unlockAchievementForPlayer(winnerIndex,"executioner");
    if((rs.sixes||0)>=15) unlockAchievementForPlayer(winnerIndex,"six_storm");
  }
