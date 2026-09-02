/* Englische Kampagneninhalte
   ------------------------------------------------------------------
   lang/en.js traegt die Oberflaeche: Knoepfe, Beschriftungen, Meldungen.
   Hier stehen die Erzaehltexte der Kampagne - Welten, Encounter,
   Untertitel und Challenge-Bedingungen. Getrennt gehalten, weil die
   Oberflaeche selten und die Kampagne bei jedem neuen Encounter waechst.

   Warum exakte Eintraege statt Wort-fuer-Wort?
   Der Uebersetzer in js/00-i18n.js prueft in dieser Reihenfolge:
   exact, dann patterns, dann Wort-fuer-Wort. Die letzte Stufe laeuft nur
   bei kurzen Texten ohne Satzzeichen, und genau dort entstanden bisher
   Mischformen wie "required-Loadout" oder "Bonus-Draft je player": das
   Wort "Pflicht" wurde einzeln ersetzt, der Rest des Kompositums blieb
   deutsch. Ein exakter Eintrag gewinnt vor beiden Stufen und kann das
   nicht.

   Das ist nicht nur Kosmetik: js/29-v28-ui-phase1.js waehlt das Symbol
   einer Detailzeile ueber ihren Text. "required-Loadout" traf weder das
   deutsche noch das englische Muster, also stand dort das allgemeine
   Info-Zeichen statt eines Schlosses.

   Neue Encounter: Titel, Untertitel, Beschreibung und Challenge hier
   nachtragen. Fehlt ein Eintrag, faellt die Beschreibung auf einen
   neutralen englischen Satz zurueck (siehe germanHints in
   js/00-i18n.js) - sichtbar, aber nie halbdeutsch. */

(() => {
  const pack = (window.WD_LANG_PACKS || {}).en;
  if (!pack) return;

  Object.assign(pack.exact, {
    /* ---- Beschriftungen der Encounter-Detailzeilen ----
       Sie stehen je in einem eigenen <strong> und damit in einem eigenen
       Textknoten. Genau diese kurzen Knoten liefen bisher in die
       Wort-fuer-Wort-Ersetzung. */
    "Challenge:": "Challenge:",
    "Belohnung:": "Reward:",
    "Mastery XP:": "Mastery XP:",
    "Encounter-Fähigkeit:": "Encounter ability:",
    "Challenge-Ausrüstung:": "Challenge gear:",
    "Startfähigkeit:": "Starting ability:",
    "Fähigkeits-Drafts:": "Ability drafts:",
    "Bonus-Draft:": "Bonus draft:",
    "Bonus-Draft je Spieler:": "Bonus draft per player:",
    "Extra-Fähigkeiten:": "Extra abilities:",
    "Pflicht-Loadout:": "Required loadout:",
    "Zufalls-Start:": "Random start:",

    /* ---- Zustandsplaketten ---- */
    "OFFEN": "OPEN",
    "✓ GESCHAFFT": "✓ CLEARED",
    "🔒 GESPERRT": "🔒 LOCKED",
    "🏆 FARM": "🏆 FARM",

    /* ---- Feste Werte in den Detailzeilen ---- */
    "In diesem Encounter deaktiviert.": "Disabled in this encounter.",
    "Erstclear bereits abgeschlossen": "First clear already completed",
    "Nächsten Duo-Encounter freischalten": "Unlock the next duo encounter",
    "Nächsten Trio-Encounter freischalten": "Unlock the next trio encounter",
    "Duo-Welt abschließen": "Complete the duo world",
    "Trio-Welt abschließen": "Complete the trio world",
    "🏆 1 Trophäe pro erfolgreichem Clear": "🏆 1 trophy per successful clear",
    "🏆 1 Prestige-Trophäe bei erfolgreichem Clear": "🏆 1 prestige trophy on a successful clear",
    "🏆 +1 Trophäe je Profil pro erfolgreichem Clear": "🏆 +1 trophy per profile per successful clear",
    "🏆 +1 Trophäe je Profil beim Erstclear": "🏆 +1 trophy per profile on first clear",
    "1 Trophäe je Profil beim Erstclear": "1 trophy per profile on first clear",
    "Fortschritt": "Progress",
    "Boss XP · zwei Profile wählen": "Boss XP · choose two profiles",
    "Jeder bekommt zusätzlich zur gewählten Fähigkeit eine zufällige 2. Fähigkeit. Die 3. kommt über Kill oder ≤15 HP.":
      "On top of the chosen ability everyone gets a random 2nd ability. The 3rd comes from a kill or ≤15 HP.",

    /* ---- Weltnamen ---- */
    "Duo-Welt 2 · Fracture Pact": "Duo World 2 · Fracture Pact",
    "Trio-Welt 1 · Trinity Protocol": "Trio World 1 · Trinity Protocol",
    "Trio-Welt 2 · Helix Protocol": "Trio World 2 · Helix Protocol",

    /* ---- Weltbeschreibungen ---- */
    "Der alternative Prestige-Pfad mit 15 Encountern. Wird freigeschaltet, sobald Black Table (Encounter 10) geschafft ist.":
      "The alternative prestige path with 15 encounters. Unlocks once you clear Black Table (encounter 10).",
    "Prestige-Endgame mit 15 Encountern. Weniger stumpfe Schadenschecks, mehr Risiko, Fähigkeits-Meisterung, Zielwahl und Kill-Reihenfolgen. Wird freigeschaltet, sobald House Circuit UND Rift Circuit abgeschlossen sind.":
      "Prestige endgame with 15 encounters. Fewer blunt damage checks; more risk, ability mastery, target selection and kill orders. Unlocks once both House Circuit AND Rift Circuit are complete.",
    "Meisterschafts-Welt mit 15 Encountern. Hier werden bekannte Mechaniken härter kombiniert: hohe Eigenkosten, mehrfacher Fähigkeits-Einsatz, Mehrzielplanung, Comebacks und exakte Kill-Orders. Wird nach Zero Regent freigeschaltet.":
      "Mastery world with 15 encounters. Familiar mechanics combined harder: steep self-costs, repeated ability use, multi-target planning, comebacks and exact kill orders. Unlocks after Zero Regent.",
    "15 Endgame-Encounter rund um bewusste Zielwahl, Angriffsrouten und kontrolliertes Chaos. Nicht bloß höhere Zahlen: Du musst Gegner markieren, Ziele wechseln, bestimmte Angriffspfade einhalten und bekannte Fähigkeiten unter neuen Bedingungen meistern. Wird nach dem Abyss Throne freigeschaltet.":
      "15 endgame encounters built on deliberate target selection, attack routes and controlled chaos. Not merely bigger numbers: you have to mark opponents, switch targets, follow set attack paths and master familiar abilities under new conditions. Unlocks after the Abyss Throne.",
    "Die ursprüngliche Duo-Kampagne mit 15 Encountern. Fokus auf Rollenverteilung, gemeinsame Ressourcen und koordinierte Finisher.":
      "The original duo campaign with 15 encounters. Focused on role distribution, shared resources and coordinated finishers.",
    "15 neue Endgame-Duo-Encounter. Beide Spieler müssen häufiger dieselbe Mechanik selbst meistern, Risiko aufteilen und gezielt Clutch-Situationen erzeugen. Wird nach Covenant Zero freigeschaltet.":
      "15 new endgame duo encounters. Both players have to master the same mechanic themselves more often, split the risk and create clutch situations on purpose. Unlocks after Covenant Zero.",
    "15 Encounter über echtes Zusammenspiel: abwechselnde Angriffe, Fokus-Pässe auf dasselbe Ziel, spielerspezifische Finisher und härtere Versionen bereits gelernter Duo-Prüfungen. Wird nach Fracture Monarch freigeschaltet.":
      "15 encounters about genuine teamwork: alternating attacks, focus passes onto the same target, player-specific finishers and harder versions of duo trials you already know. Unlocks after Fracture Monarch.",
    "Der finale aktuelle Duo-Pfad. 15 Encounter mit langen Koordinationsketten, Rollenmustern, Grande-Prüfungen und Bossen, die bewusste Zielwahl von beiden Spielern verlangen. Wird nach Mirror Heart freigeschaltet.":
      "The final duo path so far. 15 encounters with long coordination chains, role patterns, Grande trials and bosses that demand deliberate target selection from both players. Unlocks after Mirror Heart.",
    "15 Trio-Encounter für drei echte Profile: Rollen, Fokus-Pässe, gemeinsame Builds, kontrolliertes Risiko und zwei große Bossprüfungen.":
      "15 trio encounters for three real profiles: roles, focus passes, shared builds, controlled risk and two big boss trials.",
    "15 härtere Trio-Encounter. Jeder muss selbst liefern – Carry wird bestraft. Koordination, Fokus-Pässe und getrennte Rechnungen. Wird nach Trinity Singularity freigeschaltet.":
      "15 tougher trio encounters. Everyone has to deliver themselves – carrying gets punished. Coordination, focus passes and separate accounts. Unlocks after Trinity Singularity.",

    /* ---- Faehigkeitsbeschreibungen ---- */
    "Einmal pro Zug darfst du einen nicht eingeloggten 1er eines Basiswurfs neu würfeln. Der neu gewürfelte Würfel kann dabei nicht wieder eine 1 werden.":
      "Once per turn you may reroll an unlocked 1 from a base roll. The rerolled die cannot come up as a 1 again.",
    "Jeder Würfeltreffer deines Angriffs verursacht zusätzlich 1 Schaden am nächsten anderen Spieler nach deinem Hauptziel. Funktioniert nur, wenn vor dem Schaden mindestens 3 Spieler leben.":
      "Every die hit of your attack deals 1 extra damage to the next player after your main target. Only works while at least 3 players are alive before the damage.",
    "Einmal pro Basiszug darfst du einen gerade gewürfelten, noch nicht eingeloggten Würfel direkt auf eine 5 drehen. Das kostet 2 HP.":
      "Once per base turn you may turn a die you just rolled, and have not locked yet, straight to a 5. That costs 2 HP.",
    "Würfelst du in einem einzelnen Basiswurf mindestens 3 gleiche Zahlen gleichzeitig, darfst du alle Würfel dieser Zahl aus genau diesem Wurf gratis neu würfeln. Gilt für 1er bis 6er und hat kein Limit: Entsteht danach erneut mindestens ein Drilling, darfst du Snake Eyes wieder benutzen.":
      "If a single base roll shows at least 3 of the same number at once, you may reroll every die of that number from exactly that roll for free. Works for 1s through 6s and has no limit: if another triple appears afterwards, you may use Snake Eyes again.",
    "Endet dein Angriff mit exakt 2 Würfeltreffern, erhalten beide Treffer +2 Schaden. Das sind insgesamt +4 Schaden vor High Stakes.":
      "If your attack ends with exactly 2 die hits, both hits gain +2 damage. That is +4 damage in total before High Stakes.",

    /* ---- Untertitel der Encounter ---- */
    "2 gegen 1 · Druck ohne Pause": "2 vs 1 · pressure without a pause",
    "Kapitel-Boss · 2 gegen 1 · Trophy Farm": "Chapter boss · 2 vs 1 · trophy farm",
    "2 gegen 1 · Kaufen mit HP": "2 vs 1 · paying with HP",
    "Prestige-Prüfung · Loaded Dice": "Prestige trial · Loaded Dice",
    "Prestige-Prüfung · Blutpreis": "Prestige trial · Blood Price",
    "Prestige-Prüfung · High Stakes": "Prestige trial · High Stakes",
    "Boss · 2 gegen 1 · Trophy Farm": "Boss · 2 vs 1 · trophy farm",
    "Meisterprüfung · Snake Eyes": "Master trial · Snake Eyes",
    "HP sind Währung": "HP is currency",
    "Meisterprüfung · 12": "Master trial · 12",
    "Fünf Würfel · ein Angriff": "Five dice · one attack",
    "1 gegen 3 · Zielwahl zählt": "1 vs 3 · target selection matters",
    "Verteile den Druck": "Spread the pressure",
    "Schlag zurück · einmal": "Strike back · once",
    "Blood Rush ab Start · Bonus-Draft auf Slot 3": "Blood Rush from the start · bonus draft into slot 3",
    "Welt-Boss · Trophy Farm · 4-Slot-Finale": "World boss · trophy farm · 4-slot finale",
    "Abyss · Schmerz ist Eintritt": "Abyss · pain is the entry fee",
    "Perfect 25 + großer Treffer": "Perfect 25 + a big hit",
    "Verlieren und zurückholen": "Lose it, then take it back",
    "1 gegen 4 · jeder wird markiert": "1 vs 4 · everyone gets marked",
    "Drei Gegenschläge": "Three counterattacks",
    "Welt-Boss · 1 gegen 4 · Trophy Farm": "World boss · 1 vs 4 · trophy farm",
    "Drei Ziele · feste Angriffseröffnung": "Three targets · fixed attack opening",
    "Ziele ständig wechseln": "Keep switching targets",
    "1 gegen 4 · niemand darf früh fallen": "1 vs 4 · nobody may fall early",
    "Perfect 25 unter Dauerfeuer": "Perfect 25 under constant fire",
    "Gegenschläge finanzieren den Sieg": "Counterattacks pay for the win",
    "Präzise, aber nicht tunneln": "Precise, but do not tunnel",
    "Double Tap mit Zielwechsel": "Double Tap with a target switch",
    "Welt-Boss · alle markieren, dann exakte Zeitlinie · Trophy Farm":
      "World boss · mark everyone, then an exact timeline · trophy farm",
    "2 gegen 3 · Beide müssen liefern": "2 vs 3 · both have to deliver",
    "Beide müssen Snake Eyes liefern": "Both have to deliver Snake Eyes",
    "Zielwechsel · beide Spieler": "Target switching · both players",
    "Beide schlagen zurück": "Both strike back",
    "Trefferprüfung · beide": "Hit trial · both",
    "Beide retten einen Angriff": "Both rescue an attack",
    "Jeder braucht einen Kill": "Everyone needs a kill",
    "Snake Eyes · 2 pro Spieler": "Snake Eyes · 2 per player",
    "Beide müssen High Stakes gewinnen": "Both have to win High Stakes",
    "Beide Bonus-Drafts · beide zurück": "Both bonus drafts · both come back",
    "Beide müssen Last Stand triggern": "Both have to trigger Last Stand",
    "Blood Rush · zweimal pro Spieler": "Blood Rush · twice per player",
    "Double Tap · 2 pro Spieler": "Double Tap · 2 per player",
    "Zweite Chance · zweimal pro Spieler": "Second Chance · twice per player",
    "Snake Eyes · 3 pro Spieler": "Snake Eyes · 3 per player",
    "High Stakes · 2 Siege pro Spieler": "High Stakes · 2 wins per player",
    "3 Counterattacks pro Spieler": "3 counterattacks per player",
    "9 HP freiwillig pro Spieler": "9 HP paid voluntarily per player",
    "Beide müssen den Boss markieren": "Both have to mark the boss",
    "Duo-Weltboss · Fokus-Pässe": "Duo world boss · focus passes",
    "3 Fokus-Pässe + breite Zielwahl": "3 focus passes + wide target selection",
    "Zweite Chance · 3 pro Spieler": "Second Chance · 3 per player",
    "Double Tap · 3 pro Spieler": "Double Tap · 3 per player",
    "Blood Rush · 3 pro Spieler": "Blood Rush · 3 per player",
    "Perfect 25 bei beiden": "Perfect 25 from both",
    "Präzision · 2 pro Spieler": "Precision · 2 per player",
    "Fähigkeit 12 · 3 Trigger pro Spieler": "Ability 12 · 3 triggers per player",
    "Beide markieren alle vier": "Both mark all four",
    "Zwei feste Finisher pro Spieler": "Two fixed finishers per player",
    "5 Treffer bei beiden": "5 hits from both",
    "6 Fokus-Pässe": "6 focus passes",
    "Duo-Finalboss · 2 gegen 4": "Duo final boss · 2 vs 4",
    "3 gegen 3 · Alle müssen ran": "3 vs 3 · everyone has to step up",
    "Jeder muss sich selbst zurückholen": "Everyone has to bring themselves back",
    "Drei Spieler · drei Finisher": "Three players · three finishers",
    "Trio-Boss · Zufalls-Zweitfähigkeit · Trophy Farm": "Trio boss · random second ability · trophy farm",
    "Jeder bezahlt · alle kommen raus": "Everyone pays · everyone gets out",
    "Alle vier markieren · dann erst töten": "Mark all four · only then kill",
    "Drei Gegenschläge · drei Stimmen": "Three counterattacks · three voices",
    "Härterer Einstieg · alle müssen stehen": "A harder start · everyone has to stand",
    "Breit markieren · ein gemeinsames Ziel": "Mark wide · one shared target",
    "Jeder schlägt selbst zurück": "Everyone strikes back themselves",
    "Jeder zahlt · jeder heilt": "Everyone pays · everyone heals",
    "Sechs Angriffe ohne Doppelzug": "Six attacks without a double turn",
    "Welt-2-Boss · Zufalls-Zweitfähigkeit · Trophy Farm": "World 2 boss · random second ability · trophy farm",
    "Drei Bonus-Drafts · alle überleben": "Three bonus drafts · everyone survives",
    "6 Pässe · trotzdem breit bleiben": "6 passes · stay wide anyway",
    "Vier verschiedene Fähigkeiten": "Four different abilities",

    /* ---- Challenge-Bedingungen ----
       Bewusst als exakte Eintraege: die Saetze sind zu verschieden fuer
       Muster, und eine falsch uebersetzte Siegbedingung ist schlimmer als
       eine fehlende. */
    "Besiege dein Spiegelbild mit mindestens 12 HP Restleben.":
      "Defeat your mirror image with at least 12 HP remaining.",
    "Beende mindestens einen Basiswurf über 25 und gewinne mit mindestens 10 HP.":
      "Finish at least one base roll above 25 and win with at least 10 HP.",
    "Besiege alle drei Gegner mit mindestens 8 HP Restleben.":
      "Defeat all three opponents with at least 8 HP remaining.",
    "Boss-Challenge: Erzeuge mindestens 15 Schaden in einem eigenen Zug und gewinne mit mindestens 5 HP.":
      "Boss challenge: deal at least 15 damage in one of your turns and win with at least 5 HP.",
    "Nutze Snake Eyes mindestens einmal und gewinne.":
      "Use Snake Eyes at least once and win.",
    "Boss-Challenge: Heile während des Kampfes insgesamt mindestens 10 HP und gewinne.":
      "Boss challenge: heal at least 10 HP in total during the battle and win.",
    "Löse Last Stand mindestens einmal aus und gewinne.":
      "Trigger Last Stand at least once and win.",
    "Benutze Blutpreis mindestens einmal UND gewinne mindestens einen High-Stakes-Wurf mit 4–6.":
      "Use Blood Price at least once AND win at least one High Stakes roll with 4–6.",
    "Nimm während des Encounters mindestens 6 selbst verursachten Schaden und gewinne.":
      "Take at least 6 self-damage during the encounter and win.",
    "Benutze Snake Eyes mindestens zweimal und gewinne.":
      "Use Snake Eyes at least twice and win.",
    "Bezahle insgesamt mindestens 9 HP freiwillig für Fähigkeiten und gewinne.":
      "Voluntarily pay at least 9 HP in total for abilities and win.",
    "Triggere die Fähigkeit 12 mindestens zweimal und gewinne.":
      "Trigger ability 12 at least twice and win.",
    "Beende mindestens einen eigenen Angriff mit 5 Treffern und gewinne.":
      "Finish at least one of your attacks with 5 hits and win.",
    "Schalte Beacon als ersten Gegner aus und gewinne.":
      "Eliminate Beacon as the first opponent and win.",
    "Füge mindestens 3 verschiedenen Gegnern Rohschaden zu und gewinne.":
      "Deal raw damage to at least 3 different opponents and win.",
    "Gewinne, ohne Glückswurf, Zweite Chance, Blutpreis, High Stakes, Loaded Dice oder Snake Eyes aktiv zu benutzen.":
      "Win without actively using Lucky Roll, Second Chance, Blood Price, High Stakes, Loaded Dice or Snake Eyes.",
    "Löse Counterattack mindestens einmal aus und gewinne.":
      "Trigger Counterattack at least once and win.",
    "Löse Perfect 25 aus und würfle dabei 4–6, sodass der Angriff freigegeben wird.":
      "Trigger Perfect 25 and roll 4–6 on it so the attack is released.",
    "Löse Präzision mindestens zweimal aus und gewinne.":
      "Trigger Precision at least twice and win.",
    "Triggere Double Tap in zwei verschiedenen Angriffen und gewinne.":
      "Trigger Double Tap in two different attacks and win.",
    "Aktiviere Blood Rush in mindestens zwei eigenen Angriffen und gewinne.":
      "Activate Blood Rush in at least two of your attacks and win.",
    "Eliminiere die Gegner exakt in der Reihenfolge Key → Lock → Crown. Selbst-Eliminierungen der Gegner zählen mit.":
      "Eliminate the opponents in exactly the order Key → Lock → Crown. Opponent self-eliminations count.",
    "Nimm mindestens 10 selbst verursachten Schaden und gewinne.":
      "Take at least 10 self-damage and win.",
    "Bezahle insgesamt mindestens 12 HP freiwillig für Fähigkeiten und gewinne.":
      "Voluntarily pay at least 12 HP in total for abilities and win.",
    "Lass Perfect 25 mindestens einmal einen Angriff freigeben UND beende einen Angriff mit mindestens 4 Treffern.":
      "Have Perfect 25 release an attack at least once AND finish an attack with at least 4 hits.",
    "Löse Präzision mindestens 3-mal aus und gewinne.":
      "Trigger Precision at least 3 times and win.",
    "Nimm mindestens 10 Eigenschaden UND heile während des Encounters mindestens 8 HP.":
      "Take at least 10 self-damage AND heal at least 8 HP during the encounter.",
    "Füge allen 4 Gegnern mindestens einmal Rohschaden zu und gewinne.":
      "Deal raw damage to all 4 opponents at least once and win.",
    "Löse Last Stand aus UND heile im Encounter insgesamt mindestens 5 HP.":
      "Trigger Last Stand AND heal at least 5 HP in total during the encounter.",
    "Gewinne mindestens 2 High-Stakes-Würfe mit 4–6 und besiege den Gegner.":
      "Win at least 2 High Stakes rolls with 4–6 and defeat the opponent.",
    "Triggere Double Tap in mindestens 3 Angriffen und gewinne.":
      "Trigger Double Tap in at least 3 attacks and win.",
    "Löse Counterattack mindestens 3-mal aus und gewinne.":
      "Trigger Counterattack at least 3 times and win.",
    "Benutze keine aktiven Fähigkeits-Buttons UND füge mindestens 3 verschiedenen Gegnern Rohschaden zu.":
      "Use no active ability buttons AND deal raw damage to at least 3 different opponents.",
    "Triggere die Fähigkeit 12 mindestens 4-mal und gewinne.":
      "Trigger ability 12 at least 4 times and win.",
    "Eliminiere exakt in der Reihenfolge Ember → Tide → Stone → Void.":
      "Eliminate in exactly the order Ember → Tide → Stone → Void.",
    "Eliminiere Abyss King als letzten Gegner, nimm mindestens 12 Eigenschaden UND löse deinen Bonus-Draft durch ersten eigenen Kill oder ≤15 HP aus.":
      "Eliminate Abyss King as the last opponent, take at least 12 self-damage AND trigger your bonus draft through your first own kill or ≤15 HP.",
    "Deine ersten 3 Angriffe müssen Red Clock → Blue Clock → Black Clock als Ziel wählen.":
      "Your first 3 attacks must target Red Clock → Blue Clock → Black Clock.",
    "Benutze Snake Eyes mindestens 2-mal UND nimm im Encounter mindestens 6 selbst verursachten Schaden.":
      "Use Snake Eyes at least 2 times AND take at least 6 self-damage during the encounter.",
    "Erhalte mit Perfect 25 mindestens einmal den Angriff UND starte insgesamt mindestens 4 eigene Angriffe.":
      "Gain the attack through Perfect 25 at least once AND start at least 4 attacks of your own in total.",
    "Löse Counterattack mindestens 2-mal aus UND starte zusätzlich mindestens 3 normale eigene Angriffe.":
      "Trigger Counterattack at least 2 times AND additionally start at least 3 normal attacks of your own.",
    "Benutze Loaded Dice mindestens 2-mal, bezahle damit mindestens 4 HP und bleibe insgesamt bei höchstens 6 Eigenschaden.":
      "Use Loaded Dice at least 2 times, pay at least 4 HP doing so and stay at 6 self-damage or less in total.",
    "Gewinne mindestens 2 High-Stakes-Würfe mit 4–6 UND nimm im Encounter mindestens 5 selbst verursachten Schaden.":
      "Win at least 2 High Stakes rolls with 4–6 AND take at least 5 self-damage during the encounter.",
    "Benutze Präzision mindestens 2-mal UND füge allen 3 Gegnern Rohschaden zu.":
      "Use Precision at least 2 times AND deal raw damage to all 3 opponents.",
    "Benutze Blutpreis mindestens 3-mal UND füge 3 verschiedenen Gegnern Rohschaden zu.":
      "Use Blood Price at least 3 times AND deal raw damage to 3 different opponents.",
    "Triggere Double Tap mindestens 3-mal UND wechsle mindestens 3-mal dein Angriffsziel.":
      "Trigger Double Tap at least 3 times AND switch your attack target at least 3 times.",
    "Triggere Fähigkeit 12 mindestens 4-mal UND schaffe mindestens einen Angriff mit 5 Treffern.":
      "Trigger ability 12 at least 4 times AND land at least one attack with 5 hits.",
    "Löse Last Stand aus UND starte im Encounter insgesamt mindestens 6 eigene Angriffe.":
      "Trigger Last Stand AND start at least 6 attacks of your own during the encounter.",
    "Füge zuerst ALLEN 4 Gegnern Rohschaden zu, bevor jemand stirbt; eliminiere danach exakt Past → Present → Future → Paradox Crown.":
      "First deal raw damage to ALL 4 opponents before anyone dies, then eliminate exactly Past → Present → Future → Paradox Crown.",
    "Gewinnt den Encounter und beide Spieler müssen überleben.":
      "Win the encounter and both players must survive.",
    "Beide Spieler müssen mindestens einen Angriff starten und ihr müsst gewinnen.":
      "Both players must start at least one attack and you must win.",
    "Heilt als Team insgesamt mindestens 8 HP und gewinnt.":
      "Heal at least 8 HP as a team in total and win.",
    "Jeder Spieler muss in einem eigenen Zug mindestens 8 Rohschaden erzeugen und ihr müsst gewinnen.":
      "Each player must deal at least 8 raw damage in one of their own turns and you must win.",
    "Nehmt als Team mindestens 10 selbst verursachten Schaden und gewinnt.":
      "Take at least 10 self-damage as a team and win.",
    "Jeder Spieler muss mindestens 2 verschiedene Gegner angreifen und ihr müsst gewinnen.":
      "Each player must attack at least 2 different opponents and you must win.",
    "Die ersten 2 Gegner-Kills müssen von unterschiedlichen Spielern stammen und ihr müsst gewinnen.":
      "The first 2 opponent kills must come from different players and you must win.",
    "Benutzt Snake Eyes als Team insgesamt mindestens 3-mal und gewinnt.":
      "Use Snake Eyes at least 3 times as a team in total and win.",
    "Jeder Spieler muss während des Encounters mindestens 4 HP heilen.":
      "Each player must heal at least 4 HP during the encounter.",
    "Beide Spieler müssen ihren Bonus-Draft durch eigenen Kill oder ≤15 HP auslösen UND beide müssen den Sieg überleben.":
      "Both players must trigger their bonus draft through their own kill or ≤15 HP AND both must survive the win.",
    "Bei beiden Spielern muss Last Stand mindestens einmal auslösen.":
      "Last Stand must trigger at least once for both players.",
    "Benutzt keine aktiven Fähigkeits-Buttons UND jeder Spieler muss mindestens 2 verschiedene Gegner angreifen.":
      "Use no active ability buttons AND each player must attack at least 2 different opponents.",
    "Erzeugt mindestens 1 Fokus-Pass: zwei aufeinanderfolgende Duo-Angriffe von verschiedenen Spielern müssen dasselbe Ziel wählen.":
      "Create at least 1 focus pass: two consecutive duo attacks from different players must pick the same target.",
    "Die ersten 6 Duo-Angriffe müssen strikt zwischen Spieler 1 und Spieler 2 abwechseln.":
      "The first 6 duo attacks must strictly alternate between player 1 and player 2.",
    "Jeder Spieler muss mindestens 3 verschiedene Gegner aktiv angreifen.":
      "Each player must actively attack at least 3 different opponents.",
    "Beide Spieler müssen Mirror Crown mindestens einmal angreifen UND Mirror Crown muss als letzter Gegner sterben.":
      "Both players must attack Mirror Crown at least once AND Mirror Crown must be the last opponent to die.",
    "Erzeugt mindestens 4 Fokus-Pässe, jeder Spieler braucht mindestens 1 Kill UND Mirror Heart muss als letzter Gegner sterben.":
      "Create at least 4 focus passes, each player needs at least 1 kill AND Mirror Heart must be the last opponent to die.",
    "Erzeugt mindestens 3 Fokus-Pässe UND jeder Spieler muss mindestens 2 verschiedene Gegner angreifen.":
      "Create at least 3 focus passes AND each player must attack at least 2 different opponents.",
    "Jeder Spieler muss Fähigkeit 12 mindestens 3-mal triggern.":
      "Each player must trigger ability 12 at least 3 times.",
    "Jeder Spieler muss alle 4 Gegner mindestens einmal aktiv angreifen.":
      "Each player must actively attack all 4 opponents at least once.",
    "Spieler 1 eliminiert Alpha + Gamma Seal; Spieler 2 eliminiert Beta + Delta Seal.":
      "Player 1 eliminates Alpha + Gamma Seal; player 2 eliminates Beta + Delta Seal.",
    "Die ersten 5 Kills müssen von Spieler 2 → 1 → 1 → 2 → 1 erzielt werden.":
      "The first 5 kills must be scored by player 2 → 1 → 1 → 2 → 1.",
    "Jeder Spieler muss mindestens einen Angriff mit 5 Treffern schaffen.":
      "Each player must land at least one attack with 5 hits.",
    "Beide Spieler müssen Omega Crown angreifen UND Omega Crown muss als letzter Gegner sterben.":
      "Both players must attack Omega Crown AND Omega Crown must be the last opponent to die.",
    "Erzeugt mindestens 6 Fokus-Pässe im selben Encounter.":
      "Create at least 6 focus passes in the same encounter.",
    "Jeder Spieler braucht einen 5-Treffer-Angriff, die ersten 3 Kills müssen zwischen euch alternieren UND Omega Sovereign muss zuletzt sterben.":
      "Each player needs a 5-hit attack, the first 3 kills must alternate between you AND Omega Sovereign must die last.",
    "Die ersten drei Kills müssen Spieler 1 → Spieler 2 → Spieler 3 gehören UND Trinity Judge muss zuletzt sterben.":
      "The first three kills must belong to player 1 → player 2 → player 3 AND Trinity Judge must die last.",
    "Alle drei müssen Cerberus Core angreifen, jeder Spieler braucht mindestens 1 Kill UND Cerberus Core muss zuletzt sterben.":
      "All three must attack Cerberus Core, each player needs at least 1 kill AND Cerberus Core must die last.",
    "Alle drei müssen Trinity Singularity angreifen, jeder Spieler braucht mindestens 1 Kill UND Trinity Singularity muss zuletzt sterben.":
      "All three must attack Trinity Singularity, each player needs at least 1 kill AND Trinity Singularity must die last.",
    "Erzeugt mindestens 3 Fokus-Pässe UND jeder Spieler muss mindestens 2 eigene Angriffe starten.":
      "Create at least 3 focus passes AND each player must start at least 2 attacks of their own.",
    "Jeder Spieler muss mindestens 1 Kill setzen UND Helix Judge muss zuletzt sterben.":
      "Each player must land at least 1 kill AND Helix Judge must die last.",
    "Jeder Spieler muss mindestens 3 HP freiwillig bezahlen UND mindestens 4 HP selbst heilen.":
      "Each player must voluntarily pay at least 3 HP AND heal at least 4 HP themselves.",
    "Die ersten 6 Helden-Angriffe müssen zwischen verschiedenen Spielern alternieren.":
      "The first 6 hero attacks must alternate between different players.",
    "Jeder Spieler muss mindestens 2 verschiedene Ziele angreifen UND mindestens 1 Kill setzen.":
      "Each player must attack at least 2 different targets AND land at least 1 kill.",
    "Alle drei müssen Hydra Heart angreifen, jeder Spieler braucht mindestens 1 Kill UND Hydra Heart muss zuletzt sterben.":
      "All three must attack Hydra Heart, each player needs at least 1 kill AND Hydra Heart must die last.",
    "Alle drei Spieler müssen ihren Bonus-Draft auslösen UND alle drei müssen überleben.":
      "All three players must trigger their bonus draft AND all three must survive.",
    "Erzeugt mindestens 6 Fokus-Pässe UND jeder Spieler muss mindestens 2 verschiedene Ziele angreifen.":
      "Create at least 6 focus passes AND each player must attack at least 2 different targets.",
    "Benutzt als Team mindestens 4 verschiedene Fähigkeiten im selben Kampf.":
      "Use at least 4 different abilities as a team in the same battle.",
    "Alle drei müssen den Bonus-Draft auslösen, die ersten 6 Helden-Angriffe müssen alternieren UND jeder braucht mindestens 1 Kill.":
      "All three must trigger the bonus draft, the first 6 hero attacks must alternate AND everyone needs at least 1 kill.",
    "Benutze Zweite Chance mindestens 3-mal UND starte mindestens 5 eigene Angriffe.":
      "Use Second Chance at least 3 times AND start at least 5 attacks of your own.",
    "Alle drei müssen Helix Apex angreifen, jeder braucht 1 Kill, mindestens 3 Fokus-Pässe UND Helix Apex muss zuletzt sterben.":
      "All three must attack Helix Apex, everyone needs 1 kill, at least 3 focus passes AND Helix Apex must die last."
  });

  /* Satzmuster fuer die zusammengesetzten Werte der Detailzeilen. Sie
     werden angehaengt, damit die bestehenden Muster ihren Vorrang
     behalten und hier nur auffangen, was dort durchfaellt. */
  pack.patterns.push(
    [/^(\d+) Trophäe je Profil beim Erstclear · (.+)$/i,
      (m, tr) => `${m[1]} trophy per profile on first clear · ${tr(m[2])}`],
    [/^🏆 \+(\d+) Trophäe je Profil beim Erstclear · (.+)$/i,
      (m, tr) => `🏆 +${m[1]} trophy per profile on first clear · ${tr(m[2])}`],
    [/^🏆 \+(\d+) Trophäe je Profil pro erfolgreichem Clear · (.+)$/i,
      (m, tr) => `🏆 +${m[1]} trophy per profile per successful clear · ${tr(m[2])}`],
    [/^Erstclear bereits abgeschlossen · (.+)$/i,
      (m, tr) => `First clear already completed · ${tr(m[1])}`],
    [/^\+(\d+) XP je Profil beim Erstclear$/i,
      m => `+${m[1]} XP per profile on first clear`],
    [/^\+(\d+) XP je Profil bei Wiederholung$/i,
      m => `+${m[1]} XP per profile on a replay`],
    [/^\+(\d+) XP beim Erstclear$/i, m => `+${m[1]} XP on first clear`],
    [/^\+(\d+) XP bei Wiederholung$/i, m => `+${m[1]} XP on a replay`],
    [/^erster eigener Gegner-Kill oder ≤(\d+) HP – was zuerst passiert\.$/i,
      m => `your first own opponent kill or ≤${m[1]} HP – whichever comes first.`],
    [/^(.+) wird beiden Spielern zusätzlich gestellt\.$/i,
      (m, tr) => `${tr(m[1])} is additionally provided to both players.`],
    [/^(.+) wird allen drei Spielern zusätzlich gestellt\.$/i,
      (m, tr) => `${tr(m[1])} is additionally provided to all three players.`],
    [/^(.+) wird zusätzlich zu deiner Hauptfähigkeit gestellt\.$/i,
      (m, tr) => `${tr(m[1])} is provided in addition to your main ability.`],
    [/^(.+) ist fest vorgegeben\.$/i,
      (m, tr) => `${tr(m[1])} is fixed.`],
    [/^(.+) startet fest als 2\. Fähigkeit; erster eigener Kill ODER ≤(\d+) HP öffnet danach den nächsten freien Draft\.$/i,
      (m, tr) => `${tr(m[1])} always starts as the 2nd ability; your first own kill OR ≤${m[2]} HP then opens the next free draft.`],
    [/^Boss-Phase bei (\d+) %:$/i, m => `Boss phase at ${m[1]}%:`],
    [/^Boss-Phase bei (\d+) ?%$/i, m => `Boss phase at ${m[1]}%`],
    [/^(\d+) · (.+)$/, (m, tr) => `${m[1]} · ${tr(m[2])}`],
    [/^🔒 Nach (.+)$/i, (m, tr) => `🔒 After ${tr(m[1])}`],
    [/^Duo-Welt (\d+) · (.+)$/i, m => `Duo World ${m[1]} · ${m[2]}`],
    [/^Trio-Welt (\d+) · (.+)$/i, m => `Trio World ${m[1]} · ${m[2]}`],
    [/^(\d+) gegen (\d+) · (.+)$/i, (m, tr) => `${m[1]} vs ${m[2]} · ${tr(m[3])}`],

    /* Loadout- und Vergabezeilen. Sie stehen als ein langer Textknoten da
       und laufen deshalb nie in die Wort-fuer-Wort-Ersetzung; ohne diese
       Muster blieben die Faehigkeitsnamen deutsch ("P1 Zweite Chance").
       tr() uebersetzt jeden Namen einzeln ueber die exakten Eintraege. */
    [/^P(\d)(:?) (.+?) · P(\d)\2 (.+?) · P(\d)\2 (.+)$/,
      (m, tr) => `P${m[1]}${m[2]} ${tr(m[3])} · P${m[4]}${m[2]} ${tr(m[5])} · P${m[6]}${m[2]} ${tr(m[7])}`],
    [/^P(\d)(:?) (.+?) · P(\d)\2 (.+)$/,
      (m, tr) => `P${m[1]}${m[2]} ${tr(m[3])} · P${m[4]}${m[2]} ${tr(m[5])}`]
  );
})();
