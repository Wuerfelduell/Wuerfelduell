  function makeAbilityChoiceSelect(idPrefix,index,selected=1){
    const select=document.createElement("select");
    select.id=idPrefix+index;
    // Glück (BETA) ist absichtlich NICHT auswählbar. Es gibt die Fähigkeit nur bei einer natürlichen 7.
    CHOOSABLE_ABILITY_IDS.forEach(a=>{
      const opt=document.createElement("option");
      opt.value=a; opt.textContent=`${a} – ${ABILITIES[a].name}`;
      if(a===selected) opt.selected=true;
      select.appendChild(opt);
    });
    return select;
  }

  function makeSpecialAbilityChoiceSelect(id,index,slot,selected){
    const select=document.createElement("select");
    select.id=`nextAbilityChoice${index}_${slot}`;
    REAL_ABILITY_IDS.forEach(a=>{const opt=document.createElement("option");opt.value=a;opt.textContent=`${a} – ${ABILITIES[a].name}`;if(a===selected)opt.selected=true;select.appendChild(opt);});
    return select;
  }

  function prepareNextRound(){
    if(lastPlaceIndex==null) return;
    const rules=localModeRules();
    if(rules.id!=="classic" && !campaignMode){
      nextRoundAbilityRolls=Array(players.length).fill(null);
      nextRoundAbilities.innerHTML="";
      nextRoundTitle.textContent=`Runde ${roundNumber+1} · ${rules.name}`;
      nextRoundInfo.innerHTML=rules.id==="endurance50"
        ? `<span class="last-place-note">${escapeHtml(players[lastPlaceIndex].name)}</span> startet. Als Letztplatzierter darf diese Person beide Startfähigkeiten frei wählen; alle anderen bekommen 2 neue zufällige Fähigkeiten.`
        : `<span class="last-place-note">${escapeHtml(players[lastPlaceIndex].name)}</span> startet. Als Letztplatzierter darf diese Person genau 1 von 3 Startfähigkeiten frei wählen; die anderen 2 werden beim Start zufällig bestimmt.`;

      players.forEach((p,i)=>{
        const box=document.createElement("div");box.className="round-prep-player";
        const title=document.createElement("div");title.innerHTML=`<strong>${escapeHtml(p.name)}</strong>`;box.appendChild(title);
        const isLast=i===lastPlaceIndex && i!==roundWinnerIndex;
        if(isLast){
          const freeCount=Math.min(rules.lastPlaceFreeChoices,rules.startAbilityCount);
          nextRoundAbilityRolls[i]={kind:"SPECIAL_LAST",freeCount};
          const currentAbilities=playerAbilities(i);
          for(let slot=0;slot<freeCount;slot++){
            const note=document.createElement("div");note.className="round-note last-place-note";note.textContent=`🏁 Freie Wahl ${slot+1}/${freeCount}`;box.appendChild(note);
            box.appendChild(makeSpecialAbilityChoiceSelect("nextAbilityChoice",i,slot,currentAbilities[slot]||REAL_ABILITY_IDS[slot]));
          }
          const randomCount=rules.startAbilityCount-freeCount;
          if(randomCount>0){const note=document.createElement("div");note.className="round-note";note.textContent=`🎲 ${randomCount} weitere ${randomCount===1?"Fähigkeit wird":"Fähigkeiten werden"} beim Rundenstart zufällig bestimmt.`;box.appendChild(note);}
        }else{
          const abilities=randomUniqueAbilityIds(rules.startAbilityCount);
          nextRoundAbilityRolls[i]={kind:"SPECIAL_RANDOM",abilities};
          const note=document.createElement("div");note.className="round-note";note.innerHTML=`🎲 ${abilities.map(id=>escapeHtml(ABILITIES[id].name)).join(" · ")}`;box.appendChild(note);
        }
        nextRoundAbilities.appendChild(box);
      });

      winnerBox.classList.add("hidden");nextRoundBox.classList.remove("hidden");nextRoundAbilities.scrollTop=0;
      return;
    }

    nextRoundAbilityRolls=Array(players.length).fill(null);
    nextRoundAbilities.innerHTML="";
    nextRoundTitle.textContent=`Runde ${roundNumber+1} vorbereiten`;
    nextRoundInfo.innerHTML=`<span class="last-place-note">${escapeHtml(players[lastPlaceIndex].name)}</span> startet und bekommt als Letztplatzierter die freie Fähigkeitswahl aus 1–5 oder 8–25. Der Sieger und alle anderen würfeln ihre Fähigkeit mit einem W25 neu; nur eine gewürfelte 6 erlaubt freie Wahl. Glück (BETA) gibt es nur bei einer direkt gewürfelten 7.`;

    players.forEach((p,i)=>{
      const box=document.createElement("div");box.className="round-prep-player";
      const title=document.createElement("div");title.innerHTML=`<strong>${escapeHtml(p.name)}</strong>`;box.appendChild(title);
      if(i===lastPlaceIndex && i!==roundWinnerIndex){
        nextRoundAbilityRolls[i]="FREE_LAST";
        const note=document.createElement("div");note.className="round-note last-place-note";note.textContent="🏁 Letzter Platz: freie Wahl ohne Würfelwurf";box.appendChild(note);
        const select=makeAbilityChoiceSelect("nextAbilityChoice",i,p.ability||1);
        if(p.botLevel&&p.botLevel!=="human"){select.value=botPickAbility(CHOOSABLE_ABILITY_IDS,p.botLevel,[]);select.disabled=true;}
        box.appendChild(select);
      }else{
        const roll=randAbilityRoll();nextRoundAbilityRolls[i]=roll;
        const note=document.createElement("div");note.className="round-note";
        if(roll===6){
          note.innerHTML=`🎲 W25 = <strong>6</strong> → freie Wahl`;box.appendChild(note);
          const select=makeAbilityChoiceSelect("nextAbilityChoice",i,p.ability||1);
          if(p.botLevel&&p.botLevel!=="human"){select.value=botPickAbility(CHOOSABLE_ABILITY_IDS,p.botLevel,[]);select.disabled=true;}
          box.appendChild(select);
        }else{note.innerHTML=`🎲 W25 = <strong>${roll}</strong> → ${escapeHtml(ABILITIES[roll].name)}`;box.appendChild(note);}
      }
      nextRoundAbilities.appendChild(box);
    });
    winnerBox.classList.add("hidden");nextRoundBox.classList.remove("hidden");nextRoundAbilities.scrollTop=0;
  }

  function startNextRound(){
    if(lastPlaceIndex==null) return;
    clearBotAutomation();
    const starter=lastPlaceIndex;
    const starterPlayer=players[starter];
    const rules=localModeRules();
    const special=rules.id!=="classic" && !campaignMode;

    players.forEach((p,i)=>{
      if(special){
        const payload=nextRoundAbilityRolls[i]||{};
        let abilities=[];
        if(payload.kind==="SPECIAL_LAST"){
          const free=[];
          for(let slot=0;slot<payload.freeCount;slot++){
            const id=+$(`nextAbilityChoice${i}_${slot}`)?.value;
            if(REAL_ABILITY_IDS.includes(id) && !free.includes(id)) free.push(id);
          }
          while(free.length<payload.freeCount){free.push(...randomUniqueAbilityIds(1,free));}
          abilities=[...free,...randomUniqueAbilityIds(rules.startAbilityCount-free.length,free)];
          p.primaryWasChosen=true;
          p.rolledAbility="FREE_LAST_MULTI";
        }else{
          abilities=Array.isArray(payload.abilities)?[...payload.abilities]:randomUniqueAbilityIds(rules.startAbilityCount);
          p.primaryWasChosen=false;p.rolledAbility="MULTI_RANDOM";
        }
        p.ability=abilities[0]??1;
        p.secondAbility=abilities[1]??null;
        p.thirdAbility=abilities[2]??null;
        p.secondAbilityUnlocked=rules.startAbilityCount>=2;
        p.thirdAbilityUnlocked=rules.startAbilityCount>=3;
        const chosenCount=payload.kind==="SPECIAL_LAST"?Math.min(payload.freeCount||0,rules.startAbilityCount):0;
        p.secondAbilityWasChosen=chosenCount>=2;
        p.thirdAbilityWasChosen=chosenCount>=3;
      }else{
        let roll=nextRoundAbilityRolls[i];
        if(roll==="FREE_LAST" && (i!==starter || i===roundWinnerIndex)){roll=randAbilityRoll();nextRoundAbilityRolls[i]=roll;}
        let ability;if(roll==="FREE_LAST" || roll===6){ability=+$(`nextAbilityChoice${i}`).value;}else{ability=roll;}
        p.ability=ability;p.rolledAbility=roll;p.primaryWasChosen=(roll==="FREE_LAST" || roll===6);
        p.secondAbility=null;p.thirdAbility=null;p.secondAbilityUnlocked=false;p.thirdAbilityUnlocked=false;p.secondAbilityWasChosen=false;p.thirdAbilityWasChosen=false;
      }
      p.hp=special?rules.startHp:START_HP;p.maxHp=special?rules.startHp:START_HP;
      p.momentumStreak=0;p.firstClassStreak=0;p.perfect25AttackArmed=false;p.lastStandUsed=false;p.roundLastStandTriggered=false;p.damageSinceLastOwnTurn=false;p.bloodRushPrimed=false;p.voluntaryHpPaidThisTurn=false;p.botBloodUsesThisAttack=0;
    });

    roundNumber++;roundEliminationOrder=[];lastPlaceIndex=null;roundWinnerHandled=false;roundWinnerIndex=null;nextRoundAbilityRolls=[];
    secondAbilityDraftBusy=false;secondAbilityDraftIndex=null;secondAbilityDraftSlot=2;deferredBaseAdvance=false;
    gamblingRolling=false;gamblingBaseTotal=null;gamblingModal.classList.add("hidden");highStakesRolling=false;highStakesDecisionThisAttack=false;highStakesModal.classList.add("hidden");perfect25Rolling=false;perfect25D4Rolling=false;perfect25BaseTotal=null;pendingPerfect25Total=null;perfect25Modal.classList.add("hidden");perfect25D4Modal.classList.add("hidden");insuranceRolling=false;insuranceContext=null;insuranceModal.classList.add("hidden");counterRolling=false;counterContext=null;counterDiceState=[];counterHits=0;counterFirstRoll=true;pendingCounterattack=null;deferredAttackFinish=false;counterModal.classList.add("hidden");wildcardFace=null;secondAbilityDraftQueue=[];secondAbilityModal.classList.add("hidden");
    randomizePlayerOrder(true);resetRoundStats();current=Math.max(0,players.indexOf(starterPlayer));prepareBloodRushForTurn(current);
    dice=freshDice();phase="idle";isAnimating=false;attackFace=null;attackTarget=null;pendingCampaignAttackStart=null;attackHits=0;attackDamage=0;firstAttackRoll=true;currentAttackRollNewHits=0;
    baseRerollUsed=false;loadedDiceUsed=false;lastBaseRollIndices=[];attackPowerUsed=false;precisionUses=0;momentumBonus=0;bloodPriceNeighbors=[];bloodRushActiveThisAttack=false;doubleTapApplied=false;pendingDamage=null;pendingHeal=null;
    winnerBox.classList.add("hidden");nextRoundBox.classList.add("hidden");logEl.innerHTML="";
    addLog(`Runde ${roundNumber} startet. ${players[current].name} beginnt als Letztplatzierter der vorherigen Runde.`);
    players.forEach((p,i)=>{
      if(special){addLog(`${p.name}: ${playerAbilities(i).map(id=>ABILITIES[id].name).join(" + ")} · ${rules.startHp} HP.`);}
      else{const roll=p.rolledAbility;const source=roll==="FREE_LAST"?"freie Wahl als Letztplatzierter":roll===6?"W25 = 6 → freie Wahl":`W25 = ${roll}`;addLog(`${p.name}: ${source} → Fähigkeit ${p.ability}: ${ABILITIES[p.ability].name}. Zweitfähigkeit wird bei ≤12 HP neu freigeschaltet.`);}
    });
    renderAll();
  }

