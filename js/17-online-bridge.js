(function(){
  "use strict";

  let onlineSession={active:false,uid:"",roomCode:"",isHost:false,lastStateSeq:0,actionPending:false,pendingActionId:"",pendingActionType:"",previewActionId:"",previewType:"",transportConnected:true,pendingTimer:null,lastHostActionType:"",lastHostActionAt:0,lastCombatFxId:"",playedCombatFxIds:new Set(),localRoundCommitted:false};
  let onlineInputHooksInstalled=false;

  const ONLINE_ACTION_BUTTONS=[
    [primaryBtn,"primary"],
    [lockBtn,"lock"],
    [baseRerollBtn,"base_reroll"],
    [loadedDiceBtn,"loaded_dice"],
    [snakeEyesBtn,"snake_eyes"],
    [attackPowerBtn,"attack_power"],
    [bloodLowerBtn,"blood_price"],
    [bloodHigherBtn,"blood_price"],
    [resolveAttackBtn,"resolve_attack"],
    [nextBtn,"next_turn"],
    [gamblingDie,"gambling_roll"],
    [perfect25Die,"perfect25_roll"],
    [perfect25D4Die,"perfect25_d4_roll"],
    [highStakesDie,"high_stakes_roll"],
    [highStakesSkip,"high_stakes_skip"],
    [insuranceDie,"insurance_roll"],
    [counterRollBtn,"counter_roll"]
  ];

  const MAIN_ROLL_ACTIONS=new Set(["primary","base_reroll","snake_eyes","attack_power"]);
  const SPECIAL_ROLL_ACTIONS=new Set(["gambling_roll","perfect25_roll","perfect25_d4_roll","high_stakes_roll","insurance_roll","counter_roll"]);
  const ONLINE_ROLL_VISUAL_ACTIONS=new Set([...MAIN_ROLL_ACTIONS,...SPECIAL_ROLL_ACTIONS]);

  function isOnlineRollVisual(type){
    return ONLINE_ROLL_VISUAL_ACTIONS.has(String(type||""));
  }

  function beginOnlineRollWindow(type,{remote=false}={}){
    if(!isOnlineRollVisual(type)) return false;
    document.body.classList.add("online-roll-window");
    if(remote) document.body.classList.add("online-remote-roll-preview");
    return true;
  }

  function prepareOnlineRollCommit(){
    document.body.classList.remove("online-remote-roll-preview");
    document.body.classList.add("online-dice-snap");
  }

  function finishOnlineRollWindow(){
    document.body.classList.remove("online-remote-roll-preview","online-roll-window");
    requestAnimationFrame(()=>requestAnimationFrame(()=>document.body.classList.remove("online-dice-snap")));
  }

  function isOnlineMatch(){
    return onlineSession.active && String(gameContext?.mode||"").startsWith("online");
  }

  function cloneJson(value,fallback=null){
    try{return JSON.parse(JSON.stringify(value));}catch(_){return fallback;}
  }

  function uidForIndex(index){
    return String(players[index]?.onlineUid||"");
  }

  function interactionOwnerUid(){
    if(!isOnlineMatch()) return "";
    if(!winnerBox.classList.contains("hidden")) return "";
    if(secondAbilityDraftBusy && secondAbilityDraftIndex!=null) return uidForIndex(secondAbilityDraftIndex);
    if(!secondAbilityDraftBusy && Array.isArray(secondAbilityDraftQueue) && secondAbilityDraftQueue.length){
      const queued=secondAbilityDraftQueue[0];
      const queuedIndex=typeof queued==="object"?Number(queued.index):Number(queued);
      if(Number.isInteger(queuedIndex)) return uidForIndex(queuedIndex);
    }
    if(pendingCounterattack?.defenderIndex!=null) return uidForIndex(pendingCounterattack.defenderIndex);
    if(phase==="counterattack" && counterContext?.defenderIndex!=null) return uidForIndex(counterContext.defenderIndex);
    return uidForIndex(current);
  }

  function localOwnsInteraction(){
    return isOnlineMatch() && interactionOwnerUid()===String(onlineSession.uid||"");
  }

  function clearPendingAction(){
    if(onlineSession.pendingTimer){clearTimeout(onlineSession.pendingTimer);onlineSession.pendingTimer=null;}
    onlineSession.actionPending=false;
    onlineSession.pendingActionId="";
    onlineSession.pendingActionType="";
    onlineSession.previewActionId="";
    onlineSession.previewType="";
  }

  function selectedDiceIndices(){
    const out=[];
    dice.forEach((d,i)=>{if(d?.selected&&!d?.locked)out.push(i);});
    return out;
  }

  function payloadForAction(type){
    if(type==="lock") return {indices:selectedDiceIndices()};
    if(type==="loaded_dice"){
      const indices=selectedDiceIndices();
      return {selectedIndex:indices.length===1?indices[0]:-1};
    }
    return {};
  }

  function previewMainRoll(type){
    if(!isOnlineMatch() || onlineSession.isHost) return false;
    let indices=[];
    if(type==="primary") indices=dice.map((d,i)=>!d.locked?i:-1).filter(i=>i>=0);
    else if(type==="base_reroll"){
      const idx=dice.findIndex(d=>!d.locked&&d.value===1);
      if(idx>=0) indices=[idx];
    }else if(type==="snake_eyes"){
      try{const group=snakeEyesGroup();if(group?.indices)indices=[...group.indices];}catch(_){}
    }else if(type==="attack_power") indices=dice.map((d,i)=>!d.locked?i:-1).filter(i=>i>=0);
    if(!indices.length) return false;
    indices.forEach(i=>{if(dice[i])dice[i].rolling=true;});
    isAnimating=true;
    renderDice();
    return true;
  }

  function previewSpecialRoll(type){
    if(!isOnlineMatch() || onlineSession.isHost) return false;
    const map={
      gambling_roll:[gamblingDie,gamblingResult],
      perfect25_roll:[perfect25Die,perfect25Result],
      perfect25_d4_roll:[perfect25D4Die,perfect25D4Result],
      high_stakes_roll:[highStakesDie,highStakesResult],
      insurance_roll:[insuranceDie,insuranceResult]
    };
    if(type==="counter_roll"){
      if(!counterContext||!Array.isArray(counterDiceState)) return false;
      counterDiceState.forEach(d=>{if(!d.locked)d.rolling=true;});
      counterRolling=true;
      counterRollBtn.disabled=true;
      counterResult.textContent="...";
      renderCounterDice();
      return true;
    }
    const pair=map[type];
    if(!pair) return false;
    const [die,result]=pair;
    die?.classList?.add("rolling");
    if(die) die.disabled=true;
    if(result) result.textContent="...";
    return true;
  }

  function beginActionPreview(type,actionId=""){
    if(onlineSession.isHost) return;
    const actionType=String(type||"");
    beginOnlineRollWindow(actionType,{remote:true});
    if(MAIN_ROLL_ACTIONS.has(actionType)) previewMainRoll(actionType);
    else if(SPECIAL_ROLL_ACTIONS.has(actionType)) previewSpecialRoll(actionType);
    onlineSession.previewActionId=String(actionId||onlineSession.previewActionId||"");
    onlineSession.previewType=actionType;
  }

  function previewRemoteAction(visual){
    if(!isOnlineMatch()||!visual) return false;
    const id=String(visual.id||"");
    const actorUid=String(visual.actorUid||"");
    if(id && id===onlineSession.previewActionId) return true;
    if(actorUid===String(onlineSession.uid||"") && onlineSession.actionPending) return true;
    beginActionPreview(String(visual.type||""),id);
    if(actorUid!==String(onlineSession.uid||"")) setStatusForOnline();
    return true;
  }

  function transportActionRejected(actionId,message="🌐 Aktion wurde vom Host verworfen."){
    if(actionId && onlineSession.pendingActionId && String(actionId)!==String(onlineSession.pendingActionId)) return;
    prepareOnlineRollCommit();
    if(isAnimating){dice.forEach(d=>{if(d)d.rolling=false;});isAnimating=false;renderDice();}
    if(counterRolling){counterRolling=false;counterDiceState.forEach(d=>{if(d)d.rolling=false;});renderCounterDice();}
    clearPendingAction();
    finishOnlineRollWindow();
    enforceOnlineControls(message);
  }

  function setStatusForOnline(){
    if(!isOnlineMatch()) return;
    if(!winnerBox.classList.contains("hidden")) return;
    const owner=interactionOwnerUid();
    if(onlineSession.actionPending){
      statusEl.textContent="🌐 Aktion wird synchronisiert …";
      return;
    }
    if(owner && owner!==onlineSession.uid){
      const index=players.findIndex(p=>String(p?.onlineUid||"")===owner);
      const name=index>=0?players[index]?.name:"Gegner";
      if(secondAbilityDraftBusy) statusEl.textContent=`🌐 ${name} wählt eine Fähigkeit …`;
      else if(phase==="counterattack") statusEl.textContent=`🌐 ${name} führt die Counterattack aus …`;
      else statusEl.textContent=`🌐 ${name} ist dran.`;
    }
  }

  function enforceOnlineControls(message=""){
    if(!isOnlineMatch()) return;
    const canInteract=localOwnsInteraction() && onlineSession.transportConnected && (!onlineSession.actionPending || onlineSession.isHost) && !isAnimating;

    // renderAll()/updateButtons entscheidet weiterhin, WELCHE Controls regeltechnisch
    // sichtbar bzw. deaktiviert sind. Für Gäste ergänzt Online Besitz/Pending.
    // Beim Host darf actionPending die gerade von der Engine neu erzeugten Controls
    // NICHT auf disabled festnageln: requestOnlineAction blockt Doppelklicks ohnehin,
    // bis der autoritative State in Firebase veröffentlicht wurde.
    const controls=[primaryBtn,lockBtn,baseRerollBtn,loadedDiceBtn,snakeEyesBtn,attackPowerBtn,bloodLowerBtn,bloodHigherBtn,resolveAttackBtn,nextBtn];
    controls.forEach(btn=>{
      if(!btn || btn.classList.contains("hidden")) return;
      if(!canInteract) btn.disabled=true;
    });

    const modalButtons=[gamblingDie,perfect25Die,perfect25D4Die,highStakesDie,highStakesSkip,insuranceDie,counterRollBtn];
    modalButtons.forEach(btn=>{
      if(!btn) return;
      const modal=btn.closest?.(".modal");
      if(modal && modal.classList.contains("hidden")) return;
      if(!canInteract) btn.disabled=true;
    });

    if(secondAbilityDraftBusy){
      secondAbilityOptions.querySelectorAll("button").forEach(btn=>btn.disabled=!canInteract);
    }

    if(message) statusEl.textContent=message;
    else setStatusForOnline();
  }

  function requestOnlineAction(type,payload=null){
    if(!isOnlineMatch() || !localOwnsInteraction() || !onlineSession.transportConnected) return;
    const actionType=String(type||"");
    const finalPayload=payload&&typeof payload==="object"?payload:payloadForAction(actionType);
    const transport=window.WDOnlineTransport?.requestAction;
    if(typeof transport!=="function"){
      transportActionRejected("","🌐 Online-Aktion konnte nicht gesendet werden.");
      return;
    }

    // Der Host IST die autoritative Engine. Seine Eingabe darf deshalb niemals auf
    // einen Firebase-Roundtrip warten. Die Transport-Schicht serialisiert Publish und
    // Folgeaktionen separat. Eine sehr kurze Same-Action-Sperre fängt nur echte
    // Doppeltaps ab, ohne neue Modal-Aktionen (High Stakes / Perfect 25 / Counter) zu blockieren.
    if(onlineSession.isHost){
      const now=(globalThis.performance?.now?.()??Date.now());
      if(onlineSession.lastHostActionType===actionType && now-onlineSession.lastHostActionAt<90) return;
      onlineSession.lastHostActionType=actionType;
      onlineSession.lastHostActionAt=now;
      beginOnlineRollWindow(actionType,{remote:false});
      const promise=transport(actionType,finalPayload,onlineSession.lastStateSeq);
      if(promise&&typeof promise.catch==="function") promise.catch(err=>{
        console.error("Online host action",actionType,err);
        enforceOnlineControls("🌐 Aktion konnte nicht ausgeführt werden.");
      });
      return;
    }

    // Gäste bleiben strikt autoritativ: eine Aktion gleichzeitig, sofortige visuelle
    // Vorschau, danach bestätigt der Host den stabilen State.
    if(onlineSession.actionPending) return;
    onlineSession.actionPending=true;
    onlineSession.pendingActionType=actionType;
    if(onlineSession.pendingTimer) clearTimeout(onlineSession.pendingTimer);
    onlineSession.pendingTimer=setTimeout(()=>{
      if(onlineSession.actionPending) transportActionRejected(onlineSession.pendingActionId,"🌐 Host antwortet nicht. Aktion abgebrochen.");
    },8000);
    beginActionPreview(actionType);
    enforceOnlineControls();
    const promise=transport(actionType,finalPayload,onlineSession.lastStateSeq);
    if(!promise || typeof promise.catch!=="function"){
      transportActionRejected("","🌐 Online-Aktion konnte nicht gesendet werden.");
      return;
    }
    promise.then(result=>{
      if(result?.requestId){
        onlineSession.pendingActionId=String(result.requestId);
        if(onlineSession.previewType) onlineSession.previewActionId=String(result.requestId);
      }
    }).catch(err=>{
      console.error("Online action request",actionType,err);
      transportActionRejected("","🌐 Aktion fehlgeschlagen. Bitte erneut versuchen.");
    });
  }

  function installOnlineInputHooks(){
    if(onlineInputHooksInstalled) return;
    onlineInputHooksInstalled=true;

    ONLINE_ACTION_BUTTONS.forEach(([btn,type])=>{
      if(!btn) return;
      btn.addEventListener("click",event=>{
        if(!isOnlineMatch()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        requestOnlineAction(type);
      },true);
    });

    // Auswahl ist reine lokale UI. Erst Lock/Loaded Dice überträgt die gewählten
    // Indizes in EINER Aktion. Dadurch fühlt sich die wichtigste Interaktion sofort an
    // und produziert keine Firebase-Roundtrips pro angeklicktem Würfel.
    diceEl?.addEventListener("click",event=>{
      if(!isOnlineMatch()) return;
      const dieNode=event.target?.closest?.(".die");
      if(!dieNode || !diceEl.contains(dieNode)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if(phase!=="base_select" || isAnimating || onlineSession.actionPending || !localOwnsInteraction()) return;
      const index=Array.prototype.indexOf.call(diceEl.children,dieNode);
      if(index<0 || index>=dice.length || dice[index]?.locked) return;
      dice[index].selected=!dice[index].selected;
      renderDice();updateButtons();enforceOnlineControls();
    },true);

    // Die Fähigkeitskarten werden vom bestehenden Code dynamisch erzeugt. Der
    // Capture-Listener hält auch diese Auswahl server-/host-autoritativ.
    secondAbilityOptions?.addEventListener("click",event=>{
      if(!isOnlineMatch()) return;
      const card=event.target?.closest?.("button");
      if(!card || !secondAbilityOptions.contains(card)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if(!secondAbilityDraftBusy || !localOwnsInteraction()) return;
      const cardIndex=Array.prototype.indexOf.call(secondAbilityOptions.children,card);
      const abilityId=Number(card.dataset.onlineAbilityId || secondAbilityDraftChoices[cardIndex]);
      if(!REAL_ABILITY_IDS.includes(abilityId)) return;
      requestOnlineAction("ability_choice",{abilityId});
    },true);
  }

  function modalSnapshot(modal,die,result,sub=null,extra={}){
    return {
      open:!!modal && !modal.classList.contains("hidden"),
      dieText:die?.textContent||"",
      dieClass:die?.className||"",
      dieValue:die?.dataset?.value??"",
      dieDisabled:!!die?.disabled,
      result:result?.textContent||"",
      sub:sub?.textContent||"",
      ...extra
    };
  }

  function exportUiSnapshot(){
    return {
      log:Array.from(logEl.children).slice(0,32).map(el=>el.textContent||""),
      winner:!winnerBox.classList.contains("hidden")?{
        open:true,
        winnerHtml:winnerText.innerHTML,
        resultHtml:roundResultText.innerHTML,
        standingsHtml:roundStandings.innerHTML,
        statsHtml:roundStatsBox.innerHTML
      }:{open:false},
      draft:{
        open:!secondAbilityModal.classList.contains("hidden"),
        title:secondAbilityTitle.textContent||"",
        choices:[...secondAbilityDraftChoices]
      },
      gambling:modalSnapshot(gamblingModal,gamblingDie,gamblingResult),
      perfect25:modalSnapshot(perfect25Modal,perfect25Die,perfect25Result),
      perfect25d4:modalSnapshot(perfect25D4Modal,perfect25D4Die,perfect25D4Result),
      highStakes:modalSnapshot(highStakesModal,highStakesDie,highStakesResult,highStakesSub,{skipDisabled:!!highStakesSkip.disabled}),
      insurance:modalSnapshot(insuranceModal,insuranceDie,insuranceResult,insuranceSub),
      counter:{
        open:!counterModal.classList.contains("hidden"),
        title:counterTitle.textContent||"",
        result:counterResult.textContent||"",
        buttonText:counterRollBtn.textContent||"",
        buttonDisabled:!!counterRollBtn.disabled
      }
    };
  }

  function exportOnlineState(actionId="",actionType=""){
    return {
      schema:6,
      seq:onlineSession.lastStateSeq+1,
      actionId:String(actionId||""),
      actionType:String(actionType||""),
      phase:String(phase||"idle"),
      currentPlayerUid:uidForIndex(current),
      interactionOwnerUid:interactionOwnerUid(),
      dice:cloneJson(dice,[]),
      players:players.map(p=>{
        const copy=cloneJson(p,{})||{};
        delete copy.profileId;
        return copy;
      }),
      battle:{
        attackFace,attackTarget,attackHits,attackDamage,firstAttackRoll,currentAttackRollNewHits,
        baseRerollUsed,loadedDiceUsed,lastBaseRollIndices:[...lastBaseRollIndices],attackPowerUsed,precisionUses,momentumBonus,
        bloodPriceNeighbors:[...bloodPriceNeighbors],bloodRushActiveThisAttack,doubleTapApplied,
        roundNumber,roundEliminationOrder:[...roundEliminationOrder],lastPlaceIndex,roundWinnerHandled,roundWinnerIndex,
        nextRoundAbilityRolls:cloneJson(nextRoundAbilityRolls,[]),roundStats:cloneJson(roundStats,[]),turnDamageThisTurn:cloneJson(turnDamageThisTurn,[]),
        secondAbilityDraftBusy,secondAbilityDraftIndex,secondAbilityDraftSlot,secondAbilityDraftChoices:[...secondAbilityDraftChoices],
        secondAbilityDraftQueue:cloneJson(secondAbilityDraftQueue,[]),deferredBaseAdvance,
        gamblingBaseTotal,highStakesDecisionThisAttack,perfect25BaseTotal,pendingPerfect25Total,wildcardFace,
        insuranceContext:cloneJson(insuranceContext,null),counterContext:cloneJson(counterContext,null),counterDiceState:cloneJson(counterDiceState,[]),
        counterHits,counterFirstRoll,pendingCounterattack:cloneJson(pendingCounterattack,null),deferredAttackFinish,
        combatFx:cloneJson(lastCombatFx,null),combatFxEvents:cloneJson(combatFxEvents.slice(-8),[])
      },
      ui:exportUiSnapshot(),
      updatedAt:Date.now()
    };
  }

  function applyPlayers(statePlayers){
    if(!Array.isArray(statePlayers)) return;
    statePlayers.forEach(entry=>{
      const idx=players.findIndex(p=>String(p?.onlineUid||"")===String(entry?.onlineUid||entry?.uid||""));
      if(idx<0) return;
      const localProfileId=players[idx]?.profileId||null;
      Object.assign(players[idx],cloneJson(entry,{})||{});
      if(localProfileId) players[idx].profileId=localProfileId;
    });
  }

  function syncLocalOnlineAchievements(){
    if(!isOnlineMatch()) return;
    const idx=players.findIndex(p=>String(p?.onlineUid||"")===String(onlineSession.uid||""));
    if(idx<0) return;
    const ids=Array.isArray(players[idx]?.onlineAchievementUnlocks)?players[idx].onlineAchievementUnlocks:[];
    ids.forEach(id=>{
      try{unlockAchievementForPlayer(idx,String(id));}catch(err){console.warn("Online achievement sync",id,err);}
    });
  }

  function applyBattleSnapshot(b={}){
    attackFace=b.attackFace??null;
    attackTarget=b.attackTarget??null;
    attackHits=Number(b.attackHits)||0;
    attackDamage=Number(b.attackDamage)||0;
    firstAttackRoll=b.firstAttackRoll!==false;
    currentAttackRollNewHits=Number(b.currentAttackRollNewHits)||0;
    baseRerollUsed=!!b.baseRerollUsed;
    loadedDiceUsed=!!b.loadedDiceUsed;
    lastBaseRollIndices=Array.isArray(b.lastBaseRollIndices)?[...b.lastBaseRollIndices]:[];
    attackPowerUsed=!!b.attackPowerUsed;
    precisionUses=Number(b.precisionUses)||0;
    momentumBonus=Number(b.momentumBonus)||0;
    bloodPriceNeighbors=Array.isArray(b.bloodPriceNeighbors)?[...b.bloodPriceNeighbors]:[];
    bloodRushActiveThisAttack=!!b.bloodRushActiveThisAttack;
    doubleTapApplied=!!b.doubleTapApplied;
    roundNumber=Number(b.roundNumber)||1;
    roundEliminationOrder=Array.isArray(b.roundEliminationOrder)?[...b.roundEliminationOrder]:[];
    lastPlaceIndex=b.lastPlaceIndex==null?null:Number(b.lastPlaceIndex);
    roundWinnerHandled=!!b.roundWinnerHandled;
    roundWinnerIndex=b.roundWinnerIndex==null?null:Number(b.roundWinnerIndex);
    nextRoundAbilityRolls=cloneJson(b.nextRoundAbilityRolls,[])||[];
    roundStats=cloneJson(b.roundStats,[])||[];
    turnDamageThisTurn=cloneJson(b.turnDamageThisTurn,[])||[];
    secondAbilityDraftBusy=!!b.secondAbilityDraftBusy;
    secondAbilityDraftIndex=b.secondAbilityDraftIndex==null?null:Number(b.secondAbilityDraftIndex);
    secondAbilityDraftSlot=Number(b.secondAbilityDraftSlot)||2;
    secondAbilityDraftChoices=Array.isArray(b.secondAbilityDraftChoices)?b.secondAbilityDraftChoices.map(Number):[];
    secondAbilityDraftQueue=cloneJson(b.secondAbilityDraftQueue,[])||[];
    deferredBaseAdvance=!!b.deferredBaseAdvance;
    gamblingBaseTotal=b.gamblingBaseTotal==null?null:Number(b.gamblingBaseTotal);
    highStakesDecisionThisAttack=!!b.highStakesDecisionThisAttack;
    perfect25BaseTotal=b.perfect25BaseTotal==null?null:Number(b.perfect25BaseTotal);
    pendingPerfect25Total=b.pendingPerfect25Total==null?null:Number(b.pendingPerfect25Total);
    wildcardFace=b.wildcardFace==null?null:Number(b.wildcardFace);
    insuranceContext=cloneJson(b.insuranceContext,null);
    counterContext=cloneJson(b.counterContext,null);
    counterDiceState=cloneJson(b.counterDiceState,[])||[];
    counterHits=Number(b.counterHits)||0;
    counterFirstRoll=b.counterFirstRoll!==false;
    pendingCounterattack=cloneJson(b.pendingCounterattack,null);
    deferredAttackFinish=!!b.deferredAttackFinish;

    // Netzwerk-Snapshots werden immer in einem stabilen Zustand veröffentlicht.
    isAnimating=false;
    gamblingRolling=false;
    perfect25Rolling=false;
    perfect25D4Rolling=false;
    highStakesRolling=false;
    insuranceRolling=false;
    counterRolling=false;
  }

  function restoreLog(entries){
    if(!Array.isArray(entries)) return;
    logEl.innerHTML="";
    entries.slice().reverse().forEach(text=>addLog(String(text||"")));
  }

  function restoreSpecialModal(snapshot,modal,die,result,sub=null){
    if(!snapshot){modal.classList.add("hidden");return;}
    const open=!!snapshot.open;
    modal.classList.toggle("hidden",!open);
    if(die){
      if(snapshot.dieClass) die.className=String(snapshot.dieClass);
      if(Object.prototype.hasOwnProperty.call(snapshot,"dieValue") && !die.classList.contains("d4")){
        const rawValue=String(snapshot.dieValue??"");
        const value=rawValue===""?null:Number(rawValue);
        renderSpecialDieFace(die,players[current]?.diceDesign||"classic",Number.isFinite(value)?value:null);
      }else die.textContent=String(snapshot.dieText||"");
      // Snapshots werden erst nach abgeschlossener Engine-Animation veröffentlicht.
      // Ein noch offenes Spezialmodal ist deshalb definitionsgemäß wieder interaktiv.
      // Transiente disabled-Flags vom Host dürfen nicht auf dem Spiegelclient kleben.
      die.disabled=!open;
      die.classList.remove("rolling");
    }
    if(result) result.textContent=String(snapshot.result||"");
    if(sub) sub.textContent=String(snapshot.sub||"");
  }

  function restoreUiSnapshot(ui={}){
    restoreLog(ui.log);

    const draft=ui.draft||{};
    secondAbilityModal.classList.toggle("hidden",!draft.open);
    if(draft.open){
      secondAbilityTitle.textContent=String(draft.title||`${players[secondAbilityDraftIndex]?.name||"Spieler"}: Fähigkeit wählen`);
      secondAbilityOptions.innerHTML="";
      const choices=Array.isArray(draft.choices)?draft.choices:secondAbilityDraftChoices;
      choices.forEach(id=>{
        const abilityId=Number(id);
        const btn=document.createElement("button");
        btn.className="second-ability-card"+(abilityId===7?" luck":"");
        btn.dataset.onlineAbilityId=String(abilityId);
        btn.innerHTML=`<div class="num">${abilityId}</div><div class="name">${escapeHtml(ABILITIES[abilityId]?.name||"Fähigkeit")}</div><div class="desc">${escapeHtml(ABILITIES[abilityId]?.desc||"")}</div>`;
        secondAbilityOptions.appendChild(btn);
      });
    }else secondAbilityOptions.innerHTML="";

    restoreSpecialModal(ui.gambling,gamblingModal,gamblingDie,gamblingResult);
    restoreSpecialModal(ui.perfect25,perfect25Modal,perfect25Die,perfect25Result);
    restoreSpecialModal(ui.perfect25d4,perfect25D4Modal,perfect25D4Die,perfect25D4Result);
    restoreSpecialModal(ui.highStakes,highStakesModal,highStakesDie,highStakesResult,highStakesSub);
    if(ui.highStakes) highStakesSkip.disabled=!ui.highStakes.open;
    restoreSpecialModal(ui.insurance,insuranceModal,insuranceDie,insuranceResult,insuranceSub);

    const counter=ui.counter||{};
    counterModal.classList.toggle("hidden",!counter.open);
    if(counter.open){
      counterTitle.textContent=String(counter.title||"");
      counterResult.textContent=String(counter.result||"");
      counterRollBtn.textContent=String(counter.buttonText||"⚔️ Würfeln");
      counterRollBtn.disabled=false;
      renderCounterDice();
    }

    const winner=ui.winner||{};
    winnerBox.classList.toggle("hidden",!winner.open);
    if(winner.open){
      winnerText.innerHTML=String(winner.winnerHtml||"");
      roundResultText.innerHTML=String(winner.resultHtml||"");
      roundStandings.innerHTML=String(winner.standingsHtml||"");
      roundStatsBox.innerHTML=String(winner.statsHtml||"");
      nextRoundBox.classList.add("hidden");
      nextRoundPrepBtn.classList.add("hidden");
      // V27.4.0: Online ist vorerst ein einzelnes Match. Kein lokaler Restart,
      // der die beiden Clients nach dem Sieg auseinanderlaufen lassen könnte.
      restartBtn.classList.add("hidden");
      hideAllControls();
      turnLine.textContent="Online-Match beendet";
      statusEl.textContent="";
      abilityState.innerHTML="";
    }else{
      restartBtn.classList.remove("hidden");
    }
  }

  function applyStateNow(state,previousHp){
    const settlingRoll=isOnlineRollVisual(state?.actionType||onlineSession.previewType||onlineSession.pendingActionType);
    if(settlingRoll) prepareOnlineRollCommit();

    const turnUid=String(state.currentPlayerUid||"");
    const turnIndex=players.findIndex(p=>String(p?.onlineUid||"")===turnUid);
    if(turnIndex>=0) current=turnIndex;
    applyPlayers(state.players);
    syncLocalOnlineAchievements();
    applyBattleSnapshot(state.battle||{});
    if(Array.isArray(state.dice)) dice=cloneJson(state.dice,[])||[];
    phase=String(state.phase||phase||"idle");

    renderAll();
    restoreUiSnapshot(state.ui||{});
    const combatFxList=Array.isArray(state?.battle?.combatFxEvents)?state.battle.combatFxEvents:(state?.battle?.combatFx?[state.battle.combatFx]:[]);
    combatFxList.forEach((combatFx,fxIndex)=>{
      const combatFxId=String(combatFx?.id||"");
      if(!combatFxId || onlineSession.playedCombatFxIds?.has(combatFxId)) return;
      onlineSession.playedCombatFxIds?.add(combatFxId);
      onlineSession.lastCombatFxId=combatFxId;
      setTimeout(()=>window.WDAttackFx?.play?.(combatFx),fxIndex*85);
    });
    if(!onlineSession.isHost && state?.ui?.winner?.open && !onlineSession.localRoundCommitted && Number.isInteger(roundWinnerIndex)){
      // Jeder Client besitzt nur sein eigenes lokales Profil. Beim ersten Winner-Snapshot
      // schreibt deshalb auch der Gast seine eigenen Stats/Achievements lokal weg.
      try{commitRoundToStorage(roundWinnerIndex);checkRoundWinnerAchievements(roundWinnerIndex);}catch(err){console.warn("Online local round commit",err);}
      onlineSession.localRoundCommitted=true;
    }
    if(settlingRoll) finishOnlineRollWindow();

    // HP-FX auf Spiegelclients aus der Differenz des autoritativen Snapshots ableiten.
    if(previousHp){
      players.forEach((p,i)=>{
        const before=previousHp.get(String(p.onlineUid||""));
        if(!Number.isFinite(before)) return;
        const after=Number(p.hp)||0;
        if(after<before) setTimeout(()=>playDamageAnimation(i,before-after),20);
        else if(after>before) setTimeout(()=>playHealAnimation(i,after-before),20);
      });
    }

    clearPendingAction();
    enforceOnlineControls();
  }

  function applyAuthoritativeState(state){
    if(!isOnlineMatch() || !state) return false;
    const seq=Number(state.seq)||0;
    if(seq<=onlineSession.lastStateSeq) return false;
    onlineSession.lastStateSeq=seq;

    // Der Host hat diesen Zustand bereits lokal mit der echten Engine erzeugt.
    // Das Firebase-Echo wird deshalb NICHT noch einmal in DOM/State zurückgespielt.
    // Das entfernt einen kompletten Doppel-Render pro Aktion.
    if(onlineSession.isHost){
      clearPendingAction();
      enforceOnlineControls();
      return true;
    }

    const previousHp=new Map(players.map(p=>[String(p.onlineUid||""),Number(p.hp)||0]));
    applyStateNow(state,previousHp);
    return true;
  }

  function actionOwnerMatches(request){
    return interactionOwnerUid()===String(request?.actorUid||"");
  }

  function executePrimaryAction(){
    if(phase==="idle"||phase==="base_ready") rollBase();
    else if(phase==="attack_ready"||phase==="attack_continue") rollAttack();
    else if(phase==="attack_after_roll"&&hasAbility(24)&&attackHits===2&&currentAttackRollNewHits>0) continueDoubleTapAttack();
  }

  function executeOnlineAction(request){
    const type=String(request?.type||"");
    const payload=request?.payload||{};
    switch(type){
      case "primary": executePrimaryAction(); break;
      case "lock": {
        const indices=Array.isArray(payload.indices)?payload.indices.map(Number).filter(i=>Number.isInteger(i)&&i>=0&&i<dice.length&&!dice[i].locked):[];
        dice.forEach((d,i)=>{if(!d.locked)d.selected=indices.includes(i);});
        lockSelected();
        break;
      }
      case "base_reroll": useBaseReroll(); break;
      case "loaded_dice": {
        const selectedIndex=Number(payload.selectedIndex);
        dice.forEach((d,i)=>{if(!d.locked)d.selected=(i===selectedIndex);});
        useLoadedDice();
        break;
      }
      case "snake_eyes": useSnakeEyes(); break;
      case "attack_power": useAttackPower(); break;
      case "blood_price": useBloodPrice(); break;
      case "resolve_attack": resolveCurrentAttackRoll(); break;
      case "next_turn": advanceTurn(); break;
      case "gambling_roll": rollGamblingMan(); break;
      case "perfect25_roll": rollPerfect25(); break;
      case "perfect25_d4_roll": rollPerfect25D4(); break;
      case "high_stakes_roll": rollHighStakes(); break;
      case "high_stakes_skip": skipHighStakes(); break;
      case "insurance_roll": rollInsurance(); break;
      case "counter_roll": rollCounterattack(); break;
      case "ability_choice": {
        const id=Number(payload.abilityId);
        if(!secondAbilityDraftBusy || !secondAbilityDraftChoices.includes(id)) throw new Error("BAD_ABILITY_CHOICE");
        chooseSecondAbility(id);
        break;
      }
      default: throw new Error("UNSUPPORTED_ACTION");
    }
  }

  function engineBusy(){
    return !!(isAnimating||gamblingRolling||perfect25Rolling||perfect25D4Rolling||highStakesRolling||insuranceRolling||counterRolling);
  }

  async function waitForEngineSettled(actionType){
    const started=Date.now();
    let stableSince=0;
    while(Date.now()-started<3600){
      let busy=engineBusy();
      // Basis-Eigenschaden wechselt nach kurzer Auto-Pause selbst zum nächsten Zug.
      if(phase==="base_auto_end" && !secondAbilityDraftBusy) busy=true;
      // Beendete Counterattack hat noch einen 650-ms-Abschluss-Timer.
      if(phase==="counterattack" && counterContext && counterRollBtn.disabled && !counterRolling) busy=true;
      if(!busy){
        if(!stableSince) stableSince=Date.now();
        if(Date.now()-stableSince>=35) break;
      }else stableSince=0;
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    // Draft-Auswahl kann unmittelbar danach einen vorgemerkten Counter/Perfect25 öffnen.
    if(actionType==="ability_choice") await new Promise(resolve=>setTimeout(resolve,145));
  }

  async function hostExecuteAction(request){
    if(!isOnlineMatch() || !onlineSession.isHost || !request) throw new Error("ONLINE_NOT_HOST");
    if(!actionOwnerMatches(request)) throw new Error("WRONG_INTERACTION_OWNER");
    const rollVisual=isOnlineRollVisual(request.type);
    try{
      executeOnlineAction(request);
      await waitForEngineSettled(String(request.type||""));
      enforceOnlineControls();
      return exportOnlineState(request.id,request.type);
    }finally{
      if(rollVisual) finishOnlineRollWindow();
    }
  }

  function publicProfile(profile){
    if(!profile) return null;
    let cosmeticTitle="",cosmeticFrame="";
    try{cosmeticTitle=profileCosmeticTitle(profile)||"";}catch(_){}
    try{cosmeticFrame=profileCosmeticFrame(profile)||"";}catch(_){}
    return {
      id:String(profile.id||""),
      name:String(profile.name||"Spieler").slice(0,24),
      tagNumber:String(profile.tagNumber||"0000").padStart(4,"0").slice(-4),
      selectedDice:String(profile.selectedDice||"classic"),
      selectedAttackFx:String(profile.selectedAttackFx||"classic"),
      achievementShowcase:Array.isArray(profile.achievementShowcase)?profile.achievementShowcase.slice(0,3):[],
      cosmeticTitle:String(cosmeticTitle||""),
      cosmeticFrame:String(cosmeticFrame||"")
    };
  }

  function validAbility(id){
    const n=Number(id);
    return REAL_ABILITY_IDS.includes(n)?n:1;
  }

  function onlinePlayerFromMatch(entry,localUid,localProfileId,startHp=25){
    const isLocal=String(entry?.uid||"")===String(localUid||"");
    const localProfile=isLocal?getProfile(localProfileId):null;
    const rolled=Number(entry?.rolledAbility)||validAbility(entry?.ability);
    let cosmeticTitle=String(entry?.cosmeticTitle||"");
    let cosmeticFrame=String(entry?.cosmeticFrame||"");
    if(localProfile){
      try{cosmeticTitle=profileCosmeticTitle(localProfile)||cosmeticTitle;}catch(_){}
      try{cosmeticFrame=profileCosmeticFrame(localProfile)||cosmeticFrame;}catch(_){}
    }
    return {
      name:String(entry?.name||"Spieler").slice(0,24),
      battleTag:`#${String(entry?.tagNumber||"0000").padStart(4,"0").slice(-4)}`,
      profileId:localProfile?.id||null,
      onlineUid:String(entry?.uid||""),
      botLevel:"human",
      hp:startHp,maxHp:startHp,
      ability:validAbility(entry?.abilities?.[0]??entry?.ability),secondAbility:entry?.abilities?.[1]!=null?validAbility(entry.abilities[1]):null,thirdAbility:entry?.abilities?.[2]!=null?validAbility(entry.abilities[2]):null,fourthAbility:null,
      secondAbilityUnlocked:entry?.abilities?.[1]!=null,thirdAbilityUnlocked:entry?.abilities?.[2]!=null,fourthAbilityUnlocked:false,
      rolledAbility:rolled,primaryWasChosen:rolled===6,secondAbilityWasChosen:false,thirdAbilityWasChosen:false,fourthAbilityWasChosen:false,
      seat:0,diceDesign:String(entry?.diceDesign||localProfile?.selectedDice||"classic"),attackFx:String(entry?.attackFx||localProfile?.selectedAttackFx||"classic"),cosmeticTitle,cosmeticFrame,wins:0,
      momentumStreak:0,firstClassStreak:0,perfect25AttackArmed:false,lastStandUsed:false,roundLastStandTriggered:false,damageSinceLastOwnTurn:false,bloodRushPrimed:false,
      voluntaryHpPaidThisTurn:false,botBloodUsesThisAttack:0,machineBaseArmed:false,dumbassBaseArmed:false,onlineAchievementUnlocks:[]
    };
  }

  function startOnlineMatch(match,localUid,localProfileId,isHost=false){
    const matchPlayers=Array.isArray(match?.players)?match.players:[];
    onlineSession={active:true,uid:String(localUid||""),roomCode:String(match?.roomCode||""),isHost:!!isHost,lastStateSeq:Number(match?.state?.seq)||0,actionPending:false,pendingActionId:"",pendingActionType:"",previewActionId:"",previewType:"",transportConnected:true,pendingTimer:null,lastHostActionType:"",lastHostActionAt:0,lastCombatFxId:"",playedCombatFxIds:new Set(),localRoundCommitted:false};
    installOnlineInputHooks();
    if(matchPlayers.length<2 || matchPlayers.length>4 || !localUid) return false;
    if(!matchPlayers.some(p=>String(p?.uid||"")===String(localUid))) return false;

    tutorialMode=false;campaignMode=false;duoCampaignMode=false;trioCampaignMode=false;localModeId=["classic","endurance50","overload75"].includes(String(match?.modeId))?String(match.modeId):"classic";
    campaignEncounterId=null;campaignProfileId=null;campaignMetrics=freshCampaignMetrics();
    encounterRuntime={ruleIds:[],phaseRuleIds:[],phaseTriggered:false,firstStrikeUsed:new Set(),armorUsed:new Set(),turnStarts:{}};
    gameContext={mode:`online-${localModeId}`,returnScreen:"menu",profileId:localProfileId||null,encounterId:null,roomCode:String(match.roomCode||"")};

    resetTutorialUi();
    nextRoundPrepBtn.classList.add("hidden");
    restartBtn.classList.add("hidden");
    clearBotAutomation();

    const onlineStartHp=Math.max(1,Number(match?.startHp)||25);
    players=matchPlayers.map(entry=>onlinePlayerFromMatch(entry,localUid,localProfileId,onlineStartHp));
    resetRoundStats();
    const authoritativeTurnUid=String(match?.currentPlayerUid||match?.firstPlayerUid||matchPlayers[0]?.uid||"");
    const authoritativeIndex=players.findIndex(p=>String(p?.onlineUid||"")===authoritativeTurnUid);
    current=authoritativeIndex>=0?authoritativeIndex:0;
    prepareBloodRushForTurn(current);
    dice=freshDice();phase="idle";isAnimating=false;
    attackFace=null;attackTarget=null;pendingCampaignAttackStart=null;attackHits=0;attackDamage=0;firstAttackRoll=true;currentAttackRollNewHits=0;
    baseRerollUsed=false;luckRerollIndex=null;luckRerollSecondUsed=false;loadedDiceUsed=false;loadedDiceUses=0;lastBaseRollIndices=[];attackPowerUsed=false;attackPowerUses=0;precisionUses=0;momentumBonus=0;bloodPriceNeighbors=[];bloodRushActiveThisAttack=false;doubleTapApplied=false;pendingDamage=null;pendingHeal=null;pendingExtraDamageFx=[];pendingExtraHealFx=[];
    roundNumber=1;roundEliminationOrder=[];lastPlaceIndex=null;roundWinnerHandled=false;roundWinnerIndex=null;nextRoundAbilityRolls=[];
    eventPopupQueue=[];eventPopupBusy=false;secondAbilityDraftBusy=false;secondAbilityDraftIndex=null;secondAbilityDraftSlot=2;deferredBaseAdvance=false;
    gamblingRolling=false;gamblingBaseTotal=null;gamblingModal.classList.add("hidden");
    highStakesRolling=false;highStakesDecisionThisAttack=false;highStakesModal.classList.add("hidden");
    perfect25Rolling=false;perfect25D4Rolling=false;perfect25BaseTotal=null;pendingPerfect25Total=null;perfect25Modal.classList.add("hidden");perfect25D4Modal.classList.add("hidden");
    insuranceRolling=false;insuranceContext=null;insuranceModal.classList.add("hidden");
    counterRolling=false;counterContext=null;counterDiceState=[];counterHits=0;counterFirstRoll=true;pendingCounterattack=null;deferredAttackFinish=false;counterModal.classList.add("hidden");
    wildcardFace=null;secondAbilityDraftQueue=[];secondAbilityDraftChoices=[];secondAbilityModal.classList.add("hidden");

    logEl.innerHTML="";winnerBox.classList.add("hidden");nextRoundBox.classList.add("hidden");
    document.getElementById("onlineScreen")?.classList.add("hidden");hideFrontScreens();game.classList.remove("hidden","campaign-game","trio-game");
    document.body.classList.add("playing");document.body.classList.remove("bot-acting");window.scrollTo?.(0,0);

    window.WDAttackFx?.reset?.();
    lastCombatFx=null;combatFxSerial=0;combatFxEvents=[];
    addLog(`🌐 Online ${players.length}-Spieler-Match · ${String(match?.modeName||localModeRules().name)} · ${onlineStartHp} HP. ${players[current].name} beginnt.`);
    players.forEach(p=>{
      const roll=p.rolledAbility;
      const abilityText=roll===6?`W25 = 6 → automatische freie Wahl → ${ABILITIES[p.ability].name}`:`W25 = ${roll} → ${ABILITIES[p.ability].name}`;
      addLog(`${p.name}: ${abilityText} · 🎲 ${DICE_DESIGNS[p.diceDesign]?.name||"Classic"} · ✨ ${ATTACK_FX_STYLES[p.attackFx]?.name||"Arc Shot"}.`);
    });
    renderAll();enforceOnlineControls();
    addLog(`🌐 V27.6.0: Online-Modi · 2–4 Spieler · profilgebundene Combat-FX.`);
    return true;
  }


  function stopOnlineMatch(){
    onlineSession.active=false;
    onlineSession.transportConnected=false;
    clearPendingAction();
    document.body.classList.remove("online-roll-window","online-remote-roll-preview","online-dice-snap");
    isAnimating=false;
    dice.forEach(d=>{if(d)d.rolling=false;});
    if(counterDiceState?.length) counterDiceState.forEach(d=>{if(d)d.rolling=false;});
    lastCombatFx=null;combatFxSerial=0;combatFxEvents=[];window.WDAttackFx?.reset?.();
  }

  window.WDOnlineBridge=Object.freeze({
    getProfiles(){try{return (saveData?.profiles||[]).map(publicProfile).filter(Boolean);}catch(err){console.warn("Online-Profilliste konnte nicht gelesen werden",err);return []; }},
    getVersion(){try{return String(GAME_VERSION||"");}catch(_){return "";}},
    getAttackFxName(id){try{return ATTACK_FX_STYLES[String(id||"classic")]?.name||"Arc Shot";}catch(_){return "Arc Shot";}},
    resolveProfileCosmetics(profileId){try{const profile=getProfile(profileId);return window.WDV276?.resolveProfileCosmetics?.(profile)||{dice:profile?.selectedDice||"classic",attackFx:profile?.selectedAttackFx||"classic"};}catch(_){return {dice:"classic",attackFx:"classic"};}},
    getOnlineChoicePool(){return REAL_ABILITY_IDS.filter(id=>id!==7);},
    startMatch:startOnlineMatch,
    stopMatch:stopOnlineMatch,
    hostExecuteAction,
    applyState:applyAuthoritativeState,
    previewAction:previewRemoteAction,
    rejectAction:transportActionRejected,
    setConnected(value){onlineSession.transportConnected=!!value;if(!value)enforceOnlineControls("🌐 Verbindung unterbrochen …");else enforceOnlineControls();},
    enforceControls:enforceOnlineControls
  });
})();
