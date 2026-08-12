  function aliveCount(){ return players.filter(p=>p.hp>0).length; }
  function nextAlive(from){
    if(aliveCount()<=1) return -1;
    let i=from;
    do{i=(i+1)%players.length;}while(players[i].hp<=0);
    return i;
  }
  function nextAttackTarget(from){
    if(!campaignMode) return nextAlive(from);
    const team=players[from]?.campaignTeam;
    for(let step=1;step<=players.length;step++){
      const i=(from+step)%players.length;
      if(players[i]?.hp>0 && players[i].campaignTeam!==team) return i;
    }
    return -1;
  }
  function addLog(text){
    const d=document.createElement("div"); d.textContent=text; logEl.prepend(d);
  }
  function maxHpForPlayer(playerOrIndex){
    const p=typeof playerOrIndex==="number"?players[playerOrIndex]:playerOrIndex;
    const value=Number(p?.maxHp);
    return Number.isFinite(value)&&value>0?value:START_HP;
  }

  // V24.2: Kampagnen-Helden dürfen Heilung als echten Overheal über die Start-/Max-HP hinaus ansammeln.
  // Local Battle und Kampagnen-Gegner bleiben am normalen Max-HP-Limit.
  function applyHealingToPlayer(index,amount){
    const p=players[index];
    const heal=Math.max(0,Number(amount)||0);
    if(!p || heal<=0) return 0;
    const before=p.hp;
    const campaignHeroOverheal=campaignMode && p.campaignTeam==="hero";
    p.hp=campaignHeroOverheal ? p.hp+heal : Math.min(maxHpForPlayer(p),p.hp+heal);
    return Math.max(0,p.hp-before);
  }

  function playerAbilities(index=current){
    const p=players[index];
    if(!p) return [];
    return [p.ability,p.secondAbility,p.thirdAbility,p.fourthAbility].filter(a=>a!=null);
  }

  function hasAbility(id,index=current){
    if(id===13 && campaignMode && encounterRuleActive("casino_floor")) return true;
    return playerAbilities(index).includes(id);
  }

  function currentAbility(){
    return players[current]?.ability||1;
  }

  function renderPlayers(){
    playersEl.innerHTML="";
    players.forEach((p,i)=>{
      const el=document.createElement("div");
      el.id="playerCard"+i;
      el.className="player"+(p.cosmeticFrame?` frame-${p.cosmeticFrame}`:"")+(i===current&&p.hp>0?" active":"")+(p.hp<=0?" dead":"");
      const campaignCompact=campaignMode;
      el.innerHTML=`<div class="player-name">${escapeHtml(p.name)}${p.battleTag?` <span class="battle-tag">${escapeHtml(p.battleTag)}</span>`:""}</div>${p.cosmeticTitle?`<div class="profile-title-badge">${escapeHtml(p.cosmeticTitle)}</div>`:""}
        ${!campaignCompact&&p.botLevel&&p.botLevel!=="human"?`<div class="bot-tag">🤖 ${escapeHtml(BOT_LEVELS[p.botLevel]?.name.replace("Bot · ","")||"Bot")}</div>`:""}
        <div class="hp">❤️ <strong>${Math.max(0,p.hp)}</strong> / ${maxHpForPlayer(p)}</div>
        <div class="ability-tag">⚡ ${escapeHtml(ABILITIES[p.ability].name)}</div>
        ${p.secondAbility!=null ? `<div class="ability-tag second">✦ ${escapeHtml(ABILITIES[p.secondAbility].name)}</div>` : ""}
        ${p.thirdAbility!=null ? `<div class="ability-tag third">✦ ${escapeHtml(ABILITIES[p.thirdAbility].name)}</div>` : ""}
        ${p.fourthAbility!=null ? `<div class="ability-tag fourth">✦ ${escapeHtml(ABILITIES[p.fourthAbility].name)}</div>` : ""}
        ${campaignCompact?"":`<div class="seat-tag">💺 ${escapeHtml(SEATS[p.seat].name)} · 🎲 ${escapeHtml(DICE_DESIGNS[p.diceDesign]?.name||"Classic")}</div>
        <div class="live-stats">
          <span>⚔ ${roundStats[i]?.damage||0}</span>
          <span>⚀ ${roundStats[i]?.ones||0}</span>
          <span>⚅ ${roundStats[i]?.sixes||0}</span>
          <span>🤡 ${roundStats[i]?.selfDamage||0}</span>
        </div>`}
        ${campaignMode?"":`<div class="score-badge">🏆 ${p.wins||0} Sieg${(p.wins||0)===1?"":"e"}</div>`}`;
      playersEl.appendChild(el);
    });
  }

  function applySeatRotation(){
    if(!players[current] || game.classList.contains("hidden")) return;

    // Kampagnen laufen vollständig scrollbar und alle Teilnehmer nutzen Sitz 0.
    // Keine dynamische Shell-Höhe/Skalierung: so bleibt die Oberkante des Würfelfensters
    // auch während Würfelanimationen pixelstabil. Local Battle behält die Sitzrotation.
    if(campaignMode){
      rotatingBoard.style.transform="rotate(0deg) scale(1)";
      rotationShell.style.height="auto";
      return;
    }

    const seat=SEATS[players[current].seat];
    const sideways=Math.abs(seat.angle)%180===90;

    requestAnimationFrame(()=>{
      const boardW=rotatingBoard.offsetWidth;
      const boardH=rotatingBoard.offsetHeight;
      const rotatedW=sideways ? boardH : boardW;
      const rotatedH=sideways ? boardW : boardH;

      const shellW=Math.max(1,rotationShell.clientWidth);
      const shellTop=rotationShell.getBoundingClientRect().top;
      const availableH=Math.max(150,window.innerHeight-shellTop-7);

      // Das gesamte gedrehte Board wird notfalls verkleinert, damit der
      // laufende Spielscreen ohne Body-Scroll vollständig sichtbar bleibt.
      const fitW=(shellW-4)/Math.max(1,rotatedW);
      const fitH=(availableH-4)/Math.max(1,rotatedH);
      const scale=Math.min(1,fitW,fitH);

      rotatingBoard.style.transform=`rotate(${seat.angle}deg) scale(${scale})`;
      rotationShell.style.height=`${Math.max(120,Math.ceil(rotatedH*scale+6))}px`;
    });
  }

  function dieSymbol(v){ return v==null?"?":["⚀","⚁","⚂","⚃","⚄","⚅"][v-1]; }

  // Galaxy A50 / older Mali WebView compositing can flatten CSS preserve-3d dice into thin strips.
  // Only those devices get a safe flat renderer; modern devices keep the full 3D dice.
  if(/SM-A505/i.test(navigator.userAgent||"")) document.documentElement.classList.add("legacy-flat-dice");

  const DIE_3D_ROTATION={
    1:["0deg","0deg"],
    2:["-90deg","0deg"],
    3:["0deg","-90deg"],
    4:["0deg","90deg"],
    5:["90deg","0deg"],
    6:["0deg","180deg"]
  };

  const DIE_PIP_POSITIONS={
    1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]
  };

  function ensure3DDieStructure(el){
    let cube=el.querySelector(":scope > .die-cube");
    if(cube) return cube;
    cube=document.createElement("div");
    cube.className="die-cube";
    for(let face=1;face<=6;face++){
      const side=document.createElement("div");
      side.className=`die-face die-face-${face}`;
      side.dataset.face=String(face);
      const grid=document.createElement("div");
      grid.className="die-pips";
      const active=new Set(DIE_PIP_POSITIONS[face]);
      for(let pos=1;pos<=9;pos++){
        const pip=document.createElement("span");
        pip.className="die-pip"+(active.has(pos)?" active":"");
        grid.appendChild(pip);
      }
      const question=document.createElement("div");
      question.className="die-question";
      question.textContent="?";
      side.append(grid,question);
      cube.appendChild(side);
    }
    el.replaceChildren(cube);
    return cube;
  }

  function render3DDieNode(el,value){
    ensure3DDieStructure(el);
    const dieWidth=el.getBoundingClientRect().width;
    if(dieWidth>0){
      el.style.setProperty("--die-half",`${Math.max(14,(dieWidth-6)/2)}px`);
      el.style.setProperty("--die-pip-size",`${Math.max(5,Math.min(15,dieWidth*.16))}px`);
      el.style.setProperty("--die-question-size",`${Math.max(30,Math.min(68,dieWidth*.58))}px`);
    }
    const rotation=DIE_3D_ROTATION[value]||DIE_3D_ROTATION[1];
    if(!el.classList.contains("rolling")){
      el.style.setProperty("--die-rx",rotation[0]);
      el.style.setProperty("--die-ry",rotation[1]);
    }
    el.dataset.value=value==null?"":String(value);
    el.setAttribute("aria-label",value==null?"Würfel bereit":`Würfel ${value}`);
  }

  function currentSum(){ return dice.reduce((s,d)=>s+(d.value||0),0); }
  function stackingDamageBonus(){
    let bonus=0;
    if(hasAbility(9) && players[current].hp<=10) bonus+=2;
    if(hasAbility(10)) bonus+=momentumBonus;
    if(hasAbility(23) && bloodRushActiveThisAttack) bonus+=1;
    if(hasAbility(25) && isUniqueUnderdog(current)) bonus+=1;
    return bonus;
  }

  function isNormalAttackHitValue(value,abilityIndex=current){
    if(value===attackFace) return true;
    return attackFace===1 && hasAbility(1,abilityIndex) && value===2;
  }

  function damagePerAttackHit(){
    let dmg=(attackFace===1&&hasAbility(1)) ? 3 : attackFace;
    dmg+=stackingDamageBonus();
    return dmg;
  }

  function precisionHitDamage(){
    return Math.max(1,attackFace-1)+stackingDamageBonus();
  }
  function totalAttackDamage(){ return attackDamage; }

  function renderDice(){
    // Die fünf Würfel bleiben als dieselben DOM-Nodes bestehen. Früher wurden sie
    // während der Animation alle 55 ms neu erzeugt, was auf Mobile Layout-Jitter
    // und ein sichtbar wanderndes Würfelfeld verursachen konnte.
    while(diceEl.children.length<dice.length){
      const el=document.createElement("div");
      el.className="die";
      diceEl.appendChild(el);
    }
    while(diceEl.children.length>dice.length) diceEl.lastElementChild.remove();

    dice.forEach((d,idx)=>{
      const el=diceEl.children[idx];
      let cls="die";
      if(phase==="base_select"&&!d.locked) cls+=" selectable";
      if(d.selected) cls+=" selected";
      if(d.locked) cls+=phase.startsWith("attack")?" attack-hit":" locked";
      if(d.rolling) cls+=" rolling";
      const designKey=players[current]?.diceDesign||"classic";
      cls+=" "+(DICE_DESIGNS[designKey]?.className||"theme-classic");
      el.className=cls;
      render3DDieNode(el,d.value);
      el.onclick=null;

      if(phase==="base_select"&&!d.locked&&!isAnimating&&!isBotPlayer(current)){
        el.onclick=()=>{ d.selected=!d.selected; renderDice(); updateButtons(); };
      }
    });
    sumEl.textContent=phase.startsWith("attack")
      ? `${attackHits} Treffer / ${totalAttackDamage()} Schaden`
      : currentSum();
  }

  function updateHeader(){
    if(aliveCount()<=1) return;
    const botText=isBotPlayer(current)&&!campaignMode?` · 🤖 ${BOT_LEVELS[players[current].botLevel].name.replace("Bot · ","")}`:"";
    turnLine.innerHTML=`${escapeHtml(players[current].name)}${players[current].battleTag?` <span class="battle-tag">${escapeHtml(players[current].battleTag)}</span>`:""} ist dran${botText}`;

    if(phase==="idle"){statusEl.textContent="Starte deinen Basiswurf mit 5 Würfeln.";sumLabel.textContent="Summe";}
    else if(phase==="base_select"){statusEl.textContent="Tippe mindestens einen Würfel an und locke ihn ein.";sumLabel.textContent="Aktuelle Summe";}
    else if(phase==="base_ready"){statusEl.textContent="Die übrigen Würfel können erneut gewürfelt werden.";sumLabel.textContent="Aktuelle Summe";}
    else if(phase==="gamble_attack"){
      statusEl.textContent="Gambling Man: Würfle deine Angriffszahl aus.";
      sumLabel.textContent="Gamble";
    }
    else if(phase==="perfect25"){
      statusEl.textContent="Perfect 25: D6 entscheidet, ob du angreifen darfst.";
      sumLabel.textContent="Perfect 25";
    }
    else if(phase==="perfect25_d4"){
      statusEl.textContent="Perfect 25: D4 entscheidet jetzt deine Angriffszahl.";
      sumLabel.textContent="Angriffszahl";
    }
    else if(phase==="insurance"){
      statusEl.textContent="Insurance: Würfle den D6 vor deinem Eigenschaden.";
      sumLabel.textContent="Insurance";
    }
    else if(phase==="counterattack"){
      statusEl.textContent="Counterattack: 5 Würfel auf 1er, Treffer werden gelockt.";
      sumLabel.textContent="Gegenangriff";
    }
    else if(phase==="campaign_target"){
      statusEl.textContent=`Wähle, welchen Gegner du mit deinem ${attackFace}er-Angriff angreifen willst.`;
      sumLabel.textContent="Angriffsziel";
    }
    else if(phase==="attack_ready"){
      const bloodText=bloodPriceNeighbors.length ? ` Blutpreis aktiv: ${[attackFace,...bloodPriceNeighbors].sort((a,b)=>a-b).map(v=>v+"er").join(", ")} treffen.` : "";
      const wildText=firstAttackRoll&&wildcardFace!=null ? ` Wildcard: auch ${wildcardFace}er zählen im ersten Wurf.` : "";
      statusEl.textContent=`Angriff auf ${players[attackTarget].name}: Du brauchst ${attackFace}er. Jeder normale Treffer macht ${damagePerAttackHit()} Schaden.${bloodText}${wildText}`;
      sumLabel.textContent="Angriff";
    }
    else if(phase==="attack_after_roll"){
      const secondChanceForced=currentAttackRollNewHits===0&&hasAbility(4)&&!attackPowerUsed&&dice.some(d=>!d.locked);
      statusEl.textContent=secondChanceForced
        ? `0 neue Treffer. Zweite Chance ist noch verfügbar – würfle zuerst alle Nicht-Treffer erneut.`
        : `${currentAttackRollNewHits} neuer Treffer in diesem Wurf. Du kannst auswerten oder ggf. Fähigkeit 4 jetzt einsetzen.`;
      sumLabel.textContent="Angriff";
    }
    else if(phase==="attack_continue"){
      const bloodText=bloodPriceNeighbors.length ? ` Blutpreis aktiv: ${[attackFace,...bloodPriceNeighbors].sort((a,b)=>a-b).map(v=>v+"er").join(", ")} treffen in diesem Wurf.` : "";
      statusEl.textContent=`${attackHits} Treffer gelockt. Würfle die übrigen Würfel weiter.${bloodText}`;sumLabel.textContent="Angriff";
    }
    else if(phase==="base_auto_end"){statusEl.textContent="Basiszug beendet – nächster Spieler...";}
    else if(phase==="turn_done"){statusEl.textContent="Angriff beendet.";}

    const abilityLines=playerAbilities().map(a=>{
      let usage="passiv";
      if(a===3) usage=baseRerollUsed?"bereits benutzt":"noch verfügbar";
      if(a===4) usage=attackPowerUsed?"bereits benutzt":"noch verfügbar";
      if(a===7) usage="Glück aktiv";
      if(a===8) usage=`${Math.max(0,2-precisionUses)}/2 Rettungen verfügbar`;
      if(a===9) usage=players[current].hp<=10?"RACHE AKTIV: +2 pro Treffer":"aktiv ab 10 HP";
      if(a===10) usage=`Serie ${players[current].momentumStreak||0} · Bonus +${momentumBonus} pro Treffer`;
      if(a===11) usage=bloodPriceNeighbors.length?`Blutpreis aktiv: ${[attackFace,...bloodPriceNeighbors].sort((x,y)=>x-y).join("/")}`:"3 HP pro Einsatz";
      if(a===12) usage="bei Basiswurf >25";
      if(a===13) usage="bei jedem erfolgreichen Angriff verfügbar";
      if(a===14) usage=players[current].lastStandUsed?"diese Runde verbraucht":"1× pro Runde bereit";
      if(a===15) usage="triggert bei exakt 25";
      if(a===16) usage="1 Schaden pro Würfeltreffer";
      if(a===17) usage=wildcardFace!=null&&firstAttackRoll?`Wildcard: ${wildcardFace}`:"erster Angriffswurf";
      if(a===18) usage=loadedDiceUsed?"diesen Zug benutzt":"1× pro Basiszug bereit";
      if(a===19) usage="bei Basiswurf unter 25";
      if(a===20) usage="ab 3 gleichen Würfeln im selben Wurf";
      if(a===21) usage="ab 5 Hauptangriffsschaden";
      if(a===22) usage="2+ Sechser im selben Wurf = +1 HP";
      if(a===23) usage=bloodRushActiveThisAttack?"BLOOD RUSH AKTIV: +1 pro Treffer":((players[current].bloodRushPrimed||players[current].voluntaryHpPaidThisTurn)?"für nächsten Angriff bereit":"wartet auf HP-Verlust");
      if(a===24) usage="exakt 2 Treffer = +4 Gesamtschaden";
      if(a===25) usage=isUniqueUnderdog(current)?"UNDERDOG AKTIV: +1 pro Treffer":"nur allein mit niedrigsten HP";
      return `<div class="ability-compact-line"><strong>⚡ ${escapeHtml(ABILITIES[a].name)}</strong><span> · ${escapeHtml(usage)}</span></div>`;
    });
    abilityState.innerHTML=abilityLines.join(`<div class="ability-compact-sep"></div>`);
  }

  function campaignEnemyTargets(from=current){
    if(!campaignMode) return [];
    const team=players[from]?.campaignTeam;
    return players.map((p,i)=>(p?.hp>0&&p.campaignTeam!==team)?i:null).filter(i=>i!=null);
  }
  function renderCampaignTargetChoices(){
    if(phase!=="campaign_target" || !pendingCampaignAttackStart){campaignTargetBox.classList.add("hidden");campaignTargetList.innerHTML="";return;}
    const targets=campaignEnemyTargets(current);
    campaignTargetList.innerHTML=targets.map(i=>`<button type="button" class="campaign-target-btn" data-target-index="${i}"><strong>${escapeHtml(players[i].name)}</strong><span>${players[i].hp} / ${maxHpForPlayer(players[i])} HP</span></button>`).join("");
    campaignTargetBox.classList.remove("hidden");
    campaignTargetList.querySelectorAll("[data-target-index]").forEach(btn=>btn.onclick=()=>chooseCampaignAttackTarget(+btn.dataset.targetIndex));
  }
  function chooseCampaignAttackTarget(index){
    if(phase!=="campaign_target" || !pendingCampaignAttackStart || isAnimating || isBotPlayer(current)) return;
    if(!campaignEnemyTargets(current).includes(index)) return;
    attackTarget=index;
    const pending=pendingCampaignAttackStart;pendingCampaignAttackStart=null;
    initializeAttackAfterTarget(pending.total,pending.source);
  }

  function hideAllControls(){
    campaignTargetBox.classList.add("hidden");
    [primaryBtn,lockBtn,baseRerollBtn,loadedDiceBtn,snakeEyesBtn,attackPowerBtn,bloodLowerBtn,bloodHigherBtn,resolveAttackBtn,nextBtn].forEach(b=>{
      b.classList.add("hidden"); b.disabled=false;
    });
  }
  function updateButtons(){
    hideAllControls();
    if(isAnimating) return;
    if(phase==="campaign_target"){renderCampaignTargetChoices();return;}

    if(phase==="idle"){primaryBtn.classList.remove("hidden");primaryBtn.textContent="🎲 Basiswurf";}
    if(phase==="base_select"){
      lockBtn.classList.remove("hidden");
      lockBtn.disabled=!dice.some(d=>d.selected&&!d.locked);
      if(hasAbility(3)&&!baseRerollUsed&&dice.some(d=>!d.locked&&d.value===1)){
        baseRerollBtn.classList.remove("hidden");
      }

      if(hasAbility(18) && !loadedDiceUsed && players[current].hp>2){
        const selectedEligible=dice
          .map((d,i)=>({d,i}))
          .filter(x=>x.d.selected && !x.d.locked && x.d.value!=null && x.d.value!==5);
        if(selectedEligible.length===1){
          const v=selectedEligible[0].d.value;
          loadedDiceBtn.classList.remove("hidden");
          loadedDiceBtn.textContent=`🎲 Loaded Dice: ${v} → 5 (-2 HP)`;
        }
      }

      const snakeGroup=snakeEyesGroup();
      if(hasAbility(20) && snakeGroup){
        snakeEyesBtn.classList.remove("hidden");
        snakeEyesBtn.textContent=`🐍 Snake Eyes: ${snakeGroup.indices.length}× ${snakeGroup.face}er neu würfeln`;
      }
    }
    if(phase==="base_ready"){primaryBtn.classList.remove("hidden");primaryBtn.textContent="🎲 Rest würfeln";}
    if(phase==="attack_ready"||phase==="attack_continue"){
      primaryBtn.classList.remove("hidden");
      primaryBtn.textContent=bloodPriceNeighbors.length
        ? `🩸 Würfeln: ${[attackFace,...bloodPriceNeighbors].sort((a,b)=>a-b).join(" / ")}`
        : (phase==="attack_ready"?`⚔️ Auf ${attackFace}er würfeln`:"⚔️ Angriff weiterwürfeln");

      if(hasAbility(11) && bloodPriceNeighbors.length===0 && players[current].hp>3){
        const neighbors=[];
        if(attackFace>1) neighbors.push(attackFace-1);
        if(attackFace<6) neighbors.push(attackFace+1);
        if(neighbors.length){
          bloodLowerBtn.classList.remove("hidden");
          bloodLowerBtn.textContent=`🩸 3 HP: ${[attackFace,...neighbors].sort((a,b)=>a-b).join(" + ")}`;
        }
      }
    }
    if(phase==="attack_after_roll"){
      const secondChanceAvailable=hasAbility(4)&&!attackPowerUsed&&dice.some(d=>!d.locked);

      if(secondChanceAvailable){
        attackPowerBtn.classList.remove("hidden");
      }

      // QoL: Wenn der Angriff gerade an 0 neuen Treffern scheitern würde und
      // Zweite Chance noch verfügbar ist, darf man nicht versehentlich beenden.
      // Erst nach Einsatz der Fähigkeit erscheint "Angriff beenden".
      if(currentAttackRollNewHits>0 || !secondChanceAvailable){
        resolveAttackBtn.classList.remove("hidden");
        const doubleTapCashOut=hasAbility(24) && attackHits===2 && currentAttackRollNewHits>0;
        resolveAttackBtn.textContent=doubleTapCashOut
          ? "🔫 Angriff beenden · Double Tap"
          : (currentAttackRollNewHits===0?"Angriff beenden":"Angriff fortsetzen");
      }
    }
    if(phase==="turn_done") nextBtn.classList.remove("hidden");
  }


  function queueEventPopup(text,type){
    eventPopupQueue.push({text,type});
    runEventPopupQueue();
  }

  function runEventPopupQueue(){
    if(eventPopupBusy || !eventPopupQueue.length) return;
    eventPopupBusy=true;
    const item=eventPopupQueue.shift();

    eventPopup.classList.remove("active","death","win","survive");
    void eventPopup.offsetWidth;
    eventPopupText.textContent=item.text;
    eventPopup.classList.add(item.type,"active");

    setTimeout(()=>{
      eventPopup.classList.remove("active","death","win","survive");
      eventPopupBusy=false;
      setTimeout(()=>{
        runEventPopupQueue();
        scheduleBotAction(80);
      },90);
    },1080);
  }

  function playDamageAnimation(targetIndex,amount){
    if(amount<=0) return;
    const card=$("playerCard"+targetIndex);

    damageTint.classList.remove("active");
    damageFx.classList.remove("active");
    void damageTint.offsetWidth;
    damageFx.textContent=`−${amount} HP`;
    damageTint.classList.add("active");
    damageFx.classList.add("active");

    if(card){
      card.classList.remove("damage-shake");
      void card.offsetWidth;
      card.classList.add("damage-shake");
      const pop=document.createElement("div");
      pop.className="damage-pop";
      pop.textContent=`−${amount} HP`;
      card.appendChild(pop);
      setTimeout(()=>pop.remove(),950);
      setTimeout(()=>card.classList.remove("damage-shake"),650);
    }
    setTimeout(()=>{
      damageTint.classList.remove("active");
      damageFx.classList.remove("active");
    },900);
  }

  function playHealAnimation(targetIndex,amount){
    if(amount<=0) return;
    const card=$("playerCard"+targetIndex);

    healTint.classList.remove("active");
    healFx.classList.remove("active");
    void healTint.offsetWidth;
    healFx.textContent=`+${amount} HP`;
    healTint.classList.add("active");
    healFx.classList.add("active");

    if(card){
      card.classList.remove("heal-pulse");
      void card.offsetWidth;
      card.classList.add("heal-pulse");
      const pop=document.createElement("div");
      pop.className="heal-pop";
      pop.textContent=`+${amount} HP`;
      card.appendChild(pop);
      setTimeout(()=>pop.remove(),1050);
      setTimeout(()=>card.classList.remove("heal-pulse"),850);
    }
    setTimeout(()=>{
      healTint.classList.remove("active");
      healFx.classList.remove("active");
    },1000);
  }

  function flushPendingFx(){
    const dmg=pendingDamage;
    const heal=pendingHeal;
    pendingDamage=null;
    pendingHeal=null;

    if(dmg){
      requestAnimationFrame(()=>playDamageAnimation(dmg.target,dmg.amount));
    }
    if(heal){
      const delay=dmg ? 430 : 0;
      setTimeout(()=>playHealAnimation(heal.target,heal.amount),delay);
    }
    let extraDamageCount=0;
    if(pendingExtraDamageFx.length){
      const extras=[...pendingExtraDamageFx];
      pendingExtraDamageFx=[];
      extraDamageCount=extras.length;
      extras.forEach((fx,i)=>{
        setTimeout(()=>playDamageAnimation(fx.target,fx.amount),650+(i*520));
      });
    }
    if(pendingExtraHealFx.length){
      const heals=[...pendingExtraHealFx];
      pendingExtraHealFx=[];
      heals.forEach((fx,i)=>{
        setTimeout(()=>playHealAnimation(fx.target,fx.amount),650+(extraDamageCount*520)+(i*500));
      });
    }
  }

  function renderAll(){
    roundNumberEl.textContent=roundNumber;
    if(winTrackerLabel) winTrackerLabel.classList.toggle("hidden",!!campaignMode);
    renderPlayers(); renderDice(); updateHeader(); updateButtons(); renderEncounterRuleBanner(); renderCampaignTaskProgress();
    // Während eines Würfelwurfs bleibt die Board-Geometrie eingefroren.
    // Die Würfel selbst dürfen rotieren/skalieren; nur die äußere Board-Geometrie bleibt konstant.
    if(!isAnimating) applySeatRotation();
    flushPendingFx();
    scheduleBotAction();
  }

