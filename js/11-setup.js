  function randomUniqueAbilityIds(count,exclude=[]){
    const used=new Set(exclude.filter(id=>CHOOSABLE_ABILITY_IDS.includes(id)));
    const pool=CHOOSABLE_ABILITY_IDS.filter(id=>!used.has(id));
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    return pool.slice(0,Math.max(0,count));
  }

  function rebuildPlayerCountOptions(){
    const rules=localModeRules();
    const previous=Math.max(2,Math.min(Number(playerCount.value)||2,rules.maxPlayers));
    playerCount.innerHTML="";
    for(let n=2;n<=rules.maxPlayers;n++){const opt=document.createElement("option");opt.value=String(n);opt.textContent=String(n);playerCount.appendChild(opt);}
    playerCount.value=String(previous);
  }

  function applyLocalModeSetup(){
    localModeId=LOCAL_MODES[localModeSelect?.value]?localModeSelect.value:"classic";
    const rules=localModeRules();
    rebuildPlayerCountOptions();
    setup.classList.toggle("local-human-only",!rules.allowBots);
    if(rules.id==="classic"){
      setupIntro.textContent="Profile oder Bots auswählen und Sitzpositionen festlegen. Menschliche Spieler verwenden das im Profil gewählte Würfeldesign.";
      localModeInfo.innerHTML="25 HP · 1 W25-Startfähigkeit · bei ≤12 HP eine Zweitfähigkeit · Bots erlaubt · bis 8 Spieler.";
      rollAbilitiesBtn.textContent="🎲 Fähigkeiten auswürfeln";
    }else if(rules.id==="endurance50"){
      setupIntro.textContent="Endurance ist ein reiner Local-Modus: nur echte Spielerprofile, keine Bots, maximal 4 Spieler.";
      localModeInfo.innerHTML="50 HP · 2 unterschiedliche zufällige Startfähigkeiten · bei ≤30 HP Auswahl der 3. Fähigkeit · Letztplatzierter wählt zwischen Runden beide Startfähigkeiten frei.";
      rollAbilitiesBtn.textContent="🎲 2 Startfähigkeiten auswürfeln";
    }else{
      setupIntro.textContent="Overload ist ein reiner Local-Modus: nur echte Spielerprofile, keine Bots, maximal 4 Spieler.";
      localModeInfo.innerHTML="75 HP · 3 unterschiedliche zufällige Startfähigkeiten · keine weitere HP-Fähigkeit · Letztplatzierter wählt zwischen Runden genau 1 Fähigkeit frei, 2 bleiben random.";
      rollAbilitiesBtn.textContent="🎲 3 Startfähigkeiten auswürfeln";
    }
    makeNameFields();
  }

  function makeNameFields(){
    const rules=localModeRules();
    const n=+playerCount.value;
    setupAbilityRolls=Array(n).fill(null);
    nameInputs.innerHTML="";
    startGameBtn.disabled=true;

    for(let i=0;i<n;i++){
      const wrap=document.createElement("div");
      wrap.className="setup-player";
      const grid=document.createElement("div");
      grid.className="setup-grid";

      const botChoice=document.createElement("select");
      botChoice.id="botChoice"+i;botChoice.className="bot-choice";
      [["human","👤 Profil"],["easy","🤖 Bot · Leicht"],["normal","🤖 Bot · Normal"],["hard","🤖 Bot · Schwer"]].forEach(([value,label])=>{const opt=document.createElement("option");opt.value=value;opt.textContent=label;botChoice.appendChild(opt);});
      botChoice.value="human";
      if(!rules.allowBots){botChoice.classList.add("hidden");botChoice.disabled=true;}

      const profileChoice=document.createElement("select");
      profileChoice.id="profileChoice"+i;profileChoice.className="setup-profile";
      if(!saveData.profiles.length){const opt=document.createElement("option");opt.value="";opt.textContent="Kein Profil vorhanden";profileChoice.appendChild(opt);}
      else saveData.profiles.forEach((p,j)=>{const opt=document.createElement("option");opt.value=p.id;opt.textContent=`${p.name} #${p.tagNumber}`;if(j===i%saveData.profiles.length)opt.selected=true;profileChoice.appendChild(opt);});

      const seat=document.createElement("select");
      seat.id="seatChoice"+i;seat.className="seat-choice";
      SEATS.forEach(s=>{const opt=document.createElement("option");opt.value=s.id;opt.textContent="💺 "+s.name;seat.appendChild(opt);});
      seat.value=defaultSeatFor(i,n);

      const diceReadout=document.createElement("div");
      diceReadout.id="diceReadout"+i;diceReadout.className="setup-dice-readonly";diceReadout.textContent="🎲 Classic";

      botChoice.onchange=()=>syncSetupBotChoice(i);
      profileChoice.onchange=()=>syncSetupBotChoice(i);
      seat.onchange=updateStartAvailability;

      if(rules.allowBots) grid.appendChild(botChoice);
      grid.appendChild(profileChoice);grid.appendChild(seat);grid.appendChild(diceReadout);

      const ability=document.createElement("div");ability.id="abilityResult"+i;ability.className="ability-roll";
      ability.innerHTML=rules.id==="classic"?`🎲 Fähigkeit: <strong>noch nicht gewürfelt</strong>`:`🎲 ${rules.startAbilityCount} Startfähigkeiten: <strong>noch nicht gewürfelt</strong>`;
      const choice=document.createElement("select");choice.id="abilityChoice"+i;choice.className="ability-choice hidden";
      CHOOSABLE_ABILITY_IDS.forEach(a=>{const opt=document.createElement("option");opt.value=a;opt.textContent=`${a} – ${ABILITIES[a].name}`;choice.appendChild(opt);});
      choice.onchange=updateStartAvailability;

      wrap.appendChild(grid);wrap.appendChild(ability);wrap.appendChild(choice);nameInputs.appendChild(wrap);
      syncSetupBotChoice(i);
    }
    updateStartAvailability();
  }

  function rollSetupAbilities(){
    const rules=localModeRules();
    const n=+playerCount.value;
    for(let i=0;i<n;i++){
      const result=$("abilityResult"+i);
      const choice=$("abilityChoice"+i);
      if(rules.id!=="classic"){
        const abilities=randomUniqueAbilityIds(rules.startAbilityCount);
        setupAbilityRolls[i]=abilities;
        result.innerHTML=`🎲 <strong>${abilities.map(id=>escapeHtml(ABILITIES[id].name)).join(" · ")}</strong><div class="ability-desc">${abilities.map(id=>`${id}: ${escapeHtml(ABILITIES[id].desc)}`).join("<br>")}</div>`;
        choice.classList.add("hidden");
        continue;
      }
      const roll=randAbilityRoll();
      setupAbilityRolls[i]=roll;
      if(roll===6){
        result.innerHTML=`🎲 W25 = <strong>6</strong> → <strong>Freie Wahl!</strong><div class="ability-desc">Wähle jetzt eine Fähigkeit aus 1–5 oder 8–25. Glück (BETA) gibt es ausschließlich bei einer direkt gewürfelten 7.</div>`;
        choice.classList.remove("hidden");
      }else{
        result.innerHTML=`🎲 W25 = <strong>${roll}</strong> → <strong>${ABILITIES[roll].name}</strong><div class="ability-desc">${ABILITIES[roll].desc}</div>`;
        choice.classList.add("hidden");
      }
      syncSetupBotChoice(i);
    }
    updateStartAvailability();
  }

  function updateStartAvailability(){
    const rules=localModeRules();
    const n=+playerCount.value;
    const abilitiesReady=setupAbilityRolls.length===n && setupAbilityRolls.every(v=>v!=null && (!Array.isArray(v)||v.length===rules.startAbilityCount));
    const humanProfileIds=[];
    let profilesValid=true;

    for(let i=0;i<n;i++){
      if(setupBotLevel(i)==="human"){
        const id=$("profileChoice"+i)?.value||"";
        if(!id || !getProfile(id) || humanProfileIds.includes(id)) profilesValid=false;
        humanProfileIds.push(id);
      }else if(!rules.allowBots){
        profilesValid=false;
      }
    }

    if(!profilesValid){
      setupStatus.textContent=saveData.profiles.length?"⚠️ Jeder menschliche Spieler braucht ein eigenes Profil.":(rules.allowBots?"⚠️ Erstelle zuerst ein Profil oder stelle die Plätze auf Bots.":"⚠️ Erstelle zuerst genügend Spielerprofile.");
      setupStatus.className="setup-status error";
    }else if(!abilitiesReady){
      setupStatus.textContent=rules.id==="classic"?"Profile/Bots und Sitzplätze stehen. Jetzt noch die Fähigkeiten auswürfeln.":`Profile und Sitzplätze stehen. Jetzt ${rules.startAbilityCount} Startfähigkeiten pro Spieler auswürfeln.`;
      setupStatus.className="setup-status";
    }else{
      setupStatus.textContent=`✅ ${rules.name}: Spieler, Sitzplätze und Fähigkeiten bereit.`;
      setupStatus.className="setup-status";
    }
    startGameBtn.disabled=!(abilitiesReady&&profilesValid);
  }

  function getSetupAbilities(i){
    const rules=localModeRules();
    if(rules.id!=="classic") return Array.isArray(setupAbilityRolls[i])?[...setupAbilityRolls[i]]:[];
    return [setupAbilityRolls[i]===6 ? +$("abilityChoice"+i).value : setupAbilityRolls[i]];
  }

