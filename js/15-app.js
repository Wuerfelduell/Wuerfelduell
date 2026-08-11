  function applyStoredSettings(){
    animationSetting.value=saveData.settings.animation==="fast"?"fast":"normal";
    const fast=animationSetting.value==="fast";
    ROLL_ANIM_MS=fast?250:430;
    document.body.classList.toggle("fast-animations",fast);
    botSpeedMode=["slow","normal","fast"].includes(saveData.settings.botSpeed)?saveData.settings.botSpeed:"normal";
    botSpeedSetting.value=botSpeedMode;
  }

  function hideFrontScreens(){
    [mainMenu,campaignScreen,duoCampaignScreen,trioCampaignScreen,setup,profilesScreen,prestigeShopScreen,achievementsScreen,statsScreen,settingsScreen,rulesScreen,changelogScreen,abilitiesScreen].forEach(el=>el?.classList.add("hidden"));
  }

  function openMainMenu(){
    clearBotAutomation();
    tutorialMode=false;
    campaignMode=false;
    duoCampaignMode=false;
    trioCampaignMode=false;
    campaignEncounterId=null;
    campaignProfileId=null;
    campaignMetrics=freshCampaignMetrics();
    gameContext={mode:"menu",returnScreen:"menu",profileId:null,encounterId:null};
    resetTutorialUi();
    quitModal.classList.add("hidden");
    campaignModePicker?.classList.add("hidden");
    nextRoundPrepBtn.classList.remove("hidden");
    restartBtn.textContent="Neue Partie";
    rotatingBoard.style.transform="rotate(0deg) scale(1)";
    document.body.classList.remove("playing","bot-acting");
    game.classList.add("hidden");
    game.classList.remove("campaign-game","trio-game");
    winnerBox.classList.add("hidden");
    nextRoundBox.classList.add("hidden");
    hideFrontScreens();
    mainMenu.classList.remove("hidden");
    window.scrollTo?.(0,0);
  }

  function openFrontScreen(screen){
    document.body.classList.remove("playing","bot-acting");
    game.classList.add("hidden");
    hideFrontScreens();
    screen.classList.remove("hidden");
    window.scrollTo?.(0,0);
  }

  $("menuCampaignBtn").onclick=()=>{campaignModePicker.classList.remove("hidden");};
  campaignModePickerClose.onclick=()=>campaignModePicker.classList.add("hidden");
  campaignModePicker.onclick=e=>{if(e.target===campaignModePicker)campaignModePicker.classList.add("hidden");};
  campaignModeSoloBtn.onclick=()=>{campaignModePicker.classList.add("hidden");openCampaignScreen();};
  campaignModeDuoBtn.onclick=()=>{campaignModePicker.classList.add("hidden");openDuoCampaignScreen();};
  campaignModeTrioBtn.onclick=()=>{campaignModePicker.classList.add("hidden");openTrioCampaignScreen();};
  $("menuPlayBtn").onclick=()=>{
    tutorialMode=false;
    resetTutorialUi();
    nextRoundPrepBtn.classList.remove("hidden");
    restartBtn.textContent="Neue Partie";
    makeNameFields();
    openFrontScreen(setup);
  };
  $("menuTutorialBtn").onclick=startTutorial;
  campaignBackBtn.onclick=openMainMenu;
  duoCampaignBackBtn.onclick=openMainMenu;
  trioCampaignBackBtn.onclick=openMainMenu;
  duoProfile1Select.onchange=()=>{duoProfile1Id=duoProfile1Select.value||null;duoCampaignEncounterId=null;renderDuoCampaign();};
  duoProfile2Select.onchange=()=>{duoProfile2Id=duoProfile2Select.value||null;duoCampaignEncounterId=null;renderDuoCampaign();};
  duoAbility1Select.onchange=()=>{};duoAbility2Select.onchange=()=>{};
  duoCampaignStartBtn.onclick=startDuoCampaignEncounter;
  duoCampaignProfilesBtn.onclick=()=>{profileScreenOrigin="duo";renderProfiles();openFrontScreen(profilesScreen);};
  trioProfile1Select.onchange=()=>{trioProfile1Id=trioProfile1Select.value||null;trioCampaignEncounterId=null;renderTrioCampaign();};
  trioProfile2Select.onchange=()=>{trioProfile2Id=trioProfile2Select.value||null;trioCampaignEncounterId=null;renderTrioCampaign();};
  trioProfile3Select.onchange=()=>{trioProfile3Id=trioProfile3Select.value||null;trioCampaignEncounterId=null;renderTrioCampaign();};
  trioAbility1Select.onchange=renderTrioCampaign;trioAbility2Select.onchange=renderTrioCampaign;trioAbility3Select.onchange=renderTrioCampaign;
  trioCampaignStartBtn.onclick=startTrioCampaignEncounter;
  trioCampaignProfilesBtn.onclick=()=>{profileScreenOrigin="trio";renderProfiles();openFrontScreen(profilesScreen);};
  campaignProfileSelect.onchange=()=>{campaignProfileId=campaignProfileSelect.value||null;campaignEncounterId=null;gameContext.profileId=campaignProfileId;gameContext.encounterId=null;renderCampaign();};
  campaignAbilitySelect.onchange=()=>renderCampaign();
  campaignStartBtn.onclick=startCampaignEncounter;
  campaignProfilesBtn.onclick=()=>{profileScreenOrigin="campaign";renderProfiles();openFrontScreen(profilesScreen);};
  $("menuProfilesBtn").onclick=()=>{profileScreenOrigin="menu";renderProfiles();openFrontScreen(profilesScreen);};
  $("menuAchievementsBtn").onclick=()=>{renderAchievements();openFrontScreen(achievementsScreen);};
  $("menuPrestigeShopBtn").onclick=()=>{renderPrestigeShop();openFrontScreen(prestigeShopScreen);};
  prestigeShopBackBtn.onclick=openMainMenu;
  prestigeShopProfileSelect.onchange=renderPrestigeShop;
  $("menuStatsBtn").onclick=()=>{renderStats();openFrontScreen(statsScreen);};
  $("menuSettingsBtn").onclick=()=>openFrontScreen(settingsScreen);
  $("menuRulesBtn").onclick=()=>openFrontScreen(rulesScreen);
  $("menuChangelogBtn").onclick=()=>openFrontScreen(changelogScreen);
  tutorialContinueBtn.onclick=closeTutorialStep;

  gameMenuBtn.onclick=()=>{
    if(game.classList.contains("hidden")) return;
    clearBotAutomation();
    quitModal.classList.remove("hidden");
  };

  quitCancelBtn.onclick=()=>{
    quitModal.classList.add("hidden");
    scheduleBotAction(100);
  };

  quitConfirmBtn.onclick=()=>{
    quitModal.classList.add("hidden");
    if(gameContext.returnScreen==="trio" || trioCampaignMode){returnToTrioCampaignMap();return;}
    if(gameContext.returnScreen==="duo" || duoCampaignMode){returnToDuoCampaignMap();return;}
    if(campaignMode || gameContext.returnScreen==="campaign"){openCampaignScreen();return;}
    openMainMenu();
  };

  $("setupBackBtn").onclick=openMainMenu;
  document.querySelectorAll(".menuBackBtn").forEach(btn=>btn.onclick=openMainMenu);

  animationSetting.onchange=()=>{
    const fast=animationSetting.value==="fast";
    ROLL_ANIM_MS=fast?250:430;
    document.body.classList.toggle("fast-animations",fast);
    saveData.settings.animation=animationSetting.value;saveGameData();
  };

  botSpeedSetting.onchange=()=>{ botSpeedMode=botSpeedSetting.value; saveData.settings.botSpeed=botSpeedMode; saveGameData(); };


  createProfileBtn.onclick=()=>{
    const p=createProfile(newProfileName.value);
    if(!p) return;
    newProfileName.value="";renderProfiles();renderAchievements();makeNameFields();
  };
  newProfileName.addEventListener("keydown",e=>{if(e.key==="Enter")createProfileBtn.click();});
  profilesBackBtn.onclick=()=>{
    if(profileScreenOrigin==="setup"){makeNameFields();openFrontScreen(setup);}
    else if(profileScreenOrigin==="campaign"){openCampaignScreen();}
    else if(profileScreenOrigin==="duo"){openDuoCampaignScreen();}
    else if(profileScreenOrigin==="trio"){openTrioCampaignScreen();}
    else openMainMenu();
  };

  $("setupProfilesBtn").onclick=()=>{profileScreenOrigin="setup";renderProfiles();openFrontScreen(profilesScreen);};

  function refreshPersistentUi(){
    applyStoredSettings();renderProfiles();renderAchievements();renderStats();makeNameFields();renderCampaign();renderDuoCampaign();renderTrioCampaign();if(prestigeShopScreen&&!prestigeShopScreen.classList.contains("hidden"))renderPrestigeShop();
  }

  function exportSave(){
    const payload={...saveData,schemaVersion:Math.max(Number(saveData.schemaVersion)||1,SAVE_SCHEMA_VERSION),campaignVersion:Math.max(Number(saveData.campaignVersion)||1,CAMPAIGN_VERSION),lastGameVersion:GAME_VERSION,exportMeta:{gameVersion:GAME_VERSION,exportedAt:new Date().toISOString()}};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`wuerfelduell_save_v${GAME_VERSION.replace(/\./g,"_")}.json`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function importSaveFile(file){
    if(!file) return;
    let backup=saveData;
    try{
      const parsed=JSON.parse(await file.text());
      if(!parsed || typeof parsed!=="object" || !Array.isArray(parsed.profiles)) throw new Error("Ungültiges Würfelduell-Saveformat");
      if(!confirm("Import ersetzt die aktuell lokal gespeicherten Würfelduell-Daten. Fortfahren?")) return;
      saveData=hydrateSave(parsed);
      if(!saveGameData()) throw new Error("Browser-Speicher konnte nicht geschrieben werden");
      gameContext={mode:"menu",returnScreen:"menu",profileId:null,encounterId:null};
      refreshPersistentUi();
      alert(`Save importiert. ${saveData.profiles.length} Profil(e) geladen.`);
    }catch(err){
      console.warn("Save-Import fehlgeschlagen",err);
      saveData=backup;
      alert("Save konnte nicht importiert werden. Die bisherigen Daten wurden nicht ersetzt.");
    }finally{
      importSaveInput.value="";
    }
  }

  exportSaveBtn.onclick=exportSave;
  importSaveBtn.onclick=()=>importSaveInput.click();
  importSaveInput.onchange=()=>importSaveFile(importSaveInput.files?.[0]);

  resetStorageBtn.onclick=()=>{
    if(!confirm("Wirklich ALLE lokalen Würfelduell-Profile, Kampagnenfortschritte, Achievements und Statistiken löschen?")) return;
    try{localStorage.removeItem(SAVE_KEY);}catch(e){}
    saveData=createDefaultSave();saveGameData();gameContext={mode:"menu",returnScreen:"menu",profileId:null,encounterId:null};refreshPersistentUi();
  };

  allAbilitiesBtn.onclick=()=>{
    renderAllAbilities();
    openFrontScreen(abilitiesScreen);
  };

  abilitiesBackBtn.onclick=()=>openFrontScreen(rulesScreen);

  $("makeNames").onclick=makeNameFields;
  playerCount.onchange=makeNameFields;
  localModeSelect.onchange=applyLocalModeSetup;
  rollAbilitiesBtn.onclick=rollSetupAbilities;

  startGameBtn.onclick=()=>{
    tutorialMode=false;campaignMode=false;duoCampaignMode=false;trioCampaignMode=false;
    const rules=localModeRules();
    gameContext={mode:`local-${rules.id}`,returnScreen:"setup",profileId:null,encounterId:null};
    resetTutorialUi();nextRoundPrepBtn.classList.remove("hidden");restartBtn.textContent="Neue Partie";
    const n=+playerCount.value;if(setupAbilityRolls.some(v=>v==null)) return;if(!rules.allowBots && n>4) return;

    clearBotAutomation();
    const seats=Array.from({length:n},(_,i)=>+$("seatChoice"+i).value);
    const botLevels=Array.from({length:n},(_,i)=>rules.allowBots?setupBotLevel(i):"human");

    players=Array.from({length:n},(_,i)=>{
      const abilities=getSetupAbilities(i);
      const rolled=setupAbilityRolls[i];
      const profile=botLevels[i]==="human"?getProfile($("profileChoice"+i)?.value):null;
      return{
        name:profile?.name||`Bot ${i+1}`,battleTag:profile?`#${profile.tagNumber}`:"",profileId:profile?.id||null,botLevel:botLevels[i],
        hp:rules.startHp,maxHp:rules.startHp,ability:abilities[0]??1,secondAbility:abilities[1]??null,thirdAbility:abilities[2]??null,
        secondAbilityUnlocked:rules.startAbilityCount>=2,thirdAbilityUnlocked:rules.startAbilityCount>=3,rolledAbility:rolled,
        primaryWasChosen:rules.id==="classic"&&rolled===6,secondAbilityWasChosen:false,thirdAbilityWasChosen:false,
        seat:seats[i],diceDesign:profile?.selectedDice||"classic",...(profile?playerCosmeticsFromProfile(profile):{}),wins:0,momentumStreak:0,lastStandUsed:false,roundLastStandTriggered:false,damageSinceLastOwnTurn:false,bloodRushPrimed:false,voluntaryHpPaidThisTurn:false,botBloodUsesThisAttack:0
      };
    });

    randomizePlayerOrder(false);resetRoundStats();current=0;prepareBloodRushForTurn(current);dice=freshDice();phase="idle";isAnimating=false;
    attackFace=null;attackTarget=null;pendingCampaignAttackStart=null;attackHits=0;attackDamage=0;firstAttackRoll=true;currentAttackRollNewHits=0;
    baseRerollUsed=false;loadedDiceUsed=false;lastBaseRollIndices=[];attackPowerUsed=false;precisionUses=0;momentumBonus=0;bloodPriceNeighbors=[];bloodRushActiveThisAttack=false;doubleTapApplied=false;pendingDamage=null;pendingHeal=null;
    roundNumber=1;roundEliminationOrder=[];lastPlaceIndex=null;roundWinnerHandled=false;roundWinnerIndex=null;nextRoundAbilityRolls=[];eventPopupQueue=[];eventPopupBusy=false;secondAbilityDraftBusy=false;secondAbilityDraftIndex=null;secondAbilityDraftSlot=2;deferredBaseAdvance=false;gamblingRolling=false;gamblingBaseTotal=null;gamblingModal.classList.add("hidden");highStakesRolling=false;highStakesDecisionThisAttack=false;highStakesModal.classList.add("hidden");perfect25Rolling=false;perfect25D4Rolling=false;perfect25BaseTotal=null;pendingPerfect25Total=null;perfect25Modal.classList.add("hidden");perfect25D4Modal.classList.add("hidden");insuranceRolling=false;insuranceContext=null;insuranceModal.classList.add("hidden");counterRolling=false;counterContext=null;counterDiceState=[];counterHits=0;counterFirstRoll=true;pendingCounterattack=null;deferredAttackFinish=false;counterModal.classList.add("hidden");wildcardFace=null;secondAbilityDraftQueue=[];secondAbilityModal.classList.add("hidden");
    logEl.innerHTML="";winnerBox.classList.add("hidden");nextRoundBox.classList.add("hidden");hideFrontScreens();game.classList.remove("hidden","campaign-game","trio-game");document.body.classList.add("playing");window.scrollTo?.(0,0);

    if(rules.id==="classic") addLog(`Classic gestartet mit ${n} Teilnehmern. Jeder startet mit ${rules.startHp} Leben.`);
    else addLog(`${rules.name} gestartet: ${n} lokale Spieler · ${rules.startHp} HP · ${rules.startAbilityCount} Startfähigkeiten · keine Bots.`);
    players.forEach((p,i)=>{
      if(rules.id==="classic"){
        const roll=p.rolledAbility;const abilityText=roll===6?`W25 = 6 → freie Wahl → ${ABILITIES[p.ability].name}`:`W25 = ${roll} → ${ABILITIES[p.ability].name}`;
        const controller=p.botLevel==="human"?"Mensch":BOT_LEVELS[p.botLevel].name;addLog(`${p.name}: ${abilityText} · ${controller} · Sitz: ${SEATS[p.seat].name}.`);
      }else{
        addLog(`${p.name}: ${playerAbilities(i).map(id=>ABILITIES[id].name).join(" + ")}.`);
      }
    });
    renderAll();
  };

  gamblingDie.onclick=()=>{if(!isBotPlayer(current))rollGamblingMan();};
  perfect25Die.onclick=()=>{if(!isBotPlayer(current))rollPerfect25();};
  perfect25D4Die.onclick=()=>{if(!isBotPlayer(current))rollPerfect25D4();};
  highStakesDie.onclick=()=>{if(!isBotPlayer(current))rollHighStakes();};
  highStakesSkip.onclick=()=>{if(!isBotPlayer(current))skipHighStakes();};

  primaryBtn.onclick=()=>{
    if(isBotPlayer(current)) return;
    if(phase==="idle"||phase==="base_ready") rollBase();
    else if(phase==="attack_ready"||phase==="attack_continue") rollAttack();
  };
  lockBtn.onclick=()=>{if(!isBotPlayer(current))lockSelected();};
  baseRerollBtn.onclick=()=>{if(!isBotPlayer(current))useBaseReroll();};
  loadedDiceBtn.onclick=()=>{if(!isBotPlayer(current))useLoadedDice();};
  snakeEyesBtn.onclick=()=>{if(!isBotPlayer(current))useSnakeEyes();};
  insuranceDie.onclick=()=>{if(!isBotPlayer(current))rollInsurance();};
  counterRollBtn.onclick=()=>{
    if(!counterContext) return;
    if(isBotPlayer(counterContext.defenderIndex)) return;
    document.body.classList.remove("bot-acting");
    if(!counterRolling) counterRollBtn.disabled=false;
    rollCounterattack();
  };
  attackPowerBtn.onclick=()=>{if(!isBotPlayer(current))useAttackPower();};
  bloodLowerBtn.onclick=()=>{if(!isBotPlayer(current))useBloodPrice();};
  bloodHigherBtn.onclick=()=>{if(!isBotPlayer(current))useBloodPrice();};
  resolveAttackBtn.onclick=()=>{if(!isBotPlayer(current))resolveCurrentAttackRoll();};
  nextBtn.onclick=()=>{if(!isBotPlayer(current))advanceTurn();};
  nextRoundPrepBtn.onclick=prepareNextRound;
  startNextRoundBtn.onclick=startNextRound;

  restartBtn.onclick=()=>{
    if(trioCampaignMode || gameContext.returnScreen==="trio" || restartBtn.textContent==="Zur Trio-Kampagne"){returnToTrioCampaignMap();return;}
    if(duoCampaignMode || gameContext.returnScreen==="duo" || restartBtn.textContent==="Zur Duo-Kampagne"){returnToDuoCampaignMap();return;}
    if(campaignMode || gameContext.returnScreen==="campaign" || restartBtn.textContent==="Zur Kampagne"){
      returnToCampaignMap();
      return;
    }
    if(tutorialMode){
      openMainMenu();
      return;
    }
    clearBotAutomation();
    rotatingBoard.style.transform="rotate(0deg) scale(1)";
    eventPopupQueue=[];eventPopupBusy=false;
    secondAbilityDraftBusy=false;secondAbilityDraftIndex=null;deferredBaseAdvance=false;
    gamblingRolling=false;gamblingBaseTotal=null;gamblingModal.classList.add("hidden");highStakesRolling=false;highStakesDecisionThisAttack=false;highStakesModal.classList.add("hidden");perfect25Rolling=false;perfect25D4Rolling=false;perfect25BaseTotal=null;pendingPerfect25Total=null;perfect25Modal.classList.add("hidden");perfect25D4Modal.classList.add("hidden");insuranceRolling=false;insuranceContext=null;insuranceModal.classList.add("hidden");counterRolling=false;counterContext=null;counterDiceState=[];counterHits=0;counterFirstRoll=true;pendingCounterattack=null;deferredAttackFinish=false;counterModal.classList.add("hidden");wildcardFace=null;secondAbilityDraftQueue=[];
    secondAbilityModal.classList.add("hidden");
    eventPopup.classList.remove("active","death","win","survive");
    winnerBox.classList.add("hidden");nextRoundBox.classList.add("hidden");
    document.body.classList.remove("playing","bot-acting");
    game.classList.add("hidden");
    gameContext={mode:"setup",returnScreen:"setup",profileId:null,encounterId:null};
    makeNameFields();
    openFrontScreen(setup);
  };

  window.addEventListener("resize",()=>{
    if(!game.classList.contains("hidden")) applySeatRotation();
  });

  loadSaveData();
  applyStoredSettings();
  renderProfiles();
  renderAchievements();
  renderStats();
  applyLocalModeSetup();
  renderCampaign();
  renderDuoCampaign();
  renderTrioCampaign();
  openMainMenu();
