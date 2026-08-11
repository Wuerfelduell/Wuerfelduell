  const TRIO_CAMPAIGN_WORLD={
    id:"trinity",
    name:"Trinity Protocol",
    shortName:"Trinity",
    desc:"Fünf Trio-Testkämpfe: Rollen verteilen, Fähigkeiten wirklich benutzen, Angriffsreihenfolgen halten und Finisher koordinieren.",
    finalEncounterId:"trio_threefold_verdict"
  };

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
      id:"trio_threefold_verdict",world:"trinity",requires:["trio_blood_kitchen"],title:"5 · Threefold Verdict",subtitle:"Trio-Finale · koordinierte Finisher",
      desc:"Drei Bailiffs schützen den Trinity Judge. P1 spielt Zweite Chance + Counterattack, P2 Blutpreis + Blood Rush und P3 Loaded Dice + Double Tap. Die ersten drei Kills gehören der Reihe nach euch drei; der Judge fällt zuletzt.",
      requiredPrimaryAbilities:[4,11,18],
      grantedThirdAbilities:[21,23,24],
      farmTrophy:true,
      challenge:{type:"all",rules:[{type:"kill_hero_pattern",pattern:[1,2,3]},{type:"kill_last_name",name:"Trinity Judge"}],text:"Die ersten drei Kills müssen Spieler 1 → Spieler 2 → Spieler 3 gehören UND Trinity Judge muss zuletzt sterben."},
      enemies:[
        {name:"Trinity Judge",level:"hard",hp:54,ability:21,secondAbility:14},
        {name:"Bailiff Red",level:"normal",hp:22,ability:24},
        {name:"Bailiff Blue",level:"normal",hp:22,ability:8},
        {name:"Bailiff Gold",level:"normal",hp:22,ability:13}
      ]
    }
  ];
