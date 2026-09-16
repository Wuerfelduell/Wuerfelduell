  const ABILITIES = {
    0:{name:"Keine Fähigkeit",desc:"Im Tutorial spielt dieser Teilnehmer ohne Fähigkeit."},
    1:{name:"Brutale Einsen",desc:"Wenn du auf 1er angreifst, zählen 1er UND 2er als Treffer. Beide verursachen 3 Grundschaden pro Treffer. Bei einem normalen Angriff auf 2er gilt dieser Effekt nicht."},
    2:{name:"Lifesteal",desc:"Du heilst die Hälfte des tatsächlich verursachten Angriffsschadens, abgerundet. Im Local Battle bis zum Maximalleben; Kampagnenhelden dürfen darüber hinaus überheilen."},
    3:{name:"Glückswurf",desc:"Einmal pro Zug darfst du einen nicht eingeloggten 1er eines Basiswurfs neu würfeln. Der neu gewürfelte Würfel kann dabei nicht wieder eine 1 werden."},
    4:{name:"Zweite Chance",desc:"Einmal pro Zug darfst du nach einem beliebigen Angriffswurf alle Nicht-Treffer noch einmal würfeln. Du bestimmst den Zeitpunkt."},
    5:{name:"Angriffsvorsprung",desc:"Du greifst schon bei 25 auf 1er an; 26→2er, 27→3er, 28→4er, 29→5er, 30→6er."},
    7:{name:"Glück (BETA)",desc:"Deine Chance auf eine 6 ist um 6 Prozentpunkte erhöht: 22,67 % statt 16,67 %. Das gilt auch im Angriff und macht dadurch die Ergebnisse 1–5 jeweils etwas seltener."},
    8:{name:"Präzision",desc:"Zweimal pro Angriff: Würde ein final ausgewerteter Angriffswurf mit 0 neuen Treffern enden, zählt genau ein gewürfelter Nachbar deiner Zielzahl als Präzisionstreffer. Er macht Zielzahl −1 Schaden, mindestens 1."},
    9:{name:"Rache",desc:"Wenn du 10 HP oder weniger hast, verursacht jeder deiner Angriffstreffer +2 Schaden."},
    10:{name:"Momentum",desc:"Greifst du in aufeinanderfolgenden eigenen Zügen an, steigt dein Bonus: erster Angriff +0, zweiter +1 pro Treffer, dritter und jeder weitere +2. Ein Zug ohne Angriff setzt die Serie zurück."},
    11:{name:"Blutpreis",desc:"Vor einem Angriffswurf kannst du 3 HP opfern. Für genau diesen Wurf zählen deine Zielzahl und beide vorhandenen Nachbarzahlen als Treffer; alle verursachen normalen Schaden der eigentlichen Zielzahl."},
    12:{name:"Gambling Man",desc:"Wenn dein fertiger Basiswurf über 25 liegt, wird deine Angriffszahl nicht aus der Summe bestimmt. Stattdessen musst du einen D6 würfeln: Das Ergebnis 1–6 ist deine Angriffszahl."},
    13:{name:"High Stakes",desc:"Nach jedem beendeten erfolgreichen Angriff darfst du vor dem Schaden gamblen: D6 1–3 = Gesamtschaden halbiert, 4–6 = Gesamtschaden +50 %. Abrundung."},
    14:{name:"Last Stand",desc:"Einmal pro Runde: Würdest du auf 0 HP oder weniger fallen, bleibst du stattdessen auf genau 1 HP."},
    15:{name:"Perfect 25",desc:"Bei einem fertigen Basiswurf von exakt 25 würfelst du zuerst einen D6. Bei 4–6 darfst du angreifen und würfelst danach einen D4; dessen Ergebnis 1–4 bestimmt deine Angriffszahl."},
    16:{name:"Ricochet",desc:"Jeder Würfeltreffer deines Angriffs verursacht zusätzlich 1 Schaden am nächsten anderen Spieler nach deinem Hauptziel. Funktioniert nur, wenn vor dem Schaden mindestens 3 Spieler leben."},
    17:{name:"Wildcard",desc:"Vor deinem ersten Angriffswurf wird eine zusätzliche zufällige Zahl 1–6 bestimmt. Im ersten Wurf zählen Zielzahl und Wildcard als Treffer; Wildcard-Treffer verursachen trotzdem nur den normalen Schaden deiner eigentlichen Zielzahl."},
    18:{name:"Loaded Dice",desc:"Einmal pro Basiszug darfst du einen gerade gewürfelten, noch nicht eingeloggten Würfel direkt auf eine 5 drehen. Das kostet 2 HP."},
    19:{name:"Insurance",desc:"Endet dein Basiswurf unter 25, würfelst du vor dem Eigenschaden einen D6. Bei 5–6 wird der Eigenschaden halbiert und abgerundet."},
    20:{name:"Snake Eyes",desc:"Würfelst du in einem einzelnen Basiswurf mindestens 3 gleiche Zahlen gleichzeitig, darfst du alle Würfel dieser Zahl aus genau diesem Wurf gratis neu würfeln. Gilt für 1er bis 6er und hat kein Limit: Entsteht danach erneut mindestens ein Drilling, darfst du Snake Eyes wieder benutzen."},
    21:{name:"Counterattack",desc:"Erhältst du durch den Hauptangriff eines Gegners mindestens 5 Schaden und überlebst, startest du sofort einen normalen Angriff auf 1er mit 5 Würfeln: 1er werden gelockt und die übrigen Würfel weitergewürfelt, bis ein Wurf keinen neuen Treffer bringt."},
    22:{name:"12",desc:"Immer wenn du in einem einzelnen Würfelwurf mindestens zwei 6er gleichzeitig würfelst, heilst du 1 HP. Kein Limit pro Zug oder Runde. Kampagnenhelden dürfen damit über ihr Maximalleben hinaus heilen. Gilt auch für Angriffswürfe und Counterattack."},
    23:{name:"Blood Rush",desc:"Wenn du seit deinem letzten eigenen Zug durch einen Gegner HP verloren hast oder in diesem Zug freiwillig HP für Loaded Dice/Blutpreis bezahlt hast, verursacht dein nächster Angriff +1 Schaden pro Treffer. Danach ist der Effekt verbraucht."},
    24:{name:"Double Tap",desc:"Endet dein Angriff mit exakt 2 Würfeltreffern, erhalten beide Treffer +2 Schaden. Das sind insgesamt +4 Schaden vor High Stakes."},
    25:{name:"Underdog",desc:"Solange du allein die wenigsten HP aller lebenden Spieler hast, verursachen deine Angriffstreffer +1 Schaden."}
  };

  const SEATS = [
    {id:0,name:"Unten",angle:0},
    {id:1,name:"Rechts",angle:-90},
    {id:2,name:"Oben",angle:180},
    {id:3,name:"Links",angle:90}
  ];

  // rarity: Seltenheit fuer den Kistenpool (js/46-shop-daten.js). Nur
  // Designs mit rarity kommen aus Kisten; alles andere hat seinen eigenen
  // Weg (Start, Kampagnenboss, Achievement, Trophy-Shop). Super Rare, Epic
  // ist leer, bis neues Artwork kommt - die Ziehung faellt dann eine Stufe
  // tiefer. Die ersten fuenf Artwork-Designs (V28.12.30) sind je eine
  // Stufe: Walnut Lodge Common, Tide Pearl Rare, Azure Storm Epic,
  // Nebula Veil und Solar Relic Legendary (Vorgabe vom 16.09.).
  const DICE_DESIGNS = {
    classic:{name:"Classic",className:"theme-classic"},
    classic_v2:{name:"ClassicV2",className:"theme-classic-v2 theme-art-die",artKey:"ivory-royal",previewAsset:"assets/ui/v28/png/dice-designs/ivory-royal/ivory-royal-beauty.webp",unlockText:"Von Anfang an"},
    sapphire_crown:{name:"Sapphire Crown",className:"theme-sapphire-crown theme-art-die",artKey:"sapphire-crown",previewAsset:"assets/ui/v28/png/dice-designs/sapphire-crown/sapphire-crown-beauty.webp",unlockText:"Solo · Welt 3 Boss"},
    amethyst_rift:{name:"Amethyst Rift",className:"theme-amethyst-rift theme-art-die",artKey:"amethyst-rift",previewAsset:"assets/ui/v28/png/dice-designs/amethyst-rift/amethyst-rift-beauty.webp",unlockText:"Solo · Welt 4 Boss"},
    // Artwork-Würfel ohne Freischaltweg, vorerst NUR in der Testumgebung.
    // testOnly hält sie aus der Profilliste heraus: dort stünden sie sonst als
    // gesperrte Karten, obwohl es noch keinen Weg gibt, sie zu bekommen.
    // Wenn sie freigeschaltet werden sollen, fällt testOnly weg und sie
    // brauchen einen Eintrag in DICE_UNLOCK_ACHIEVEMENT, im Trophy Shop
    // oder als Kampagnenbelohnung - plus einen unlockText.
    walnut_lodge:{name:"Walnut Lodge",className:"theme-walnut-lodge theme-art-die",artKey:"walnut-lodge",previewAsset:"assets/ui/v28/png/dice-designs/walnut-lodge/walnut-lodge-beauty.webp",testOnly:true,rarity:"common"},
    tide_pearl:{name:"Tide Pearl",className:"theme-tide-pearl theme-art-die",artKey:"tide-pearl",previewAsset:"assets/ui/v28/png/dice-designs/tide-pearl/tide-pearl-beauty.webp",testOnly:true,rarity:"rare"},
    azure_storm:{name:"Azure Storm",className:"theme-azure-storm theme-art-die",artKey:"azure-storm",previewAsset:"assets/ui/v28/png/dice-designs/azure-storm/azure-storm-beauty.webp",testOnly:true,rarity:"epic"},
    nebula_veil:{name:"Nebula Veil",className:"theme-nebula-veil theme-art-die",artKey:"nebula-veil",previewAsset:"assets/ui/v28/png/dice-designs/nebula-veil/nebula-veil-beauty.webp",testOnly:true,rarity:"legendary"},
    solar_relic:{name:"Solar Relic",className:"theme-solar-relic theme-art-die",artKey:"solar-relic",previewAsset:"assets/ui/v28/png/dice-designs/solar-relic/solar-relic-beauty.webp",testOnly:true,rarity:"legendary"},
    frostporcelain:{name:"Frost Porcelain",className:"theme-frostporcelain theme-art-die",artKey:"frostporcelain",previewAsset:"assets/ui/v28/png/dice-designs/frostporcelain/frostporcelain-beauty.webp",testOnly:true,rarity:"common"},
    ashwood:{name:"Ashwood",className:"theme-ashwood theme-art-die",artKey:"ashwood",previewAsset:"assets/ui/v28/png/dice-designs/ashwood/ashwood-beauty.webp",testOnly:true,rarity:"common"},
    coppertrail:{name:"Coppertrail",className:"theme-coppertrail theme-art-die",artKey:"coppertrail",previewAsset:"assets/ui/v28/png/dice-designs/coppertrail/coppertrail-beauty.webp",testOnly:true,rarity:"common"},
    midnightenamel:{name:"Midnight Enamel",className:"theme-midnightenamel theme-art-die",artKey:"midnightenamel",previewAsset:"assets/ui/v28/png/dice-designs/midnightenamel/midnightenamel-beauty.webp",testOnly:true,rarity:"common"},
    ironkeep:{name:"Ironkeep",className:"theme-ironkeep theme-art-die",artKey:"ironkeep",previewAsset:"assets/ui/v28/png/dice-designs/ironkeep/ironkeep-beauty.webp",testOnly:true,rarity:"common"},
    oakbound:{name:"Oakbound",className:"theme-oakbound theme-art-die",artKey:"oakbound",previewAsset:"assets/ui/v28/png/dice-designs/oakbound/oakbound-beauty.webp",testOnly:true,rarity:"common"},
    mossstone:{name:"Mossstone",className:"theme-mossstone theme-art-die",artKey:"mossstone",previewAsset:"assets/ui/v28/png/dice-designs/mossstone/mossstone-beauty.webp",testOnly:true,rarity:"common"},
    slatewatch:{name:"Slatewatch",className:"theme-slatewatch theme-art-die",artKey:"slatewatch",previewAsset:"assets/ui/v28/png/dice-designs/slatewatch/slatewatch-beauty.webp",testOnly:true,rarity:"common"},
    sandcarver:{name:"Sandcarver",className:"theme-sandcarver theme-art-die",artKey:"sandcarver",previewAsset:"assets/ui/v28/png/dice-designs/sandcarver/sandcarver-beauty.webp",testOnly:true,rarity:"common"},
    redclay:{name:"Redclay",className:"theme-redclay theme-art-die",artKey:"redclay",previewAsset:"assets/ui/v28/png/dice-designs/redclay/redclay-beauty.webp",testOnly:true,rarity:"common"},
    seidenhof:{name:"Seidenhof",className:"theme-seidenhof theme-art-die",artKey:"seidenhof",previewAsset:"assets/ui/v28/png/dice-designs/seidenhof/seidenhof-beauty.webp",testOnly:true,rarity:"rare"},
    korsar:{name:"Korsar",className:"theme-korsar theme-art-die",artKey:"korsar",previewAsset:"assets/ui/v28/png/dice-designs/korsar/korsar-beauty.webp",testOnly:true,rarity:"rare"},
    drachenpanzer:{name:"Drachenpanzer",className:"theme-drachenpanzer theme-art-die",artKey:"drachenpanzer",previewAsset:"assets/ui/v28/png/dice-designs/drachenpanzer/drachenpanzer-beauty.webp",testOnly:true,rarity:"rare"},
    goldbruch:{name:"Goldbruch",className:"theme-goldbruch theme-art-die",artKey:"goldbruch",previewAsset:"assets/ui/v28/png/dice-designs/goldbruch/goldbruch-beauty.webp",testOnly:true,rarity:"rare"},
    uhrwerk:{name:"Uhrwerk",className:"theme-uhrwerk theme-art-die",artKey:"uhrwerk",previewAsset:"assets/ui/v28/png/dice-designs/uhrwerk/uhrwerk-beauty.webp",testOnly:true,rarity:"rare"},
    duenenrelikt:{name:"Dünenrelikt",className:"theme-duenenrelikt theme-art-die",artKey:"duenenrelikt",previewAsset:"assets/ui/v28/png/dice-designs/duenenrelikt/duenenrelikt-beauty.webp",testOnly:true,rarity:"rare"},
    dornenhain:{name:"Dornenhain",className:"theme-dornenhain theme-art-die",artKey:"dornenhain",previewAsset:"assets/ui/v28/png/dice-designs/dornenhain/dornenhain-beauty.webp",testOnly:true,rarity:"rare"},
    daemmerkathedrale:{name:"Dämmerkathedrale",className:"theme-daemmerkathedrale theme-art-die",artKey:"daemmerkathedrale",previewAsset:"assets/ui/v28/png/dice-designs/daemmerkathedrale/daemmerkathedrale-beauty.webp",testOnly:true,rarity:"epic"},
    phoenixkern:{name:"Phönixkern",className:"theme-phoenixkern theme-art-die",artKey:"phoenixkern",previewAsset:"assets/ui/v28/png/dice-designs/phoenixkern/phoenixkern-beauty.webp",testOnly:true,rarity:"epic"},
    weltenwurzel:{name:"Weltenwurzel",className:"theme-weltenwurzel theme-art-die",artKey:"weltenwurzel",previewAsset:"assets/ui/v28/png/dice-designs/weltenwurzel/weltenwurzel-beauty.webp",testOnly:true,rarity:"epic"},
    ereignishorizont:{name:"Ereignishorizont",className:"theme-ereignishorizont theme-art-die",artKey:"ereignishorizont",previewAsset:"assets/ui/v28/png/dice-designs/ereignishorizont/ereignishorizont-beauty.webp",testOnly:true,rarity:"legendary"},
    gezeitenkompass:{name:"Gezeitenkompass",className:"theme-gezeitenkompass theme-art-die",artKey:"gezeitenkompass",previewAsset:"assets/ui/v28/png/dice-designs/gezeitenkompass/gezeitenkompass-beauty.webp",testOnly:true,rarity:"super_rare"},
    runenschmiede:{name:"Runenschmiede",className:"theme-runenschmiede theme-art-die",artKey:"runenschmiede",previewAsset:"assets/ui/v28/png/dice-designs/runenschmiede/runenschmiede-beauty.webp",testOnly:true,rarity:"super_rare"},
    frostsiegel:{name:"Frostsiegel",className:"theme-frostsiegel theme-art-die",artKey:"frostsiegel",previewAsset:"assets/ui/v28/png/dice-designs/frostsiegel/frostsiegel-beauty.webp",testOnly:true,rarity:"super_rare"},
    nachtfalter:{name:"Nachtfalter",className:"theme-nachtfalter theme-art-die",artKey:"nachtfalter",previewAsset:"assets/ui/v28/png/dice-designs/nachtfalter/nachtfalter-beauty.webp",testOnly:true,rarity:"super_rare"},
    bernsteinarchiv:{name:"Bernsteinarchiv",className:"theme-bernsteinarchiv theme-art-die",artKey:"bernsteinarchiv",previewAsset:"assets/ui/v28/png/dice-designs/bernsteinarchiv/bernsteinarchiv-beauty.webp",testOnly:true,rarity:"super_rare"},
    obsidian:{name:"Obsidian",className:"theme-obsidian"},
    gold:{name:"Gold",className:"theme-gold"},
    blood:{name:"Blood",className:"theme-blood"},
    arcane:{name:"Arcane",className:"theme-arcane"},
    emerald:{name:"Emerald",className:"theme-emerald"},
    frost:{name:"Frost",className:"theme-frost"},
    pearl:{name:"Pearl",className:"theme-pearl"},
    neon:{name:"Neon",className:"theme-neon"},
    void:{name:"Void",className:"theme-void"},
    sapphire:{name:"Sapphire",className:"theme-sapphire"},
    chrome:{name:"Chrome",className:"theme-chrome"},
    storm:{name:"Storm",className:"theme-storm"},
    circuit:{name:"Circuit",className:"theme-circuit"},
    sunset:{name:"Sunset",className:"theme-sunset"},
    toxic:{name:"Toxic",className:"theme-toxic"},
    rose:{name:"Rose",className:"theme-rose"},
    galaxy:{name:"Galaxy",className:"theme-galaxy"},
    prestige:{name:"Prestige",className:"theme-prestige"}
  };

  const BOT_LEVELS = {
    human:{name:"Mensch",icon:"👤"},
    easy:{name:"Bot · Leicht",icon:"🤖"},
    normal:{name:"Bot · Normal",icon:"🤖"},
    hard:{name:"Bot · Schwer",icon:"🤖"}
  };
  const BOT_DELAY = {easy:760,normal:620,hard:520};
  const BOT_SPEED_MULTIPLIER = {slow:1.35,normal:1,fast:.62};
  let botSpeedMode="normal";

  const BOT_ABILITY_RATING = {
    1:7.0, 2:7.5, 3:9.0, 4:8.8, 5:8.0, 7:8.2, 8:9.1, 9:7.6, 10:9.0,
    11:9.4, 12:7.3, 13:7.4, 14:8.6, 15:7.1, 16:7.4, 17:7.8, 18:9.7,
    19:8.3, 20:7.2, 21:7.8, 22:7.7, 23:8.4, 24:8.0, 25:7.8
  };

  const $ = id => document.getElementById(id);
  const mainMenu=$("mainMenu"), campaignScreen=$("campaignScreen"), duoCampaignScreen=$("duoCampaignScreen"), trioCampaignScreen=$("trioCampaignScreen"), setup=$("setup"), game=$("game"), nameInputs=$("nameInputs");
  const tutorialModal=$("tutorialModal"), tutorialTitle=$("tutorialTitle"), tutorialText=$("tutorialText"), tutorialProgress=$("tutorialProgress"), tutorialContinueBtn=$("tutorialContinueBtn");
  const quitModal=$("quitModal"), quitCancelBtn=$("quitCancelBtn"), quitConfirmBtn=$("quitConfirmBtn"), gameMenuBtn=$("gameMenuBtn");
  const campaignModePicker=$("campaignModePicker"), campaignModePickerClose=$("campaignModePickerClose"), campaignModeSoloBtn=$("campaignModeSoloBtn"), campaignModeDuoBtn=$("campaignModeDuoBtn"), campaignModeTrioBtn=$("campaignModeTrioBtn");
  const profilesScreen=$("profilesScreen"), prestigeShopScreen=$("prestigeShopScreen"), achievementsScreen=$("achievementsScreen"), statsScreen=$("statsScreen"), settingsScreen=$("settingsScreen"), rulesScreen=$("rulesScreen"), changelogScreen=$("changelogScreen"), abilitiesScreen=$("abilitiesScreen");
  const prestigeShopBackBtn=$("prestigeShopBackBtn"), prestigeShopProfileSelect=$("prestigeShopProfileSelect"), prestigeShopTrophies=$("prestigeShopTrophies"), prestigeEquipped=$("prestigeEquipped"), prestigeShopList=$("prestigeShopList");
  const animationSetting=$("animationSetting"), botSpeedSetting=$("botSpeedSetting"), resetStorageBtn=$("resetStorageBtn");
  const exportSaveBtn=$("exportSaveBtn"), importSaveBtn=$("importSaveBtn"), importSaveInput=$("importSaveInput");
  const newProfileName=$("newProfileName"), createProfileBtn=$("createProfileBtn"), profileList=$("profileList");
  const profilesBackBtn=$("profilesBackBtn");
  const achievementList=$("achievementList"), achievementToastLayer=$("achievementToastLayer");
  const statsKpis=$("statsKpis"), profileStatsList=$("profileStatsList"), abilityStatsList=$("abilityStatsList");
  const allAbilitiesList=$("allAbilitiesList"), allAbilitiesBtn=$("allAbilitiesBtn"), abilitiesBackBtn=$("abilitiesBackBtn");
  const localModeSelect=$("localModeSelect"), localModeInfo=$("localModeInfo"), setupIntro=$("setupIntro");
  const playerCount=$("playerCount"), playersEl=$("players"), diceEl=$("dice");
  const turnLine=$("turnLine"), statusEl=$("status"), abilityState=$("abilityState");
  const campaignTargetBox=$("campaignTargetBox"), campaignTargetList=$("campaignTargetList");
  const sumEl=$("sum"), sumLabel=$("sumLabel"), primaryBtn=$("primaryBtn");
  const lockBtn=$("lockBtn"), baseRerollBtn=$("baseRerollBtn"), loadedDiceBtn=$("loadedDiceBtn"), snakeEyesBtn=$("snakeEyesBtn");
  const attackPowerBtn=$("attackPowerBtn"), bloodLowerBtn=$("bloodLowerBtn"), bloodHigherBtn=$("bloodHigherBtn"), bloodRushMasteryBtn=$("bloodRushMasteryBtn"), resolveAttackBtn=$("resolveAttackBtn");
  const nextBtn=$("nextBtn"), logEl=$("log"), winnerBox=$("winnerBox");
  const winnerText=$("winnerText"), roundResultText=$("roundResultText"), roundStandings=$("roundStandings"), roundStatsBox=$("roundStatsBox"), rollAbilitiesBtn=$("rollAbilities");
  const winTrackerLabel=$("winTrackerLabel");
  const startGameBtn=$("startGame"), setupStatus=$("setupStatus"), roundNumberEl=$("roundNumber");
  const nextRoundPrepBtn=$("nextRoundPrepBtn"), nextRoundBox=$("nextRoundBox"), nextRoundTitle=$("nextRoundTitle"), restartBtn=$("restartBtn");
  const nextRoundInfo=$("nextRoundInfo"), nextRoundAbilities=$("nextRoundAbilities"), startNextRoundBtn=$("startNextRoundBtn");
  const rotatingBoard=$("rotatingBoard"), rotationShell=$("rotationShell");
  const damageTint=$("damageTint"), damageFx=$("damageFx");
  const healTint=$("healTint"), healFx=$("healFx");
  const eventPopup=$("eventPopup"), eventPopupText=$("eventPopupText");
  const secondAbilityModal=$("secondAbilityModal"), secondAbilityTitle=$("secondAbilityTitle"), secondAbilityOptions=$("secondAbilityOptions");
  const gamblingModal=$("gamblingModal"), gamblingDie=$("gamblingDie"), gamblingResult=$("gamblingResult"), gamblingRetryActions=$("gamblingRetryActions"), gamblingRetryBtn=$("gamblingRetryBtn"), gamblingRetryEndBtn=$("gamblingRetryEndBtn");
  const highStakesModal=$("highStakesModal"), highStakesDie=$("highStakesDie"), highStakesResult=$("highStakesResult"), highStakesSub=$("highStakesSub"), highStakesSkip=$("highStakesSkip");
  const perfect25Modal=$("perfect25Modal"), perfect25Die=$("perfect25Die"), perfect25Result=$("perfect25Result");
  const perfect25D4Modal=$("perfect25D4Modal"), perfect25D4Die=$("perfect25D4Die"), perfect25D4Result=$("perfect25D4Result");
  const insuranceModal=$("insuranceModal"), insuranceDie=$("insuranceDie"), insuranceResult=$("insuranceResult"), insuranceSub=$("insuranceSub");
  const counterModal=$("counterModal"), counterTitle=$("counterTitle"), counterDiceEl=$("counterDice"), counterResult=$("counterResult"), counterRollBtn=$("counterRollBtn");
  const campaignBackBtn=$("campaignBackBtn"), campaignProfileSelect=$("campaignProfileSelect"), campaignAbilitySelect=$("campaignAbilitySelect"), campaignStartBtn=$("campaignStartBtn"), campaignProfilesBtn=$("campaignProfilesBtn");
  const campaignPath=$("campaignPath"), campaignEncounterDetail=$("campaignEncounterDetail"), campaignProfileSummary=$("campaignProfileSummary"), campaignProgressSummary=$("campaignProgressSummary"), campaignTrophySummary=$("campaignTrophySummary"), campaignAbilityGrid=$("campaignAbilityGrid"), campaignCompleteBanner=$("campaignCompleteBanner");
  const campaignWorldTabs=$("campaignWorldTabs"), campaignWorldDesc=$("campaignWorldDesc");
  const duoCampaignBackBtn=$("duoCampaignBackBtn"), duoCampaignBanner=$("duoCampaignBanner"), duoCampaignWorldTabs=$("duoCampaignWorldTabs"), duoCampaignWorldDesc=$("duoCampaignWorldDesc"), duoTeamSummary=$("duoTeamSummary"), duoProgressSummary=$("duoProgressSummary"), duoUnlockSummary=$("duoUnlockSummary");
  const duoProfile1Select=$("duoProfile1Select"), duoProfile2Select=$("duoProfile2Select"), duoAbility1Select=$("duoAbility1Select"), duoAbility2Select=$("duoAbility2Select"), duoCampaignStartBtn=$("duoCampaignStartBtn"), duoCampaignProfilesBtn=$("duoCampaignProfilesBtn"), duoCampaignPath=$("duoCampaignPath"), duoCampaignEncounterDetail=$("duoCampaignEncounterDetail");
  const trioCampaignBackBtn=$("trioCampaignBackBtn"), trioCampaignBanner=$("trioCampaignBanner"), trioCampaignWorldTabs=$("trioCampaignWorldTabs"), trioCampaignWorldDesc=$("trioCampaignWorldDesc"), trioTeamSummary=$("trioTeamSummary"), trioProgressSummary=$("trioProgressSummary"), trioTrophySummary=$("trioTrophySummary"), trioCampaignPath=$("trioCampaignPath"), trioCampaignEncounterDetail=$("trioCampaignEncounterDetail");
  const trioProfile1Select=$("trioProfile1Select"), trioProfile2Select=$("trioProfile2Select"), trioProfile3Select=$("trioProfile3Select"), trioAbility1Select=$("trioAbility1Select"), trioAbility2Select=$("trioAbility2Select"), trioAbility3Select=$("trioAbility3Select"), trioCampaignStartBtn=$("trioCampaignStartBtn"), trioCampaignProfilesBtn=$("trioCampaignProfilesBtn");
  const encounterRuleBanner=$("encounterRuleBanner"), campaignTaskProgress=$("campaignTaskProgress");
  const combatLogBtn=$("combatLogBtn"), battleInfoBtn=$("battleInfoBtn");
  const battleSheetOverlay=$("battleSheetOverlay"), battleSheetKicker=$("battleSheetKicker");
  const battleSheetTitle=$("battleSheetTitle"), battleSheetBody=$("battleSheetBody"), battleSheetCloseBtn=$("battleSheetCloseBtn");

  let players=[], setupAbilityRolls=[], current=0, dice=[], phase="idle", isAnimating=false;
  let attackFace=null, attackTarget=null, attackHits=0, attackDamage=0, firstAttackRoll=true, currentAttackRollNewHits=0;
  let baseRerollUsed=false, loadedDiceUsed=false, lastBaseRollIndices=[], attackPowerUsed=false, precisionUses=0;
  let luckRerollIndex=null, luckRerollSecondUsed=false, luckRerollUses=0, loadedDiceUses=0, attackPowerUses=0;
  let lastAttackRollIndices=[], attackRollCount=0, attackMasteryRollCount=0, normalAttackHitsThisAttack=0, exactFaceHitsThisAttack=0, wildcardAttackHitsThisAttack=0, wildcardSecondRollArmed=false, wildcardTriggeredThisAttack=false, masteryL2AttackBonusesApplied=false;
  let bloodPricePaidThisRoll=0, bloodPriceWasPreActivatedThisRoll=false, currentAttackSource="normal", currentAttackBaseTotal=null;
  let gamblingRetryUsed=false, gamblingRetryPending=false;
  let momentumBonus=0, bloodPriceNeighbors=[];
  let bloodRushActiveThisAttack=false, doubleTapApplied=false;
  let pendingDamage=null, pendingHeal=null;
  let roundNumber=1, roundEliminationOrder=[], lastPlaceIndex=null, roundWinnerHandled=false, roundWinnerIndex=null;
  let nextRoundAbilityRolls=[];
  let roundStats=[], turnDamageThisTurn=[];
  let eventPopupQueue=[], eventPopupBusy=false;
  let secondAbilityDraftBusy=false, secondAbilityDraftIndex=null, deferredBaseAdvance=false;
  let gamblingRolling=false, gamblingBaseTotal=null;
  let highStakesRolling=false, highStakesDecisionThisAttack=false;
  let perfect25Rolling=false, perfect25D4Rolling=false, perfect25BaseTotal=null, pendingPerfect25Total=null;
  let wildcardFace=null;
  let pendingExtraDamageFx=[], pendingExtraHealFx=[];
  // V27.5: letztes Projektil-/Einschlag-Event wird mit Online-Snapshots gespiegelt.
  let combatFxSerial=0, lastCombatFx=null, combatFxEvents=[];
  let secondAbilityDraftQueue=[];
  let insuranceRolling=false, insuranceContext=null;

  function hasMasteryUpgrade(id,level=1,index=current){
    return !!window.WDMastery?.hasAbilityUpgrade?.(id,level,index);
  }
  let counterRolling=false, counterContext=null, counterDiceState=[], counterHits=0, counterFirstRoll=true, pendingCounterattack=null, deferredAttackFinish=false;
  let secondAbilityDraftChoices=[];
  let secondAbilityDraftSlot=2;
  let botTimer=null, botSequence=0;
  let tutorialMode=false, tutorialOpen=false, tutorialSeen=new Set(), tutorialQueue=[], tutorialStepCount=0;
  let achievementToastQueue=[], achievementToastBusy=false;
  let profileScreenOrigin="menu";
  let campaignMode=false, duoCampaignMode=false, trioCampaignMode=false, campaignEncounterId=null, campaignProfileId=null, campaignWorldId="house";
  let encounterRuntime={ruleIds:[],phaseRuleIds:[],phaseTriggered:false,firstStrikeUsed:new Set(),armorUsed:new Set(),turnStarts:{}};
  let duoCampaignEncounterId=null, duoProfile1Id=null, duoProfile2Id=null, duoWorldId="covenant";
  let trioCampaignEncounterId=null, trioProfile1Id=null, trioProfile2Id=null, trioProfile3Id=null, trioWorldId="trinity";
