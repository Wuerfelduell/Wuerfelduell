  const START_HP = 25;
  const DICE_COUNT = 5;
  let ROLL_ANIM_MS = 430;
  const SECOND_ABILITY_HP = 12;
  const REAL_ABILITY_IDS = [1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25];
  const CHOOSABLE_ABILITY_IDS = REAL_ABILITY_IDS.filter(id=>id!==7);

  const LOCAL_MODES={
    classic:{id:"classic",name:"Classic",startHp:25,startAbilityCount:1,bonusThreshold:12,bonusSlot:2,maxPlayers:8,allowBots:true,lastPlaceFreeChoices:1},
    endurance50:{id:"endurance50",name:"Endurance",startHp:50,startAbilityCount:2,bonusThreshold:30,bonusSlot:3,maxPlayers:4,allowBots:false,lastPlaceFreeChoices:2},
    overload75:{id:"overload75",name:"Overload",startHp:75,startAbilityCount:3,bonusThreshold:null,bonusSlot:null,maxPlayers:4,allowBots:false,lastPlaceFreeChoices:1}
  };
  let localModeId="classic";
  function localModeRules(){return LOCAL_MODES[localModeId]||LOCAL_MODES.classic;}

  const GAME_VERSION="27.5.1";
  const SAVE_KEY="wuerfelduell_save_v1"; // absichtlich stabil: Updates lesen denselben Browser-Save
  // Versionsanzeige immer aus derselben Quelle ziehen, damit Titel/Footer nicht mehr hinterherhinken.
  document.title=`Würfelduell · V${GAME_VERSION}`;
  queueMicrotask(()=>{const footer=document.querySelector(".version-footer");if(footer)footer.textContent=`WÜRFELDUELL · VERSION ${GAME_VERSION}`;});
  const SAVE_SCHEMA_VERSION=8;
  const CAMPAIGN_VERSION=29;

  const ACHIEVEMENTS={
    grande:{name:"GRANDE!",desc:"Beende einen Angriff mit allen 5 Würfeln als Treffer.",rewardDice:"gold"},
    not_today:{name:"Not Today.",desc:"Last Stand rettet dich und du gewinnst danach noch dieselbe Runde.",rewardDice:"obsidian"},
    blood_money:{name:"Blood Money",desc:"Bezahle in einer Runde insgesamt 9 HP freiwillig mit Loaded Dice oder Blutpreis.",rewardDice:"blood"},
    dual_wielding:{name:"Dual Wielding",desc:"Gewinne eine Runde mit aktiver Zweitfähigkeit.",rewardDice:"arcane"},
    back_from_dead:{name:"Back From The Dead",desc:"Heile in einer einzigen Runde insgesamt mindestens 8 HP.",rewardDice:"emerald"},
    snake_charmer:{name:"Snake Charmer",desc:"Benutze Snake Eyes mindestens zweimal im selben Basiszug.",rewardDice:"frost"},
    one_hp_wonder:{name:"One HP Wonder",desc:"Gewinne eine Runde mit exakt 1 HP."},
    untouchable:{name:"Untouchable",desc:"Gewinne eine Runde mit vollen Maximal-HP.",rewardDice:"pearl"},
    degenerate_gambler:{name:"Degenerate Gambler",desc:"Gewinne in einer Runde dreimal High Stakes mit einem Ergebnis von 4–6.",rewardDice:"neon"},
    double_trouble:{name:"Double Trouble",desc:"Schalte einen Spieler mit dem Double-Tap-Bonus aus."},
    twelve_x3:{name:"12 · 12 · 12",desc:"Triggere die Fähigkeit 12 dreimal in einer Runde."},
    no_blood_left:{name:"No Blood Left",desc:"Bezahle in einer Runde insgesamt 12 HP freiwillig."},
    overkill:{name:"Overkill",desc:"Verursache mit einem Angriff mindestens 10 Schaden mehr, als dein Ziel noch HP hatte.",rewardDice:"void"},
    hat_trick:{name:"Hat Trick",desc:"Gewinne drei Runden hintereinander.",rewardDice:"sapphire"},
    dice_goblin:{name:"Dice Goblin",desc:"Schalte die fünf ursprünglichen zusätzlichen Würfeldesigns frei."},
    damage_magnet:{name:"Damage Magnet",desc:"Gewinne eine Runde, obwohl du mindestens 25 HP gegnerischen Schaden kassiert hast."},
    clean_sheet:{name:"Clean Sheet",desc:"Gewinne eine Runde ohne Eigenschaden und ohne freiwillig HP für Fähigkeiten zu bezahlen."},
    heavy_hitter:{name:"Delete Button",desc:"Verursache mindestens 20 Schaden in einem einzigen eigenen Zug."},
    executioner:{name:"Executioner",desc:"Schalte in einer Runde mindestens 3 Gegner aus."},
    six_storm:{name:"Sixstorm",desc:"Würfle in einer Runde insgesamt mindestens 15 Sechser."},
    dumbass:{name:"Dumbass",desc:"Würfle im ersten Basiswurf fünf 1er und locke freiwillig alle fünf ein."},
    full_send:{name:"Full Send",desc:"Würfle im ersten Basiswurf fünf 6er."},
    machine:{name:"Machine",desc:"Würfle zuerst fünf 6er im Basiswurf und danach im ersten Angriffswurf fünf 5er.",rewardDice:"chrome"},
    laser_guided:{name:"Laser Guided",desc:"Triff im allerersten Angriffswurf mit allen fünf Würfeln exakt die Zielzahl.",rewardDice:"storm"},
    technically_a_win:{name:"Technically A Win",desc:"Gewinne eine Runde, ohne selbst auch nur 1 Schaden verursacht zu haben."},
    party_crasher:{name:"Party Crasher",desc:"Gewinne ein Online-Match mit vier Spielern.",rewardDice:"circuit"},
    straight:{name:"Straight",desc:"Locke in einem Basiszug gleichzeitig genau die Zahlen 1, 2, 3, 4 und 5 ein."},
    backstab:{name:"Backstab",desc:"Verursache mit einer einzigen Counterattack mindestens 15 tatsächlichen Schaden.",rewardFx:"venom"},
    momentum_mori:{name:"Momentum Mori",desc:"Erreiche mit Momentum eine Angriffserie von 5 aufeinanderfolgenden eigenen Angriffen.",rewardFx:"lightning"},
    loaded_question:{name:"Loaded Dice?",desc:"Drehe in einer Runde dreimal eine gewürfelte 6 mit Loaded Dice auf eine 5."},
    critical_hit:{name:"Critical Hit",desc:"Verursache mit einem einzigen Hauptangriff exakt 21 tatsächlichen Schaden.",rewardFx:"flame"},
    nat20_nat1:{name:"Nat 20... oh wait, Nat 1",desc:"Beende den Basiswurf exakt auf 20 und würfle beim anschließenden Insurance-Wurf eine 1."},
    vampiric_touch:{name:"Vampiric Touch",desc:"Heile dich durch Lifesteal aus einer Counterattack.",rewardFx:"blood"},
    royal_flush_attack:{name:"Royal Flush?",desc:"Würfle in einem einzelnen 5W6-Angriffswurf genau 1, 2, 3, 4 und 5.",rewardFx:"jackpot"},
    one_or_three:{name:"1er oder 3er?",desc:"Verursache mit einem Angriff auf 1er mindestens 15 tatsächlichen Schaden."},
    first_class:{name:"First Class",desc:"Triggere drei eigene Angriffe hintereinander und verursache dabei jedes Mal 0 Schaden."},
    insurance_fraud:{name:"Insurance Fraud",desc:"Beende den Basiswurf auf 24 und lass Insurance den 1 Eigenschaden auf 0 reduzieren."},
    collateral_damage:{name:"Collateral Damage",desc:"Eliminiere Hauptziel und Ricochet-Ziel mit demselben Angriff.",rewardFx:"void"},
    blood_bank:{name:"Blood Bank",desc:"Heile dich durch einen einzigen Lifesteal-Effekt um mindestens 10 HP."},
    full_house_attack:{name:"Full House",desc:"Würfle in einem einzelnen 5W6-Angriffswurf ein echtes Full House: 3 gleiche + 2 gleiche."},
    snake_oil:{name:"Snake Oil",desc:"Benutze Snake Eyes viermal im selben Basiszug."},
    perfectly_useless:{name:"Perfectly Useless",desc:"Perfect 25 gibt dir einen Angriff, aber dieser Angriff verursacht 0 Schaden.",rewardFx:"confetti"},
    house_always_wins:{name:"The House Always Wins",desc:"Verliere in einer Runde mindestens dreimal High Stakes mit 1–3 und gewinne die Runde trotzdem."},
    chromatic_menace:{name:"Chromatic Menace",desc:"Schalte alle Achievement-Würfeldesigns frei."},
    special_effects_department:{name:"Special Effects Department",desc:"Schalte alle Achievement-Angriffseffekte frei."}
  };

  const DICE_UNLOCK_ACHIEVEMENT={gold:"grande",obsidian:"not_today",blood:"blood_money",arcane:"dual_wielding",emerald:"back_from_dead",frost:"snake_charmer",pearl:"untouchable",neon:"degenerate_gambler",void:"overkill",sapphire:"hat_trick",chrome:"machine",storm:"laser_guided",circuit:"party_crasher"};

  const ATTACK_FX_STYLES={
    classic:{name:"Arc Shot",desc:"Der klassische adaptive Laser/Blitz aus V27.5."},
    lightning:{name:"Thunderbolt",desc:"Ein harter elektrischer Blitz direkt ins Ziel."},
    flame:{name:"Hellfire",desc:"Ein brennender Feuerstrahl mit Glutspur."},
    venom:{name:"Venom",desc:"Giftgrüner Treffer mit toxischer Wolke."},
    blood:{name:"Blood Slash",desc:"Dunkelroter Schnitt mit Blutspritzern."},
    jackpot:{name:"Royal Burst",desc:"Goldener Casino-Schuss mit Kartenfarben."},
    void:{name:"Void Rift",desc:"Violetter Riss, der am Ziel kollabiert."},
    confetti:{name:"Confetti Cannon",desc:"Völlig unnötig. Völlig korrekt. Konfetti."},
    frost:{name:"Frost Lance",desc:"Eislanze mit Splittern am Einschlag."},
    rift:{name:"Rift Tear",desc:"Prestige-Riss mit violett-cyanem Nachglühen."},
    crown:{name:"Crownfall",desc:"Goldener Endgame-Effekt. Reiner Flex."}
  };
  const ATTACK_FX_UNLOCK_ACHIEVEMENT={
    lightning:"momentum_mori",flame:"critical_hit",venom:"backstab",blood:"vampiric_touch",
    jackpot:"royal_flush_attack",void:"collateral_damage",confetti:"perfectly_useless"
  };

  const PRESTIGE_SHOP_ITEMS=[
    {id:"title_high_roller",type:"title",name:"High Roller",value:"High Roller",cost:5,desc:"Kleiner Prestige-Titel unter deinem Namen."},
    {id:"title_housebreaker",type:"title",name:"Housebreaker",value:"Housebreaker",cost:8,desc:"Für Profile, die dem House schon lange entwachsen sind."},
    {id:"title_riftwalker",type:"title",name:"Riftwalker",value:"Riftwalker",cost:10,desc:"Ein Titel aus dem Rift Circuit."},
    {id:"title_worldeater",type:"title",name:"World Eater",value:"World Eater",cost:15,desc:"Endgame-Titel für Kampagnenmonster."},
    {id:"frame_brass",type:"frame",name:"Brass Frame",value:"brass",cost:8,desc:"Warmer Metallrahmen für deine Spielerkarte."},
    {id:"frame_rift",type:"frame",name:"Rift Frame",value:"rift",cost:14,desc:"Violetter Rift-Glow um deine Spielerkarte."},
    {id:"frame_void",type:"frame",name:"Void Frame",value:"void",cost:20,desc:"Dunkler Endgame-Rahmen mit Void-Glow."},
    {id:"frame_crown",type:"frame",name:"Crown Frame",value:"crown",cost:30,desc:"Der teuerste Profilrahmen. Reiner Flex."},
    {id:"dice_sunset",type:"dice",name:"Sunset Dice",value:"sunset",cost:10,desc:"Gold-zu-Pink Verlauf."},
    {id:"dice_toxic",type:"dice",name:"Toxic Dice",value:"toxic",cost:12,desc:"Leuchtendes Giftgrün."},
    {id:"dice_rose",type:"dice",name:"Rose Dice",value:"rose",cost:15,desc:"Helles Rosé mit dunklen Pips."},
    {id:"dice_galaxy",type:"dice",name:"Galaxy Dice",value:"galaxy",cost:20,desc:"Violett-blauer Weltraum-Look."},
    {id:"dice_prestige",type:"dice",name:"Prestige Dice",value:"prestige",cost:30,desc:"Teuerstes Würfelset im Shop. Maximalpreis 30 🏆."},
    {id:"fx_frost",type:"attackfx",name:"Frost Lance",value:"frost",cost:10,desc:"Eisiger Projektil-Effekt mit Splitter-Einschlag."},
    {id:"fx_rift",type:"attackfx",name:"Rift Tear",value:"rift",cost:18,desc:"Violett-cyaner Riss als Angriffseffekt."},
    {id:"fx_crown",type:"attackfx",name:"Crownfall",value:"crown",cost:28,desc:"Goldener Endgame-Angriffseffekt. Reiner Prestige-Flex."}
  ];

  const SPECIAL_RULES={
    first_strike:{name:"First Strike",desc:"Der erste erfolgreiche Hauptangriff jedes Helden verursacht +2 Rohschaden."},
    blood_moon:{name:"Blood Moon",desc:"Jedes echte Heilereignis heilt +1 zusätzlichen HP."},
    armor_shell:{name:"Armor Shell",desc:"Der erste Hauptangriff gegen jeden Gegner wird um 2 Rohschaden reduziert."},
    void_clock:{name:"Void Clock",desc:"Ab dem zweiten eigenen Zug verliert jeder Held beim Zugstart 1 HP; der Effekt kann nicht unter 1 HP töten."},
    overcharge:{name:"Overcharge",desc:"Jeder erfolgreiche Hauptangriff eines Helden verursacht +2 Rohschaden; danach verliert der Angreifer 1 HP, nie unter 1."},
    casino_floor:{name:"Casino Floor",desc:"High Stakes gilt in diesem Encounter für alle Teilnehmer, auch ohne ausgerüstete Fähigkeit."},
    serpent_floor:{name:"Serpent Floor",desc:"Snake Eyes darf bereits bei mindestens 2 gleichen Würfeln aus demselben Basiswurf benutzt werden."},
    blood_tax:{name:"Blood Tax",desc:"Loaded Dice und Blutpreis kosten in diesem Encounter jeweils 1 zusätzlichen HP."}
  };

  const ENCOUNTER_SPECIAL_RULES={
    snake_pit:["serpent_floor"],double_trouble_campaign:["first_strike"],vampires_cut:["blood_moon"],chaos_room:["casino_floor"],
    house_of_chance_rift:["casino_floor"],rift_crown:["first_strike"],blood_oath_rift:["blood_tax"],lucky_break_rift:["void_clock"],dead_mans_hand_rift:["overcharge"],
    zero_loaded_debt:["blood_tax"],zero_grand_design:["first_strike"],zero_three_doors:["armor_shell"],zero_precision_surgery:["serpent_floor"],zero_blood_rush_relay:["blood_moon"],
    abyss_loaded_ledger:["overcharge"],abyss_precision_doctrine:["armor_shell"],abyss_four_marks:["void_clock"],abyss_counter_cathedral:["casino_floor"],abyss_six_machine:["blood_moon"],
    paradox_no_favorite:["armor_shell"],paradox_serpent_debt:["serpent_floor"],paradox_counter_economy:["first_strike"],paradox_high_recovery:["void_clock"],paradox_second_marathon:["overcharge"],paradox_six_signal:["casino_floor"],
    duo_split_pressure:["first_strike"],duo_blood_pact:["blood_moon"],duo_counter_pair:["armor_shell"],duo_relay_kills:["void_clock"],
    duo_fracture_bettors:["casino_floor"],duo_fracture_shared_marks:["blood_moon"],duo_fracture_last_stands:["first_strike"],duo_fracture_clean_team:["void_clock"],duo_fracture_double_pair:["overcharge"],
    duo_mirror_metronome:["first_strike"],duo_mirror_double_bet:["casino_floor"],duo_mirror_heal_six:["blood_moon"],duo_mirror_roles:["armor_shell"],duo_mirror_pattern:["blood_tax"],
    duo_omega_focus_web:["armor_shell"],duo_omega_rush_three:["void_clock"],duo_omega_six_twins:["blood_moon"],duo_omega_pattern_five:["overcharge"],duo_omega_crown_touch:["first_strike"],
    trio_three_tools:["casino_floor"],trio_relay_protocol:["first_strike"],trio_blood_kitchen:["blood_moon"],trio_threefold_verdict:["armor_shell"],
    trio_crossfire_ledger:["armor_shell"],trio_blood_communion:["blood_moon"],trio_focus_chain:["first_strike"],trio_cerberus_gate:["armor_shell"],
    trio_blood_debt:["blood_moon"],trio_four_before_one:["void_clock"],trio_last_light:["void_clock"],trio_singularity:["armor_shell"]
  };

  const BOSS_PHASES={
    rift_eclipse:{boss:"Eclipse",threshold:.5,title:"RIFT COLLAPSE",desc:"Eclipse stabilisiert den Riss: 6 HP Heilung, High Stakes + Counterattack und Overcharge für den Rest des Kampfes. Beim Phasenwechsel erhältst du zusätzlich einen Bonus-Draft für deine 3. Fähigkeit.",heal:6,ability:13,secondAbility:21,rule:"overcharge",heroBonusDraft:true},
    zero_perfect_crime:{boss:"The Alibi",threshold:.5,title:"FALSE ALIBI",desc:"The Alibi wirft den Plan weg: 5 HP Heilung, Perfect 25 + Wildcard und Casino Floor.",heal:5,ability:15,secondAbility:17,rule:"casino_floor"},
    zero_regent:{boss:"Zero Regent",threshold:.5,title:"ZERO DECREE",desc:"Der Regent wechselt auf Counterattack + High Stakes, heilt 8 HP und legt Armor Shell auf den Tisch.",heal:8,ability:21,secondAbility:13,rule:"armor_shell"},
    abyss_double_triad:{boss:"Pairmaster",threshold:.5,title:"PAIR OVERDRIVE",desc:"Pairmaster heilt 6 HP, ergänzt Momentum und der erste Heldenangriff erhält First Strike.",heal:6,ability:24,secondAbility:10,rule:"first_strike"},
    abyss_throne:{boss:"Abyss King",threshold:.5,title:"THE THRONE OPENS",desc:"Abyss King heilt 10 HP, wechselt auf High Stakes + Counterattack und aktiviert Void Clock.",heal:10,ability:13,secondAbility:21,rule:"void_clock"},
    paradox_blood_circuit:{boss:"Vein C",threshold:.5,title:"HEMORRHAGE PROTOCOL",desc:"Vein C heilt 6 HP, übernimmt Blood Rush + Blutpreis und erhöht mit Blood Tax alle freiwilligen Kosten.",heal:6,ability:23,secondAbility:11,rule:"blood_tax"},
    paradox_crown:{boss:"Paradox Crown",threshold:.5,title:"TIMELINE BREAK",desc:"Paradox Crown heilt 12 HP, schaltet High Stakes zusätzlich frei und verwandelt den Tisch in einen Casino Floor.",heal:12,ability:22,secondAbility:13,rule:"casino_floor"},
    duo_fracture_monarch:{boss:"Fracture Monarch",threshold:.5,title:"FRACTURE II",desc:"Der Monarch heilt 10 HP, erhält Counterattack + High Stakes und setzt Overcharge auf beide Helden.",heal:10,ability:21,secondAbility:13,rule:"overcharge"},
    duo_mirror_five_kills:{boss:"Relay V",threshold:.5,title:"RELAY ASCENSION",desc:"Relay V heilt 7 HP, erhält Counterattack + Momentum und aktiviert First Strike.",heal:7,ability:21,secondAbility:10,rule:"first_strike"},
    duo_mirror_heart:{boss:"Mirror Heart",threshold:.5,title:"HEART REFLECTION",desc:"Mirror Heart heilt 12 HP, übernimmt High Stakes + Counterattack und legt Armor Shell auf alle Gegner.",heal:12,ability:13,secondAbility:21,rule:"armor_shell"},
    duo_omega_roles_two:{boss:"Delta Seal",threshold:.5,title:"BROKEN SEAL",desc:"Delta Seal heilt 8 HP, erhält Counterattack + High Stakes und aktiviert Blood Tax.",heal:8,ability:21,secondAbility:13,rule:"blood_tax"},
    duo_omega_throne:{boss:"Omega Sovereign",threshold:.5,title:"OMEGA PHASE",desc:"Omega Sovereign heilt 15 HP, wechselt auf High Stakes + Counterattack und startet die Void Clock.",heal:15,ability:13,secondAbility:21,rule:"void_clock"},
    trio_cerberus_gate:{boss:"Cerberus Core",threshold:.5,title:"THREE HEADS, ONE CORE",desc:"Der Core heilt 8 HP, wechselt auf Counterattack + High Stakes und zieht den ganzen Tisch auf Casino Floor.",heal:8,ability:21,secondAbility:13,rule:"casino_floor"},
    trio_singularity:{boss:"Trinity Singularity",threshold:.5,title:"SINGULARITY OPEN",desc:"Die Singularity heilt 10 HP, wechselt auf High Stakes + Counterattack und aktiviert Overcharge für alle Helden: +2 Rohschaden, danach 1 HP Rückstoß.",heal:10,ability:13,secondAbility:21,rule:"overcharge"}
  };

