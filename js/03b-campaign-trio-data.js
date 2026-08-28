  const TRIO_CAMPAIGN_WORLDS=[
    {id:"trinity",name:"Trio-Welt 1 · Trinity Protocol",shortName:"Trinity",desc:"15 Trio-Encounter für drei echte Profile: Rollen, Fokus-Pässe, gemeinsame Builds, kontrolliertes Risiko und zwei große Bossprüfungen.",unlockRequires:[],finalEncounterId:"trio_singularity",lockedText:""},
    {id:"helix",name:"Trio-Welt 2 · Helix Protocol",shortName:"Helix",desc:"15 härtere Trio-Encounter. Jeder muss selbst liefern – Carry wird bestraft. Koordination, Fokus-Pässe und getrennte Rechnungen. Wird nach Trinity Singularity freigeschaltet.",unlockRequires:["trio_singularity"],finalEncounterId:"trio_helix_apex",lockedText:"🔒 Nach Trinity Singularity"}
  ];
  const TRIO_CAMPAIGN_WORLD=TRIO_CAMPAIGN_WORLDS[0];

  const TRIO_CAMPAIGN_ENCOUNTERS=[
    {
      id:"trio_triple_entry",world:"trinity",requires:[],title:"1 · Triple Entry",subtitle:"3 gegen 3 · Alle müssen ran",
      desc:"Drei kleine Gegner, drei echte Spieler. Niemand darf sich vom Team tragen lassen: Jeder muss selbst einen Angriff landen und am Ende soll das komplette Trio noch stehen.",
      challenge:{type:"all",rules:[{type:"each_hero_attack"},{type:"all_heroes_survive"}],text:"Jeder der drei Spieler muss mindestens einmal angreifen UND alle drei müssen überleben."},
      enemies:[
        {name:"Spark",level:"normal",hp:18,ability:3},
        {name:"Rush",level:"normal",hp:18,ability:10},
        {name:"Tap",level:"normal",hp:18,ability:24}
      ]
    },
    {
      id:"trio_three_tools",world:"trinity",requires:["trio_triple_entry"],title:"2 · Three Tools",subtitle:"Drei Werkzeuge · drei Jobs",
      desc:"Jeder Spieler erhält zusätzlich eine andere Einsatz-Fähigkeit: Blutpreis, Loaded Dice und High Stakes. Das Team muss wirklich drei verschiedene Fähigkeiten benutzen; Casino Floor sorgt dabei für kontrolliertes Chaos.",
      grantedThirdAbilities:[11,18,13],
      challenge:{type:"team_distinct_abilities_min",value:3,text:"Benutzt als Team mindestens 3 verschiedene Fähigkeiten im selben Kampf."},
      enemies:[
        {name:"Foreman",level:"normal",hp:24,ability:19},
        {name:"Collector",level:"normal",hp:22,ability:2},
        {name:"Trigger",level:"normal",hp:22,ability:24}
      ]
    },
    {
      id:"trio_relay_protocol",world:"trinity",requires:["trio_three_tools"],title:"3 · Relay Protocol",subtitle:"P1 → P2 → P3",
      desc:"Der Tisch will Rhythmus. Die ersten drei tatsächlichen Trio-Angriffe müssen sauber von Spieler 1, dann Spieler 2, dann Spieler 3 kommen. First Strike macht jeden gelungenen Staffelstab spürbar.",
      challenge:{type:"attack_hero_pattern",pattern:[1,2,3],text:"Die ersten drei Helden-Angriffe müssen in der Reihenfolge Spieler 1 → Spieler 2 → Spieler 3 erfolgen."},
      enemies:[
        {name:"Bell One",level:"normal",hp:19,ability:17},
        {name:"Bell Two",level:"normal",hp:19,ability:19},
        {name:"Bell Three",level:"normal",hp:19,ability:10},
        {name:"Bell Four",level:"normal",hp:19,ability:21}
      ]
    },
    {
      id:"trio_blood_kitchen",world:"trinity",requires:["trio_relay_protocol"],title:"4 · Blood Kitchen",subtitle:"HP verbrennen · HP zurückholen",
      desc:"Ihr bekommt Blutpreis, Lifesteal und Loaded Dice als zusätzliche Werkzeuge. Bezahlt bewusst Leben und holt es euch mit Blood Moon wieder zurück, während drei Gegner weiter Druck machen.",
      grantedThirdAbilities:[11,2,18],
      challenge:{type:"all",rules:[{type:"team_voluntary_hp_min",value:9},{type:"team_healed_min",value:10}],text:"Bezahlt als Team mindestens 9 HP freiwillig UND heilt insgesamt mindestens 10 HP."},
      enemies:[
        {name:"Chef Red",level:"hard",hp:30,ability:11,secondAbility:23},
        {name:"Leech Pot",level:"normal",hp:28,ability:2,secondAbility:9},
        {name:"Taxman",level:"normal",hp:26,ability:18,secondAbility:19}
      ]
    },
    {
      id:"trio_threefold_verdict",world:"trinity",requires:["trio_blood_kitchen"],title:"5 · Threefold Verdict",subtitle:"Erster Schwur · koordinierte Finisher",
      desc:"Drei Bailiffs schützen den Trinity Judge. P1 spielt Zweite Chance + Counterattack, P2 Blutpreis + Blood Rush und P3 Loaded Dice + Double Tap. Die ersten drei Kills gehören der Reihe nach euch drei; der Judge fällt zuletzt.",
      requiredPrimaryAbilities:[4,11,18],
      grantedThirdAbilities:[21,23,24],
      challenge:{type:"all",rules:[{type:"kill_hero_pattern",pattern:[1,2,3]},{type:"kill_last_name",name:"Trinity Judge"}],text:"Die ersten drei Kills müssen Spieler 1 → Spieler 2 → Spieler 3 gehören UND Trinity Judge muss zuletzt sterben."},
      enemies:[
        {name:"Trinity Judge",level:"hard",hp:54,ability:21,secondAbility:14},
        {name:"Bailiff Red",level:"normal",hp:22,ability:24},
        {name:"Bailiff Blue",level:"normal",hp:22,ability:8},
        {name:"Bailiff Gold",level:"normal",hp:22,ability:13}
      ]
    },
    {
      id:"trio_crossfire_ledger",world:"trinity",requires:["trio_threefold_verdict"],title:"6 · Crossfire Ledger",subtitle:"Breit markieren · gemeinsam fokussieren",
      desc:"Vier Konten, drei Spieler. Jeder muss mindestens zwei verschiedene Gegner selbst markieren, aber mindestens ein Ziel muss wirklich von allen drei bearbeitet werden. Armor Shell bestraft stumpfes Eröffnungsfeuer.",
      challenge:{type:"all",rules:[{type:"each_hero_targets_min",value:2},{type:"shared_targets_min",value:1}],text:"Jeder Spieler muss mindestens 2 verschiedene Ziele angreifen UND mindestens 1 Gegner muss von allen drei Spielern angegriffen worden sein."},
      enemies:[
        {name:"Ledger Prime",level:"hard",hp:34,ability:19,secondAbility:21},
        {name:"Redline",level:"normal",hp:25,ability:8},
        {name:"Bluebook",level:"normal",hp:25,ability:17},
        {name:"Margin",level:"normal",hp:24,ability:10}
      ]
    },
    {
      id:"trio_blood_communion",world:"trinity",requires:["trio_crossfire_ledger"],title:"7 · Blood Communion",subtitle:"Jeder muss sich selbst zurückholen",
      desc:"Alle drei erhalten Lifesteal als zusätzliche Fähigkeit. Blood Moon verstärkt echte Heilungen, aber die Aufgabe lässt keinen Heiler-Carry zu: Jeder Spieler muss selbst Leben zurückgewinnen.",
      grantedThirdAbilities:[2,2,2],
      challenge:{type:"each_hero_healed_min",value:3,text:"Jeder der drei Spieler muss im Encounter mindestens 3 HP selbst heilen."},
      enemies:[
        {name:"Pulse Red",level:"hard",hp:36,ability:23,secondAbility:11},
        {name:"Pulse White",level:"hard",hp:36,ability:22,secondAbility:14},
        {name:"Pulse Black",level:"hard",hp:36,ability:9,secondAbility:19}
      ]
    },
    {
      id:"trio_focus_chain",world:"trinity",requires:["trio_blood_communion"],title:"8 · Focus Chain",subtitle:"Fokus weiterreichen · niemand verschwindet",
      desc:"Ein Ziel soll immer wieder von einem anderen Spieler übernommen werden. Fünf echte Fokus-Pässe sind Pflicht; gleichzeitig muss jeder mindestens zwei eigene Angriffe gestartet haben.",
      challenge:{type:"all",rules:[{type:"focus_passes_min",value:5},{type:"each_hero_attacks_min",value:2}],text:"Erzeugt mindestens 5 Fokus-Pässe UND jeder Spieler muss mindestens 2 eigene Angriffe starten."},
      enemies:[
        {name:"Anchor",level:"hard",hp:44,ability:21,secondAbility:19},
        {name:"Link Left",level:"hard",hp:32,ability:24,secondAbility:10},
        {name:"Link Right",level:"hard",hp:32,ability:13,secondAbility:17}
      ]
    },
    {
      id:"trio_three_marks",world:"trinity",requires:["trio_focus_chain"],title:"9 · Three Marks",subtitle:"Drei Spieler · drei Finisher",
      desc:"Keine komplizierte Reihenfolge, kein Carry: Es stehen exakt drei harte Ziele am Tisch und jeder Spieler muss persönlich mindestens einen Kill setzen.",
      challenge:{type:"each_hero_kill_min",value:1,text:"Jeder Spieler muss mindestens einen Gegner selbst eliminieren."},
      enemies:[
        {name:"Mark Alpha",level:"hard",hp:34,ability:8,secondAbility:24},
        {name:"Mark Beta",level:"hard",hp:34,ability:21,secondAbility:19},
        {name:"Mark Gamma",level:"hard",hp:34,ability:13,secondAbility:14}
      ]
    },
    {
      id:"trio_cerberus_gate",world:"trinity",requires:["trio_three_marks"],title:"10 · Cerberus Gate",subtitle:"Trio-Boss · Zufalls-Zweitfähigkeit · Trophy Farm",
      desc:"Drei Heads schützen den Cerberus Core. Jeder startet mit seiner gewählten Fähigkeit plus einer zufälligen Zweitfähigkeit. Die 3. Fähigkeit kommt über den normalen Kill- oder ≤15-HP-Trigger. Jeder muss den Core markieren und selbst finishen; der Core fällt zuletzt.",
      farmTrophy:true,
      randomStartSecondAbility:true,
      challenge:{type:"all",rules:[{type:"each_hero_attacked_name",name:"Cerberus Core"},{type:"each_hero_kill_min",value:1},{type:"kill_last_name",name:"Cerberus Core"}],text:"Alle drei müssen Cerberus Core angreifen, jeder Spieler braucht mindestens 1 Kill UND Cerberus Core muss zuletzt sterben."},
      enemies:[
        {name:"Cerberus Core",level:"hard",hp:66,ability:22,secondAbility:14},
        {name:"Head Red",level:"hard",hp:28,ability:21,secondAbility:24},
        {name:"Head Blue",level:"hard",hp:28,ability:13,secondAbility:17},
        {name:"Head Gold",level:"hard",hp:28,ability:19,secondAbility:8}
      ]
    },
    {
      id:"trio_blood_debt",world:"trinity",requires:["trio_cerberus_gate"],title:"11 · Blood Debt",subtitle:"Jeder bezahlt · alle kommen raus",
      desc:"P1 und P3 bekommen Blutpreis, P2 Loaded Dice. Jeder muss selbst mindestens 3 HP freiwillig bezahlen, aber am Ende sollen trotzdem alle drei noch leben. Blood Moon macht Recovery-Builds wertvoll.",
      grantedThirdAbilities:[11,18,11],
      challenge:{type:"all",rules:[{type:"each_hero_voluntary_hp_min",value:3},{type:"all_heroes_survive"}],text:"Jeder Spieler muss mindestens 3 HP freiwillig bezahlen UND alle drei müssen den Encounter überleben."},
      enemies:[
        {name:"Debtkeeper",level:"hard",hp:42,ability:11,secondAbility:23},
        {name:"Interest",level:"hard",hp:34,ability:18,secondAbility:19},
        {name:"Collector IX",level:"hard",hp:34,ability:2,secondAbility:9}
      ]
    },
    {
      id:"trio_four_before_one",world:"trinity",requires:["trio_blood_debt"],title:"12 · Four Before One",subtitle:"Alle vier markieren · dann erst töten",
      desc:"Vier Targets hängen an derselben Matrix. Bevor der erste Gegner fällt, muss das Team alle vier mindestens einmal beschädigt haben. Zusätzlich muss jeder Spieler selbst mindestens zwei verschiedene Ziele angreifen.",
      challenge:{type:"all",rules:[{type:"first_kill_after_targets_min",value:4},{type:"each_hero_targets_min",value:2}],text:"Beschädigt alle 4 Gegner vor dem ersten Kill UND jeder Spieler muss mindestens 2 verschiedene Ziele angreifen."},
      enemies:[
        {name:"North",level:"hard",hp:30,ability:17,secondAbility:24},
        {name:"East",level:"hard",hp:30,ability:10,secondAbility:21},
        {name:"South",level:"hard",hp:30,ability:19,secondAbility:8},
        {name:"West",level:"hard",hp:30,ability:13,secondAbility:14}
      ]
    },
    {
      id:"trio_counter_choir",world:"trinity",requires:["trio_four_before_one"],title:"13 · Counter Choir",subtitle:"Drei Gegenschläge · drei Stimmen",
      desc:"Alle drei erhalten Counterattack als zusätzliche Fähigkeit. Die Gegner schlagen hart genug zurück; jeder Spieler muss mindestens einen eigenen Gegenschlag tatsächlich auslösen.",
      grantedThirdAbilities:[21,21,21],
      challenge:{type:"each_hero_ability_use",ability:21,count:1,text:"Jeder der drei Spieler muss Counterattack mindestens einmal auslösen."},
      enemies:[
        {name:"Bass",level:"hard",hp:40,ability:1,secondAbility:13},
        {name:"Tenor",level:"hard",hp:40,ability:24,secondAbility:10},
        {name:"Soprano",level:"hard",hp:40,ability:13,secondAbility:17}
      ]
    },
    {
      id:"trio_last_light",world:"trinity",requires:["trio_counter_choir"],title:"14 · Last Light Relay",subtitle:"Drei Bonus-Drafts · Rhythmus halten",
      desc:"Der letzte Vorraum verlangt von allen drei Spielern ihren normalen Kampagnen-Bonus-Draft. Er kommt durch den ersten eigenen Gegner-Kill oder durch ≤15 HP – was zuerst passiert – während die ersten sechs Helden-Angriffe ohne Doppelzug desselben Spielers alternieren.",
      challenge:{type:"all",rules:[{type:"all_heroes_secondary_unlocked"},{type:"attack_heroes_alternate_min",value:6}],text:"Alle drei Spieler müssen ihren Bonus-Draft durch eigenen Kill oder ≤15 HP auslösen UND die ersten 6 Helden-Angriffe müssen zwischen verschiedenen Spielern alternieren."},
      enemies:[
        {name:"Dusk",level:"hard",hp:46,ability:21,secondAbility:13},
        {name:"Afterglow",level:"hard",hp:44,ability:17,secondAbility:24},
        {name:"Blackout",level:"hard",hp:44,ability:1,secondAbility:19}
      ]
    },
    {
      id:"trio_singularity",world:"trinity",requires:["trio_last_light"],title:"15 · Trinity Singularity",subtitle:"Trio-Finalboss · drei Siegel · Trophy Farm",
      desc:"Die Singularity steht hinter drei Seals. Jeder Spieler erhält eine andere zusätzliche Endgame-Fähigkeit. Alle drei müssen den Boss persönlich markieren, jeder braucht mindestens einen Kill und die Singularity fällt zuletzt. In Phase II kippt der Tisch in Overcharge.",
      grantedThirdAbilities:[14,23,24],
      farmTrophy:true,
      challenge:{type:"all",rules:[{type:"each_hero_attacked_name",name:"Trinity Singularity"},{type:"each_hero_kill_min",value:1},{type:"kill_last_name",name:"Trinity Singularity"}],text:"Alle drei müssen Trinity Singularity angreifen, jeder Spieler braucht mindestens 1 Kill UND Trinity Singularity muss zuletzt sterben."},
      enemies:[
        {name:"Trinity Singularity",level:"hard",hp:82,ability:22,secondAbility:14},
        {name:"Seal Red",level:"hard",hp:32,ability:21,secondAbility:24},
        {name:"Seal Blue",level:"hard",hp:32,ability:13,secondAbility:17},
        {name:"Seal Gold",level:"hard",hp:32,ability:19,secondAbility:8}
      ]
    },

    {
      id:"trio_helix_entry",world:"helix",requires:["trio_singularity"],title:"1 · Helix Entry",subtitle:"Härterer Einstieg · alle müssen stehen",
      desc:"Helix beginnt nicht freundlich. Drei echte Gegner, etwas mehr HP, und die Challenge bleibt klar: Jeder greift an, niemand darf fallen.",
      challenge:{type:"all",rules:[{type:"each_hero_attack"},{type:"all_heroes_survive"}],text:"Jeder der drei Spieler muss mindestens einmal angreifen UND alle drei müssen überleben."},
      enemies:[
        {name:"Helix Spark",level:"hard",hp:24,ability:8},
        {name:"Helix Rush",level:"hard",hp:24,ability:10},
        {name:"Helix Tap",level:"hard",hp:24,ability:24}
      ]
    },
    {
      id:"trio_helix_invoices",world:"helix",requires:["trio_helix_entry"],title:"2 · Three Invoices",subtitle:"Jeder bezahlt selbst",
      desc:"Keine Team-Summe. Blutpreis und Loaded Dice liegen bereit, Blood Tax macht jede Zahlung teurer. Jeder Spieler muss seine eigene Rechnung von 4 HP begleichen.",
      grantedThirdAbilities:[11,18,11],
      challenge:{type:"each_hero_voluntary_hp_min",value:4,text:"Jeder Spieler muss mindestens 4 HP freiwillig für Fähigkeiten bezahlen."},
      enemies:[
        {name:"Invoice Red",level:"hard",hp:32,ability:18,secondAbility:19},
        {name:"Invoice Blue",level:"hard",hp:32,ability:11,secondAbility:23},
        {name:"Invoice Gold",level:"hard",hp:30,ability:13,secondAbility:2}
      ]
    },
    {
      id:"trio_helix_pass",world:"helix",requires:["trio_helix_invoices"],title:"3 · Pass the Spindle",subtitle:"Fokus weiterreichen",
      desc:"Ein Ziel soll wandern. Drei echte Fokus-Pässe, und jeder muss selbst mindestens zweimal angreifen – kein Zuschauen.",
      challenge:{type:"all",rules:[{type:"focus_passes_min",value:3},{type:"each_hero_attacks_min",value:2}],text:"Erzeugt mindestens 3 Fokus-Pässe UND jeder Spieler muss mindestens 2 eigene Angriffe starten."},
      enemies:[
        {name:"Spindle",level:"hard",hp:38,ability:21,secondAbility:19},
        {name:"Coil Left",level:"hard",hp:30,ability:24,secondAbility:10},
        {name:"Coil Right",level:"hard",hp:30,ability:13,secondAbility:17}
      ]
    },
    {
      id:"trio_helix_marks",world:"helix",requires:["trio_helix_pass"],title:"4 · Shared Ledger",subtitle:"Breit markieren · ein gemeinsames Ziel",
      desc:"Vier Konten. Armor Shell bestraft den ersten Schlag. Jeder muss zwei verschiedene Ziele wählen, mindestens eines davon wirklich zu dritt.",
      challenge:{type:"all",rules:[{type:"each_hero_targets_min",value:2},{type:"shared_targets_min",value:1}],text:"Jeder Spieler muss mindestens 2 verschiedene Ziele angreifen UND mindestens 1 Gegner muss von allen drei Spielern angegriffen worden sein."},
      enemies:[
        {name:"Ledger Helix",level:"hard",hp:32,ability:19,secondAbility:21},
        {name:"Redline II",level:"hard",hp:26,ability:8},
        {name:"Bluebook II",level:"hard",hp:26,ability:17},
        {name:"Margin II",level:"hard",hp:26,ability:10}
      ]
    },
    {
      id:"trio_helix_judge",world:"helix",requires:["trio_helix_marks"],title:"5 · Helix Judge",subtitle:"Mini-Boss · drei Finisher · Judge zuletzt",
      desc:"Zwei Wardens halten den Judge. Jeder braucht einen eigenen Kill, und Helix Judge darf erst fallen, wenn die Wardens weg sind.",
      challenge:{type:"all",rules:[{type:"each_hero_kill_min",value:1},{type:"kill_last_name",name:"Helix Judge"}],text:"Jeder Spieler muss mindestens 1 Kill setzen UND Helix Judge muss zuletzt sterben."},
      enemies:[
        {name:"Helix Judge",level:"hard",hp:64,ability:21,secondAbility:14},
        {name:"Warden Red",level:"hard",hp:30,ability:24,secondAbility:8},
        {name:"Warden Blue",level:"hard",hp:30,ability:13,secondAbility:17}
      ]
    },
    {
      id:"trio_helix_counters",world:"helix",requires:["trio_helix_judge"],title:"6 · Counter Spindle",subtitle:"Jeder schlägt selbst zurück",
      desc:"Alle drei bekommen Counterattack. Die Gegner hauen hart genug, dass jeder seinen eigenen Gegenschlag wirklich auslösen muss.",
      grantedThirdAbilities:[21,21,21],
      challenge:{type:"each_hero_ability_use",ability:21,count:1,text:"Jeder der drei Spieler muss Counterattack mindestens einmal auslösen."},
      enemies:[
        {name:"Hammer Red",level:"hard",hp:40,ability:8,secondAbility:24},
        {name:"Hammer Blue",level:"hard",hp:40,ability:1,secondAbility:10},
        {name:"Hammer Gold",level:"hard",hp:38,ability:13,secondAbility:17}
      ]
    },
    {
      id:"trio_helix_ledger",world:"helix",requires:["trio_helix_counters"],title:"7 · Blood Helix",subtitle:"Jeder zahlt · jeder heilt",
      desc:"Blutpreis, Lifesteal, Loaded Dice. Blood Moon hilft, aber Carry ist verboten: Jeder bezahlt 3 HP selbst und holt sich mindestens 4 HP selbst zurück.",
      grantedThirdAbilities:[11,2,18],
      challenge:{type:"all",rules:[{type:"each_hero_voluntary_hp_min",value:3},{type:"each_hero_healed_min",value:4}],text:"Jeder Spieler muss mindestens 3 HP freiwillig bezahlen UND mindestens 4 HP selbst heilen."},
      enemies:[
        {name:"Vein Red",level:"hard",hp:38,ability:11,secondAbility:23},
        {name:"Vein White",level:"hard",hp:38,ability:2,secondAbility:9},
        {name:"Vein Black",level:"hard",hp:36,ability:18,secondAbility:19}
      ]
    },
    {
      id:"trio_helix_metronome",world:"helix",requires:["trio_helix_ledger"],title:"8 · Helix Metronome",subtitle:"Sechs Angriffe ohne Doppelzug",
      desc:"First Strike belohnt den Staffelstab. Die ersten sechs Helden-Angriffe dürfen nie zweimal hintereinander vom selben Spieler kommen.",
      challenge:{type:"attack_heroes_alternate_min",value:6,text:"Die ersten 6 Helden-Angriffe müssen zwischen verschiedenen Spielern alternieren."},
      enemies:[
        {name:"Tick",level:"hard",hp:32,ability:10},
        {name:"Tock",level:"hard",hp:32,ability:24},
        {name:"Beat",level:"hard",hp:32,ability:17},
        {name:"Lock",level:"hard",hp:30,ability:21}
      ]
    },
    {
      id:"trio_helix_finishers",world:"helix",requires:["trio_helix_metronome"],title:"9 · Three Blades",subtitle:"Jeder finish · zwei Ziele pro Kopf",
      desc:"Drei harte Marken. Jeder muss mindestens zwei verschiedene Ziele angreifen und persönlich mindestens einen Kill setzen.",
      challenge:{type:"all",rules:[{type:"each_hero_targets_min",value:2},{type:"each_hero_kill_min",value:1}],text:"Jeder Spieler muss mindestens 2 verschiedene Ziele angreifen UND mindestens 1 Kill setzen."},
      enemies:[
        {name:"Blade Alpha",level:"hard",hp:36,ability:8,secondAbility:24},
        {name:"Blade Beta",level:"hard",hp:36,ability:21,secondAbility:19},
        {name:"Blade Gamma",level:"hard",hp:36,ability:13,secondAbility:14}
      ]
    },
    {
      id:"trio_helix_hydra",world:"helix",requires:["trio_helix_finishers"],title:"10 · Hydra Gate",subtitle:"Welt-2-Boss · Zufalls-Zweitfähigkeit · Trophy Farm",
      desc:"Drei Heads schützen das Hydra Heart. Jeder startet mit seiner gewählten Fähigkeit plus einer zufälligen Zweitfähigkeit. Die 3. Fähigkeit kommt über den normalen Kill- oder ≤15-HP-Trigger. Alle drei müssen das Heart markieren, jeder braucht einen eigenen Finisher, und das Heart fällt zuletzt. Phase II zieht Casino Floor auf den Tisch.",
      farmTrophy:true,
      randomStartSecondAbility:true,
      challenge:{type:"all",rules:[{type:"each_hero_attacked_name",name:"Hydra Heart"},{type:"each_hero_kill_min",value:1},{type:"kill_last_name",name:"Hydra Heart"}],text:"Alle drei müssen Hydra Heart angreifen, jeder Spieler braucht mindestens 1 Kill UND Hydra Heart muss zuletzt sterben."},
      enemies:[
        {name:"Hydra Heart",level:"hard",hp:80,ability:22,secondAbility:14},
        {name:"Hydra Red",level:"hard",hp:34,ability:21,secondAbility:24},
        {name:"Hydra Blue",level:"hard",hp:34,ability:13,secondAbility:17},
        {name:"Hydra Gold",level:"hard",hp:34,ability:19,secondAbility:8}
      ]
    },
    {
      id:"trio_helix_draft",world:"helix",requires:["trio_helix_hydra"],title:"11 · Forced Draft",subtitle:"Drei Bonus-Drafts · alle überleben",
      desc:"Void Clock tickt. Alle drei müssen ihren normalen Bonus-Draft (eigener Kill oder ≤15 HP) auslösen und trotzdem gemeinsam stehen bleiben.",
      challenge:{type:"all",rules:[{type:"all_heroes_secondary_unlocked"},{type:"all_heroes_survive"}],text:"Alle drei Spieler müssen ihren Bonus-Draft auslösen UND alle drei müssen überleben."},
      enemies:[
        {name:"Pressure Helix",level:"hard",hp:44,ability:8,secondAbility:24},
        {name:"Tax Helix",level:"hard",hp:40,ability:21,secondAbility:19},
        {name:"Clock Helix",level:"hard",hp:40,ability:13,secondAbility:1}
      ]
    },
    {
      id:"trio_helix_web",world:"helix",requires:["trio_helix_draft"],title:"12 · Focus Web",subtitle:"6 Pässe · trotzdem breit bleiben",
      desc:"Ihr müsst dasselbe Ziel oft weiterreichen, dürft euch aber nicht auf einen Gegner versteifen. Sechs Fokus-Pässe, zwei verschiedene Ziele pro Spieler.",
      challenge:{type:"all",rules:[{type:"focus_passes_min",value:6},{type:"each_hero_targets_min",value:2}],text:"Erzeugt mindestens 6 Fokus-Pässe UND jeder Spieler muss mindestens 2 verschiedene Ziele angreifen."},
      enemies:[
        {name:"Web Core",level:"hard",hp:48,ability:21,secondAbility:19},
        {name:"Web One",level:"hard",hp:32,ability:17},
        {name:"Web Two",level:"hard",hp:32,ability:24},
        {name:"Web Three",level:"hard",hp:30,ability:10}
      ]
    },
    {
      id:"trio_helix_tools",world:"helix",requires:["trio_helix_web"],title:"13 · Four Tools",subtitle:"Vier verschiedene Fähigkeiten",
      desc:"Zweite Chance, Counterattack und Double Tap liegen zusätzlich auf dem Tisch. Als Team müsst ihr mindestens vier verschiedene Fähigkeiten wirklich benutzen.",
      grantedThirdAbilities:[4,21,24],
      challenge:{type:"team_distinct_abilities_min",value:4,text:"Benutzt als Team mindestens 4 verschiedene Fähigkeiten im selben Kampf."},
      enemies:[
        {name:"Toolmaster",level:"hard",hp:44,ability:19,secondAbility:13},
        {name:"Ratchet",level:"hard",hp:40,ability:8,secondAbility:10},
        {name:"Caliper",level:"hard",hp:40,ability:17,secondAbility:21}
      ]
    },
    {
      id:"trio_helix_relay",world:"helix",requires:["trio_helix_tools"],title:"14 · Final Spindle",subtitle:"Draft + Rhythmus + drei Finisher",
      desc:"Letzter Vorraum: Alle drei lösen den Bonus-Draft aus, die ersten sechs Angriffe alternieren, und jeder setzt selbst einen Kill.",
      challenge:{type:"all",rules:[{type:"all_heroes_secondary_unlocked"},{type:"attack_heroes_alternate_min",value:6},{type:"each_hero_kill_min",value:1}],text:"Alle drei müssen den Bonus-Draft auslösen, die ersten 6 Helden-Angriffe müssen alternieren UND jeder braucht mindestens 1 Kill."},
      enemies:[
        {name:"Spindle Prime",level:"hard",hp:50,ability:21,secondAbility:13},
        {name:"Spindle Left",level:"hard",hp:42,ability:17,secondAbility:24},
        {name:"Spindle Right",level:"hard",hp:42,ability:1,secondAbility:19}
      ]
    },
    {
      id:"trio_helix_apex",world:"helix",requires:["trio_helix_relay"],title:"15 · Helix Apex",subtitle:"Trio-Weltboss · Trophy Farm",
      desc:"Die Apex steht hinter drei Seals. Jeder bekommt eine andere zusätzliche Endgame-Fähigkeit. Alle drei müssen die Apex markieren, jeder braucht einen Kill, drei Fokus-Pässe sind Pflicht, und die Apex fällt zuletzt. Phase II kippt in Overcharge.",
      grantedThirdAbilities:[14,23,21],
      farmTrophy:true,
      challenge:{type:"all",rules:[{type:"each_hero_attacked_name",name:"Helix Apex"},{type:"each_hero_kill_min",value:1},{type:"focus_passes_min",value:3},{type:"kill_last_name",name:"Helix Apex"}],text:"Alle drei müssen Helix Apex angreifen, jeder braucht 1 Kill, mindestens 3 Fokus-Pässe UND Helix Apex muss zuletzt sterben."},
      enemies:[
        {name:"Helix Apex",level:"hard",hp:94,ability:22,secondAbility:14},
        {name:"Seal Crimson",level:"hard",hp:38,ability:21,secondAbility:24},
        {name:"Seal Azure",level:"hard",hp:38,ability:13,secondAbility:17},
        {name:"Seal Amber",level:"hard",hp:38,ability:19,secondAbility:8}
      ]
    }
  ];
