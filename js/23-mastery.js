(() => {
  const MODES=["solo","duo","trio"];
  const MAX_HP_LEVEL=3;
  const MAX_DAMAGE_LEVEL=3;
  const MAX_ABILITY_LEVEL=5;
  const ABILITY_ORDER=[1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25];

  // [id, name, L1 name, L1 desc, L2 name, L2 desc]
  const ABILITY_SHEET=[
    [1,"Brutale Einsen","1 for Poison","Erfolgreicher 1er-Angriff: Ziel verliert für die nächsten 2 Runden jeweils 1 HP.","Toxic Bomb","Stirbt ein vergifteter Gegner, verursacht eine einmalige Explosion 3 DMG an allen benachbarten Gegnern."],
    [2,"Lifesteal","Borrowing Life","Bei 0 Treffern heilt Lifesteal trotzdem +2 HP.","Overheal","Ein erfolgreicher Lifesteal heilt zusätzlich +3 HP."],
    [3,"Glückswurf","Reroll the Reroll","Die durch Glückswurf neu gewürfelte 1 darf einmal zusätzlich neu gewürfelt werden.","Reroll for Days","Glückswurf kann 2-mal pro Runde triggern."],
    [4,"Second Chance","One More Try","Second Chance darf 2-mal verwendet werden.","Reroll for Damage","Jeder Wurf im aktuellen Turn gibt dem daraus entstehenden Angriff +1 Gesamtschaden. Maximal +5. Nächster Turn startet wieder bei 0."],
    [5,"Angriffsvorsprung","Jump Ahead","24 und 25 zählen als 1er-Angriff; bei 24 bleibt 1 Self-DMG.","First Strike","Beim ersten Angriffswurf eines Angriffsvorsprung-Angriffs hast du automatisch 1 Treffer."],
    [8,"Präzision","Wider Window","Präzision erhält +1 Einsatz.","Bullseye","Treffer auf die ursprünglich gewählte Angriffszahl geben +1 Gesamtschaden für den Angriff."],
    [9,"Rache","Grudge","Rache wird bereits bei ≤15 HP aktiv statt erst bei ≤10 HP.","Vendetta","Basis-Rache bleibt +2 DMG pro Treffer. Zusätzlich: 5 HP = +1 Gesamtschaden, 4 HP = +2, 3 HP = +3, 2 HP = +4, 1 HP = +5 pro Angriff."],
    [10,"Momentum","Keep Rolling","Bei einem Fail sinkt die Momentum-Streak um 1 statt komplett zu resetten.","Unstoppable","Der Momentum-Bonus kann bis +3 steigen."],
    [11,"Blood Price","Blood Pact","Blood Price kostet weiterhin 3 HP. Bei 0 Treffern bekommst du 2 HP zurück.","Blood Credit","Wenn Blood Price vorher nicht aktiviert wurde, darf es nach dem Angriffswurf für 5 HP aktiviert werden."],
    [12,"Gambling Man","Gambling Twice","Bei 0 Treffern darfst du freiwillig erneut gambeln.","Better Chances","Die 1 ist nicht mehr im Gambling-Man-Angriffspool."],
    [13,"High Stakes","Raise the Stakes","Eine gewürfelte 3 gilt nicht mehr als Misserfolg, sondern verursacht normalen High-Stakes-Schaden.","All In","Bei einer gewürfelten 6 verursacht High Stakes 75 % mehr Schaden."],
    [14,"Last Stand","Back from the Dead","Wenn Last Stand triggert, wird dein Spielerleben auf 6 HP gesetzt.","I Can Do This All Day","Nach einem Last-Stand-Trigger kann Last Stand nach 3 Runden erneut triggern."],
    [15,"Perfect 25","Better Odds","Die 3 zählt jetzt auch als Hit.","Even the Odds","Die 2 zählt jetzt ebenfalls als Hit."],
    [16,"Ricochet","Rebound","Der erste Ricochet-Bounce auf Gegner 2 verursacht 2 DMG pro Angriffstreffer statt 1.","Chain Reaction","Ricochet bounced auf Gegner 3 weiter und verursacht dort 1 DMG pro Angriffstreffer."],
    [17,"Wildcard","Wildcards","Wildcard zählt auch beim 2. Angriffswurf.","Joker","Fällt die Wildcard-Zahl nicht, bekommen normale Angriffstreffer jeweils +2 DMG."],
    [18,"Loaded Dice","Dealer’s Choice","Loaded Dice darf 2-mal pro Zug verwendet werden.","Discount Dice","Der zweite Loaded-Dice-Use im selben Zug kostet nur 1 HP."],
    [19,"Insurance","Better Conditions","50 % Schadensreduktion gilt nun bei 4, 5 und 6.","Full Coverage","Bei einer 6 werden 100 % des anwendbaren Schadens reduziert."],
    [20,"Snake Eyes","Snake Bite","Snake Eyes ist auch im Angriffswurf nutzbar.","Python Entangle","Pro Snake-Eyes-Use im aktuellen Zug bekommt der Angriff +1 Gesamtschaden."],
    [21,"Counterattack","Fast Hits","Counterattack triggert bereits bei 4 HP eingehendem Schaden.","Parry","5 Einser im Counterattack-Wurf setzen den ursprünglichen eingehenden Schaden auf 0."],
    [23,"Blood Rush","Sacrifice","Selbst verursachter Schaden der letzten Runde zählt ebenfalls für Blood Rush.","Self Harm","Nach dem Angriffswurf darfst du 1 HP opfern, um Blood Rush zu triggern, falls es nicht aktiv ist."],
    [24,"Double Tap","One Tap","Bei genau 1 Angriffstreffer kann Double Tap triggern und gibt +2 Bonus-DMG.","Two Piece","Der Double-Tap-Bonus steigt auf +3 statt +2."],
    [25,"Underdog","Stay Hungry","Gleichstand bei niedrigsten HP reicht. Ist Underdog zu Zugbeginn aktiv, bleibt es den gesamten Zug aktiv.","Top Dog","Bonus = floor(Angriffstreffer × 1,5): 1→+1, 2→+3, 3→+4, 4→+6, 5→+7."]
  ];

  // Standalone nodes still take their position in the global ability-id unlock order.
  const STANDALONE=[
    [7,"Glück","Lucky Bastard","+1 % Chance auf 6er.","Very Lucky Bastard","Noch einmal +1 % Chance auf 6er.","FORTUNE'S FAVOR","Nach 3 Rolls ohne 6 steigt die 6er-Chance temporär stärker, bis eine 6 fällt. Danach Reset."],
    [22,"12","18","Bei 3 Sechsern gleichzeitig heilst du +2 HP.","24","Jeder zweite Heileffekt heilt zusätzlich +1 HP.","???","Keystone noch offen."]
  ];

  const L2_CONDITIONS={
    1:"Vergifte denselben Gegner 3-mal in einem Kampf.",
    2:"Heile 15 HP in einem Kampf, ohne Lifesteal mitzuhaben.",
    3:"Würfle insgesamt 100-mal.",
    4:"Führe insgesamt 50 Angriffswürfe aus.",
    5:"Verursache mit deinem ersten Angriff eines Kampfes mindestens 20 Schaden, ohne Angriffsvorsprung dafür zu verwenden.",
    7:"Würfle insgesamt 25 Sechser im Basiswurf weiter, statt sie einzulocken.",
    8:"Würfle im Angriffswurf ein Grande exakt auf deiner Trefferzahl.",
    9:"Töte insgesamt 10 Gegner, während du selbst unter 10 HP bist.",
    10:"Baue eine 5er Angriffsstreak auf, ohne Momentum mitzuhaben.",
    11:"Füge dir in einem Kampf insgesamt 40 Self-Damage zu.",
    12:"Locke im Basiswurf 5 Einser ein und kassiere 20 Self-Damage auf einmal.",
    13:"Würfle im Angriffswurf 5 Sechser gleichzeitig.",
    14:"Gewinne einen Kampf mit exakt 1 HP, ohne Last Stand mitzuhaben.",
    15:"Würfle 2-mal hintereinander exakt 25 mit Perfect 25 aktiv, schaffe den Perfect-25-Erlaubniswurf und würfle danach mit dem D4 eine 4.",
    16:"Töte 3 Gegner in einem Kampf, ohne Ricochet zu benutzen.",
    17:"Wrong Number: Verursache in einem Angriff mindestens 15 Schaden ausschließlich über Wildcard-Treffer, ohne Treffer deiner eigentlichen Angriffszahl.",
    18:"Zieh dir mit Loaded Dice in einem Kampf insgesamt 20 HP ab.",
    19:"Nutze Insurance 3-mal in einem Kampf und fail alle 3 Würfe.",
    20:"Würfle im Angriffswurf ein Grande Serviert; die Zahl muss nicht deiner Trefferzahl entsprechen.",
    21:"Verursache in einem Kampf genau einmal exakt 1 Schaden mit Counterattack – nicht mehr und nicht weniger.",
    22:"Würfle in einem Kampf insgesamt 24 Sechser.",
    23:"Blood Marathon: Greife 4-mal in einem Kampf an und erleide zwischen jedem dieser Angriffe Self-Damage.",
    24:"Greife 5-mal in einem Kampf an, ohne Double Tap zu verwenden, obwohl du Double Tap mithast.",
    25:"Starte in einem Kampf 5 eigene Züge mit mehr HP als alle Gegner."
  };

  const L2_PROGRESS_TARGETS={3:100,4:50,7:25,9:10};


  let activeMode="solo";
  let activeProfileId=null;

  function normalizeAbilityLevels(raw){
    const out={};
    if(raw&&typeof raw==="object"){
      Object.entries(raw).forEach(([id,level])=>{
        const n=Math.max(0,Math.min(2,Math.floor(Number(level)||0)));
        if(n>0) out[String(Number(id))]=n;
      });
    }
    return out;
  }

  function defaults(){
    return {xp:0,lifetimeXp:0,hpLevel:0,damageLevel:0,abilityLevel:0,abilityLevels:{},abilityL2Unlocked:{},abilityL2Progress:{},retroBackfillDone:false,retroBackfillV4Done:false};
  }

  function normalize(raw){
    raw=raw&&typeof raw==="object"?raw:{};
    return {
      xp:Math.max(0,Math.floor(Number(raw.xp)||0)),
      lifetimeXp:Math.max(0,Math.floor(Number(raw.lifetimeXp)||0)),
      hpLevel:Math.max(0,Math.min(MAX_HP_LEVEL,Math.floor(Number(raw.hpLevel)||0))),
      damageLevel:Math.max(0,Math.min(MAX_DAMAGE_LEVEL,Math.floor(Number(raw.damageLevel)||0))),
      abilityLevel:Math.max(0,Math.min(MAX_ABILITY_LEVEL,Math.floor(Number(raw.abilityLevel)||0))),
      abilityLevels:normalizeAbilityLevels(raw.abilityLevels),
      abilityL2Unlocked:raw.abilityL2Unlocked&&typeof raw.abilityL2Unlocked==="object"?Object.fromEntries(Object.entries(raw.abilityL2Unlocked).filter(([,v])=>!!v).map(([k])=>[String(Number(k)),true])):{},
      abilityL2Progress:raw.abilityL2Progress&&typeof raw.abilityL2Progress==="object"?Object.fromEntries(Object.entries(raw.abilityL2Progress).map(([k,v])=>[String(Number(k)),Math.max(0,Math.floor(Number(v)||0))])):{},
      retroBackfillDone:!!raw.retroBackfillDone,
      retroBackfillV2Done:!!raw.retroBackfillV2Done,
      retroBackfillV3Done:!!raw.retroBackfillV3Done,
      retroBackfillV4Done:!!raw.retroBackfillV4Done
    };
  }

  function normalizeInPlace(raw){
    const target=raw&&typeof raw==="object"?raw:{};
    const normalized=normalize(target);
    Object.assign(target,normalized);
    return target;
  }

  function ensureModes(profile){
    if(!profile) return null;
    profile.campaign=profile.campaign||{};
    profile.campaign.masteryModes=profile.campaign.masteryModes||{};

    if(!profile.campaign.masteryModes.solo){
      profile.campaign.masteryModes.solo=normalize(profile.campaign.mastery);
    }else{
      normalizeInPlace(profile.campaign.masteryModes.solo);
    }

    for(const mode of MODES){
      if(!profile.campaign.masteryModes[mode]){
        profile.campaign.masteryModes[mode]=defaults();
      }else{
        normalizeInPlace(profile.campaign.masteryModes[mode]);
      }
    }

    return profile.campaign.masteryModes;
  }

  function ensure(profile,mode="solo"){
    if(!MODES.includes(mode)) mode="solo";
    return ensureModes(profile)?.[mode]||defaults();
  }

  function perkCost(level){return Math.max(1,Number(level)||1)*100;}
  function branchSpent(level){let n=0;for(let i=1;i<=level;i++)n+=perkCost(i);return n;}
  function abilitySpent(m){
    return Object.values(m.abilityLevels||{}).reduce((sum,level)=>sum+(level>=1?300:0)+(level>=2?500:0),0);
  }
  function totalSpent(profile,mode){
    const m=ensure(profile,mode);
    return branchSpent(m.hpLevel)+branchSpent(m.damageLevel)+branchSpent(m.abilityLevel)+abilitySpent(m);
  }

  function modeLabel(mode){return mode==="duo"?"DUO MASTERY":mode==="trio"?"TRIO MASTERY":"SOLO MASTERY";}
  function soloWorldIndex(encounter){return CAMPAIGN_WORLDS.findIndex(w=>w.id===(encounter?.world||"house"));}
  function duoWorldIndex(encounter){return DUO_CAMPAIGN_WORLDS.findIndex(w=>w.id===(encounter?.world||"covenant"));}
  function encounterLevelInWorld(encounter,mode){
    if(!encounter) return 0;
    const list=mode==="duo"
      ? DUO_CAMPAIGN_ENCOUNTERS.filter(e=>(e.world||"covenant")===(encounter.world||"covenant"))
      : CAMPAIGN_ENCOUNTERS.filter(e=>(e.world||"house")===(encounter.world||"house"));
    return list.findIndex(e=>e.id===encounter.id)+1;
  }

  // XP farming begins with the first Standard-Mastery unlock.
  function encounterEligible(mode,encounter){
    if(!encounter) return false;
    if(mode==="solo"){
      const wi=soloWorldIndex(encounter),lv=encounterLevelInWorld(encounter,"solo");
      return wi>1 || (wi===1&&lv>=10); // Solo XP: W2L10+
    }
    if(mode==="duo"){
      const wi=duoWorldIndex(encounter),lv=encounterLevelInWorld(encounter,"duo");
      return wi>0 || (wi===0&&lv>=10); // Duo XP: W1L10+
    }
    if(mode==="trio") return true; // Trio XP: L1+
    return false;
  }

  // Standard bonuses may be USED from the newly requested earlier gates.
  function standardEligible(mode,encounter){
    if(!encounter) return false;
    if(mode==="solo"){
      const wi=soloWorldIndex(encounter),lv=encounterLevelInWorld(encounter,"solo");
      return wi>1 || (wi===1&&lv>=10); // Solo W2L10+
    }
    if(mode==="duo"){
      const wi=duoWorldIndex(encounter),lv=encounterLevelInWorld(encounter,"duo");
      return wi>0 || (wi===0&&lv>=10); // Duo W1L10+
    }
    return mode==="trio";
  }

  function completedSetForMode(mode,profiles){
    const list=(profiles||[]).filter(Boolean);
    if(mode==="solo") return new Set(list[0]?.campaign?.completedEncounters||[]);
    if(mode==="duo"&&list.length>=2){
      try{return new Set(duoCampaignProgress(list[0],list[1],false)?.completedEncounters||[]);}catch(_err){return new Set();}
    }
    if(mode==="trio"&&list.length>=3){
      try{return new Set(trioCampaignProgress(list[0],list[1],list[2],false)?.completedEncounters||[]);}catch(_err){return new Set();}
    }
    return new Set();
  }

  function modeUnlocked(mode,profiles){
    const list=(profiles||[]).filter(Boolean);
    if(mode==="trio") return list.length>=1;
    const done=completedSetForMode(mode,list);
    if(mode==="solo"){
      const gate=CAMPAIGN_ENCOUNTERS.filter(e=>(e.world||"house")==="rift")[9]; // W2L10
      return !!gate&&done.has(gate.id);
    }
    if(mode==="duo"){
      if(list.length<2) return false;
      const gate=DUO_CAMPAIGN_ENCOUNTERS.filter(e=>(e.world||"covenant")==="covenant")[9]; // W1L10
      return !!gate&&done.has(gate.id);
    }
    return false;
  }

  function hpBonus(profile,mode,encounter){return standardEligible(mode,encounter)?ensure(profile,mode).hpLevel*2:0;}
  function damageBonus(profile,mode,encounter){return standardEligible(mode,encounter)?ensure(profile,mode).damageLevel:0;}
  function abilityThreshold(profile,mode,encounter){return standardEligible(mode,encounter)?15+ensure(profile,mode).abilityLevel:15;}

  function currentBattleMode(){
    if(typeof trioCampaignMode!=="undefined"&&trioCampaignMode) return "trio";
    if(typeof duoCampaignMode!=="undefined"&&duoCampaignMode) return "duo";
    return "solo";
  }


  function isJuergenProfile(profile){
    const n=String(profile?.name||"").trim().toLowerCase();
    return n==="jürgen"||n==="jurgen"||n==="juergen";
  }
  function abilityLevel(profile,mode,id){
    return Math.max(0,Number(ensure(profile,mode).abilityLevels?.[String(Number(id))])||0);
  } // ensure() must preserve object identity

  function l2Unlocked(profile,mode,id){
    return !!ensure(profile,mode).abilityL2Unlocked?.[String(Number(id))];
  }
  function l2Progress(profile,mode,id){
    return Math.max(0,Number(ensure(profile,mode).abilityL2Progress?.[String(Number(id))])||0);
  }
  function l2ChallengeEligible(mode,encounter){
    if(!encounter) return false;
    if(mode==="solo") return soloWorldIndex(encounter)>=2; // Welt 3+
    if(mode==="duo") return duoWorldIndex(encounter)>=1;   // Welt 2+
    if(mode==="trio") return true;                         // Trio besitzt keine Welten
    return false;
  }

  function playerProfileAndMode(index){
    try{
      const p=players?.[Number(index)];
      if(!campaignMode||!p||p.campaignTeam!=="hero"||!p.profileId) return null;
      const profile=resolveMasteryProfile(p.profileId);
      if(!profile) return null;
      const mode=currentBattleMode();
      const encounter=currentEncounterObject?.();
      if(!l2ChallengeEligible(mode,encounter)) return null;
      return {profile,mode,player:p,encounter};
    }catch(_err){return null;}
  }
  function l2TrackingContext(index,id){
    const ctx=playerProfileAndMode(index);
    if(!ctx)return null;
    if(abilityLevel(ctx.profile,ctx.mode,id)<1)return null;
    return ctx;
  }
  function unlockL2ForPlayer(index,id){
    const ctx=l2TrackingContext(index,id);if(!ctx)return false;
    const state=ensure(ctx.profile,ctx.mode),key=String(Number(id));
    if(state.abilityL2Unlocked[key])return false;
    state.abilityL2Unlocked[key]=true;
    saveGameData();
    try{addLog(`🧬 Mastery L2 freigeschaltet: ${ABILITIES[Number(id)]?.name||id}!`);}catch(_err){}
    try{queueEventPopup(`${ABILITIES[Number(id)]?.name||"Ability"} L2 unlocked!`,"win");}catch(_err){}
    return true;
  }
  function addL2Progress(index,id,amount=1){
    const ctx=l2TrackingContext(index,id);if(!ctx)return 0;
    const state=ensure(ctx.profile,ctx.mode),key=String(Number(id)),target=Number(L2_PROGRESS_TARGETS[Number(id)])||0;
    if(state.abilityL2Unlocked[key]||target<=0)return state.abilityL2Progress[key]||0;
    state.abilityL2Progress[key]=Math.min(target,Math.max(0,Number(state.abilityL2Progress[key])||0)+Math.max(0,Number(amount)||0));
    if(state.abilityL2Progress[key]>=target)unlockL2ForPlayer(index,id);
    return state.abilityL2Progress[key];
  }
  function runState(index){
    const p=players?.[Number(index)];if(!p)return null;
    if(!p.masteryL2Run)p.masteryL2Run={
      abilityUses:{},poisons:{},killsNoRicochet:0,ricochetUsed:false,
      counterEvents:0,counterDamageTotal:0,selfDamageTotal:0,loadedSelfDamage:0,
      insuranceFails:0,healNoLifesteal:0,everHadLifesteal:false,everHadLastStand:false,
      firstAttackDone:false,doubleTapUsed:false,doubleTapSafeAttacks:0,
      selfDamageSerial:0,bloodMarathonCount:0,bloodMarathonLastSerial:0,
      perfect25Chain:0,perfect25PermitChain:0,underdogHighTurns:0
    };
    return p.masteryL2Run;
  }
  function noteAbilityUse(index,id){
    const r=runState(index);if(!r)return;
    r.abilityUses[String(Number(id))]=(r.abilityUses[String(Number(id))]||0)+1;
    if(Number(id)===16)r.ricochetUsed=true;
    if(Number(id)===24)r.doubleTapUsed=true;
  }
  function noteSelfDamage(index,amount,source=""){
    if(amount<=0)return;
    const r=runState(index);if(!r)return;
    if(l2TrackingContext(index,11)){
      r.selfDamageTotal+=amount;
      if(r.selfDamageTotal>=40)unlockL2ForPlayer(index,11);
    }
    if(l2TrackingContext(index,18)&&source==="loaded"){
      r.loadedSelfDamage+=amount;
      if(r.loadedSelfDamage>=20)unlockL2ForPlayer(index,18);
    }
    if(l2TrackingContext(index,23))r.selfDamageSerial++;
  }
  function noteHealing(index,amount){
    if(amount<=0||!l2TrackingContext(index,2))return;
    const r=runState(index);if(!r)return;
    if(hasAbility(2,index))r.everHadLifesteal=true;
    if(!r.everHadLifesteal){
      r.healNoLifesteal+=amount;
      if(r.healNoLifesteal>=15)unlockL2ForPlayer(index,2);
    }
  }
  function noteKill(index,targetIndex){
    const r=runState(index);if(!r)return;
    if(l2TrackingContext(index,9)&&players?.[index]?.hp<10)addL2Progress(index,9,1);
    if(l2TrackingContext(index,16)&&!r.ricochetUsed){
      r.killsNoRicochet++;
      if(r.killsNoRicochet>=3)unlockL2ForPlayer(index,16);
    }
  }
  function noteAttackRoll(index,values,face){
    if(!Array.isArray(values))return;
    const nums=values.map(v=>Number(v)).filter(v=>Number.isFinite(v));
    if(l2TrackingContext(index,4))addL2Progress(index,4,1);
    /* Full attack board only (5 dice). Callers must pass locked+unlocked values. */
    if(nums.length===5){
      const target=Number(face);
      if(l2TrackingContext(index,13)&&nums.every(v=>v===6))unlockL2ForPlayer(index,13);
      if(l2TrackingContext(index,20)&&nums.every(v=>v===nums[0]))unlockL2ForPlayer(index,20);
      if(l2TrackingContext(index,8)&&Number.isFinite(target)&&nums.every(v=>v===target))unlockL2ForPlayer(index,8);
    }
  }
  function noteRerolledSixes(index,count){
    if(count>0&&l2TrackingContext(index,7))addL2Progress(index,7,count);
  }
  function noteAnyD6(index){
    if(l2TrackingContext(index,3))addL2Progress(index,3,1);
  }
  function noteAttackStart(index,source){
    const r=runState(index);if(!r)return;
    const p=players[index];
    if(l2TrackingContext(index,5)&&!r.firstAttackDone)r.firstAttackSource=source;
    if(l2TrackingContext(index,10)&&!hasAbility(10,index)&&Number(p?.hotDiceStreak||0)>=5)unlockL2ForPlayer(index,10);
    if(l2TrackingContext(index,24)&&hasAbility(24,index)&&!r.doubleTapUsed)r.doubleTapSafeAttacks++;
    if(l2TrackingContext(index,23)){
      if(r.bloodMarathonCount===0)r.bloodMarathonCount=1;
      else if(r.selfDamageSerial>r.bloodMarathonLastSerial)r.bloodMarathonCount++;
      else r.bloodMarathonCount=1;
      r.bloodMarathonLastSerial=r.selfDamageSerial;
      if(r.bloodMarathonCount>=4)unlockL2ForPlayer(index,23);
    }
  }
  function noteAttackResolved(index,damage,source,normalHits=0,wildcardHits=0){
    const r=runState(index);if(!r)return;
    if(l2TrackingContext(index,5)&&!r.firstAttackDone){
      if(Number(damage)>=20&&source!=="advance")unlockL2ForPlayer(index,5);
      r.firstAttackDone=true;
    }
    if(l2TrackingContext(index,24)&&hasAbility(24,index)&&!r.doubleTapUsed&&r.doubleTapSafeAttacks>=5)unlockL2ForPlayer(index,24);
    if(l2TrackingContext(index,17)&&Number(normalHits)===0&&Number(wildcardHits)>0&&Number(damage)>=15)unlockL2ForPlayer(index,17);
  }
  function notePoison(index,targetIndex){
    if(!l2TrackingContext(index,1))return;
    const r=runState(index);if(!r)return;
    const key=String(targetIndex);r.poisons[key]=(r.poisons[key]||0)+1;
    if(r.poisons[key]>=3)unlockL2ForPlayer(index,1);
  }
  function noteInsurance(index,success){
    if(success||!l2TrackingContext(index,19))return;
    const r=runState(index);if(!r)return;
    r.insuranceFails++;
    if(r.insuranceFails>=3)unlockL2ForPlayer(index,19);
  }
  function noteCounterDamage(index,amount){
    if(!l2TrackingContext(index,21))return;
    const r=runState(index);if(!r)return;
    const dmg=Math.max(0,Number(amount)||0);
    if(dmg>0){r.counterEvents++;r.counterDamageTotal+=dmg;}
  }
  function noteTurnStart(index){
    const r=runState(index);if(!r)return;
    if(l2TrackingContext(index,2)&&hasAbility(2,index))r.everHadLifesteal=true;
    if(l2TrackingContext(index,14)&&hasAbility(14,index))r.everHadLastStand=true;
    if(l2TrackingContext(index,25)){
      const enemies=players.map((p,i)=>p?.hp>0&&p.campaignTeam==="enemy"?i:null).filter(i=>i!=null);
      if(enemies.length&&enemies.every(i=>players[index].hp>players[i].hp)){
        r.underdogHighTurns++;
        if(r.underdogHighTurns>=5)unlockL2ForPlayer(index,25);
      }
    }
  }
  function notePerfect25Base(index){
    if(!l2TrackingContext(index,15))return;
    const r=runState(index);if(!r)return;
    r.perfect25Chain=(r.perfect25Chain||0)+1;
    if(r.perfect25Chain>2)r.perfect25Chain=2;
  }
  function notePerfect25Break(index){
    if(!l2TrackingContext(index,15))return;
    const r=runState(index);if(r)r.perfect25Chain=0;
  }
  function notePerfect25Permit(index,success){
    if(!l2TrackingContext(index,15))return;
    const r=runState(index);if(!r)return;
    if(success&&r.perfect25Chain>=2)r.perfect25PermitChain=2;
    else if(!success)r.perfect25PermitChain=0;
  }
  function notePerfect25D4(index,value){
    if(!l2TrackingContext(index,15))return;
    const r=runState(index);if(!r)return;
    if(r.perfect25PermitChain>=2&&Number(value)===4)unlockL2ForPlayer(index,15);
  }
  function noteMatchEnd(index,won){
    const r=runState(index);if(!r)return;
    if(l2TrackingContext(index,14)&&won&&players[index]?.hp===1&&!r.everHadLastStand&&!hasAbility(14,index))unlockL2ForPlayer(index,14);
    if(l2TrackingContext(index,21)&&r.counterEvents===1&&r.counterDamageTotal===1)unlockL2ForPlayer(index,21);
  }

  function abilityLevelForPlayer(id,index=current){
    try{
      if(!campaignMode) return 0;
      const p=players?.[Number(index)];
      if(!p||p.campaignTeam!=="hero") return 0;
      const profile=getProfile(p.profileId);
      return abilityLevel(profile,currentBattleMode(),id);
    }catch(_err){return 0;}
  }
  function hasAbilityUpgrade(id,level=1,index=current){return abilityLevelForPlayer(id,index)>=level;}

  function damageBonusForPlayer(index){
    try{
      if(!campaignMode) return 0;
      const p=players?.[Number(index)];
      if(!p||p.campaignTeam!=="hero") return 0;
      return damageBonus(getProfile(p.profileId),currentBattleMode(),currentEncounterObject?.());
    }catch(_err){return 0;}
  }
  function abilityThresholdForPlayer(index){
    try{
      if(!campaignMode) return 15;
      const p=players?.[Number(index)];
      if(!p||p.campaignTeam!=="hero") return 15;
      return abilityThreshold(getProfile(p.profileId),currentBattleMode(),currentEncounterObject?.());
    }catch(_err){return 15;}
  }

  function isBossMasteryEncounter(mode,encounter){
    if(!encounter)return false;
    const level=encounterLevelInWorld(encounter,mode);
    const isBoss=level===10||level===15;
    if(!isBoss)return false;
    if(mode==="solo")return soloWorldIndex(encounter)>=2; // W3+
    if(mode==="duo")return duoWorldIndex(encounter)>=1;   // W2+
    return false;
  }

  function xpReward(mode,encounter,newlyCompleted){
    if(!encounterEligible(mode,encounter))return 0;
    if(isBossMasteryEncounter(mode,encounter))return newlyCompleted?200:50;
    return newlyCompleted?100:20;
  }

  function awardXp(profile,mode,encounter,newlyCompleted){
    if(!profile)return 0;
    const amount=xpReward(mode,encounter,!!newlyCompleted);
    if(amount<=0)return 0;
    const m=ensure(profile,mode);
    m.xp+=amount;m.lifetimeXp+=amount;return amount;
  }

  function profileIdsForMode(mode){
    if(mode==="solo") return [document.getElementById("campaignProfileSelect")?.value||campaignProfileId].filter(Boolean);
    if(mode==="duo") return [document.getElementById("duoProfile1Select")?.value||duoProfile1Id,document.getElementById("duoProfile2Select")?.value||duoProfile2Id].filter(Boolean);
    return [document.getElementById("trioProfile1Select")?.value||trioProfile1Id,document.getElementById("trioProfile2Select")?.value||trioProfile2Id,document.getElementById("trioProfile3Select")?.value||trioProfile3Id].filter(Boolean);
  }
  function profilesForMode(mode){return profileIdsForMode(mode).map(getProfile).filter(Boolean);}
  function selectedMasteryProfile(){
    const profiles=profilesForMode(activeMode);if(!profiles.length)return null;
    const picked=getProfile(activeProfileId);return picked&&profiles.some(p=>p.id===picked.id)?picked:profiles[0];
  }

  function branchData(profile){
    const m=ensure(profile,activeMode);
    return [
      {key:"hpLevel",icon:"❤️",title:"Vitality",desc:"Mehr Start- und Max-HP.",max:3,level:m.hpLevel,values:["+2 HP","+4 HP","+6 HP"]},
      {key:"damageLevel",icon:"⚔️",title:"Force",desc:"+1 / +2 / +3 Gesamtschaden pro Angriff.",max:3,level:m.damageLevel,values:["+1 DMG","+2 DMG","+3 DMG"]},
      {key:"abilityLevel",icon:"✨",title:"Awakening",desc:"Bonus-Draft früher verfügbar.",max:5,level:m.abilityLevel,values:["16 HP","17 HP","18 HP","19 HP","20 HP"]}
    ];
  }
  function standardNode(branch,index,xp){
    const level=index+1,cost=perkCost(level),owned=branch.level>=level,next=!owned&&branch.level===index,available=next&&xp>=cost;
    return `<button type="button" class="mastery-node${owned?" owned":""}${available?" available":" locked"}" data-standard-branch="${branch.key}" data-standard-level="${level}" data-standard-cost="${cost}" data-standard-title="${escapeHtml(branch.title+" · "+branch.values[index])}" data-standard-available="${available?"1":"0"}"><span class="mastery-node-orb"><span class="mastery-node-dot">${owned?"✓":level}</span></span><span class="mastery-node-plaque"><span class="mastery-node-value">${branch.values[index]}</span><small>${owned?"AKTIV":next?cost+" XP":"GESPERRT"}</small></span></button>`;
  }
  function closePurchaseConfirm(){
    const modal=document.getElementById("masteryPurchaseConfirm");
    if(!modal) return;
    modal.classList.add("hidden");
    modal.removeAttribute("data-tx");
  }

  function resolveMasteryProfile(profileId){
    try{
      const direct=getProfile(profileId);
      if(direct) return direct;
    }catch(_err){}
    try{
      return (saveData.profiles||[]).find(p=>String(p.id)===String(profileId))||null;
    }catch(_err){
      return null;
    }
  }

  function executeMasteryPurchase(tx){
    if(!tx||typeof tx!=="object") return false;

    const profile=resolveMasteryProfile(tx.profileId);
    if(!profile){
      showAbilityInfo("Kauf fehlgeschlagen","Profil konnte nicht aufgelöst werden.","⚠️ Kein Kauf",`ID: ${String(tx.profileId)} · Keine XP abgezogen.`);
      return false;
    }

    const mode=MODES.includes(tx.mode)?tx.mode:"solo";
    const state=ensure(profile,mode);
    const cost=Math.max(0,Number(tx.cost)||0);

    if(state.xp<cost){
      showAbilityInfo(tx.title||"Mastery","Nicht mehr genug XP.",`⭐ ${cost} XP`,`Verfügbar: ${state.xp} XP.`);
      return false;
    }

    if(tx.type==="standard"){
      const branch=String(tx.branch||"");
      const level=Number(tx.level);
      const caps={hpLevel:3,damageLevel:3,abilityLevel:5};

      if(!(branch in caps)||level<1||level>caps[branch]){
        showAbilityInfo(tx.title||"Mastery","Ungültiger Standard-Mastery-Kauf.","⚠️ Kein Kauf","Keine XP abgezogen.");
        return false;
      }
      if(state[branch]>=level){
        showAbilityInfo(tx.title||"Mastery","Diese Stufe ist bereits aktiv.","✅ Aktiv","Keine XP abgezogen.");
        return false;
      }
      if(state[branch]!==level-1){
        showAbilityInfo(tx.title||"Mastery","Vorherige Stufe zuerst kaufen.","🔒 Gesperrt","Keine XP abgezogen.");
        return false;
      }

      state.xp-=cost;
      state[branch]=level;
    }else if(tx.type==="ability"){
      const id=Number(tx.abilityId);
      const level=Number(tx.level);

      const currentLevel=abilityLevel(profile,mode,id);
      if(currentLevel>=level){
        showAbilityInfo(tx.title||"Ability Mastery","Dieses Upgrade ist bereits aktiv.","✅ Aktiv","Keine XP abgezogen.");
        return false;
      }
      if(level===1){
        if(currentLevel!==0){
          showAbilityInfo(tx.title||"Ability Mastery","Level 1 ist bereits aktiv.","✅ Aktiv","Keine XP abgezogen.");
          return false;
        }
      }else if(level===2){
        if(currentLevel<1||!l2Unlocked(profile,mode,id)){
          showAbilityInfo(tx.title||"Ability Mastery","Die L2-Challenge ist noch nicht erfüllt.","🔒 Gesperrt",L2_CONDITIONS[id]||"Condition offen.");
          return false;
        }
      }else return false;

      state.xp-=cost;
      state.abilityLevels[String(id)]=level;
    }else{
      showAbilityInfo(tx.title||"Mastery","Unbekannter Kauf-Typ.","⚠️ Kein Kauf","Keine XP abgezogen.");
      return false;
    }

    saveGameData();
    activeMode=mode;
    activeProfileId=profile.id;
    renderModal();
    refreshAll();
    return true;
  }

  function ensurePurchaseConfirm(){
    let modal=document.getElementById("masteryPurchaseConfirm");
    if(modal) return modal;

    modal=document.createElement("div");
    modal.id="masteryPurchaseConfirm";
    modal.className="mastery-purchase-confirm hidden";
    modal.innerHTML=`
      <div class="mastery-purchase-card">
        <div class="mastery-kicker">${window.t ? window.t("MASTERY KAUF BESTÄTIGEN") : "MASTERY KAUF BESTÄTIGEN"}</div>
        <h3></h3>
        <p class="mastery-purchase-desc"></p>
        <div class="mastery-purchase-price"></div>
        <div class="mastery-purchase-balance"></div>
        <div class="mastery-purchase-actions">
          <button type="button" class="secondary mastery-purchase-cancel">${window.t ? window.t("Abbrechen") : "Abbrechen"}</button>
          <button type="button" class="good mastery-purchase-buy">${window.t ? window.t("Kaufen") : "Kaufen"}</button>
        </div>
      </div>`;
    document.getElementById("masteryModal")?.appendChild(modal);
    return modal;
  }

  function showPurchaseConfirm({title,desc,cost,transaction}){
    const profile=resolveMasteryProfile(transaction?.profileId);
    if(!profile||!transaction) return;

    const modal=ensurePurchaseConfirm();
    const state=ensure(profile,transaction.mode);

    modal.dataset.tx=JSON.stringify({...transaction,title});
    modal.querySelector("h3").textContent=window.t?window.t(title):title;
    modal.querySelector(".mastery-purchase-desc").textContent=window.t?window.t(desc||""): (desc||"");
    modal.querySelector(".mastery-purchase-price").textContent=`⭐ ${cost} XP`;
    modal.querySelector(".mastery-purchase-balance").textContent=window.t?window.t(`Verfügbar: ${state.xp} XP → danach ${Math.max(0,state.xp-cost)} XP`):`Verfügbar: ${state.xp} XP → danach ${Math.max(0,state.xp-cost)} XP`;
    modal.classList.remove("hidden");
  }


  function renderStandard(profile){
    const m=ensure(profile,activeMode),summary=document.getElementById("masterySummary"),content=document.getElementById("masteryContent");
    summary.innerHTML=`<div class="mastery-summary-main"><strong>${escapeHtml(profile.name)}</strong><span>${modeLabel(activeMode)}</span></div><div class="mastery-xp-line"><span>⭐ ${m.xp} XP verfügbar</span><span>Σ ${m.lifetimeXp} verdient</span><span>-${totalSpent(profile,activeMode)} investiert</span></div><div class="mastery-xp-track mastery-xp-currency"></div><small>Standard-Mastery: ${activeMode==="solo"?"ab Solo W2L10":activeMode==="duo"?"ab Duo W1L10":"ab Trio L1"}. XP-Farming: Solo ab W2L10 · Duo ab W1L10 · Trio ab L1.</small>`;
    content.innerHTML=branchData(profile).map(branch=>`<section class="mastery-branch branch-${branch.key}"><div class="mastery-branch-head"><span class="mastery-branch-icon">${branch.icon}</span><div><strong>${branch.title}</strong><small>${branch.desc}</small></div><span class="mastery-branch-level">${branch.level}/${branch.max}</span></div><div class="mastery-tree-line">${Array.from({length:branch.max},(_,i)=>standardNode(branch,i,m.xp)).join("")}</div></section>`).join("");
    content.querySelectorAll("[data-standard-branch]").forEach(btn=>btn.addEventListener("click",()=>{
      const p=selectedMasteryProfile();if(!p)return;
      const state=ensure(p,activeMode),branch=btn.dataset.standardBranch,level=Number(btn.dataset.standardLevel),cost=Number(btn.dataset.standardCost),caps={hpLevel:3,damageLevel:3,abilityLevel:5};
      if(!(branch in caps))return;
      if(state[branch]>=level){showAbilityInfo(btn.dataset.standardTitle,"Dieses Standard-Mastery-Level ist bereits aktiv.","✅ Aktiv","Bereits gekauft.");return;}
      if(state[branch]!==level-1){showAbilityInfo(btn.dataset.standardTitle,"Vorherige Stufe zuerst freischalten.",`🔒 ${cost} XP`,"Gesperrt.");return;}
      if(state.xp<cost){showAbilityInfo(btn.dataset.standardTitle,"Nicht genug XP.",`⭐ ${cost} XP`,`Dir fehlen ${cost-state.xp} XP.`);return;}

      showPurchaseConfirm({
        title:btn.dataset.standardTitle,
        desc:`Standard-Mastery Level ${level} für ${modeLabel(activeMode)} kaufen?`,
        cost,
        transaction:{
          type:"standard",
          profileId:p.id,
          mode:activeMode,
          branch,
          level,
          cost
        }
      });
    }));
  }

  function abilityUnlockSequence(mode){
    if(mode==="solo"){
      const all=CAMPAIGN_WORLDS.flatMap(w=>CAMPAIGN_ENCOUNTERS.filter(e=>(e.world||"house")===w.id));
      const start=all.findIndex(e=>(e.world||"house")==="rift"&&encounterLevelInWorld(e,"solo")===10);
      return start>=0?all.slice(start):[];
    }
    if(mode==="duo"){
      const all=DUO_CAMPAIGN_WORLDS.flatMap(w=>DUO_CAMPAIGN_ENCOUNTERS.filter(e=>(e.world||"covenant")===w.id));
      const start=all.findIndex(e=>(e.world||"covenant")==="covenant"&&encounterLevelInWorld(e,"duo")===10);
      return start>=0?all.slice(start):[];
    }
    return [];
  }
  function abilityGate(mode,id){
    const pos=ABILITY_ORDER.indexOf(Number(id));if(pos<0||mode==="trio")return null;
    return abilityUnlockSequence(mode)[pos]||null;
  }
  function abilityGateLabel(mode,id){
    const e=abilityGate(mode,id);if(!e)return mode==="trio"?"Trio Unlock folgt":"Später";
    const wi=mode==="duo"?duoWorldIndex(e):soloWorldIndex(e),lv=encounterLevelInWorld(e,mode);
    return `${mode==="duo"?"Duo":"Solo"} W${wi+1}L${lv}`;
  }
  function abilityGateReached(mode,id){
    if(mode==="trio") return true;
    const gate=abilityGate(mode,id);if(!gate)return false;
    return completedSetForMode(mode,profilesForMode(mode)).has(gate.id);
  }

  function abilityNode(entry,level,profile){
    const id=entry[0],name=level===1?entry[2]:entry[4],desc=level===1?entry[3]:entry[5],cost=level===1?300:500,state=ensure(profile,activeMode),owned=abilityLevel(profile,activeMode,id)>=level;
    const l1Unlocked=abilityGateReached(activeMode,id);
    const l2Gate=l2Unlocked(profile,activeMode,id);
    const prereq=level===1?l1Unlocked:(abilityLevel(profile,activeMode,id)>=1&&l2Gate);
    const available=prereq&&!owned&&state.xp>=cost;
    let status="";
    if(owned)status="AKTIV";
    else if(level===1)status=l1Unlocked?`${cost} XP`:`🔒 ${abilityGateLabel(activeMode,id)}`;
    else{
      const target=L2_PROGRESS_TARGETS[id],prog=l2Progress(profile,activeMode,id),l1Owned=abilityLevel(profile,activeMode,id)>=1;
      status=!l1Owned?"🔒 L1 zuerst":l2Gate?`${cost} XP`:(target?`🔒 ${prog}/${target}`:"🔒 Challenge");
    }
    const cls=owned?" owned":available?" available":prereq?" mastery-ability-unlocked":" mastery-ability-locked";
    return `<button type="button" class="aml-node aml-ability-node ${cls}" data-ability-id="${id}" data-ability-level="${level}" data-ability-title="${escapeHtml(entry[1]+" · "+name)}" data-ability-desc="${escapeHtml(desc)}" data-ability-cost="${cost}"><span class="aml-node-orbit"></span><span class="aml-node-core"><span class="aml-node-level">${owned?"✓":"L"+level}</span></span><span class="aml-node-tag"><strong>${escapeHtml(name)}</strong><small>${status}</small></span></button>`;
  }
  function abilityBranch(entry,profile){
    return `<div class="mastery-ability-branch"><div class="mastery-ability-name">${escapeHtml(entry[1])}</div><div class="mastery-ability-node-row">${abilityNode(entry,1,profile)}${abilityNode(entry,2,profile)}</div></div>`;
  }
  function abilityPair(a,b,profile){
    return `<section class="mastery-ability-pair"><div class="mastery-ability-branches">${abilityBranch(a,profile)}${abilityBranch(b,profile)}</div><button type="button" class="mastery-fusion-placeholder" data-fusion-info="${escapeHtml(a[1]+" × "+b[1])}">🔒 <strong>???</strong><small>FUSION · 1000 XP</small></button></section>`;
  }
  function standaloneCard(a,profile){
    const entry=[a[0],a[1],a[2],a[3],a[4],a[5]];
    return `<section class="mastery-ability-pair mastery-standalone-pair">${abilityBranch(entry,profile)}<button type="button" class="mastery-fusion-placeholder" data-keystone-info="${escapeHtml(a[1]+" · "+a[6])}">🔒 <strong>${escapeHtml(a[6])}</strong><small>KEYSTONE · 1000 XP</small></button></section>`;
  }

  function showAbilityInfo(title,desc,cost,note){
    const tr=s=>window.t?window.t(s):s;
    let p=document.getElementById("masteryLockedInfo");
    if(!p){p=document.createElement("div");p.id="masteryLockedInfo";p.className="mastery-locked-info hidden";p.innerHTML=`<div class="mastery-locked-card"><button type="button">✕</button><div class="mastery-kicker">ABILITY MASTERY</div><h3></h3><div class="mastery-locked-cost"></div><p></p><small></small></div>`;document.getElementById("masteryModal")?.appendChild(p);p.querySelector("button").onclick=()=>p.classList.add("hidden");p.onclick=e=>{if(e.target===p)p.classList.add("hidden")};}
    p.querySelector("h3").textContent=tr(title);p.querySelector(".mastery-locked-cost").textContent=tr(cost);p.querySelector("p").textContent=tr(desc);p.querySelector("small").textContent=tr(note||"");p.classList.remove("hidden");
  }
  function renderAbilitySheet(profile){
    const sheet=document.getElementById("masteryAbilitySheet"),ordered=ABILITY_ORDER.map(id=>ABILITY_SHEET.find(a=>a[0]===id)).filter(Boolean),chunks=[];
    for(let i=0;i<ordered.length;i+=2){if(ordered[i+1])chunks.push(abilityPair(ordered[i],ordered[i+1],profile));else chunks.push(standaloneCard([ordered[i][0],ordered[i][1],ordered[i][2],ordered[i][3],ordered[i][4],ordered[i][5],"???","Keystone offen"],profile));}
    // Insert the two actual standalone abilities at their id-order position as separate cards.
    const stand=STANDALONE.map(a=>standaloneCard(a,profile)).join("");
    sheet.innerHTML=chunks.join("")+stand;
    sheet.querySelectorAll("[data-ability-id]").forEach(btn=>btn.addEventListener("click",()=>{
      const p=selectedMasteryProfile();if(!p)return;
      const id=Number(btn.dataset.abilityId),level=Number(btn.dataset.abilityLevel),cost=Number(btn.dataset.abilityCost),state=ensure(p,activeMode),owned=abilityLevel(p,activeMode,id)>=level;

      if(owned){showAbilityInfo(btn.dataset.abilityTitle,btn.dataset.abilityDesc,"✅ Aktiv","Bereits gekauft.");return;}
      if(level===1&&!abilityGateReached(activeMode,id)){
        showAbilityInfo(btn.dataset.abilityTitle,btn.dataset.abilityDesc,`🔒 ${cost} XP`,`Freischaltung: ${abilityGateLabel(activeMode,id)} abschließen.`);
        return;
      }
      if(level===2){
        if(abilityLevel(p,activeMode,id)<1){showAbilityInfo(btn.dataset.abilityTitle,btn.dataset.abilityDesc,`🔒 ${cost} XP`,"Kaufe zuerst Level 1.");return;}
        if(!l2Unlocked(p,activeMode,id)){
          const target=L2_PROGRESS_TARGETS[id],prog=l2Progress(p,activeMode,id),progressText=target?`Fortschritt: ${prog}/${target}. `:"";
          showAbilityInfo(btn.dataset.abilityTitle,btn.dataset.abilityDesc,`🔒 ${cost} XP`,`${progressText}${L2_CONDITIONS[id]||"L2-Challenge noch offen."}`);
          return;
        }
      }
      if(state.xp<cost){
        showAbilityInfo(btn.dataset.abilityTitle,btn.dataset.abilityDesc,`⭐ ${cost} XP`,`Dir fehlen ${cost-state.xp} XP.`);
        return;
      }

      showPurchaseConfirm({
        title:btn.dataset.abilityTitle,
        desc:btn.dataset.abilityDesc,
        cost,
        transaction:{
          type:"ability",
          profileId:p.id,
          mode:activeMode,
          abilityId:id,
          level,
          cost
        }
      });
    }));
    sheet.querySelectorAll("[data-fusion-info]").forEach(btn=>btn.addEventListener("click",()=>showAbilityInfo(btn.dataset.fusionInfo,"Fusion noch nicht festgelegt.","🔒 1000 XP","Fusionen bleiben Platzhalter.")));
    sheet.querySelectorAll("[data-keystone-info]").forEach(btn=>btn.addEventListener("click",()=>showAbilityInfo(btn.dataset.keystoneInfo,"Keystone bleibt vorerst gesperrt.","🔒 1000 XP","Keystone-Unlock folgt später.")));
  }

  function renderProfilePicker(){
    const wrap=document.getElementById("masteryProfilePickerWrap"),select=document.getElementById("masteryProfilePicker"),profiles=profilesForMode(activeMode);
    select.innerHTML=profiles.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");if(!activeProfileId||!profiles.some(p=>p.id===activeProfileId))activeProfileId=profiles[0]?.id||null;select.value=activeProfileId||"";wrap.classList.toggle("hidden",profiles.length<=1);
  }
  function renderModal(){
    const profile=selectedMasteryProfile();document.getElementById("masteryModeBadge").textContent=modeLabel(activeMode);document.querySelector("#masteryModal .mastery-kicker").textContent=`Campaign Progression · ${modeLabel(activeMode)}`;renderProfilePicker();
    if(!profile){document.getElementById("masterySummary").textContent="Kein Profil ausgewählt.";document.getElementById("masteryContent").innerHTML="";document.getElementById("masteryAbilitySheet").innerHTML="";}else{renderStandard(profile);renderAbilitySheet(profile);}
  }
  function open(mode="solo"){
    if(!MODES.includes(mode))mode="solo";const profiles=profilesForMode(mode);if(!profiles.length||!modeUnlocked(mode,profiles))return;activeMode=mode;activeProfileId=profiles[0].id;document.getElementById("masteryModal")?.classList.remove("hidden");document.body.classList.add("mastery-open");renderModal();
  }
  function close(){closePurchaseConfirm();document.getElementById("masteryModal")?.classList.add("hidden");document.getElementById("masteryLockedInfo")?.classList.add("hidden");document.body.classList.remove("mastery-open");}
  function summaryFor(mode){const profiles=profilesForMode(mode);if(!profiles.length)return"⭐ –";return profiles.map(p=>`${p.name}: ${ensure(p,mode).xp}`).join(" · ")+" XP";}
  function refreshMode(mode){
    const profiles=profilesForMode(mode),unlocked=modeUnlocked(mode,profiles),ids=mode==="solo"?["campaignMasteryXpSummary","campaignMasteryBtn"]:mode==="duo"?["duoCampaignMasteryXpSummary","duoCampaignMasteryBtn"]:["trioCampaignMasteryXpSummary","trioCampaignMasteryBtn"],counter=document.getElementById(ids[0]),btn=document.getElementById(ids[1]);
    if(counter)counter.textContent=summaryFor(mode);if(btn){btn.disabled=!unlocked;btn.textContent=unlocked?"⚔️ Mastery":"🔒 Mastery";btn.title=unlocked?"Mastery öffnen":mode==="solo"?"Nach Solo W2L10":"Nach Duo W1L10";}
  }
  function refreshAll(){refreshMode("solo");refreshMode("duo");refreshMode("trio");}
  function refreshCampaignUi(){refreshAll();}

  function retroCompletedEncountersForProfile(profile,mode){
    if(!profile)return[];
    const out=new Set();
    try{
      if(mode==="solo"){
        (profile.campaign?.completedEncounters||[]).forEach(id=>{
          const e=campaignEncounterById(id);
          if(e&&encounterEligible("solo",e)) out.add(String(id));
        });
        return [...out];
      }

      const store=mode==="duo"?(saveData.duoCampaigns||{}):(saveData.trioCampaigns||{});
      Object.values(store).forEach(progress=>{
        if(!(progress?.profileIds||[]).map(String).includes(String(profile.id))) return;
        (progress?.completedEncounters||[]).forEach(id=>{
          const e=mode==="duo"?duoEncounterById(id):trioEncounterById(id);
          if(e&&encounterEligible(mode,e)) out.add(String(id));
        });
      });
    }catch(_err){}
    return [...out];
  }

  function applyRetroBackfill(profile,mode){
    if(!profile||!MODES.includes(mode))return 0;
    const state=ensure(profile,mode);
    let granted=0;

    // Preserve the older baseline migration first.
    if(!state.retroBackfillV3Done){
      const completed=retroCompletedEncountersForProfile(profile,mode);
      const targetLifetime=completed.length*100;
      const beforeLifetime=Math.max(0,Math.floor(Number(state.lifetimeXp)||0));
      const beforeSpendable=Math.max(0,Math.floor(Number(state.xp)||0));

      if(targetLifetime>beforeLifetime){
        const delta=targetLifetime-beforeLifetime;
        state.lifetimeXp=targetLifetime;
        state.xp=beforeSpendable+delta;
        granted+=delta;
      }

      state.retroBackfillDone=true;
      state.retroBackfillV2Done=true;
      state.retroBackfillV3Done=true;
    }

    // V27.10.4: old boss first-clears used to be worth 100 XP.
    // New eligible bosses are worth 200, so each already-cleared boss gets exactly +100 once.
    if(!state.retroBackfillV4Done){
      const completed=retroCompletedEncountersForProfile(profile,mode);
      let bossBonus=0;
      completed.forEach(id=>{
        const e=mode==="solo"?campaignEncounterById(id):mode==="duo"?duoEncounterById(id):trioEncounterById(id);
        if(e&&isBossMasteryEncounter(mode,e))bossBonus+=100;
      });
      if(bossBonus>0){
        state.xp+=bossBonus;
        state.lifetimeXp+=bossBonus;
        granted+=bossBonus;
      }
      state.retroBackfillV4Done=true;
    }

    return granted;
  }

  function findProfileByNames(aliases){
    const want=(aliases||[]).map(a=>String(a).trim().toLowerCase());
    return (saveData.profiles||[]).find(p=>want.includes(String(p?.name||"").trim().toLowerCase()))||null;
  }
  function stripJuergenPrecisionOnce(){
    if(!saveData.global||typeof saveData.global!=="object")saveData.global={};
    if(saveData.global.juergenPrecisionUnbought)return false;
    (saveData.profiles||[]).forEach(p=>{
      if(!isJuergenProfile(p))return;
      ensureModes(p);
      for(const mode of MODES){
        const state=ensure(p,mode);
        if(state.abilityLevels&&Object.prototype.hasOwnProperty.call(state.abilityLevels,"8"))delete state.abilityLevels["8"];
        if(state.abilityL2Unlocked&&Object.prototype.hasOwnProperty.call(state.abilityL2Unlocked,"8"))delete state.abilityL2Unlocked["8"];
        if(state.abilityL2Progress&&Object.prototype.hasOwnProperty.call(state.abilityL2Progress,"8"))delete state.abilityL2Progress["8"];
      }
    });
    saveData.global.juergenPrecisionUnbought=true;
    return true;
  }
  function applyTrioThreefoldVerdictRetro(){
    if(!saveData.global||typeof saveData.global!=="object")saveData.global={};
    if(saveData.global.trioThreefoldVerdictRetro)return false;
    const seb=findProfileByNames(["seb"]);
    const hoada=findProfileByNames(["hoada"]);
    const juergen=findProfileByNames(["jürgen","jurgen","juergen"]);
    if(!seb||!hoada||!juergen||new Set([seb.id,hoada.id,juergen.id]).size!==3)return false;
    if(typeof trioCampaignProgress!=="function")return false;
    const encounter=(typeof trioEncounterById==="function"&&trioEncounterById("trio_threefold_verdict"))||{id:"trio_threefold_verdict"};
    const progress=trioCampaignProgress(seb,hoada,juergen,true);
    if(!progress)return false;
    let newlyCompleted=false;
    if(!progress.completedEncounters.includes("trio_threefold_verdict")){
      progress.completedEncounters.push("trio_threefold_verdict");
      newlyCompleted=true;
    }
    if(newlyCompleted){
      if(typeof awardTrioCampaignTrophies==="function")awardTrioCampaignTrophies(seb,hoada,juergen,encounter,true);
      [seb,hoada,juergen].forEach(p=>awardXp(p,"trio",encounter,true));
    }
    saveData.global.trioThreefoldVerdictRetro=true;
    return true;
  }

  function init(){
    try{
      let migrated=false;
      (saveData.profiles||[]).forEach(p=>{
        const hadSolo=!!p.campaign?.masteryModes?.solo;
        ensureModes(p);
        if(!hadSolo)migrated=true;

        for(const mode of MODES){
          const before=!!p.campaign?.masteryModes?.[mode]?.retroBackfillV4Done;
          applyRetroBackfill(p,mode);
          if(!before)migrated=true;
        }
      });
      if(applyTrioThreefoldVerdictRetro())migrated=true;
      if(stripJuergenPrecisionOnce())migrated=true;
      if(migrated)saveGameData();
    }catch(_err){}
    const masteryRoot=document.getElementById("masteryModal");
    masteryRoot?.addEventListener("click",e=>{
      const cancel=e.target.closest?.(".mastery-purchase-cancel");
      if(cancel){
        e.preventDefault();
        e.stopPropagation();
        closePurchaseConfirm();
        return;
      }

      const buy=e.target.closest?.(".mastery-purchase-buy");
      if(buy){
        e.preventDefault();
        e.stopPropagation();

        const confirm=document.getElementById("masteryPurchaseConfirm");
        if(!confirm) return;

        let tx=null;
        try{tx=JSON.parse(confirm.dataset.tx||"null");}catch(_err){tx=null;}
        if(!tx){
          showAbilityInfo("Kauf fehlgeschlagen","Kaufdaten fehlen.","⚠️ Kein Kauf","Keine XP abgezogen.");
          return;
        }

        confirm.classList.add("hidden");
        confirm.removeAttribute("data-tx");
        executeMasteryPurchase(tx);
        return;
      }

      if(e.target?.id==="masteryPurchaseConfirm"){
        closePurchaseConfirm();
      }
    });

    document.getElementById("campaignMasteryBtn")?.addEventListener("click",()=>open("solo"));document.getElementById("duoCampaignMasteryBtn")?.addEventListener("click",()=>open("duo"));document.getElementById("trioCampaignMasteryBtn")?.addEventListener("click",()=>open("trio"));document.getElementById("masteryCloseBtn")?.addEventListener("click",close);document.getElementById("masteryModal")?.addEventListener("click",e=>{if(e.target?.id==="masteryModal")close()});document.getElementById("masteryProfilePicker")?.addEventListener("change",e=>{activeProfileId=e.target.value;renderModal();});["campaignProfileSelect","duoProfile1Select","duoProfile2Select","trioProfile1Select","trioProfile2Select","trioProfile3Select"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>setTimeout(refreshAll,0)));refreshAll();
  }

  window.WDMastery=Object.freeze({
    ensure,ensureModes,encounterEligible,standardEligible,modeUnlocked,hpBonus,damageBonus,damageBonusForPlayer,abilityThreshold,abilityThresholdForPlayer,isBossMasteryEncounter,xpReward,awardXp,applyRetroBackfill,abilityLevel,abilityLevelForPlayer,hasAbilityUpgrade,abilityGate,abilityGateLabel,abilityGateReached,l2Unlocked,l2Progress,l2ChallengeEligible,l2TrackingContext,unlockL2ForPlayer,addL2Progress,runState,noteAbilityUse,noteSelfDamage,noteHealing,noteKill,noteAttackRoll,noteRerolledSixes,noteAnyD6,noteAttackStart,noteAttackResolved,notePoison,noteInsurance,noteCounterDamage,noteTurnStart,notePerfect25Base,notePerfect25Break,notePerfect25Permit,notePerfect25D4,noteMatchEnd,refreshCampaignUi,refreshAll,open
  });
  init();
})();
