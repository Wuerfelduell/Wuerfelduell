  function defaultDuoProgress(profile1Id,profile2Id){
    return {campaignVersion:CAMPAIGN_VERSION,profileIds:[profile1Id,profile2Id].filter(Boolean).sort(),completedEncounters:[],wins:0,losses:0};
  }

  function defaultTrioProgress(profile1Id,profile2Id,profile3Id){
    return {campaignVersion:CAMPAIGN_VERSION,profileIds:[profile1Id,profile2Id,profile3Id].filter(Boolean).sort(),completedEncounters:[],wins:0,losses:0};
  }

  function defaultCampaignProgress(){
    return {campaignVersion:CAMPAIGN_VERSION,completedEncounters:[],unlockedAbilities:[...CAMPAIGN_START_ABILITIES],unlockedSecondaryAbilities:[],trophies:0,wins:0,losses:0};
  }


  function emptyAbilityStat(){return {equipped:0,primary:0,secondary:0,chosen:0,wins:0};}
  function emptyProfileStats(){return {rounds:0,wins:0,kills:0,damageDealt:0,damageTaken:0,selfDamage:0,healed:0,ones:0,sixes:0,maxTurnDamage:0,currentWinStreak:0,bestWinStreak:0,abilities:{}};}
  function createDefaultSave(){
    return {schemaVersion:SAVE_SCHEMA_VERSION,campaignVersion:CAMPAIGN_VERSION,lastGameVersion:GAME_VERSION,settings:{animation:"normal",botSpeed:"normal"},global:{completedRounds:0},profiles:[],duoCampaigns:{},trioCampaigns:{}};
  }

  let storageAvailable=true;
  let saveData=createDefaultSave();

  // V27.6.6 Save Safety Net
  const SAVE_BACKUP_KEYS=[
    `${SAVE_KEY}_backup_1`,
    `${SAVE_KEY}_backup_2`,
    `${SAVE_KEY}_backup_3`
  ];

  function parseStoredSave(raw){
    if(!raw || typeof raw!=="string") return null;
    try{
      const parsed=JSON.parse(raw);
      return (parsed&&typeof parsed==="object"&&!Array.isArray(parsed))?parsed:null;
    }catch(_err){
      return null;
    }
  }

  function isMeaningfulStoredSave(rawOrParsed){
    const parsed=typeof rawOrParsed==="string"?parseStoredSave(rawOrParsed):rawOrParsed;
    if(!parsed) return false;
    if(Array.isArray(parsed.profiles)&&parsed.profiles.length>0) return true;
    if(parsed.global&&Number(parsed.global.completedRounds)>0) return true;
    if(parsed.duoCampaigns&&typeof parsed.duoCampaigns==="object"&&Object.keys(parsed.duoCampaigns).length>0) return true;
    if(parsed.trioCampaigns&&typeof parsed.trioCampaigns==="object"&&Object.keys(parsed.trioCampaigns).length>0) return true;
    return false;
  }

  function rotateSaveBackups(rawMain){
    if(!isMeaningfulStoredSave(rawMain)) return false;
    try{
      const b1=localStorage.getItem(SAVE_BACKUP_KEYS[0]);
      const b2=localStorage.getItem(SAVE_BACKUP_KEYS[1]);
      if(b2) localStorage.setItem(SAVE_BACKUP_KEYS[2],b2);
      if(b1) localStorage.setItem(SAVE_BACKUP_KEYS[1],b1);
      localStorage.setItem(SAVE_BACKUP_KEYS[0],rawMain);
      console.info(`[Würfelduell] Save-Snapshot gesichert: ${parseStoredSave(rawMain)?.lastGameVersion||"unbekannte Version"}`);
      return true;
    }catch(err){
      console.warn("Save-Backup konnte nicht rotiert werden",err);
      return false;
    }
  }

  function newestValidSaveBackup(){
    for(let i=0;i<SAVE_BACKUP_KEYS.length;i++){
      try{
        const raw=localStorage.getItem(SAVE_BACKUP_KEYS[i]);
        if(parseStoredSave(raw)&&isMeaningfulStoredSave(raw)) return {slot:i+1,key:SAVE_BACKUP_KEYS[i],raw};
      }catch(_err){}
    }
    return null;
  }

  function clearSaveBackups(){
    try{
      SAVE_BACKUP_KEYS.forEach(key=>localStorage.removeItem(key));
      return true;
    }catch(err){
      console.warn("Save-Backups konnten nicht gelöscht werden",err);
      return false;
    }
  }

  function recoverSaveBackup(slot=1){
    const index=Math.max(1,Math.min(3,Number(slot)||1))-1;
    try{
      const raw=localStorage.getItem(SAVE_BACKUP_KEYS[index]);
      const parsed=parseStoredSave(raw);
      if(!parsed||!isMeaningfulStoredSave(parsed)) return false;
      localStorage.setItem(SAVE_KEY,raw);
      saveData=hydrateSave(parsed);
      saveData.schemaVersion=Math.max(Number(saveData.schemaVersion)||1,SAVE_SCHEMA_VERSION);
      saveData.campaignVersion=Math.max(Number(saveData.campaignVersion)||1,CAMPAIGN_VERSION);
      saveData.lastGameVersion=GAME_VERSION;
      try{window.WDCloudAccount?.noteLocalSave?.(saveData);}catch(_err){}
      localStorage.setItem(SAVE_KEY,JSON.stringify(saveData));
      storageAvailable=true;
      console.warn(`[Würfelduell] Save aus Backup-Slot ${index+1} wiederhergestellt.`);
      return true;
    }catch(err){
      console.warn("Save-Recovery fehlgeschlagen",err);
      return false;
    }
  }

  window.WDSaveSafety={
    backupKeys:[...SAVE_BACKUP_KEYS],
    recover:recoverSaveBackup,
    clear:clearSaveBackups,
    inspect(){
      return SAVE_BACKUP_KEYS.map((key,i)=>{
        let parsed=null;
        try{parsed=parseStoredSave(localStorage.getItem(key));}catch(_err){}
        return {
          slot:i+1,
          version:parsed?.lastGameVersion||null,
          profiles:Array.isArray(parsed?.profiles)?parsed.profiles.length:0,
          meaningful:isMeaningfulStoredSave(parsed)
        };
      });
    }
  };

  function generateProfileId(){
    if(globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;
  }

  function generateTagNumber(){
    const used=new Set((saveData.profiles||[]).map(p=>String(p.tagNumber)));
    for(let i=0;i<200;i++){
      const n=String(Math.floor(Math.random()*10000)).padStart(4,"0");
      if(!used.has(n)) return n;
    }
    return String(Math.floor(Math.random()*10000)).padStart(4,"0");
  }

  function migrateSave(raw){
    const source=(raw&&typeof raw==="object")?raw:{};
    const migrated={...source};
    let version=Number(migrated.schemaVersion)||1;

    // V1 -> V2: Profile/Kampagne werden beim Normalisieren ergänzt.
    if(version<2) version=2;

    // V2 -> V3: campaign.completed war vom damaligen Content-Umfang abhängig.
    // Ab V3 wird "komplett" ausschließlich aus den aktuellen Final-Encounter-IDs berechnet.
    if(version<3){
      if(Array.isArray(migrated.profiles)){
        migrated.profiles=migrated.profiles.map(profile=>{
          if(!profile || typeof profile!=="object") return profile;
          const next={...profile};
          if(next.campaign && typeof next.campaign==="object"){
            next.campaign={...next.campaign};
            delete next.campaign.completed;
            if(!next.campaign.campaignVersion) next.campaign.campaignVersion=1;
          }
          return next;
        });
      }
      version=3;
    }

    // V3 -> V4: Prestige-Trophäen + separat freischaltbare Zweitfähigkeiten.
    // Bestehende Clears der beiden farmbaren Bosse erhalten einmalig ihre erste Trophäe.
    if(version<4){
      if(Array.isArray(migrated.profiles)){
        migrated.profiles=migrated.profiles.map(profile=>{
          if(!profile || typeof profile!=="object") return profile;
          const next={...profile};
          const campaign=(next.campaign&&typeof next.campaign==="object")?{...next.campaign}:{};
          const completed=Array.isArray(campaign.completedEncounters)?campaign.completedEncounters.map(String):[];
          if(!Number.isFinite(Number(campaign.trophies))){
            campaign.trophies=["royal_flush","rift_sovereign"].reduce((n,id)=>n+(completed.includes(id)?1:0),0);
          }
          const secondary=Array.isArray(campaign.unlockedSecondaryAbilities)?campaign.unlockedSecondaryAbilities.map(Number):[];
          if(completed.includes("rift_sovereign") && !secondary.includes(7)) secondary.push(7);
          campaign.unlockedSecondaryAbilities=[...new Set(secondary.filter(id=>Number.isInteger(id)&&id>0))];
          next.campaign=campaign;
          return next;
        });
      }
      version=4;
    }

    // V4 -> V5: Teamgebundener Fortschritt für die Duo-Kampagne.
    if(version<5){
      if(!migrated.duoCampaigns || typeof migrated.duoCampaigns!=="object" || Array.isArray(migrated.duoCampaigns)) migrated.duoCampaigns={};
      version=5;
    }

    // V5 -> V6: Prestige-Shop / kosmetische Profil-Ausrüstung.
    if(version<6){
      if(Array.isArray(migrated.profiles)){
        migrated.profiles=migrated.profiles.map(profile=>{
          if(!profile || typeof profile!=="object") return profile;
          const next={...profile};
          if(!next.prestigeCosmetics || typeof next.prestigeCosmetics!=="object") next.prestigeCosmetics={owned:[],selectedTitle:null,selectedFrame:null};
          return next;
        });
      }
      version=6;
    }

    // V6 -> V7: Teamgebundener Fortschritt für die Trio-Kampagne.
    if(version<7){
      if(!migrated.trioCampaigns || typeof migrated.trioCampaigns!=="object" || Array.isArray(migrated.trioCampaigns)) migrated.trioCampaigns={};
      version=7;
    }

    // V7 -> V8: Profilgebundene Angriffseffekte. Die eigentlichen Unlocks werden
    // beim Normalisieren aus Achievements und Trophy-Shop-Besitz rückwirkend ergänzt.
    if(version<8){
      if(Array.isArray(migrated.profiles)){
        migrated.profiles=migrated.profiles.map(profile=>{
          if(!profile || typeof profile!=="object") return profile;
          return {...profile,unlockedAttackFx:Array.isArray(profile.unlockedAttackFx)?profile.unlockedAttackFx:["classic"],selectedAttackFx:profile.selectedAttackFx||"classic"};
        });
      }
      version=8;
    }

    migrated.schemaVersion=Math.max(version,SAVE_SCHEMA_VERSION);
    migrated.campaignVersion=Number(migrated.campaignVersion)||CAMPAIGN_VERSION;
    migrated.lastGameVersion=GAME_VERSION;
    return migrated;
  }

  function normalizeProfile(raw){
    const p={...raw};
    p.id=p.id||generateProfileId();
    p.name=String(p.name||"Spieler").slice(0,24);
    p.tagNumber=String(p.tagNumber??generateTagNumber()).padStart(4,"0").slice(-4);
    p.unlockedDice=Array.isArray(p.unlockedDice)?[...new Set(["classic",...p.unlockedDice])]:["classic"];
    p.achievements=(p.achievements&&typeof p.achievements==="object")?p.achievements:{};
    // Neue Würfel-Rewards gelten rückwirkend: Wer das Achievement schon hatte,
    // bekommt das zugehörige Design beim ersten Start nach dem Update automatisch.
    p.unlockedAttackFx=Array.isArray(p.unlockedAttackFx)?[...new Set(["classic",...p.unlockedAttackFx.map(String)])]:["classic"];
    Object.entries(ACHIEVEMENTS).forEach(([id,a])=>{
      if(p.achievements[id] && a.rewardDice && !p.unlockedDice.includes(a.rewardDice)) p.unlockedDice.push(a.rewardDice);
      if(p.achievements[id] && a.rewardFx && ATTACK_FX_STYLES[a.rewardFx] && !p.unlockedAttackFx.includes(a.rewardFx)) p.unlockedAttackFx.push(a.rewardFx);
    });
    // Bereits gekaufte Trophy-Shop-Effekte ebenfalls rückwirkend als freigeschaltet markieren.
    const rawOwnedFx=Array.isArray(p.prestigeCosmetics?.owned)?p.prestigeCosmetics.owned:[];
    PRESTIGE_SHOP_ITEMS.filter(item=>item.type==="attackfx"&&rawOwnedFx.includes(item.id)).forEach(item=>{
      if(!p.unlockedAttackFx.includes(item.value)) p.unlockedAttackFx.push(item.value);
    });
    const originalDiceSet=["obsidian","gold","blood","arcane","emerald"];
    if(originalDiceSet.every(k=>p.unlockedDice.includes(k)) && !p.achievements.dice_goblin) p.achievements.dice_goblin=Date.now();
    const allDiceSet=Object.keys(DICE_UNLOCK_ACHIEVEMENT);
    if(allDiceSet.every(k=>p.unlockedDice.includes(k)) && !p.achievements.chromatic_menace) p.achievements.chromatic_menace=Date.now();
    const allAchievementFx=Object.keys(ATTACK_FX_UNLOCK_ACHIEVEMENT);
    if(allAchievementFx.every(k=>p.unlockedAttackFx.includes(k)) && !p.achievements.special_effects_department) p.achievements.special_effects_department=Date.now();
    p.selectedDice=p.unlockedDice.includes(p.selectedDice)?p.selectedDice:"classic";
    p.selectedAttackFx=p.unlockedAttackFx.includes(p.selectedAttackFx)?p.selectedAttackFx:"classic";
    const rawCosmetics=(p.prestigeCosmetics&&typeof p.prestigeCosmetics==="object")?p.prestigeCosmetics:{};
    p.prestigeCosmetics={
      owned:Array.isArray(rawCosmetics.owned)?[...new Set(rawCosmetics.owned.map(String))]:[],
      selectedTitle:rawCosmetics.selectedTitle?String(rawCosmetics.selectedTitle):null,
      selectedFrame:rawCosmetics.selectedFrame?String(rawCosmetics.selectedFrame):null
    };
    const ownedIds=new Set(p.prestigeCosmetics.owned);
    if(p.prestigeCosmetics.selectedTitle&&!ownedIds.has(p.prestigeCosmetics.selectedTitle)) p.prestigeCosmetics.selectedTitle=null;
    if(p.prestigeCosmetics.selectedFrame&&!ownedIds.has(p.prestigeCosmetics.selectedFrame)) p.prestigeCosmetics.selectedFrame=null;

    const rawCampaign=(p.campaign&&typeof p.campaign==="object")?p.campaign:{};
    p.campaign={...defaultCampaignProgress(),...rawCampaign};
    // Unbekannte IDs absichtlich behalten: Ein älterer Build darf niemals Fortschritt
    // aus einem neueren Kampagnen-Content-Stand wegfiltern.
    p.campaign.completedEncounters=Array.isArray(rawCampaign.completedEncounters)
      ? [...new Set(rawCampaign.completedEncounters.map(String).filter(Boolean))]
      : [];
    p.campaign.campaignVersion=Number(rawCampaign.campaignVersion)||CAMPAIGN_VERSION;

    const earnedRewards=CAMPAIGN_ENCOUNTERS
      .filter(e=>p.campaign.completedEncounters.includes(e.id) && e.rewardAbility)
      .map(e=>e.rewardAbility);
    const earnedSecondaryRewards=CAMPAIGN_ENCOUNTERS
      .filter(e=>p.campaign.completedEncounters.includes(e.id) && e.rewardSecondaryAbility)
      .map(e=>e.rewardSecondaryAbility);
    const storedCampaignAbilities=Array.isArray(rawCampaign.unlockedAbilities)
      ? rawCampaign.unlockedAbilities.map(Number).filter(id=>Number.isInteger(id)&&id>0&&!CAMPAIGN_SECONDARY_ONLY_ABILITY_IDS.includes(id))
      : [];
    const legacySecondaryFromMain=Array.isArray(rawCampaign.unlockedAbilities)
      ? rawCampaign.unlockedAbilities.map(Number).filter(id=>CAMPAIGN_SECONDARY_ONLY_ABILITY_IDS.includes(id))
      : [];
    const storedSecondaryAbilities=Array.isArray(rawCampaign.unlockedSecondaryAbilities)
      ? rawCampaign.unlockedSecondaryAbilities.map(Number).filter(id=>Number.isInteger(id)&&id>0)
      : [];
    // Unbekannte numerische Haupt-Ability-IDs bleiben erhalten; explizit second-only markierte IDs
    // werden dagegen in ihren eigenen Pool verschoben und können nie als Hauptfähigkeit gewählt werden.
    p.campaign.unlockedAbilities=[...new Set([...CAMPAIGN_START_ABILITIES,...earnedRewards,...storedCampaignAbilities])];
    p.campaign.unlockedSecondaryAbilities=[...new Set([...earnedSecondaryRewards,...storedSecondaryAbilities,...legacySecondaryFromMain])];
    p.campaign.trophies=Math.max(0,Math.floor(Number(rawCampaign.trophies)||0));

    p.stats={...emptyProfileStats(),...(p.stats||{})};
    p.stats.abilities=(p.stats.abilities&&typeof p.stats.abilities==="object")?p.stats.abilities:{};
    return p;
  }

  function hydrateSave(raw){
    const migrated=migrateSave(raw);
    const next={...createDefaultSave(),...migrated};
    next.schemaVersion=Math.max(Number(migrated.schemaVersion)||1,SAVE_SCHEMA_VERSION);
    next.campaignVersion=Math.max(Number(migrated.campaignVersion)||1,CAMPAIGN_VERSION);
    next.lastGameVersion=GAME_VERSION;
    next.settings={...createDefaultSave().settings,...(migrated.settings||{})};
    next.global={...createDefaultSave().global,...(migrated.global||{})};
    next.duoCampaigns=(migrated.duoCampaigns&&typeof migrated.duoCampaigns==="object"&&!Array.isArray(migrated.duoCampaigns))?{...migrated.duoCampaigns}:{};
    next.trioCampaigns=(migrated.trioCampaigns&&typeof migrated.trioCampaigns==="object"&&!Array.isArray(migrated.trioCampaigns))?{...migrated.trioCampaigns}:{};
    const rawProfiles=Array.isArray(migrated.profiles)?migrated.profiles:[];
    next.profiles=[];
    saveData=next; // normalizeProfile nutzt die bereits aufgebauten Profile für eindeutige Tags.
    rawProfiles.forEach(rawProfile=>next.profiles.push(normalizeProfile(rawProfile)));
    return next;
  }

  function loadSaveData(){
    try{
      const raw=localStorage.getItem(SAVE_KEY);

      if(!raw || !parseStoredSave(raw)){
        const backup=newestValidSaveBackup();
        if(backup){
          localStorage.setItem(SAVE_KEY,backup.raw);
          saveData=hydrateSave(parseStoredSave(backup.raw));
          saveData.lastGameVersion=GAME_VERSION;
          localStorage.setItem(SAVE_KEY,JSON.stringify(saveData));
          storageAvailable=true;
          console.warn(`[Würfelduell] Hauptsave fehlte/war defekt – Backup ${backup.slot} wurde automatisch wiederhergestellt.`);
          return;
        }
        saveData=createDefaultSave();
        return;
      }

      const parsed=parseStoredSave(raw);
      const previousVersion=String(parsed?.lastGameVersion||"");
      if(previousVersion!==String(GAME_VERSION) && isMeaningfulStoredSave(parsed)){
        rotateSaveBackups(raw);
      }

      saveData=hydrateSave(parsed);
      saveGameData();
    }catch(err){
      console.warn("Save konnte nicht geladen werden",err);
      const backup=newestValidSaveBackup();
      if(backup){
        try{
          localStorage.setItem(SAVE_KEY,backup.raw);
          saveData=hydrateSave(parseStoredSave(backup.raw));
          saveData.lastGameVersion=GAME_VERSION;
          localStorage.setItem(SAVE_KEY,JSON.stringify(saveData));
          storageAvailable=true;
          console.warn(`[Würfelduell] Ladefehler – Backup ${backup.slot} wurde automatisch wiederhergestellt.`);
          return;
        }catch(recoveryErr){
          console.warn("Automatische Save-Recovery ebenfalls fehlgeschlagen",recoveryErr);
        }
      }
      storageAvailable=false;
      saveData=createDefaultSave();
    }
  }

  function saveGameData(){
    try{
      saveData.schemaVersion=Math.max(Number(saveData.schemaVersion)||1,SAVE_SCHEMA_VERSION);
      saveData.campaignVersion=Math.max(Number(saveData.campaignVersion)||1,CAMPAIGN_VERSION);
      saveData.lastGameVersion=GAME_VERSION;
      localStorage.setItem(SAVE_KEY,JSON.stringify(saveData));
      storageAvailable=true;
      return true;
    }catch(err){
      console.warn("Save konnte nicht geschrieben werden",err);
      storageAvailable=false;
      return false;
    }
  }

  function getProfile(id){return saveData.profiles.find(p=>p.id===id)||null;}
  function profileLabel(profile){return profile?`${profile.name} #${profile.tagNumber}`:"Unbekannt";}
  function isHumanProfilePlayer(index){return !!players[index]?.profileId;}
  function profileForPlayer(index){return getProfile(players[index]?.profileId);}

  function createProfile(name){
    const clean=String(name||"").trim().slice(0,24);
    if(!clean) return null;
    const p=normalizeProfile({id:generateProfileId(),name:clean,tagNumber:generateTagNumber(),unlockedDice:["classic"],selectedDice:"classic",unlockedAttackFx:["classic"],selectedAttackFx:"classic",achievements:{},stats:emptyProfileStats()});
    saveData.profiles.push(p);
    saveGameData();
    return p;
  }

  function abilityStatFor(profile,id){
    const key=String(id);
    if(!profile.stats.abilities[key]) profile.stats.abilities[key]=emptyAbilityStat();
    profile.stats.abilities[key]={...emptyAbilityStat(),...profile.stats.abilities[key]};
    return profile.stats.abilities[key];
  }
