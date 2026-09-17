// Gemeinsame Datenquelle für Browser und die DOM-freie Duell-Engine.
// ID 6 ist freie W25-Wahl, ID 0 bleibt der Tutorial-Eintrag für die Browseransicht.
(function(root){
  'use strict';
  const START_HP = 25;
  const DICE_COUNT = 5;
  const SECOND_ABILITY_HP = 12;
  const REAL_ABILITY_IDS = [1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25];
  const CHOOSABLE_ABILITY_IDS = REAL_ABILITY_IDS.filter(id=>id!==7);

  const LOCAL_MODES={
    classic:{id:"classic",name:"Classic",startHp:25,startAbilityCount:1,bonusThreshold:12,bonusSlot:2,maxPlayers:8,allowBots:true,lastPlaceFreeChoices:1},
    endurance50:{id:"endurance50",name:"Endurance",startHp:50,startAbilityCount:2,bonusThreshold:30,bonusSlot:3,maxPlayers:4,allowBots:false,lastPlaceFreeChoices:2},
    overload75:{id:"overload75",name:"Overload",startHp:75,startAbilityCount:3,bonusThreshold:null,bonusSlot:null,maxPlayers:4,allowBots:false,lastPlaceFreeChoices:1},
    mayhem:{id:"mayhem",name:"Mayhem",startHp:65,startAbilityCount:2,bonusThreshold:30,bonusSlot:3,maxPlayers:6,allowBots:false,lastPlaceFreeChoices:0,bonusOnKill:true,allMasteryLevel:2}
  };

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


  function freezeData(value){
    if(value && typeof value === 'object'){
      Object.values(value).forEach(freezeData);
      Object.freeze(value);
    }
    return value;
  }
  const engine=root.WDEngine||(root.WDEngine={});
  engine.definitions=freezeData({
    RULE_VERSION:'duel-1',STATE_VERSION:1,
    START_HP,DICE_COUNT,SECOND_ABILITY_HP,REAL_ABILITY_IDS,CHOOSABLE_ABILITY_IDS,
    LOCAL_MODES,ABILITIES
  });
})(globalThis);
