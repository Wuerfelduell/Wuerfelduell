  function aliveCount(){ return players.filter(p=>p.hp>0).length; }
  function nextAlive(from){
    if(aliveCount()<=1) return -1;
    let i=from;
    do{i=(i+1)%players.length;}while(players[i].hp<=0);
    return i;
  }

  function campaignTeamIndices(team,aliveOnly=false){
    return players
      .map((p,i)=>(p?.campaignTeam===team&&(!aliveOnly||p.hp>0))?i:null)
      .filter(i=>i!=null);
  }

  function campaignEnemyUsesRotatingTarget(from){
    if(!campaignMode||players[from]?.campaignTeam!=="enemy") return false;
    const heroes=campaignTeamIndices("hero");
    const enemies=campaignTeamIndices("enemy");
    const enemySlot=enemies.indexOf(from);
    if(enemySlot<0||!heroes.length) return false;

    // Bei zu wenigen Gegnern rotieren alle, damit kein Spieler dauerhaft
    // ohne Gegenspieler bleibt. Bei einem Gegner-Ueberschuss werden zuerst
    // feste 1:1-Paare gebildet; nur die uebrigen Gegner rotieren.
    return enemies.length<heroes.length||enemySlot>=heroes.length;
  }

  function campaignEnemyAttackTarget(from){
    if(!campaignMode||players[from]?.campaignTeam!=="enemy") return -1;
    const heroes=campaignTeamIndices("hero");
    const enemies=campaignTeamIndices("enemy");
    const enemySlot=enemies.indexOf(from);
    if(enemySlot<0||!heroes.length) return -1;

    const aliveHeroes=heroes.filter(i=>players[i]?.hp>0);
    const profile=ENEMY_AI_PROFILES[players[from]?.aiProfile]||ENEMY_AI_PROFILES.standard;
    if(!aliveHeroes.length)return -1;
    const activeMark=encounterRuntime?.markTurns>0&&aliveHeroes.includes(encounterRuntime.markedHero);
    const markForcesTarget=activeMark&&(encounterRuntime.markSource==="hunted"||getActiveWorldRule?.()==="hunters_mark")&&!['support','defensive'].includes(players[from]?.aiProfile);
    if(markForcesTarget)return encounterRuntime.markedHero;
    if(profile.target==="marked_player"&&encounterRuntime?.markTurns>0&&aliveHeroes.includes(encounterRuntime.markedHero))return encounterRuntime.markedHero;
    if(profile.target==="lowest_hp")return [...aliveHeroes].sort((a,b)=>(players[a].hp/Math.max(1,players[a].maxHp))-(players[b].hp/Math.max(1,players[b].maxHp)))[0];
    if(profile.target==="highest_hp")return [...aliveHeroes].sort((a,b)=>(players[b].hp/Math.max(1,players[b].maxHp))-(players[a].hp/Math.max(1,players[a].maxHp)))[0];
    if(profile.target==="last_attacker"&&aliveHeroes.includes(encounterRuntime?.lastHeroAttacker))return encounterRuntime.lastHeroAttacker;
    if(profile.target==="random_valid")return aliveHeroes[Math.floor(Math.random()*aliveHeroes.length)];

    const rotating=campaignEnemyUsesRotatingTarget(from);
    const targetTurns=encounterRuntime?.enemyTargetTurns||{};
    const turnOffset=rotating?(Math.max(0,Number(targetTurns[String(from)])||0)%heroes.length):0;
    const baseSlot=rotating&&enemies.length>=heroes.length
      ? enemySlot-heroes.length
      : enemySlot;

    // Die urspruenglichen Team-Slots bleiben stabil. Ist der vorgesehene
    // Spieler bereits ausgeschieden, wird der naechste lebende Spieler in
    // derselben Rotation genommen.
    for(let step=0;step<heroes.length;step++){
      const heroIndex=heroes[(baseSlot+turnOffset+step+heroes.length)%heroes.length];
      if(players[heroIndex]?.hp>0) return heroIndex;
    }
    return -1;
  }

  function commitCampaignEnemyAttackTarget(from,targetIndex){
    if(campaignMode&&players[from]?.campaignTeam==="enemy"){
      encounterRuntime.enemyTurnCount=(encounterRuntime.enemyTurnCount||0)+1;
      if(encounterRuntime.markTurns>0){encounterRuntime.markTurns--;if(encounterRuntime.markTurns<=0){encounterRuntime.markedHero=null;encounterRuntime.markSource=null;}}
      applyWorldRuleOnEnemyTurn?.();
      if(getActiveWorldRule?.()!=="final_gravity")updateEncounterEscalation?.();
    }
    if(!campaignEnemyUsesRotatingTarget(from)||players[targetIndex]?.campaignTeam!=="hero") return;
    if(!encounterRuntime.enemyTargetTurns||typeof encounterRuntime.enemyTargetTurns!=="object"){
      encounterRuntime.enemyTargetTurns={};
    }
    const key=String(from);
    encounterRuntime.enemyTargetTurns[key]=Math.max(0,Number(encounterRuntime.enemyTargetTurns[key])||0)+1;
  }

  function nextAttackTarget(from){
    if(!campaignMode) return nextAlive(from);
    const team=players[from]?.campaignTeam;
    if(team==="enemy") return campaignEnemyAttackTarget(from);
    for(let step=1;step<=players.length;step++){
      const i=(from+step)%players.length;
      if(players[i]?.hp>0 && players[i].campaignTeam!==team) return i;
    }
    return -1;
  }

  // Der Combat-Log ist ein reiner, versteckter Debug-Stream. Emojis werden
  // deshalb zentral am einzigen Ausgabe-Sink entfernt, auch wenn neue
  // Logmeldungen spaeter wieder ein Piktogramm im Quelltext mitbringen.
  const COMBAT_LOG_EMOJI_RE=/(?:[#*0-9]\uFE0F?\u20E3|[\u{1F1E6}-\u{1F1FF}]{2}|\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?)*)/gu;
  function combatLogText(text){
    return String(text??"")
      .replace(COMBAT_LOG_EMOJI_RE,"")
      .replace(/[\u200D\uFE0E\uFE0F]/g,"")
      .replace(/[ \t]{2,}/g," ")
      .trim();
  }
  function addLog(text){
    const cleanText=combatLogText(text);
    if(!cleanText) return;
    const d=document.createElement("div"); d.textContent=cleanText; logEl.prepend(d);
  }

  /* ===== Kampflog und Infos: ein Blatt für beide =====
     #log ist und bleibt unsichtbar - der Verlauf steht hinter einem Knopf
     in der Matchbar, die Fähigkeits- und Aufgabenzeilen hinter "Infos" über
     den Würfeln. Beides gibt im Zug seinen Platz frei.

     Das Blatt zeigt KOPIEN. #abilityState und #campaignTaskProgress bleiben
     an ihrem Platz im Baum und werden nur per CSS ausgeblendet; so kann
     kein Renderpfad ins Leere schreiben und nichts muss aufgeräumt werden. */
  function battleSheetCopy(source){
    const copy=source.cloneNode(true);
    // Zwei Knoten mit derselben id waeren ein stiller Fehler:
    // getElementById liefert danach irgendeinen von beiden.
    copy.removeAttribute("id");
    copy.querySelectorAll("[id]").forEach(node=>node.removeAttribute("id"));
    // Ohne Symbole. Die Quelle im Kampf traegt Sprites (der Sprite-Pass
    // ersetzt dort jedes Emoji); im Blatt ist Text Text. #battleSheetBody
    // steht zwar in ALWAYS_SKIP, aber die KOPIE bringt die fertigen Bilder
    // schon mit - der Pass muesste sie gar nicht erst setzen.
    copy.querySelectorAll("img.dd-emoji-sprite,img.p1-inline-icon,img.dd-inline-icon")
      .forEach(node=>node.remove());
    copy.classList.remove("hidden");
    return copy;
  }
  function battleSheetHasContent(el){
    return !!el && !el.classList.contains("hidden") && el.innerHTML.trim()!=="";
  }
  function renderBattleSheetInfo(body){
    // Die Weltregel stand bis V28.12.28 als eigene Leiste ueber den
    // Spielerkarten und kostete dort 58 Pixel - jeden Zug, obwohl man sie
    // einmal liest. Im Blatt steht sie zuoberst, sie gilt fuer alles andere.
    const parts=[["Weltregel",encounterRuleBanner],["Fähigkeiten",abilityState],["Aufgaben",campaignTaskProgress]];
    let any=false;
    for(const [title,source] of parts){
      if(!battleSheetHasContent(source)) continue;
      any=true;
      const head=document.createElement("div");
      head.className="battle-sheet-head";
      head.textContent=tx(title);
      // Von der Regelleiste nur den Text: ihr Rahmen besteht aus 25 SVG-
      // Kacheln, die auf die Proportionen der Leiste gerechnet sind.
      const inner=source===encounterRuleBanner
        ? source.querySelector(":scope > .encounter-rule-text")||source
        : source;
      body.append(head,battleSheetCopy(inner));
    }
    if(!any){
      const empty=document.createElement("div");
      empty.className="battle-sheet-leer";
      empty.textContent=tx("Gerade gibt es nichts zu berichten.");
      body.append(empty);
    }
  }
  function renderBattleSheetLog(body){
    // addLog stellt neue Eintraege VORNE ein. Im Blatt steht der Kampf in
    // der Reihenfolge, in der er passiert ist: Zeile 1 ist die erste Aktion.
    const lines=[...logEl.children].map(node=>node.textContent).filter(t=>t&&t.trim()).reverse();
    if(!lines.length){
      const empty=document.createElement("div");
      empty.className="battle-sheet-leer";
      empty.textContent=tx("Noch kein Eintrag in dieser Partie.");
      body.append(empty);
      return;
    }
    const list=document.createElement("ol");
    list.className="battle-log-list";
    for(const text of lines){
      const row=document.createElement("li");
      row.textContent=text;
      list.append(row);
    }
    body.append(list);
  }
  function openBattleSheet(kind){
    if(!battleSheetOverlay) return;
    battleSheetBody.replaceChildren();
    battleSheetKicker.textContent=tx(kind==="log"?"Verlauf":"Im Zug");
    battleSheetTitle.textContent=tx(kind==="log"?"Kampflog":"Infos");
    if(kind==="log") renderBattleSheetLog(battleSheetBody);
    else renderBattleSheetInfo(battleSheetBody);
    battleSheetOverlay.classList.remove("hidden");
  }
  function closeBattleSheet(){ battleSheetOverlay?.classList.add("hidden"); }
  // Der Infos-Knopf steht nur da, wenn es etwas zu zeigen gibt - im Boss
  // Rush zum Beispiel sind die Faehigkeitszeilen bewusst leer.
  function refreshBattleInfoButton(){
    if(!battleInfoBtn) return;
    // Der Knopf selbst wird versteckt, nicht sein Elternteil: er steht in
    // der Zugkopfzeile neben der Augenzahl, und die muss stehen bleiben.
    const something=battleSheetHasContent(encounterRuleBanner)
      ||battleSheetHasContent(abilityState)
      ||battleSheetHasContent(campaignTaskProgress);
    battleInfoBtn.classList.toggle("hidden",!something);
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
    let heal=Math.max(0,Number(amount)||0);
    if(!p || heal<=0) return 0;
    if(campaignMode&&p.campaignTeam==="hero"&&currentEncounterObject?.()?.modifier==="no_recovery")heal=Math.max(1,Math.floor(heal*.5));
    if(hasAbility(22,index)&&hasMasteryUpgrade(22,2,index)){
      p.masteryHealEffectCount=(Number(p.masteryHealEffectCount)||0)+1;
      if(p.masteryHealEffectCount%2===0){
        heal+=1;
        addLog(`🎲 24: jeder 2. Heileffekt erhält +1 HP.`);
      }
    }
    const before=p.hp;
    // Ueberheilung ohne Deckel stammt aus V24.2 und ist fuer kurze
    // Kampagnen-Encounter gedacht. Im Boss Rush ueber 15 Stufen wurde
    // daraus ein Fass ohne Boden: Helden liefen mit dem Zwoelffachen ihres
    // Maximums herum, und jeder Perk mit einer HP-Prozentschwelle war tot.
    const campaignHeroOverheal=campaignMode && p.campaignTeam==="hero" && !window.WDBossRush?.isActive?.();
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
    const onlineBattle=String(gameContext?.mode||"").startsWith("online");
    players.forEach((p,i)=>{
      const el=document.createElement("div");
      el.id="playerCard"+i;
      el.className="player"+(p.cosmeticFrame?` frame-${p.cosmeticFrame}`:"")+(i===current&&p.hp>0?" active":"")+(p.hp<=0?" dead":"")+(p.enemyInstanceId?" campaign-enemy-instance":"")+(attackTarget===i&&p.hp>0?" current-target":"");
      el.dataset.instanceId=p.enemyInstanceId||`player:${i}`;
      const bossRushWorldTheme=p.campaignTeam==="enemy"&&window.WDBossRush?.isActive?.()
        ?window.WDBossRush.worldThemeKey?.()
        :null;
      if(bossRushWorldTheme){
        el.classList.add("boss-rush-world-enemy");
        el.dataset.bossRushStage=String(window.WDBossRush.stageNumber?.()||1);
        window.WDCampaignWorldThemes?.applyTheme?.(el,bossRushWorldTheme);
      }
      const mutator=p.mutatorId&&ELITE_MUTATORS[p.mutatorId];
      const marked=campaignMode&&p.campaignTeam==="hero"&&encounterRuntime?.markTurns>0&&encounterRuntime.markedHero===i;
      const campaignCompact=campaignMode;
      el.innerHTML=`<div class="player-name"><span class="player-name-text">${escapeHtml(p.name)}</span></div>${p.cosmeticTitle?`<div class="profile-title-badge">${escapeHtml(p.cosmeticTitle)}</div>`:""}
        ${!campaignCompact&&p.botLevel&&p.botLevel!=="human"?`<div class="bot-tag">🤖 ${escapeHtml(BOT_LEVELS[p.botLevel]?.name.replace("Bot · ","")||"Bot")}</div>`:""}
        ${mutator?`<div class="endgame-combat-badge" title="${escapeHtml(mutator.desc)}">${escapeHtml(mutator.name)}</div>`:""}
        ${marked?`<div class="endgame-combat-badge mark-badge">${escapeHtml(tx("MARKIERT"))} · ${encounterRuntime.markTurns}</div>`:""}
        <div class="hp">❤️ <strong>${Math.max(0,p.hp)}</strong> / ${maxHpForPlayer(p)}</div>
        <div class="ability-tag">⚡ ${escapeHtml(ABILITIES[p.ability].name)}</div>
        ${p.secondAbility!=null ? `<div class="ability-tag second">✦ ${escapeHtml(ABILITIES[p.secondAbility].name)}</div>` : ""}
        ${p.thirdAbility!=null ? `<div class="ability-tag third">✦ ${escapeHtml(ABILITIES[p.thirdAbility].name)}</div>` : ""}
        ${p.fourthAbility!=null ? `<div class="ability-tag fourth">✦ ${escapeHtml(ABILITIES[p.fourthAbility].name)}</div>` : ""}
        ${campaignCompact?"":`<div class="seat-tag">${onlineBattle?"":`💺 ${escapeHtml(SEATS[p.seat].name)} · `}🎲 ${escapeHtml(DICE_DESIGNS[p.diceDesign]?.name||"Classic")}</div>
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
      rotationShell.style.removeProperty("height");
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

  // Nur die bewusst unangetastete Testumgebung nutzt weiterhin die alten
  // Font-Wuerfel. Im normalen Spiel werden Classic-Spezialwuerfel als Pips
  // gerendert, damit dort kein Emoji-/Symbol-Fallback mehr sichtbar ist.
  function testLabDieSymbol(v){ return v==null?"?":["⚀","⚁","⚂","⚃","⚄","⚅"][v-1]; }

  const DICE_ART_VARIABLES=["--die-art-question","--die-art-current",...Array.from({length:6},(_,i)=>`--die-art-face-${i+1}`)];
  function diceArtworkAsset(designKey,face="question"){
    const artKey=DICE_DESIGNS[designKey]?.artKey;
    if(!artKey) return "";
    const suffix=face==="question"?"question":String(Math.max(1,Math.min(6,Number(face)||1)));
    return `assets/ui/v28/png/dice-designs/${artKey}/${artKey}-face-${suffix}.webp?v=${ASSET_REV}`;
  }
  function clearDiceArtwork(el){
    el.classList.remove("theme-art-die");
    DICE_ART_VARIABLES.forEach(name=>el.style.removeProperty(name));
    delete el.dataset.diceArt;
  }
  function applyDiceArtwork(el,designKey,value=null){
    const design=DICE_DESIGNS[designKey];
    if(!design?.artKey){clearDiceArtwork(el);return false;}
    el.classList.add("theme-art-die");
    el.dataset.diceArt=design.artKey;
    for(let face=1;face<=6;face++) el.style.setProperty(`--die-art-face-${face}`,`url("${diceArtworkAsset(designKey,face)}")`);
    el.style.setProperty("--die-art-question",`url("${diceArtworkAsset(designKey,"question")}")`);
    el.style.setProperty("--die-art-current",`url("${diceArtworkAsset(designKey,value==null?"question":value)}")`);
    return true;
  }

  // V27.1.3 – versteckter Kompatibilitätscode für problematische ältere Android-GPUs.
  // Sobald ein echtes Spielerprofil „GalaxyA50“ heißt (Leerzeichen/Bindestriche egal),
  // nutzt dieses Gerät für ALLE Würfel der Partie den stabilen 2D-Würfelrenderer. Ohne diesen Profilcode bleibt alles 3D.
  function galaxyA50CompatibilityMode(){
    const enabled=Array.isArray(players) && players.some(p=>{
      if(!p?.profileId) return false;
      const code=String(p.name||"").trim().toLowerCase().replace(/[\s_-]+/g,"");
      return code==="galaxya50";
    });
    document.documentElement.classList.toggle("legacy-flat-dice",enabled);
    return enabled;
  }

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

  function ensureSpecialPipDieStructure(el){
    let face=el.querySelector(":scope > .special-die-flat-face");
    if(face) return face;
    face=document.createElement("span");
    face.className="special-die-flat-face";
    const grid=document.createElement("span");
    grid.className="special-die-flat-pips";
    for(let pos=1;pos<=9;pos++){
      const pip=document.createElement("span");
      pip.className="special-die-flat-pip";
      pip.dataset.pos=String(pos);
      grid.appendChild(pip);
    }
    const question=document.createElement("span");
    question.className="special-die-flat-question";
    question.textContent="?";
    face.append(grid,question);
    el.replaceChildren(face);
    return face;
  }

  function renderSpecialPipDie(el,value){
    el.querySelector(":scope > .die-cube")?.remove();
    el.querySelector(":scope > img.die-art-sprite")?.remove();
    clearDiceArtwork(el);
    const face=ensureSpecialPipDieStructure(el);
    const active=new Set(DIE_PIP_POSITIONS[value]||[]);
    face.querySelectorAll(".special-die-flat-pip").forEach(pip=>{
      pip.classList.toggle("active",active.has(Number(pip.dataset.pos)));
    });
    face.querySelector(".special-die-flat-pips").classList.toggle("hidden",value==null);
    face.querySelector(".special-die-flat-question").classList.toggle("hidden",value!=null);
    el.dataset.value=value==null?"":String(value);
    el.setAttribute("aria-label",value==null?"Würfel bereit":`Würfel ${value}`);
  }

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

  function stampArtFaces(el,designKey,value){
    const cube=ensure3DDieStructure(el);
    cube.querySelectorAll(":scope > .die-face").forEach(side=>{
      const face=Number(side.dataset.face)||1;
      let img=side.querySelector(":scope > img.die-face-art");
      if(!img){
        img=document.createElement("img");
        img.className="die-face-art";
        img.alt="";
        img.draggable=false;
        img.setAttribute("aria-hidden","true");
        side.prepend(img);
      }
      const next=diceArtworkAsset(designKey,value==null?"question":face);
      if(img.getAttribute("src")!==next) img.src=next;
    });
    return cube;
  }

  function ensureArtSprite(el,designKey,value){
    let img=el.querySelector(":scope > img.die-art-sprite");
    if(!img){
      img=document.createElement("img");
      img.className="die-art-sprite";
      img.alt="";
      img.draggable=false;
      img.setAttribute("aria-hidden","true");
      el.appendChild(img);
    }
    const next=diceArtworkAsset(designKey,value==null?"question":value);
    if(img.getAttribute("src")!==next) img.src=next;
  }

  function applyArtCube(el,designKey,value){
    applyDiceArtwork(el,designKey,value);
    stampArtFaces(el,designKey,value);
    ensureArtSprite(el,designKey,value);
    const dieWidth=el.getBoundingClientRect().width;
    if(dieWidth>0) el.style.setProperty("--die-half",`${Math.max(14,(dieWidth-6)/2)}px`);
    const rotation=DIE_3D_ROTATION[value]||DIE_3D_ROTATION[1];
    if(!el.classList.contains("rolling")){
      el.style.setProperty("--die-rx",rotation[0]);
      el.style.setProperty("--die-ry",rotation[1]);
    }
    el.dataset.value=value==null?"":String(value);
    el.setAttribute("aria-label",value==null?"Würfel bereit":`Würfel ${value}`);
  }

  function renderSpecialDieFace(el,designKey,value=null){
    const artKey=DICE_DESIGNS[designKey]?.artKey;
    const testLabActive=document.body.classList.contains("test-lab-active");

    // Die Testumgebung bleibt exakt auf ihrem bisherigen Renderer.
    if(testLabActive){
      if(el.classList.contains("d4") || !artKey){
        el.querySelector(":scope > .die-cube")?.remove();
        el.querySelector(":scope > img.die-art-sprite")?.remove();
        clearDiceArtwork(el);
        el.dataset.value=value==null?"":String(value);
        el.textContent=testLabDieSymbol(value);
        el.setAttribute("aria-label",value==null?"Würfel bereit":`Würfel ${value}`);
        return;
      }
      applyArtCube(el,designKey,value);
      return;
    }

    if(el.classList.contains("d4")){
      el.querySelector(":scope > .die-cube")?.remove();
      el.querySelector(":scope > img.die-art-sprite")?.remove();
      clearDiceArtwork(el);
      el.dataset.value=value==null?"":String(value);
      el.textContent=value==null?"?":String(value);
      el.setAttribute("aria-label",value==null?"Würfel bereit":`Würfel ${value}`);
      return;
    }
    // Derselbe 3D-Weg wie beim normalen Wuerfel, fuer JEDES Design. Bis
    // V28.12.22 lief Classic hier ueber eine flache Pip-Flaeche und die
    // Artwork-Designs ueber einen Kubus, der waehrend des Wurfs unsichtbar
    // war - gemeldet als "2D statt der sauberen 3D-Animation".
    render3DDieNode(el,value,designKey);
    sizeSpecialCube(el);
  }

  // render3DDieNode misst die RAHMENBOX. Der grosse Spezialwuerfel traegt
  // seit dem Rahmenumbau border-width:40px, seine Innenbox ist also nur rund
  // halb so breit - mit der Rahmenbox als Grundlage wird der Kubus doppelt
  // so tief wie breit, die Flaechen fuellen den ganzen Knopf und der Wurf
  // sieht aus wie eine weisse Flaeche. Gemessen wird deshalb clientWidth.
  //
  // Der Wuerfel soll die OEFFNUNG des Rahmens fuellen, nicht die Innenbox.
  // Der gemalte Rahmen belegt nur die aeusseren rund 8px des 40px breiten
  // Randes: im Rahmenbild (640px) ist das Band 30px breit, und mit
  // border-image-slice:150 auf border-width:40px wird daraus 30*40/150 = 8px.
  // Der Rest des Randes ist durchsichtig. Ohne diese Rechnung sass der
  // Wuerfel sichtbar zu klein in einem viel zu grossen Rahmen.
  const RAHMEN_BAND=8, RAHMEN_LUFT=4;
  // SPRITE_SCALE ist derselbe Faktor wie bei .theme-art-die>.die-art-sprite:
  // die Wuerfelbilder tragen rund 19% durchsichtigen Rand, die Sprite muss
  // also groesser sein als der Kubus, damit BEIDE gleich gross aussehen.
  const SPRITE_SCALE=1.24;

  // Gemessen wird erst, wenn der Knopf wirklich auf dem Schirm steht.
  // openInsurance & Co. zeichnen den Wuerfel, WAEHREND ihr Fenster noch
  // versteckt ist - dort ist jede Breite 0, und der Wuerfel bliebe bis zum
  // ersten Wurf zu klein. Der Beobachter holt die Messung nach, sobald der
  // Knopf seine Groesse bekommt. Er kann sich nicht selbst ausloesen: er
  // setzt nur CSS-Variablen, keine Masse des Knopfes.
  const gemesseneWuerfel=new WeakSet();
  function sizeSpecialCube(el){
    if(!gemesseneWuerfel.has(el)&&typeof ResizeObserver==="function"){
      gemesseneWuerfel.add(el);
      new ResizeObserver(()=>messeSpecialCube(el)).observe(el);
    }
    messeSpecialCube(el);
  }

  function messeSpecialCube(el){
    // offsetWidth, nicht getBoundingClientRect: der Knopf pulsiert waehrend
    // des Wurfs (wdWuerfelPuls), und die Rechteckmessung zaehlt diese
    // Skalierung mit - der Kubus haette bei jedem Tick eine andere Kante.
    const innen=el.clientWidth;
    const aussen=el.offsetWidth;
    if(innen<=0||aussen<=0)return;
    const seite=Math.max(innen,aussen-2*(RAHMEN_BAND+RAHMEN_LUFT));
    el.style.setProperty("--die-half",`${seite/2}px`);
    el.style.setProperty("--die-cube-inset",`${(innen-seite)/2}px`);
    el.style.setProperty("--die-sprite-scale",`${seite*SPRITE_SCALE/innen}`);
    el.style.setProperty("--die-pip-size",`${Math.max(8,Math.min(30,seite*.17))}px`);
    el.style.setProperty("--die-question-size",`${Math.max(34,Math.min(110,seite*.62))}px`);
  }

  function render3DDieNode(el,value,designKey="classic"){
    if(DICE_DESIGNS[designKey]?.artKey && !galaxyA50CompatibilityMode()){
      applyArtCube(el,designKey,value);
      return;
    }
    el.querySelector(":scope > img.die-art-sprite")?.remove();
    el.querySelectorAll("img.die-face-art").forEach(n=>n.remove());
    applyDiceArtwork(el,designKey,value);
    if(galaxyA50CompatibilityMode()){
      renderFlatDieNode(el,value);
      return;
    }
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

  function ensureFlatDieStructure(el){
    let face=el.querySelector(".die-flat-face");
    if(face) return face;
    face=document.createElement("div");
    face.className="die-flat-face";
    const grid=document.createElement("div");
    grid.className="die-flat-pips";
    for(let pos=1;pos<=9;pos++){
      const pip=document.createElement("span");
      pip.className="die-flat-pip";
      pip.dataset.pos=String(pos);
      grid.appendChild(pip);
    }
    const question=document.createElement("div");
    question.className="die-flat-question";
    question.textContent="?";
    face.append(grid,question);
    el.replaceChildren(face);
    return face;
  }

  function renderFlatDieNode(el,value){
    const face=ensureFlatDieStructure(el);
    const active=new Set(DIE_PIP_POSITIONS[value]||[]);
    face.querySelectorAll(".die-flat-pip").forEach(pip=>pip.classList.toggle("active",active.has(Number(pip.dataset.pos))));
    face.querySelector(".die-flat-pips").classList.toggle("hidden",value==null);
    face.querySelector(".die-flat-question").classList.toggle("hidden",value!=null);
    el.dataset.value=value==null?"":String(value);
    el.setAttribute("aria-label",value==null?"Würfel bereit":`Würfel ${value}`);
  }

  function currentSum(){ return dice.reduce((s,d)=>s+(d.value||0),0); }
  function stackingDamageBonus(){
    let bonus=0;
    if(hasAbility(9) && players[current].hp<=(hasMasteryUpgrade(9,1,current)?15:10)) bonus+=2;
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
    // Ultra-Stufen im Boss Rush: der Gegner trifft haerter je Wuerfel, nicht
    // nur haeufiger. Die Zeile "Jeder Treffer macht X Schaden" zieht mit.
    dmg+=window.WDBossRush?.enemyHitBonus?.(current)||0;
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
      render3DDieNode(el,d.value,designKey);
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
    turnLine.innerHTML=`${escapeHtml(players[current].name)} ist dran${botText}`;

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
      const wildcardWindow=wildcardFace!=null && (attackRollCount===0 || (attackRollCount===1&&hasMasteryUpgrade(17,1,current)));
      const wildText=wildcardWindow ? ` Wildcard: auch ${wildcardFace}er zählen${attackRollCount===1?" im zweiten Wurf":" im ersten Wurf"}.` : "";
      statusEl.textContent=`Angriff auf ${players[attackTarget].name}: Du brauchst ${attackFace}er. Jeder normale Treffer macht ${damagePerAttackHit()} Schaden.${bloodText}${wildText}`;
      sumLabel.textContent="Angriff";
    }
    else if(phase==="attack_after_roll"){
      const secondChanceForced=currentAttackRollNewHits===0&&hasAbility(4)&&!attackPowerUsed&&dice.some(d=>!d.locked);
      const doubleTapChoice=hasAbility(24)&&attackHits===2&&currentAttackRollNewHits>0;
      statusEl.textContent=doubleTapChoice
        ? `Double Tap bereit: Sichere jetzt exakt 2 Treffer oder würfle bewusst mit den übrigen Würfeln weiter.`
        : (secondChanceForced
          ? `0 neue Treffer. Zweite Chance ist noch verfügbar – würfle zuerst alle Nicht-Treffer erneut.`
          : `${currentAttackRollNewHits} neuer Treffer in diesem Wurf. Du kannst auswerten oder ggf. Fähigkeit 4 jetzt einsetzen.`);
      sumLabel.textContent="Angriff";
    }
    else if(phase==="attack_continue"){
      const bloodText=bloodPriceNeighbors.length ? ` Blutpreis aktiv: ${[attackFace,...bloodPriceNeighbors].sort((a,b)=>a-b).map(v=>v+"er").join(", ")} treffen in diesem Wurf.` : "";
      statusEl.textContent=`${attackHits} Treffer gelockt. Würfle die übrigen Würfel weiter.${bloodText}`;sumLabel.textContent="Angriff";
    }
    else if(phase==="base_auto_end"){statusEl.textContent="Basiszug beendet – nächster Spieler...";}
    else if(phase==="turn_done"){statusEl.textContent="Angriff beendet.";}

    // Im Boss Rush bleibt die Fähigkeitsliste aus: die Loadouts wechseln je
    // Stufe und stehen im Belohnungsfenster, hier kosten sie nur Platz.
    if(window.WDBossRush?.isActive?.()){abilityState.innerHTML="";abilityState.classList.add("hidden");return;}
    abilityState.classList.remove("hidden");
    const abilityLines=playerAbilities().map(a=>{
      let usage="passiv";
      if(a===3) usage=baseRerollUsed?"bereits benutzt":"noch verfügbar";
      if(a===4){const maxChance=hasMasteryUpgrade(4,1,current)?2:1;usage=`${Math.max(0,maxChance-attackPowerUses)}/${maxChance} verfügbar`;}
      if(a===7) usage="Glück aktiv";
      if(a===8){const maxPrecision=hasMasteryUpgrade(8,1,current)?3:2;usage=`${Math.max(0,maxPrecision-precisionUses)}/${maxPrecision} Rettungen verfügbar`;}
      if(a===9) usage=players[current].hp<=10?"RACHE AKTIV: +2 pro Treffer":"aktiv ab 10 HP";
      if(a===10) usage=`Serie ${players[current].momentumStreak||0} · Bonus +${momentumBonus} pro Treffer`;
      if(a===11) usage=bloodPriceNeighbors.length?`Blutpreis aktiv: ${[attackFace,...bloodPriceNeighbors].sort((x,y)=>x-y).join("/")}`:"3 HP pro Einsatz";
      if(a===12) usage="bei Basiswurf >25";
      if(a===13) usage="bei jedem erfolgreichen Angriff verfügbar";
      if(a===14) usage=players[current].lastStandUsed?"diese Runde verbraucht":"1× pro Runde bereit";
      if(a===15) usage="triggert bei exakt 25";
      if(a===16) usage="1 Schaden pro Würfeltreffer";
      if(a===17) usage=wildcardFace!=null&&firstAttackRoll?`Wildcard: ${wildcardFace}`:"erster Angriffswurf";
      if(a===18){const maxLoaded=hasMasteryUpgrade(18,1,current)?2:1;usage=`${Math.max(0,maxLoaded-loadedDiceUses)}/${maxLoaded} pro Basiszug verfügbar`;}
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

  function battleAction(btn, label, icon){
    const img=document.createElement("img");
    img.className="p1-action-icon";
    img.src=`assets/ui/v28/svg/${icon}?v=${ASSET_REV}`;
    img.alt="";
    img.draggable=false;
    img.setAttribute("aria-hidden","true");
    btn.replaceChildren(img, document.createTextNode(label));
    btn.classList.add("p1-action-button");
  }
  function hideAllControls(){
    campaignTargetBox.classList.add("hidden");
    [primaryBtn,lockBtn,baseRerollBtn,loadedDiceBtn,snakeEyesBtn,attackPowerBtn,bloodLowerBtn,bloodHigherBtn,bloodRushMasteryBtn,resolveAttackBtn,nextBtn].forEach(b=>{
      b.classList.add("hidden"); b.disabled=false;
    });
  }
  function updateButtons(){
    hideAllControls();
    if(isAnimating) return;
    if(phase==="campaign_target"){renderCampaignTargetChoices();return;}

    if(phase==="idle"){primaryBtn.classList.remove("hidden");battleAction(primaryBtn,"Würfeln","gameplay/dice.svg");}
    if(phase==="base_select"){
      lockBtn.classList.remove("hidden");
      lockBtn.disabled=!dice.some(d=>d.selected&&!d.locked);
      if(hasAbility(3)){
        const maxLuckUses=hasMasteryUpgrade(3,2,current)?2:1;
        const standardLuck=luckRerollUses<maxLuckUses&&dice.some(d=>!d.locked&&d.value===1);
        const secondLuck=hasMasteryUpgrade(3,1,current)&&luckRerollUses>0&&!luckRerollSecondUsed&&luckRerollIndex!=null&&dice[luckRerollIndex]&&!dice[luckRerollIndex].locked;
        if(standardLuck||secondLuck){
          baseRerollBtn.classList.remove("hidden");
          baseRerollBtn.textContent=tx(secondLuck?"Reroll the Reroll":"Glückswurf");
        }
      }

      const loadedMax=hasMasteryUpgrade(18,1,current)?2:1;
      const loadedUiCost=(hasMasteryUpgrade(18,2,current)&&loadedDiceUses===1)?1:2;
      if(hasAbility(18) && loadedDiceUses<loadedMax && players[current].hp>loadedUiCost){
        const selectedEligible=dice
          .map((d,i)=>({d,i}))
          .filter(x=>x.d.selected && !x.d.locked && x.d.value!=null && x.d.value!==5);
        if(selectedEligible.length===1){
          const v=selectedEligible[0].d.value;
          loadedDiceBtn.classList.remove("hidden");
          const shownCost=(hasMasteryUpgrade(18,2,current)&&loadedDiceUses===1)?1:2;loadedDiceBtn.textContent=tx("Loaded Dice");
        }
      }

      const snakeGroup=snakeEyesGroup();
      if(hasAbility(20) && snakeGroup){
        snakeEyesBtn.classList.remove("hidden");
        snakeEyesBtn.textContent=tx("Snake Eyes");
      }
    }
    if(phase==="base_ready"){primaryBtn.classList.remove("hidden");battleAction(primaryBtn,"Würfeln","gameplay/dice.svg");}
    if(phase==="attack_ready"||phase==="attack_continue"){
      primaryBtn.classList.remove("hidden");
      // Kurz halten: der Knopf heisst in jeder Phase "Wuerfeln". Welche
      // Zahl gesucht ist, welche Nachbarzahlen der Blutpreis mittraegt und
      // was ein Treffer kostet, steht vollstaendig in der Statuszeile
      // darueber - auf dem Knopf war es doppelt und machte ihn so breit,
      // dass kein zweiter daneben passte.
      battleAction(
        primaryBtn,
        "Würfeln",
        bloodPriceNeighbors.length ? "gameplay/heart-hp.svg" : "gameplay/attack.svg"
      );

      if(hasAbility(11) && bloodPriceNeighbors.length===0 && players[current].hp>3){
        const neighbors=[];
        if(attackFace>1) neighbors.push(attackFace-1);
        if(attackFace<6) neighbors.push(attackFace+1);
        if(neighbors.length){
          bloodLowerBtn.classList.remove("hidden");
          bloodLowerBtn.textContent=tx("Blutpreis");
        }
      }
    }
    if(phase==="attack_after_roll"){
      if(hasAbility(11)&&hasMasteryUpgrade(11,2,current)&&!bloodPriceWasPreActivatedThisRoll&&bloodPriceNeighbors.length===0&&players[current].hp>5){
        const neighbors=[];if(attackFace>1)neighbors.push(attackFace-1);if(attackFace<6)neighbors.push(attackFace+1);
        if(neighbors.length){bloodLowerBtn.classList.remove("hidden");bloodLowerBtn.textContent=tx("Blood Credit");}
      }
      if(hasAbility(23)&&hasMasteryUpgrade(23,2,current)&&!bloodRushActiveThisAttack&&players[current].hp>1){
        bloodRushMasteryBtn.classList.remove("hidden");
        bloodRushMasteryBtn.textContent=tx("Self Harm");
      }
      const secondChanceMax=hasMasteryUpgrade(4,1,current)?2:1;
      const secondChanceAvailable=hasAbility(4)&&attackPowerUses<secondChanceMax&&dice.some(d=>!d.locked);
      const doubleTapChoice=hasAbility(24)&&attackHits===2&&currentAttackRollNewHits>0;

      if(secondChanceAvailable){
        attackPowerBtn.classList.remove("hidden");
        attackPowerBtn.textContent=tx("Zweite Chance");
      }
      const attackSnakeGroup=hasMasteryUpgrade(20,1,current)?snakeEyesGroup():null;
      if(hasAbility(20)&&attackSnakeGroup){
        snakeEyesBtn.classList.remove("hidden");
        snakeEyesBtn.textContent=tx("Snake Bite");
      }

      // Double Tap ist eine echte Entscheidung: exakt 2 Treffer sichern ODER
      // bewusst weiterwürfeln. Das Weiterwürfeln liegt auf dem normalen Hauptbutton,
      // der Cash-out auf dem Auswerten-Button.
      if(doubleTapChoice){
        primaryBtn.classList.remove("hidden");
        battleAction(primaryBtn,"Würfeln","gameplay/dice.svg");
        resolveAttackBtn.classList.remove("hidden");
        resolveAttackBtn.textContent="🔫 2 Treffer sichern · Double Tap";
      }
      // QoL: Wenn der Angriff gerade an 0 neuen Treffern scheitern würde und
      // Zweite Chance noch verfügbar ist, darf man nicht versehentlich beenden.
      // Erst nach Einsatz der Fähigkeit erscheint "Angriff beenden".
      else if(currentAttackRollNewHits>0 || !secondChanceAvailable){
        resolveAttackBtn.classList.remove("hidden");
        resolveAttackBtn.textContent=currentAttackRollNewHits===0?"Angriff beenden":"Angriff fortsetzen";
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

  // Die Zahl an der Spielerkarte ("-14 HP") hing bis V28.12.21 IN der Karte.
  // Damit steckte sie in deren Stapelkontext und lag zwangslaeufig unter
  // jedem Kampf-Overlay - beim Counterattack also genau dann unsichtbar,
  // wenn der Schaden entsteht. Eine hoehere z-index am Element selbst hilft
  // dagegen nicht; sie muss aus der Karte heraus.
  // Sie wird deshalb fest ueber der Karte positioniert an den Koerper
  // gehaengt, im selben Band wie die uebrigen Meldeschichten.
  function cardValuePop(card,klasse,text,dauer){
    if(!card)return;
    const box=card.getBoundingClientRect();
    const pop=document.createElement("div");
    pop.className=`${klasse} dd-card-pop`;
    pop.textContent=text;
    pop.style.left=`${Math.round(box.left+box.width/2)}px`;
    pop.style.top=`${Math.round(box.top)}px`;
    document.body.appendChild(pop);
    setTimeout(()=>pop.remove(),dauer);
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
      cardValuePop(card,"damage-pop",`−${amount} HP`,950);
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
      cardValuePop(card,"heal-pop",`+${amount} HP`,1050);
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
    // Nach den beiden Rendern, die den Inhalt setzen: erst dann steht fest,
    // ob es ueberhaupt etwas zu zeigen gibt.
    refreshBattleInfoButton();
    // Während eines Würfelwurfs bleibt die Board-Geometrie eingefroren.
    // Die Würfel selbst dürfen rotieren/skalieren; nur die äußere Board-Geometrie bleibt konstant.
    if(!isAnimating) applySeatRotation();
    flushPendingFx();
    scheduleBotAction();
  }
