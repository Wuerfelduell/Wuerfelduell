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

  /* ---- Encounter-Beschreibungen ----
     Der laengste Block, und der einzige mit echtem Erzaehlton. Deshalb
     exakt und nicht Wort fuer Wort: eine halb uebersetzte Beschreibung
     liest sich schlechter als eine ganz deutsche, und der Fallback in
     js/00-i18n.js wuerde sie ohnehin durch einen neutralen Satz
     ersetzen. Fehlt hier ein Encounter, faellt genau dieser Satz ein -
     sichtbar, aber nie halbdeutsch. */
  Object.assign(pack.exact, {
    /* Welt 1 · House Circuit */
    "Ein sauberer Einstieg gegen einen leichten Gegner. Du spielst diesen Encounter ausschließlich mit Glückswurf; weitere Fähigkeits-Drafts sind deaktiviert.":
      "A clean start against an easy opponent. You play this encounter with Lucky Roll only; further ability drafts are disabled.",
    "Sie spielt aggressiver. Zeig, dass du nicht nur auf Sicherheit würfelst.":
      "She plays more aggressively. Show that you do not only roll for safety.",
    "Mehr Druck, härtere Entscheidungen. Ein einzelner starker Zug ist jetzt Pflicht.":
      "More pressure, harder decisions. A single strong turn is required now.",
    "Der Dealer bezahlt für bessere Treffer mit seinem eigenen Blut. Gewinne, ohne dich komplett zerlegen zu lassen.":
      "The Dealer pays for better hits with his own blood. Win without letting yourself be torn apart.",
    "Nach dem House wartet kein Urlaub. Der Schlangenzüchter lebt von chaotischen Basiswürfen – du sollst dagegen möglichst sauber spielen.":
      "There is no holiday after the House. The Snake Breeder thrives on chaotic base rolls – you are meant to play as cleanly as possible against him.",
    "Der Spiegel übernimmt exakt deine gewählte Hauptfähigkeit. Deine stärkste Option kann damit plötzlich gegen dich arbeiten.":
      "The Mirror copies exactly the main ability you picked. Your strongest option can suddenly work against you.",
    "Zwei abgestimmte Gegner: Einer baut Momentum auf, der andere bestraft exakt zwei Treffer. Du bist wieder allein.":
      "Two opponents in sync: one builds momentum, the other punishes exactly two hits. You are on your own again.",
    "Der Leech startet mit mehr Leben und heilt sich über seinen verursachten Schaden zurück. Lange Kämpfe spielen ihm in die Hände.":
      "The Leech starts with more HP and heals himself back through the damage he deals. Long battles play into his hands.",
    "Der Pit Boss hat 40 HP, Counterattack und High Stakes. Große Treffer können ihn beenden – oder sofort einen brutalen Gegenschlag auslösen.":
      "The Pit Boss has 40 HP, Counterattack and High Stakes. Big hits can finish him – or trigger a brutal counterattack right away.",
    "Der Collector lebt von langen Kämpfen: 30 HP, Lifesteal und Rache. Diesmal reicht Überleben nicht – du musst selbst Leben zurückholen.":
      "The Collector thrives on long battles: 30 HP, lifesteal and Revenge. Surviving is not enough this time – you have to win HP back yourself.",
    "Präzision plus Loaded Dice macht jeden kleinen Fehler teuer. Spiele kontrolliert und bezahle nicht dauernd mit deinem eigenen Leben.":
      "Precision plus Loaded Dice makes every small mistake expensive. Play in control and do not keep paying with your own HP.",
    "Wildcard und Gambling Man machen seine Angriffe schwer lesbar. Du musst selbst offensiv bleiben, ohne am Ende zerlegt dazustehen.":
      "Wildcard and Gambling Man make his attacks hard to read. You have to stay offensive yourself without ending up in pieces.",
    "Drei kleinere Gegner teilen sich den Tisch. Jeder hat nur 15 HP, aber Momentum, Double Tap und Insurance erzeugen konstanten Druck.":
      "Three smaller opponents share the table. Each has only 15 HP, but Momentum, Double Tap and Insurance create constant pressure.",
    "Der King spielt mit Präzision und Wildcard, sein Ace mit Brutalen Einsen und Underdog. Royal Flush bleibt nach dem Clear offen: Jeder weitere erfolgreiche Sieg bringt erneut eine Prestige-Trophäe.":
      "The King plays with Precision and Wildcard, his Ace with Brutal Ones and Underdog. Royal Flush stays open after the clear: every further win brings another prestige trophy.",

    /* Welt 2 · Rift Circuit */
    "Hinter Black Table öffnet sich ein zweiter Pfad. Der Gatekeeper drückt früh auf 1er-Angriffe und bestraft vorsichtiges Spiel.":
      "A second path opens behind Black Table. The Gatekeeper pushes attacks on 1s early and punishes cautious play.",
    "Broker und Loader bezahlen beide Leben für bessere Würfe. Du darfst dich von ihrem Tempo nicht zum selben Fehler zwingen lassen.":
      "Broker and Loader both pay HP for better rolls. Do not let their pace force you into the same mistake.",
    "Gambling Man und Wildcard machen seine Angriffszahl unberechenbar. Ein großer eigener Zug ist der sicherste Weg durch das Chaos.":
      "Gambling Man and Wildcard make his attack number unpredictable. One big turn of your own is the safest way through the chaos.",
    "Drei kleinere Gegner teilen den Tisch. Der Kampf ist gebaut, um Mehrziel-Schaden und saubere Zielwahl zu belohnen.":
      "Three smaller opponents share the table. The fight is built to reward multi-target damage and clean target selection.",
    "Der Rift King heilt über doppelte Sechser und verweigert einmal den Tod. Echo eröffnet Angriffe schon bei 25 und wird stärker, sobald Blut geflossen ist.":
      "The Rift King heals through double sixes and refuses death once. Echo opens attacks as early as 25 and grows stronger once blood has been drawn.",
    "The Coil zwingt dich in einen längeren, kontrollierten Kampf. Diesmal zählt nicht nur der Sieg: Du musst Snake Eyes wirklich zum Einsatz bringen. Der Clear schaltet die letzte reguläre Hauptfähigkeit frei und aktiviert Prestige.":
      "The Coil forces you into a longer, controlled fight. The win alone does not count this time: you have to actually put Snake Eyes to work. The clear unlocks the last regular main ability and activates prestige.",
    "Der Fixer manipuliert seine Würfe und bestraft Zögern. Ab hier werden Siege zu Prestige-Trophäen, sobald alle regulären Hauptfähigkeiten freigeschaltet sind.":
      "The Fixer manipulates his rolls and punishes hesitation. From here on wins turn into prestige trophies once every regular main ability is unlocked.",
    "Der Red Broker macht aus Lebenspunkten Währung. Um ihn zu schlagen, musst du selbst mindestens einmal Blutpreis aktiv einsetzen.":
      "The Red Broker turns HP into currency. To beat him you have to actively use Blood Price at least once yourself.",
    "Der Croupier lebt vom Risiko. Ein bloßer Klick auf High Stakes reicht nicht: Mindestens ein Gamble muss mit 4–6 erfolgreich sein.":
      "The Croupier lives on risk. Merely clicking High Stakes is not enough: at least one gamble has to land on 4–6.",
    "Der Sovereign und sein Warden spielen maximal aggressiv. Für diesen Boss wählst du direkt beim Kampfbeginn deine Zweitfähigkeit aus dem normalen Kampagnen-Draft. Der Boss bleibt nach dem Clear farmbar. Sein erster erfolgreicher Clear schaltet zusätzlich Glück (BETA) für den Zweitfähigkeits-Pool frei.":
      "The Sovereign and his Warden play as aggressively as possible. For this boss you pick your second ability from the normal campaign draft right at the start of the battle. The boss stays farmable after the clear. Its first successful clear additionally unlocks Luck (BETA) for the second-ability pool.",
    "Der Hex Dealer lässt dir kaum saubere Würfe. Gewinne, nachdem du Glückswurf bewusst mindestens einmal eingesetzt hast.":
      "The Hex Dealer barely leaves you a clean roll. Win after deliberately using Lucky Roll at least once.",
    "Der Protocoler bestraft schlechte Angriffswürfe. Ein Sieg zählt nur, wenn du Zweite Chance aktiv in einem Angriff verwendest.":
      "The Protocoler punishes bad attack rolls. A win only counts if you actively use Second Chance in an attack.",
    "Der Executioner soll dich einmal wirklich an den Rand bringen. Last Stand muss auslösen – und danach musst du den Kampf trotzdem noch drehen.":
      "The Executioner is meant to push you right to the edge once. Last Stand has to trigger – and you still have to turn the fight around afterwards.",
    "Broker Prime und the Gambler kombinieren Blutpreis und High Stakes. Wähle eine der beiden Fähigkeiten als Hauptfähigkeit; die jeweils andere wird dir für diesen Encounter als dritte Fähigkeit bereitgestellt.":
      "Broker Prime and the Gambler combine Blood Price and High Stakes. Pick one of the two as your main ability; the other one is provided as a third ability for this encounter.",
    "Eclipse und Shard sind der Abschluss des Rift Circuit. Du startest mit 40 HP und wählst direkt zu Kampfbeginn deine 2. Fähigkeit. Dein erster eigener Kill oder ≤15 HP kann die 3. Fähigkeit schon vorher freischalten; spätestens RIFT COLLAPSE bietet sie an, falls der Slot noch frei ist. Der Boss hält 58 HP und kann Last Stand auslösen; Shard setzt dich mit Double Tap und Wildcard unter Druck.":
      "Eclipse and Shard close out the Rift Circuit. You start with 40 HP and pick your 2nd ability right at the start of the battle. Your first own kill or ≤15 HP can unlock the 3rd ability earlier; RIFT COLLAPSE offers it at the latest, if the slot is still free. The boss holds 58 HP and can trigger Last Stand; Shard pressures you with Double Tap and Wildcard.",

    /* Welt 3 · Zero Circuit */
    "Der Tollkeeper blockt jeden sicheren Weg. Hier zählt kontrolliertes Risiko: Du musst bewusst Leben als Ressource akzeptieren, statt nur möglichst sauber durchzukommen.":
      "The Tollkeeper blocks every safe route. Controlled risk is what counts here: you have to accept HP as a resource on purpose instead of just getting through cleanly.",
    "Threefold singt nur in Paschen. Ein einzelner Snake-Eyes-Trigger reicht hier nicht mehr – du musst die Fähigkeit zweimal wirklich zum Arbeiten bringen.":
      "Threefold only sings in matching sets. A single Snake Eyes trigger is no longer enough – you have to make the ability work twice.",
    "Debt Collector und Auditor bestrafen passives Spiel. Für den Clear musst du selbst tief genug in die Tasche greifen – egal ob über Loaded Dice oder Blutpreis.":
      "Debt Collector and Auditor punish passive play. To clear it you have to dig deep enough yourself – whether through Loaded Dice or Blood Price.",
    "Echo Six gewinnt lange Kämpfe über kleine Heilimpulse. Du musst dieselbe Mechanik zweimal auslösen: zwei Würfe mit mindestens zwei Sechsern.":
      "Echo Six wins long fights through small healing pulses. You have to trigger the same mechanic twice: two rolls with at least two sixes.",
    "Architect Zero interessiert sich nicht für Chip-Damage. Irgendwann in diesem Kampf muss ein Angriff mit allen fünf Würfeln als Treffern enden.":
      "Architect Zero has no interest in chip damage. At some point in this fight one attack has to end with all five dice as hits.",
    "Der Beacon verstärkt die Formation. Wenn du blind den nächsten Gegner angreifst, wird der Kampf unnötig lang. Schalte das markierte Ziel zuerst aus.":
      "The Beacon strengthens the formation. Attacking the nearest opponent blindly makes the fight needlessly long. Take out the marked target first.",
    "Drei Wächter teilen dieselbe Barriere. Bevor du nur einen fokussierst, musst du allen drei mindestens einmal echten Rohschaden zufügen.":
      "Three wardens share the same barrier. Before focusing just one, you have to deal real raw damage to all three at least once.",
    "Der Purist deaktiviert nichts – aber die Challenge tut es. Passive Fähigkeiten sind erlaubt; aktive Knöpfe sollen unangetastet bleiben.":
      "The Purist disables nothing – but the challenge does. Passive abilities are allowed; active buttons are to stay untouched.",
    "Breaker prüft deinen Gegenangriff mit Präzision, aber ohne den früheren Double-Tap-Burst. Überlebe seinen Druck und löse Counterattack mindestens einmal tatsächlich aus.":
      "Breaker tests your counterattack with Precision, but without the earlier Double Tap burst. Survive his pressure and actually trigger Counterattack at least once.",
    "The Alibi zwingt dich auf die schmale Linie zwischen Sicherheit und Angriff. Perfect 25 muss einen Angriff tatsächlich freigeben.":
      "The Alibi forces you onto the narrow line between safety and attack. Perfect 25 has to actually release an attack.",
    "Surgeon Null bestraft Nulltreffer-Würfe. Präzision soll nicht nur ausgerüstet sein – sie muss zwei fehlgeschlagene Angriffswürfe retten.":
      "Surgeon Null punishes zero-hit rolls. Precision is not meant to just sit equipped – it has to rescue two failed attack rolls.",
    "Twin Trigger zählt nur saubere Paare. Zwei verschiedene Angriffe müssen jeweils mit exakt zwei Treffern enden und den Double-Tap-Bonus aktivieren.":
      "Twin Trigger only counts clean pairs. Two different attacks each have to end with exactly two hits and activate the Double Tap bonus.",
    "Blood Rush wird dir für diesen Encounter direkt als 2. Fähigkeit gestellt. Dein erster eigener Gegner-Kill ODER ≤15 HP löst den Bonus-Draft für eine 3. Fähigkeit aus – was zuerst passiert. Nutze Blood Rush zweimal in echten Angriffen.":
      "Blood Rush is provided directly as your 2nd ability for this encounter. Your first own opponent kill OR ≤15 HP triggers the bonus draft for a 3rd ability – whichever comes first. Use Blood Rush twice in real attacks.",
    "Drei Offiziere schützen sich gegenseitig. Du startest mit 30 HP. Die einzige gültige Eliminationsfolge lautet Key → Lock → Crown; auch ein Gegner, der sich selbst ausschaltet, zählt an seiner Position. Nach jeder Eliminierung bekommst du sofort eine neue Fähigkeitswahl, bis du maximal 3 Fähigkeiten besitzt.":
      "Three officers protect each other. You start with 30 HP. The only valid elimination order is Key → Lock → Crown; an opponent who takes themselves out also counts in their position. After each elimination you immediately get a new ability choice, up to a maximum of 3 abilities.",
    "Der Regent versteckt sich hinter Warden und Proxy. Du startest mit 30 HP und direkt mit zwei Fähigkeiten. Der globale Kill/≤15-HP-Bonus und danach weitere Gegner-Kills bauen dein Loadout bis auf maximal 4 Fähigkeiten aus. Die Zusatz-Challenge ist bewusst simpel: überlebe den Fight.":
      "The Regent hides behind Warden and Proxy. You start with 30 HP and two abilities right away. The global kill/≤15 HP bonus and further opponent kills after it build your loadout up to a maximum of 4 abilities. The extra challenge is deliberately simple: survive the fight.",

    /* Welt 4 · Abyss Circuit */
    "Der Ferryman akzeptiert keinen kostenlosen Durchgang. Zero verlangte sechs Punkte Eigenschaden; der Abyss will zweistelliges Risiko.":
      "The Ferryman accepts no free passage. Zero asked for six points of self-damage; the Abyss wants double-digit risk.",
    "Der Crowned Coil gibt dir genug Zeit für einen echten Mastery-Check. Zwei Trigger waren Training – diesmal werden drei verlangt.":
      "The Crowned Coil gives you enough time for a real mastery check. Two triggers were training – three are asked for this time.",
    "Der Ledger zählt nur Zahlungen, die du selbst autorisierst. Loaded Dice und Blutpreis werden hier zur gefährlichen Investition.":
      "The Ledger only counts payments you authorize yourself. Loaded Dice and Blood Price turn into a dangerous investment here.",
    "Die Balance-Waage verlangt erst den exakten Basiswurf und danach einen echten Angriff. Ein bloßer Perfect-25-Trigger reicht nicht.":
      "The Balance demands the exact base roll first and a real attack afterwards. A mere Perfect 25 trigger is not enough.",
    "Der Surgeon aus Zero war nur die Vorlesung. Im Abyss muss Präzision drei Nulltreffer-Würfe retten.":
      "The Surgeon from Zero was only the lecture. In the Abyss, Precision has to rescue three zero-hit rolls.",
    "Der Hemomancer will, dass du tief gehst und wieder hochkommst. Schaden allein oder Heilung allein genügt nicht.":
      "The Hemomancer wants you to go deep and come back up. Damage alone or healing alone is not enough.",
    "Vier Wächter dürfen nicht ignoriert werden. Die Zielwahl ist hier die eigentliche Mechanik: Jeder Gegner muss echten Rohschaden abbekommen.":
      "Four wardens cannot be ignored. Target selection is the actual mechanic here: every opponent has to take real raw damage.",
    "Der Reaper soll Last Stand wirklich brechen – danach musst du dich wieder stabilisieren. Die Challenge prüft den Comeback-Build statt Restleben am Ende.":
      "The Reaper is meant to genuinely break Last Stand – after that you have to stabilize again. The challenge tests the comeback build rather than your HP at the end.",
    "Der Pit Oracle duldet kein einmaliges Glück. Zwei High-Stakes-Gambles müssen mit 4–6 durchgehen.":
      "The Pit Oracle tolerates no one-off luck. Two High Stakes gambles have to land on 4–6.",
    "Exakt zwei Treffer sind hier kein Zufall, sondern Pflichtprogramm. Drei verschiedene Angriffe müssen den Double-Tap-Bonus auslösen.":
      "Exactly two hits are no accident here, they are the required routine. Three different attacks have to trigger the Double Tap bonus.",
    "Die Bellguard schlägt hart genug, um Counterattack zu füttern. Du musst drei echte Gegenschläge überleben und auslösen.":
      "The Bellguard hits hard enough to feed Counterattack. You have to survive and trigger three real counterattacks.",
    "Keine aktiven Tricks, aber trotzdem keine Tunnelvision. Passive Fähigkeiten sind erlaubt; drei Ziele müssen Schaden erhalten.":
      "No active tricks, but no tunnel vision either. Passive abilities are allowed; three targets have to take damage.",
    "Die Maschine läuft nur auf Doppel-Sechsen. Vier Trigger der Fähigkeit 12 sind ein echter Langzeit-Würfeltest.":
      "The machine only runs on double sixes. Four triggers of ability 12 are a real long-run dice test.",
    "Die vier Schlüssel öffnen das Tor nur in einer Reihenfolge. Zielwahl und Finisher müssen perfekt koordiniert sein.":
      "The four keys only open the gate in one order. Target selection and finishers have to be perfectly coordinated.",
    "Der Abyss King wartet hinter drei Exarchen. Der finale Clear verlangt drei Dinge: den King bis zuletzt stehen lassen, zweistelligen Eigenschaden akzeptieren und den normalen Kampagnen-Bonus-Draft wirklich auslösen.":
      "The Abyss King waits behind three exarchs. The final clear asks for three things: leave the King standing until last, accept double-digit self-damage and actually trigger the normal campaign bonus draft.",

    /* Welt 5 · Paradox Circuit */
    "Paradox beginnt mit Zielwahl statt Schadensrennen. Deine ersten drei eigenen Angriffe müssen drei verschiedene Wächter in einer festgelegten Reihenfolge treffen.":
      "Paradox begins with target selection instead of a damage race. Your first three attacks have to hit three different wardens in a set order.",
    "Der Switchboard bestraft Tunnelvision. Du darfst natürlich wieder auf alte Ziele zurückkehren – aber du musst während des Encounters mehrfach bewusst umschalten.":
      "The Switchboard punishes tunnel vision. You may of course return to earlier targets – but you have to switch deliberately several times during the encounter.",
    "Vier Sigils müssen zuerst alle aktiviert werden. Der erste Kill darf erst passieren, nachdem jeder Gegner mindestens einmal Rohschaden bekommen hat.":
      "All four sigils have to be activated first. The first kill may only happen after every opponent has taken raw damage at least once.",
    "Die Schlange verlangt nicht nur Würfelglück. Du musst Snake Eyes mehrfach erzeugen und trotzdem genug Risiko nehmen, um dir selbst spürbaren Schaden einzuhandeln.":
      "The serpent asks for more than dice luck. You have to produce Snake Eyes several times and still take enough risk to do noticeable damage to yourself.",
    "Ein Perfect-25-Versuch reicht nicht; der Erfolg muss in einen längeren offensiven Kampf eingebettet sein.":
      "One Perfect 25 attempt is not enough; the success has to sit inside a longer offensive fight.",
    "Der Auditor schlägt hart. Nutze den Druck aktiv: mehrere Counterattacks reichen nicht, du musst daneben selbst offensiv genug bleiben und normale Angriffe starten.":
      "The Auditor hits hard. Use the pressure actively: several counterattacks are not enough, you also have to stay offensive yourself and start normal attacks.",
    "Loaded Dice ist stark, aber Paradox will keine Blutorgie. Nutze es mehrfach und halte deinen gesamten selbst verursachten Schaden trotzdem niedrig.":
      "Loaded Dice is strong, but Paradox does not want a bloodbath. Use it several times and still keep your total self-damage low.",
    "Der Croupier zwingt lange Gambles. Zwei erfolgreiche High-Stakes-Würfe müssen mit bewusst akzeptiertem Eigenschaden kombiniert werden.":
      "The Croupier forces long gambles. Two successful High Stakes rolls have to be combined with deliberately accepted self-damage.",
    "Präzision soll nicht einfach auf ein einziges Ziel gespammt werden. Zwei Einsätze und Schaden an drei verschiedenen Gegnern sind Pflicht.":
      "Precision is not meant to be spammed onto a single target. Two uses and damage on three different opponents are required.",
    "Blutpreis gibt dir Kontrolle über Trefferzahlen. Beweise sie nicht nur gegen einen Sack HP, sondern verteilt über mehrere Ziele.":
      "Blood Price gives you control over hit counts. Prove it across several targets, not just against one sack of HP.",
    "Zweite Chance soll hier nicht nur einen schlechten Wurf retten. Du musst die Fähigkeit wiederholt nutzen und den Kampf offensiv am Laufen halten.":
      "Second Chance is not just meant to rescue one bad roll here. You have to use the ability repeatedly and keep the fight offensively alive.",
    "Drei Double-Tap-Auslösungen reichen nur, wenn du sie nicht als Tunnel-Combo spielst. Der Matrixkern verlangt mehrere Zielwechsel.":
      "Three Double Tap triggers only count if you do not play them as a tunnel combo. The matrix core demands several target switches.",
    "Doppel-Sechsen halten dich am Leben; ein Grande beendet die Gleichung. Beides muss im selben Encounter passieren.":
      "Double sixes keep you alive; a Grande ends the equation. Both have to happen in the same encounter.",
    "Last Stand ist nicht das Ziel, sondern der Wendepunkt. Nach dem Trigger musst du den Fight weiter aktiv spielen und mehrere Angriffe zustande bringen.":
      "Last Stand is not the goal, it is the turning point. After the trigger you have to keep playing the fight actively and land several attacks.",
    "Vier Zeitfragmente schützen die Crown. Du musst zuerst jeden Gegner markieren; erst danach darf der erste fallen. Anschließend gilt eine exakte Kill-Zeitlinie bis zum Boss.":
      "Four time fragments protect the Crown. You have to mark every opponent first; only then may the first one fall. After that an exact kill timeline applies up to the boss.",

    /* Duo-Welt 1 · Covenant */
    "Der erste Duo-Test. Zwei Gegner mit überschaubarem Druck – aber beide Spieler müssen den Kampf lebend beenden.":
      "The first duo test. Two opponents with manageable pressure – but both players have to finish the fight alive.",
    "Drei kleinere Gegner verteilen konstant Druck. Ein Spieler allein kann den Clear schaffen, aber für die Challenge müssen beide aktiv angreifen.":
      "Three smaller opponents spread constant pressure. One player alone can manage the clear, but for the challenge both have to attack actively.",
    "Leech und Broker wollen den Kampf lang ziehen. Mindestens einer von euch sollte bewusst auf Heilung spielen.":
      "Leech and Broker want to drag the fight out. At least one of you should deliberately play for healing.",
    "Dieser Encounter zwingt beide Spieler zu einem starken eigenen Zug. Einer kann den anderen retten – aber die Challenge verlangt Leistung von beiden.":
      "This encounter forces a strong turn out of both players. One can rescue the other – but the challenge asks for output from both.",
    "Die Serpent Twins spiegeln eure Würfelbilder. Für den Clear müssen beide Spieler Snake Eyes mindestens einmal selbst auslösen.":
      "The Serpent Twins mirror your dice patterns. For the clear both players have to trigger Snake Eyes at least once themselves.",
    "Der Pact zählt nur, wenn ihr wirklich etwas riskiert. Eigenschaden beider Spieler wird zusammengezählt.":
      "The Pact only counts if you actually risk something. The self-damage of both players is added up.",
    "Drei Gegner verlangen echte Koordination. Jeder von euch muss im Verlauf des Encounters mindestens zwei verschiedene Gegner aktiv als Angriffsziel wählen.":
      "Three opponents demand real coordination. Over the course of the encounter each of you has to actively pick at least two different opponents as an attack target.",
    "Die Hammers liefern genug Druck, um Counterattack zu füttern. Beide Spieler starten hier mit 35 HP; jeder muss seinen eigenen Gegenschlag auslösen.":
      "The Hammers deliver enough pressure to feed Counterattack. Both players start with 35 HP here; each has to trigger their own counterattack.",
    "Die Nulltwins wollen eure Angriffswürfe auslaufen lassen. Beide Spieler müssen Zweite Chance mindestens einmal wirklich einsetzen.":
      "The Null Twins want your attack rolls to run dry. Both players have to genuinely use Second Chance at least once.",
    "Vier kleinere Gegner sind ein Staffelstab. Die ersten zwei Eliminierungen müssen von unterschiedlichen Duo-Spielern kommen.":
      "Four smaller opponents are a relay baton. The first two eliminations have to come from different duo players.",
    "Twin Snakes war die Einführung. Jetzt zählt nur Teamgesamtleistung: drei echte Snake-Eyes-Einsätze, egal wie ihr sie verteilt.":
      "Twin Snakes was the introduction. Only the team total counts now: three genuine Snake Eyes uses, however you split them.",
    "Drei Elites teilen sich die Arena. Zielwahl und Timing entscheiden, damit nicht ein Spieler versehentlich alle Finisher einsammelt.":
      "Three elites share the arena. Target selection and timing decide whether one player accidentally collects every finisher.",
    "Beide Spieler müssen ihren normalen Kampagnen-Bonus-Draft auslösen – durch den ersten eigenen Gegner-Kill oder durch ≤15 HP – und am Ende trotzdem gemeinsam stehen.":
      "Both players have to trigger their normal campaign bonus draft – through their first own opponent kill or through ≤15 HP – and still be standing together at the end.",
    "Drei Gegner, aber ihr dürft euch nicht in getrennte Duelle aufteilen. Mindestens zwei Gegner müssen von beiden Spielern aktiv angegriffen worden sein.":
      "Three opponents, but you may not split into separate duels. At least two opponents have to have been actively attacked by both players.",

    /* Duo-Welt 2 · Fracture Pact */
    "Fracture beginnt nicht mit Teamgesamtwerten. Beide Spieler müssen selbst Risiko nehmen; einer kann die Challenge nicht für den anderen bezahlen.":
      "Fracture does not start with team totals. Both players have to take risk themselves; one cannot pay the challenge for the other.",
    "Die alte Twin-Snakes-Prüfung kehrt härter zurück. Diesmal braucht jeder von euch zwei echte Snake-Eyes-Einsätze.":
      "The old Twin Snakes trial returns harder. This time each of you needs two genuine Snake Eyes uses.",
    "Ein Spieler mit Glück reicht dem House nicht. Jeder von euch braucht mindestens einen erfolgreichen 4–6-High-Stakes-Wurf.":
      "One lucky player is not enough for the House. Each of you needs at least one successful 4–6 High Stakes roll.",
    "Teamheilung kann sonst von einem Lifesteal-Carry erledigt werden. Fracture verlangt Sustain von beiden Spielern einzeln.":
      "Team healing can otherwise be handled by a lifesteal carry. Fracture demands sustain from both players individually.",
    "Nicht Teamgesamt, sondern zwei getrennte Rechnungen: Beide Spieler müssen Fähigkeiten aktiv mit ihrem eigenen Leben bezahlen.":
      "Not a team total but two separate accounts: both players have to pay for abilities actively with their own HP.",
    "Zwei Executioner drücken euch beide an die Kante. Der Clear zählt nur, wenn Last Stand bei jedem Spieler tatsächlich auslöst.":
      "Two Executioners push both of you to the edge. The clear only counts if Last Stand actually triggers for each player.",
    "Counter Pair war die Einführung. Jetzt muss jeder Spieler zweimal selbst zurückschlagen.":
      "Counter Pair was the introduction. Now each player has to strike back twice themselves.",
    "Vier Ziele bilden eine Staffel. Die ersten vier Eliminierungen müssen ohne doppelten Finisher desselben Spielers abwechseln.":
      "Four targets form a relay. The first four eliminations have to alternate without the same player finishing twice.",
    "Beide müssen ohne aktive Ability-Buttons spielen und trotzdem breit genug angreifen. Passive Builds und Zielwahl werden wichtiger.":
      "Both have to play without active ability buttons and still attack widely enough. Passive builds and target selection matter more.",
    "Schmerz muss bei beiden Spielern in Tempo umgewandelt werden. Jeder braucht zwei echte Blood-Rush-Angriffe.":
      "Both players have to convert pain into pace. Each needs two genuine Blood Rush attacks.",
    "Vier saubere Paar-Angriffe sind nötig: jeweils zwei Double-Tap-Trigger von jedem Duo-Spieler.":
      "Four clean paired attacks are needed: two Double Tap triggers from each duo player.",
    "Beide Spieler müssen schlechte Angriffswürfe aktiv retten. Zwei Einsätze pro Kopf – kein Carry möglich.":
      "Both players have to actively rescue bad attack rolls. Two uses each – no carry possible.",
    "Der Monarch verlangt von beiden den normalen Kampagnen-Bonus-Draft. Er kann durch den ersten eigenen Gegner-Kill oder durch ≤15 HP ausgelöst werden – aber nur einer darf den Kampf lebend beenden und den Clutch setzen.":
      "The Monarch demands the normal campaign bonus draft from both. It can be triggered through your first own opponent kill or through ≤15 HP – but only one of you may finish the fight alive and land the clutch.",

    /* Duo-Welt 3 · Mirror Pact */
    "Mirror Pact startet mit einer neuen Teammechanik: Ein Spieler eröffnet auf ein Ziel, der andere übernimmt direkt dasselbe Ziel im nächsten eigenen Angriff.":
      "Mirror Pact starts with a new team mechanic: one player opens on a target, the other takes over that same target in their next attack.",
    "Nicht nur Kills, sondern das Angriffstempo selbst muss geteilt werden. Die ersten sechs Duo-Angriffe dürfen nie zweimal hintereinander vom selben Spieler kommen.":
      "Not only kills but the pace of attacking itself has to be shared. The first six duo attacks may never come from the same player twice in a row.",
    "Getrennte Duelle sind verboten. Jeder von euch muss alle drei Gegner persönlich als Angriffsziel gehabt haben.":
      "Separate duels are forbidden. Each of you has to have personally had all three opponents as an attack target.",
    "Fracture verlangte zwei. Mirror erhöht die echte Würfelprüfung: Beide Spieler brauchen drei Snake-Eyes-Einsätze.":
      "Fracture asked for two. Mirror raises the real dice trial: both players need three Snake Eyes uses.",
    "Beide Spieler müssen nicht nur gambeln, sondern jeweils zwei erfolgreiche 4–6-Ergebnisse liefern.":
      "Both players have to do more than gamble: each has to deliver two successful 4–6 results.",
    "Die Hammer Mirrors erzeugen genug Druck für echte Gegenschlagketten. Jeder Spieler muss dreimal selbst zurückschlagen.":
      "The Hammer Mirrors create enough pressure for real counterattack chains. Each player has to strike back three times themselves.",
    "Jeder muss seinen eigenen Sustain erzeugen. Ein einzelner Heiler kann die Challenge nicht carrien.":
      "Everyone has to produce their own sustain. A single healer cannot carry the challenge.",
    "Vier Gegner stehen auf dem Feld, aber drei davon müssen nachweislich von beiden Spielern angegriffen worden sein.":
      "Four opponents are on the field, but three of them have to be provably attacked by both players.",
    "Fünf kleine Ziele machen den Kill-Relay länger als je zuvor. Kein Spieler darf zwei aufeinanderfolgende Finisher setzen.":
      "Five small targets make the kill relay longer than ever. No player may land two consecutive finishers.",
    "Die Zielwahl wird zur Rollenverteilung: Spieler 1 muss Anchor beenden, Spieler 2 muss Reflection beenden.":
      "Target selection turns into role distribution: player 1 has to finish Anchor, player 2 has to finish Reflection.",
    "Ihr dürft die Leibwachen zuerst töten, aber der Mirror Crown muss von beiden Spielern mindestens einmal bewusst angegriffen worden sein und am Ende zuletzt fallen.":
      "You may kill the bodyguards first, but Mirror Crown has to have been deliberately attacked by both players at least once and fall last in the end.",
    "Nicht einfach alternieren: Vier Ziele müssen in einem exakten Spieler-Muster fallen.":
      "Not simply alternating: four targets have to fall in an exact player pattern.",
    "Beide müssen ihren normalen Bonus-Draft durch eigenen Kill oder ≤15 HP auslösen; gleichzeitig dürfen die ersten vier Teamangriffe nicht aus dem Rhythmus geraten.":
      "Both have to trigger their normal bonus draft through their own kill or ≤15 HP; at the same time the first four team attacks may not fall out of rhythm.",
    "Das Heart wird von zwei Shards gespiegelt. Der Boss muss zuletzt fallen; bis dahin müsst ihr mehrfach dasselbe Ziel direkt aneinander übergeben und beide einen Finisher setzen.":
      "The Heart is mirrored by two Shards. The boss has to fall last; until then you have to hand the same target straight to each other several times and both land a finisher.",

    /* Duo-Welt 4 · Omega Pact */
    "Omega beginnt mit einer langen Rhythmuskette. Acht aufeinanderfolgende Teamangriffe müssen sauber zwischen euch wechseln.":
      "Omega begins with a long rhythm chain. Eight consecutive team attacks have to alternate cleanly between you.",
    "Ihr müsst Ziele gemeinsam übernehmen, dürft euch aber trotzdem nicht auf einen einzigen Gegner einschießen.":
      "You have to take over targets together, but still may not lock onto a single opponent.",
    "Fracture verlangte zwei Rettungen. Omega verlangt drei von jedem Spieler.":
      "Fracture asked for two rescues. Omega asks for three from each player.",
    "Sechs saubere Paar-Angriffe insgesamt: drei pro Spieler.":
      "Six clean paired attacks in total: three per player.",
    "Beide Spieler müssen Schaden oder freiwillige Kosten dreimal in echte Blood-Rush-Angriffe umwandeln.":
      "Both players have to convert damage or voluntary costs into genuine Blood Rush attacks three times.",
    "Zum ersten Mal verlangt eine Duo-Prüfung denselben seltenen Perfect-25-Erfolg von beiden Spielern.":
      "For the first time a duo trial asks for the same rare Perfect 25 success from both players.",
    "Beide Spieler müssen ihre Treffer selbst chirurgisch korrigieren.":
      "Both players have to correct their own hits surgically.",
    "Doppel-Sechsen müssen bei beiden Spielern mehrfach auftauchen. Ein Würfelmonster kann den anderen nicht carrien.":
      "Double sixes have to show up several times for both players. One dice monster cannot carry the other.",
    "Vier Gegner, acht persönliche Markierungen: Jeder Spieler muss jeden Gegner mindestens einmal aktiv angreifen.":
      "Four opponents, eight personal marks: each player has to actively attack every opponent at least once.",
    "Vier Wächter sind paarweise zugeordnet. Ihr müsst eure Finisher-Rollen exakt erfüllen.":
      "Four wardens are assigned in pairs. You have to fulfil your finisher roles exactly.",
    "Fünf Finisher folgen diesmal keinem einfachen Wechsel, sondern einer vorgegebenen Rollenfolge.":
      "This time five finishers follow no simple alternation but a prescribed role order.",
    "Ein GRANDE ist stark. Omega verlangt einen von jedem Spieler im selben Encounter.":
      "One GRANDE is strong. Omega asks for one from each player in the same encounter.",
    "Bevor ihr die Wachen abräumt, muss der Omega Crown bereits von beiden persönlich angegriffen worden sein. Danach darf er trotzdem erst zuletzt sterben.":
      "Before you clear the guards, Omega Crown has to have been personally attacked by both of you. Even so, it may only die last.",
    "Der letzte Vorboss ist eine reine Übergabeprüfung. Ihr müsst sechs Mal ein Ziel direkt an den Partner weiterreichen.":
      "The last sub-boss is a pure handover trial. You have to pass a target straight to your partner six times.",
    "Der Omega Sovereign steht hinter drei Thrones. Für den Clear braucht jeder einen GRANDE, die drei Throne müssen in alternierenden Finishern fallen und der Sovereign darf erst ganz am Ende sterben.":
      "The Omega Sovereign stands behind three Thrones. For the clear each of you needs a GRANDE, the three Thrones have to fall to alternating finishers and the Sovereign may only die at the very end.",

    /* Trio-Welt 1 · Trinity Protocol */
    "Drei kleine Gegner, drei echte Spieler. Niemand darf sich vom Team tragen lassen: Jeder muss selbst einen Angriff landen und am Ende soll das komplette Trio noch stehen.":
      "Three small opponents, three real players. Nobody gets carried by the team: everyone has to land an attack themselves and the whole trio should still be standing at the end.",
    "Jeder Spieler erhält zusätzlich eine andere Einsatz-Fähigkeit: Blutpreis, Loaded Dice und High Stakes. Das Team muss wirklich drei verschiedene Fähigkeiten benutzen; Casino Floor sorgt dabei für kontrolliertes Chaos.":
      "Each player additionally receives a different staking ability: Blood Price, Loaded Dice and High Stakes. The team really has to use three different abilities; Casino Floor supplies the controlled chaos.",
    "Der Tisch will Rhythmus. Die ersten drei tatsächlichen Trio-Angriffe müssen sauber von Spieler 1, dann Spieler 2, dann Spieler 3 kommen. First Strike macht jeden gelungenen Staffelstab spürbar.":
      "The table wants rhythm. The first three actual trio attacks have to come cleanly from player 1, then player 2, then player 3. First Strike makes every successful handover felt.",
    "Ihr bekommt Blutpreis, Lifesteal und Loaded Dice als zusätzliche Werkzeuge. Bezahlt bewusst Leben und holt es euch mit Blood Moon wieder zurück, während drei Gegner weiter Druck machen.":
      "You get Blood Price, Lifesteal and Loaded Dice as extra tools. Pay HP deliberately and win it back with Blood Moon while three opponents keep the pressure on.",
    "Drei Bailiffs schützen den Trinity Judge. P1 spielt Zweite Chance + Counterattack, P2 Blutpreis + Blood Rush und P3 Loaded Dice + Double Tap. Die ersten drei Kills gehören der Reihe nach euch drei; der Judge fällt zuletzt.":
      "Three Bailiffs protect the Trinity Judge. P1 plays Second Chance + Counterattack, P2 Blood Price + Blood Rush and P3 Loaded Dice + Double Tap. The first three kills belong to the three of you in order; the Judge falls last.",
    "Vier Konten, drei Spieler. Jeder muss mindestens zwei verschiedene Gegner selbst markieren, aber mindestens ein Ziel muss wirklich von allen drei bearbeitet werden. Armor Shell bestraft stumpfes Eröffnungsfeuer.":
      "Four accounts, three players. Everyone has to mark at least two different opponents themselves, but at least one target has to be worked on by all three. Armor Shell punishes blunt opening fire.",
    "Alle drei erhalten Lifesteal als zusätzliche Fähigkeit. Blood Moon verstärkt echte Heilungen, aber die Aufgabe lässt keinen Heiler-Carry zu: Jeder Spieler muss selbst Leben zurückgewinnen.":
      "All three receive Lifesteal as an extra ability. Blood Moon amplifies real healing, but the challenge allows no healer carry: every player has to win HP back themselves.",
    "Ein Ziel soll immer wieder von einem anderen Spieler übernommen werden. Fünf echte Fokus-Pässe sind Pflicht; gleichzeitig muss jeder mindestens zwei eigene Angriffe gestartet haben.":
      "One target is meant to be taken over by a different player again and again. Five genuine focus passes are required; at the same time everyone has to have started at least two attacks of their own.",
    "Keine komplizierte Reihenfolge, kein Carry: Es stehen exakt drei harte Ziele am Tisch und jeder Spieler muss persönlich mindestens einen Kill setzen.":
      "No complicated order, no carry: exactly three hard targets stand at the table and every player has to land at least one kill personally.",
    "Drei Heads schützen den Cerberus Core. Jeder startet mit seiner gewählten Fähigkeit plus einer zufälligen Zweitfähigkeit. Die 3. Fähigkeit kommt über den normalen Kill- oder ≤15-HP-Trigger. Jeder muss den Core markieren und selbst finishen; der Core fällt zuletzt.":
      "Three Heads protect the Cerberus Core. Everyone starts with their chosen ability plus a random second ability. The 3rd ability comes through the normal kill or ≤15 HP trigger. Everyone has to mark the Core and finish themselves; the Core falls last.",
    "P1 und P3 bekommen Blutpreis, P2 Loaded Dice. Jeder muss selbst mindestens 3 HP freiwillig bezahlen, aber am Ende sollen trotzdem alle drei noch leben. Blood Moon macht Recovery-Builds wertvoll.":
      "P1 and P3 get Blood Price, P2 gets Loaded Dice. Everyone has to voluntarily pay at least 3 HP themselves, yet all three should still be alive at the end. Blood Moon makes recovery builds valuable.",
    "Vier Targets hängen an derselben Matrix. Bevor der erste Gegner fällt, muss das Team alle vier mindestens einmal beschädigt haben. Zusätzlich muss jeder Spieler selbst mindestens zwei verschiedene Ziele angreifen.":
      "Four targets are linked to the same matrix. Before the first opponent falls, the team has to have damaged all four at least once. On top of that every player has to attack at least two different targets themselves.",
    "Alle drei erhalten Counterattack als zusätzliche Fähigkeit. Die Gegner schlagen hart genug zurück; jeder Spieler muss mindestens einen eigenen Gegenschlag tatsächlich auslösen.":
      "All three receive Counterattack as an extra ability. The opponents hit back hard enough; every player has to actually trigger at least one counterattack of their own.",
    "Der letzte Vorraum verlangt von allen drei Spielern ihren normalen Kampagnen-Bonus-Draft. Er kommt durch den ersten eigenen Gegner-Kill oder durch ≤15 HP – was zuerst passiert – während die ersten sechs Helden-Angriffe ohne Doppelzug desselben Spielers alternieren.":
      "The last antechamber demands the normal campaign bonus draft from all three players. It comes through their first own opponent kill or through ≤15 HP – whichever comes first – while the first six hero attacks alternate without the same player going twice.",
    "Die Singularity steht hinter drei Seals. Jeder Spieler erhält eine andere zusätzliche Endgame-Fähigkeit. Alle drei müssen den Boss persönlich markieren, jeder braucht mindestens einen Kill und die Singularity fällt zuletzt. In Phase II kippt der Tisch in Overcharge.":
      "The Singularity stands behind three Seals. Each player receives a different extra endgame ability. All three have to mark the boss personally, everyone needs at least one kill and the Singularity falls last. In phase II the table tips into Overcharge.",

    /* Trio-Welt 2 · Helix Protocol */
    "Helix beginnt nicht freundlich. Drei echte Gegner, etwas mehr HP, und die Challenge bleibt klar: Jeder greift an, niemand darf fallen.":
      "Helix does not begin kindly. Three real opponents, a little more HP, and the challenge stays plain: everyone attacks, nobody may fall.",
    "Keine Team-Summe. Blutpreis und Loaded Dice liegen bereit, Blood Tax macht jede Zahlung teurer. Jeder Spieler muss seine eigene Rechnung von 4 HP begleichen.":
      "No team total. Blood Price and Loaded Dice are ready, Blood Tax makes every payment more expensive. Every player has to settle their own bill of 4 HP.",
    "Ein Ziel soll wandern. Drei echte Fokus-Pässe, und jeder muss selbst mindestens zweimal angreifen – kein Zuschauen.":
      "One target is meant to travel. Three genuine focus passes, and everyone has to attack at least twice themselves – no spectating.",
    "Vier Konten. Armor Shell bestraft den ersten Schlag. Jeder muss zwei verschiedene Ziele wählen, mindestens eines davon wirklich zu dritt.":
      "Four accounts. Armor Shell punishes the first strike. Everyone has to pick two different targets, at least one of them worked on by all three.",
    "Zwei Wardens halten den Judge. Jeder braucht einen eigenen Kill, und Helix Judge darf erst fallen, wenn die Wardens weg sind.":
      "Two Wardens hold the Judge. Everyone needs a kill of their own, and Helix Judge may only fall once the Wardens are gone.",
    "Alle drei bekommen Counterattack. Die Gegner hauen hart genug, dass jeder seinen eigenen Gegenschlag wirklich auslösen muss.":
      "All three get Counterattack. The opponents hit hard enough that everyone genuinely has to trigger their own counterattack.",
    "Blutpreis, Lifesteal, Loaded Dice. Blood Moon hilft, aber Carry ist verboten: Jeder bezahlt 3 HP selbst und holt sich mindestens 4 HP selbst zurück.":
      "Blood Price, Lifesteal, Loaded Dice. Blood Moon helps, but carrying is forbidden: everyone pays 3 HP themselves and wins at least 4 HP back themselves.",
    "First Strike belohnt den Staffelstab. Die ersten sechs Helden-Angriffe dürfen nie zweimal hintereinander vom selben Spieler kommen.":
      "First Strike rewards the handover. The first six hero attacks may never come from the same player twice in a row.",
    "Drei harte Marken. Jeder muss mindestens zwei verschiedene Ziele angreifen und persönlich mindestens einen Kill setzen.":
      "Three hard marks. Everyone has to attack at least two different targets and land at least one kill personally.",
    "Drei Heads schützen das Hydra Heart. Jeder startet mit seiner gewählten Fähigkeit plus einer zufälligen Zweitfähigkeit. Die 3. Fähigkeit kommt über den normalen Kill- oder ≤15-HP-Trigger. Alle drei müssen das Heart markieren, jeder braucht einen eigenen Finisher, und das Heart fällt zuletzt. Phase II zieht Casino Floor auf den Tisch.":
      "Three Heads protect the Hydra Heart. Everyone starts with their chosen ability plus a random second ability. The 3rd ability comes through the normal kill or ≤15 HP trigger. All three have to mark the Heart, everyone needs a finisher of their own, and the Heart falls last. Phase II pulls Casino Floor onto the table.",
    "Void Clock tickt. Alle drei müssen ihren normalen Bonus-Draft (eigener Kill oder ≤15 HP) auslösen und trotzdem gemeinsam stehen bleiben.":
      "Void Clock is ticking. All three have to trigger their normal bonus draft (own kill or ≤15 HP) and still be left standing together.",
    "Ihr müsst dasselbe Ziel oft weiterreichen, dürft euch aber nicht auf einen Gegner versteifen. Sechs Fokus-Pässe, zwei verschiedene Ziele pro Spieler.":
      "You have to pass the same target on often, but may not fixate on one opponent. Six focus passes, two different targets per player.",
    "Zweite Chance, Counterattack und Double Tap liegen zusätzlich auf dem Tisch. Als Team müsst ihr mindestens vier verschiedene Fähigkeiten wirklich benutzen.":
      "Second Chance, Counterattack and Double Tap are additionally on the table. As a team you have to genuinely use at least four different abilities.",
    "Letzter Vorraum: Alle drei lösen den Bonus-Draft aus, die ersten sechs Angriffe alternieren, und jeder setzt selbst einen Kill.":
      "Last antechamber: all three trigger the bonus draft, the first six attacks alternate, and everyone lands a kill themselves.",
    "Die Apex steht hinter drei Seals. Jeder bekommt eine andere zusätzliche Endgame-Fähigkeit. Alle drei müssen die Apex markieren, jeder braucht einen Kill, drei Fokus-Pässe sind Pflicht, und die Apex fällt zuletzt. Phase II kippt in Overcharge.":
      "The Apex stands behind three Seals. Everyone gets a different extra endgame ability. All three have to mark the Apex, everyone needs a kill, three focus passes are required, and the Apex falls last. Phase II tips into Overcharge."
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
  Object.assign(pack.exact, {
    "Klingenfokus":"Blade Focus","Verschnaufpause":"Respite","Regeneration":"Regeneration","Eröffnungsschlag":"Opening Strike","Blutdurst":"Bloodthirst","Trophäenjäger":"Trophy Hunter",
    "Alle eigenen Hauptangriffe verursachen dauerhaft +1 Schaden pro Stapel.":"All of your main attacks permanently deal +1 damage per stack.",
    "Heilt diesen Spieler sofort um 12 HP. Kann erneut gewählt werden.":"Immediately heals this player for 12 HP. Can be chosen again.",
    "Heilt diesen Spieler jetzt und nach jedem weiteren Boss um 5 HP pro Stapel.":"Heals this player now and after each later boss for 5 HP per stack.",
    "Der erste erfolgreiche eigene Hauptangriff jedes Bosses erhält +3 Schaden pro Stapel.":"Your first successful main attack against each boss gains +3 damage per stack.",
    "Jeder erfolgreiche eigene Hauptangriff heilt 2 HP pro Stapel.":"Each successful main attack heals 2 HP per stack.",
    "Jeder eigene Gegner-Kill heilt diesen Spieler um 4 HP pro Stapel.":"Each enemy kill by this player heals them for 4 HP per stack.",
    "Fortlaufender Duo-Gruppenkampf":"Continuous duo group battle","Fortlaufender Duo-Bosskampf":"Continuous duo boss battle",
    "Einmalig · bleibt bis Rush-Ende":"One-time · remains until the rush ends","Sofort-Effekt":"Immediate effect","Noch kein Stapel":"No stacks yet",
    "Keine Run-Belohnungen":"No run rewards","3. Fähigkeit":"3rd ability","BOSS RUSH GESCHAFFT!":"BOSS RUSH COMPLETE!","BOSS RUSH GESCHEITERT":"BOSS RUSH FAILED","ESKALATION II":"ESCALATION II",
    "Zur Duo-Kampagne":"Back to Duo Campaign","Boss Rush abgeschlossen":"Boss Rush complete","Boss Rush beendet":"Boss Rush ended",
    "Zwei verschiedene Duo-Profile wählen":"Select two different duo profiles","Duo-Kampagne zuerst freischalten":"Unlock Duo Campaign first",
    "10 Bossstufen · wechselnde Loadouts · Build-Drafts nach jeder Stufe":"10 boss stages · changing loadouts · build drafts after every stage","Boss XP · zwei Profile wählen":"Boss XP · select two profiles",
    "Der nächste Boss konnte nicht gestartet werden.":"The next boss could not be started.",
    "Rush-Belohnungen und zusätzliche Fähigkeiten sind nur für diesen Lauf gültig und werden beim Verlassen entfernt.":"Rush rewards and additional abilities apply only to this run and are removed when leaving.",
    "Kampagnenfortschritt, Mastery XP und Trophäen bleiben unverändert.":"Campaign progress, Mastery XP, and trophies remain unchanged.",
    "Phase 1":"Phase I","Phase 2":"Phase II","Phase 3":"Phase III","Nächster Übergang":"Next transition","Finalphase aktiv":"Final phase active","PHASENWECHSEL":"PHASE SHIFT"
  });
  pack.patterns.push(
    [/^(.+) wechselt das Loadout auf (.+) und heilt (\d+) HP\.$/, m=>`${m[1]} changes its loadout to ${m[2]} and heals ${m[3]} HP.`],
    [/^Besiegt (.+)\. Gegnerfähigkeiten wechseln bei jedem neuen Run; Spieler-HP, Rush-Fähigkeiten und Belohnungen werden übernommen\.$/, m=>`Defeat ${m[1]}. Enemy abilities change with every new run; player HP, rush abilities, and rewards carry over.`],
    [/^Besiegt (.+)\.$/, m=>`Defeat ${m[1]}.`],
    [/^Boss Rush (\d+)\/(\d+) · (.+) · (\d+) Boss XP je Profil$/, m=>`Boss Rush ${m[1]}/${m[2]} · ${m[3]} · ${m[4]} Boss XP per profile`],
    [/^BOSS (\d+) \/ (\d+) BESIEGT · \+(\d+) BOSS XP$/, m=>`BOSS ${m[1]} / ${m[2]} DEFEATED · +${m[3]} BOSS XP`],
    [/^Belohnung für (.+)$/, m=>`Reward for ${m[1]}`],
    [/^Spieler (\d+) von (\d+) · (\d+) HP · Run: (\d+) Boss XP je Profil · Wähle 1 von 3\.$/, m=>`Player ${m[1]} of ${m[2]} · ${m[3]} HP · Run: ${m[4]} Boss XP per profile · Choose 1 of 3.`],
    [/^Bereits (\d+)× gewählt$/, m=>`Already chosen ${m[1]}×`],[/^Aktuell (\d+) Stapel$/, m=>`Currently ${m[1]} stacks`],
    [/^Setzt die 3\. Fähigkeit für die nächsten Stufen\. (.+)$/, m=>`Sets the 3rd ability for the next stages. ${m[1]}`],
    [/^Boss (\d+) besiegt$/, m=>`Boss ${m[1]} defeated`],[/^\+(\d+) Boss XP je Profil · Belohnungen wählen$/, m=>`+${m[1]} Boss XP per profile · choose rewards`],
    [/^Spieler (\d+)$/, m=>`Player ${m[1]}`],[/^Duo-Spieler · (\d+) HP · Boss XP gesamt (\d+)$/, m=>`Duo player · ${m[1]} HP · total Boss XP ${m[2]}`],
    [/^Alle (\d+) Bossstufen wurden besiegt\.$/, m=>`All ${m[1]} boss stages were defeated.`],[/^Run abgeschlossen: (\d+) \/ (\d+) · \+(\d+) Boss XP je Profil$/, m=>`Run complete: ${m[1]} / ${m[2]} · +${m[3]} Boss XP per profile`],
    [/^Euer Team ist bei Boss (\d+) gefallen\.$/, m=>`Your team fell at boss ${m[1]}.`],[/^Besiegt: (\d+) \/ (\d+) · \+(\d+) Boss XP je Profil behalten$/, m=>`Defeated: ${m[1]} / ${m[2]} · keep +${m[3]} Boss XP per profile`]
  );
  /* V28.9 endgame campaign source-of-truth. Content files only carry their
     German source strings; every player-facing English counterpart lives here. */
  Object.assign(pack.exact,
{
  "Füge mindestens 2 verschiedenen Gegnern Schaden zu und gewinne.": "Damage at least 2 different enemies and win.",
  "Heile mindestens 6 HP und gewinne.": "Heal at least 6 HP and win.",
  "Benutze Snake Eyes mindestens 2-mal und gewinne.": "Use Snake Eyes at least 2 times and win.",
  "Gewinne mit mindestens 9 HP Restleben.": "Win with at least 9 HP remaining.",
  "Füge mindestens 3 verschiedenen Gegnern Schaden zu und gewinne.": "Damage at least 3 different enemies and win.",
  "Nimm mindestens 7 selbst verursachten Schaden und gewinne.": "Take at least 7 self-inflicted damage and win.",
  "Benutze Counterattack mindestens 2-mal und gewinne.": "Use Counterattack at least 2 times and win.",
  "Astral Oracle muss als letzter Gegner fallen.": "Astral Oracle must be the last enemy defeated.",
  "Verursache mindestens 14 Schaden in einem eigenen Zug.": "Deal at least 14 damage in one of your turns.",
  "Beende einen Angriff mit 5 Treffern und gewinne.": "Finish an attack with 5 hits and win.",
  "Füge mindestens 4 verschiedenen Gegnern Schaden zu und gewinne.": "Damage at least 4 different enemies and win.",
  "Benutze Last Stand mindestens 1-mal und gewinne.": "Use Last Stand at least 1 time and win.",
  "Gewinne mit mindestens 7 HP Restleben.": "Win with at least 7 HP remaining.",
  "Verursache mindestens 15 Schaden in einem eigenen Zug.": "Deal at least 15 damage in one of your turns.",
  "Verursache 15 Schaden in einem Zug UND greife alle 3 Gegner an.": "Deal 15 damage in one turn AND attack all 3 enemies.",
  "Astral Emperor muss als letzter Gegner fallen.": "Astral Emperor must be the last enemy defeated.",
  "Gewinne den Kampf.": "Win the battle.",
  "Nimm mindestens 8 selbst verursachten Schaden und gewinne.": "Take at least 8 self-inflicted damage and win.",
  "Void Judge muss als letzter Gegner fallen.": "Void Judge must be the last enemy defeated.",
  "Heile mindestens 8 HP und gewinne.": "Heal at least 8 HP and win.",
  "Verursache mindestens 16 Schaden in einem eigenen Zug.": "Deal at least 16 damage in one of your turns.",
  "Gewinne ohne einen aktiven Ability-Button zu benutzen.": "Win without using an active ability button.",
  "Gewinne mit mindestens 8 HP Restleben.": "Win with at least 8 HP remaining.",
  "Gewinne mit mindestens 6 HP Restleben.": "Win with at least 6 HP remaining.",
  "Verursache 16 Schaden in einem Zug UND gewinne mit 6 HP.": "Deal 16 damage in one turn AND win with 6 HP.",
  "Void Queen muss als letzter Gegner fallen.": "Void Queen must be the last enemy defeated.",
  "Welt 6 · Astral Circuit": "World 6 · Astral Circuit",
  "15 Endgame-Encounter über Zielpriorität, Würfelkontrolle und kosmische Elite-Duos.": "15 endgame encounters about target priority, dice control and cosmic elite duos.",
  "🔒 Nach Paradox Crown": "🔒 After Paradox Crown",
  "Kontrollierter Auftakt": "Controlled opening",
  "Zwei Wächter testen Zielwahl statt bloßer Ausdauer.": "Two wardens test target priority rather than raw endurance.",
  "Sustain unter Druck": "Sustain under pressure",
  "Der Moon Leech verlängert den Kampf, während ein schneller Begleiter Druck aufbaut.": "The Moon Leech extends the fight while a fast companion builds pressure.",
  "Pflichttechnik · Snake Eyes": "Required technique · Snake Eyes",
  "Eine lange, faire Würfelprüfung mit automatisch gestellter Challenge-Fähigkeit.": "A long but fair dice test with the required challenge ability supplied automatically.",
  "Glaskanonen zuerst": "Glass cannons first",
  "Drei fragile Angreifer belohnen frühe Finisher und saubere Prioritäten.": "Three fragile attackers reward early finishes and clean priorities.",
  "Mini-Boss · Zielwechsel": "Mini-boss · target switching",
  "Der Keeper schützt zwei gefährliche Satelliten; alle Ziele müssen bewusst markiert werden.": "The Keeper protects two dangerous satellites; every target must be marked deliberately.",
  "Risiko gegen Tempo": "Risk versus tempo",
  "Blut wird zur Ressource, doch der Kampf bietet genug Zeit für kontrollierte Entscheidungen.": "Blood becomes a resource, but the fight leaves room for controlled decisions.",
  "Counterattack-Prüfung": "Counterattack test",
  "Hohe Angriffszahlen füttern Gegenschläge, ohne den Spieler schutzlos zu überrollen.": "High attack numbers feed counters without leaving the player helpless.",
  "Ausführungsroute": "Execution route",
  "Unterschiedliche Rollen verlangen, dass der gefährliche Oracle zuletzt isoliert wird.": "Distinct roles require the dangerous Oracle to be isolated and defeated last.",
  "Difficulty Spike": "Difficulty spike",
  "Ein Elite-Paar kombiniert Heilung und Frontloaded Damage; Fokusfeuer entscheidet.": "An elite pair combines healing and front-loaded damage; focus fire decides.",
  "Fünf Treffer": "Five hits",
  "Der Zenith Wall prüft einen vollständigen Trefferangriff statt riesiger Lebenspunkte.": "The Zenith Wall tests a complete hit attack instead of inflated health.",
  "Vier Ziele · klare Rollen": "Four targets · clear roles",
  "Kleine Spezialisten erzeugen Battlefield-Druck ohne visuelles Chaos.": "Small specialists create battlefield pressure without visual chaos.",
  "Last Stand": "Last Stand",
  "Kontrollierter niedriger HP-Bereich trifft auf einen einzelnen aggressiven Elitegegner.": "A controlled low-health state meets one aggressive elite enemy.",
  "Spezialisten-Duo": "Specialist duo",
  "Würfelmanipulation und Bluttempo greifen ineinander, bleiben aber durch Zielwahl konterbar.": "Dice manipulation and blood tempo interlock but remain answerable through target priority.",
  "Boss-Vorhut": "Boss vanguard",
  "Drei asymmetrische Wächter bilden den härtesten normalen Kampf der Welt.": "Three asymmetric wardens form the world's hardest normal battle.",
  "Weltboss · Emperor + Comet": "World boss · Emperor + Comet",
  "Der Emperor wechselt bei halben HP sein Loadout; sein Add erzwingt eine frühe Prioritätsentscheidung.": "The Emperor changes loadout at half health; his add forces an early priority decision.",
  "Welt 7 · Void Circuit": "World 7 · Void Circuit",
  "15 finale Solo-Prüfungen mit präzisen Finisher-Routen, kontrollierten Clutches und asymmetrischen Gegnerrollen.": "15 final solo trials with precise finisher routes, controlled clutches and asymmetric enemy roles.",
  "🔒 Nach Astral Emperor": "🔒 After Astral Emperor",
  "Der Void beginnt mit einem einzelnen präzisen Gegner.": "The Void opens with one precise enemy.",
  "Zwei Steuereintreiber verlangen kontrollierten Eigenschaden.": "Two collectors demand controlled self-damage.",
  "Snake Eyes stabilisiert ein chaotisches Echo.": "Snake Eyes stabilizes a chaotic echo.",
  "Drei kleine Hounds belohnen geplante Finisher.": "Three small Hounds reward planned finishers.",
  "Ein defensiver Mini-Boss schützt einen Support.": "A defensive mini-boss protects a support.",
  "Heilung muss gegen aggressiven Blutdruck bestehen.": "Healing must withstand aggressive blood pressure.",
  "Zwei gegensätzliche Rollen bestrafen falsche Priorität.": "Two opposing roles punish poor priority.",
  "Vier fragile Ziele testen saubere Finisher.": "Four fragile targets test clean finishes.",
  "Ein Elite-Paar markiert den ersten großen Spike.": "An elite pair marks the first major spike.",
  "Ein passiver Kampf verlangt Schaden ohne hektische Tricks.": "A passive fight demands damage without frantic tricks.",
  "Der Harvester verlängert den Kampf mit Lifesteal.": "The Harvester extends the fight through lifesteal.",
  "Last Stand macht den kontrollierten Clutch möglich.": "Last Stand enables a controlled clutch.",
  "Drei Supports erzeugen wachsenden Druck.": "Three supports create rising pressure.",
  "Die Vorhut kombiniert Counter und Würfelkontrolle.": "The vanguard combines counters and dice control.",
  "Weltboss · Queen + Anchor": "World boss · Queen + Anchor",
  "Die Void Queen eskaliert bei halben HP und ihr Anchor muss zuerst fallen.": "The Void Queen escalates at half health and her Anchor must fall first.",
  "Mindestens 1 Gegner müssen von allen Spielern angegriffen werden.": "At least 1 enemies must be attacked by every player.",
  "Umbra Sentinel muss als letzter Gegner fallen.": "Umbra Sentinel must be the last enemy defeated.",
  "Die ersten 5 Team-Angriffe müssen zwischen den Spielern abwechseln.": "The first 5 team attacks must alternate between players.",
  "Jeder Spieler muss Snake Eyes mindestens 1-mal benutzen.": "Every player must use Snake Eyes at least 1 time.",
  "Mindestens 2 Gegner müssen von allen Spielern angegriffen werden.": "At least 2 enemies must be attacked by every player.",
  "Silent Commander muss als letzter Gegner fallen.": "Silent Commander must be the last enemy defeated.",
  "Jeder Spieler muss Counterattack mindestens 1-mal benutzen.": "Every player must use Counterattack at least 1 time.",
  "Jeder Spieler muss mindestens 2 verschiedene Gegner angreifen.": "Every player must attack at least 2 different enemies.",
  "Gewinnt und alle Spieler müssen überleben.": "Win with every player alive.",
  "Eclipse Marshal muss als letzter Gegner fallen.": "Eclipse Marshal must be the last enemy defeated.",
  "Verursacht als Team mindestens 58 Rohschaden.": "Deal at least 58 raw team damage.",
  "Greift gemeinsam 2 Ziele an UND beide Spieler müssen überleben.": "Attack 2 shared targets AND both players must survive.",
  "Eclipse Pact Sovereign muss als letzter Gegner fallen.": "Eclipse Pact Sovereign must be the last enemy defeated.",
  "Nimm mindestens 6 selbst verursachten Schaden und gewinne.": "Take at least 6 self-inflicted damage and win.",
  "Heilt als Team mindestens 8 HP und gewinnt.": "Heal at least 8 team HP and win.",
  "Jeder Spieler muss Blutpreis mindestens 1-mal benutzen.": "Every player must use Blutpreis at least 1 time.",
  "Verursacht als Team mindestens 52 Rohschaden.": "Deal at least 52 raw team damage.",
  "Jeder Spieler muss mindestens einmal angreifen und das Team muss gewinnen.": "Every player must attack at least once and the team must win.",
  "Heilt als Team mindestens 10 HP und gewinnt.": "Heal at least 10 team HP and win.",
  "Jeder Spieler muss mindestens einen Gegner eliminieren.": "Every player must defeat at least one enemy.",
  "Hemalurgic Matron muss als letzter Gegner fallen.": "Hemalurgic Matron must be the last enemy defeated.",
  "Verursacht als Team mindestens 60 Rohschaden.": "Deal at least 60 raw team damage.",
  "Verursacht 60 Rohschaden UND beide Spieler müssen überleben.": "Deal 60 raw damage AND both players must survive.",
  "Bloodmoon Pact Sovereign muss als letzter Gegner fallen.": "Bloodmoon Pact Sovereign must be the last enemy defeated.",
  "Die ersten 6 Team-Angriffe müssen zwischen den Spielern abwechseln.": "The first 6 team attacks must alternate between players.",
  "Heilt als Team mindestens 12 HP und gewinnt.": "Heal at least 12 team HP and win.",
  "Verursacht als Team mindestens 78 Rohschaden.": "Deal at least 78 raw team damage.",
  "Shattered Regent muss als letzter Gegner fallen.": "Shattered Regent must be the last enemy defeated.",
  "Greift alle 3 Gegner an UND alle Spieler müssen überleben.": "Attack all 3 enemies AND every player must survive.",
  "Prism Protocol Sovereign muss als letzter Gegner fallen.": "Prism Protocol Sovereign must be the last enemy defeated.",
  "Collapse Herald muss als letzter Gegner fallen.": "Collapse Herald must be the last enemy defeated.",
  "Verursacht als Team mindestens 80 Rohschaden.": "Deal at least 80 raw team damage.",
  "Verursacht als Team mindestens 82 Rohschaden.": "Deal at least 82 raw team damage.",
  "Verursacht 82 Rohschaden UND alle Spieler müssen überleben.": "Deal 82 raw damage AND every player must survive.",
  "Singularity Protocol Sovereign muss als letzter Gegner fallen.": "Singularity Protocol Sovereign must be the last enemy defeated.",
  "Duo-Welt 5 · Eclipse Pact": "Duo World 5 · Eclipse Pact",
  "15 koordinierte Endgame-Encounter über Zielpriorität, Supportlinien und kontrollierte Fokuswechsel.": "15 coordinated endgame encounters about target priority, support lines, and controlled focus switches.",
  "🔒 Nach Omega Throne": "🔒 After Omega Throne",
  "Geteiltes Ziel": "Shared target",
  "Ein Schildträger bindet Aufmerksamkeit, während die Klinge ungestört eskaliert.": "A shieldbearer draws attention while the blade escalates unchecked.",
  "Support zuerst": "Support first",
  "Die Veil-Sängerin stärkt ihren Beschützer; ein früher Fokuswechsel verhindert den langen Kampf.": "The Veil Cantor empowers her protector; an early focus switch prevents a long fight.",
  "Wechselangriff": "Alternating assault",
  "Zwei Assassinen bestrafen einseitige Zugfolgen und verlangen saubere Übergaben.": "Two assassins punish one-sided turn sequences and demand clean handoffs.",
  "Pflichttechnik": "Required technique",
  "Die verdunkelte Schlange lässt sich nur mit koordinierter Würfelkontrolle sicher lesen.": "The eclipsed serpent is safely read only through coordinated dice control.",
  "Mini-Boss · Fokus": "Mini-boss · focus",
  "Der Warden deckt seinen Oracle; beide Helden müssen das gleiche Fenster nutzen.": "The Warden covers his Oracle; both heroes must exploit the same opening.",
  "Eliminiere den Support": "Eliminate the support",
  "Ein stummer Kommandant wird durch seinen Herald stabilisiert, solange dieser lebt.": "A silent commander is stabilized by his Herald while it lives.",
  "Counter-Duett": "Counter duet",
  "Gegenschläge belohnen Geduld; beide Spieler müssen ihre Antwort zeigen.": "Counterattacks reward patience; both players must show their answer.",
  "Zielübergabe": "Target relay",
  "Drei fragile Spezialisten verlangen bewusst verteilte Angriffe statt Tunnelblick.": "Three fragile specialists demand deliberate split attacks instead of tunnel vision.",
  "Gejagtes Team": "Hunted team",
  "Die Jagd beginnt auf einem Helden; der Partner muss den offensiven Druck schnell brechen.": "The hunt begins on one hero; their partner must break the offensive pressure quickly.",
  "Mini-Boss · Schutzlinie": "Mini-boss · guard line",
  "Der Marshal schützt eine gefährliche Klinge und reagiert auf ihren Fall.": "The Marshal shields a dangerous blade and reacts when it falls.",
  "Breites Schlachtfeld": "Wide battlefield",
  "Tank, Finisher und Controller verlangen eine gemeinsam vereinbarte Reihenfolge.": "Tank, finisher, and controller demand an agreed kill order.",
  "Schadensfenster": "Damage window",
  "Eine gepanzerte Elite öffnet nur kurze Fenster für konzentrierten Teamschaden.": "An armored elite opens only brief windows for concentrated team damage.",
  "Überlebensprüfung": "Survival test",
  "Zwei komplementäre Eliten testen Fokus und defensive Aufgabenteilung.": "Two complementary elites test focus and defensive role sharing.",
  "Gemeinsamer Fokus": "Shared focus",
  "Drei Hofwächter dürfen nicht getrennt zu lange Druck aufbauen.": "Three court wardens cannot be allowed to build pressure separately for long.",
  "Weltboss · wechselnder Fokus": "World boss · shifting focus",
  "Der Sovereign wechselt zwischen Schutz und Jagd; sein Anchor kontrolliert das Angriffstempo.": "The Sovereign alternates between defense and pursuit; its Anchor controls attack tempo.",
  "Duo-Welt 6 · Bloodmoon Pact": "Duo World 6 · Bloodmoon Pact",
  "15 riskante Teamprüfungen über Blutkosten, Sustain und gezielte Eskalation.": "15 risky team trials about blood costs, sustain, and deliberate escalation.",
  "🔒 Nach Eclipse Sovereign": "🔒 After Eclipse Sovereign",
  "Kontrollierte Kosten": "Controlled cost",
  "Ein einzelner Blutritter macht freiwillige HP-Kosten zu einer frühen Risikoentscheidung.": "A lone blood knight turns voluntary HP costs into an early risk decision.",
  "Heiler und Finisher": "Healer and finisher",
  "Die Sängerin hält einen verwundeten Finisher am Leben; falscher Fokus verlängert sein stärkstes Fenster.": "The cantor sustains a wounded finisher; poor focus extends his strongest window.",
  "Blutpreis für beide": "Blood Price for both",
  "Beide Helden müssen den Preis zahlen, ohne den gemeinsamen Lebensvorrat zu überziehen.": "Both heroes must pay the price without exhausting the shared life reserve.",
  "Sustain-Rennen": "Sustain race",
  "Zwei Vampire heilen durch Treffer und bestrafen unkoordinierten Streuschaden.": "Two vampires heal through hits and punish uncoordinated chip damage.",
  "Mini-Boss · Heilfenster": "Mini-boss · healing window",
  "Der Keeper eskaliert unter niedrigen HP; rechtzeitige Heilung hält beide Rollen im Spiel.": "The Keeper escalates at low HP; timely healing keeps both roles active.",
  "Risiko gegen Counter": "Risk versus counter",
  "Blutkosten verstärken den Angriff, doch der Wächter wartet auf überhastete Würfe.": "Blood costs empower attacks, but the warden waits for reckless rolls.",
  "Heilkoordination": "Healing coordination",
  "Ein Controller stört das Tempo, während der Leech verlorene HP zurückholt.": "A controller disrupts tempo while the Leech recovers lost HP.",
  "Geteiltes Risiko": "Shared risk",
  "Drei leichte Gegner belohnen frühe Kills, aber jeder Treffer füttert das Bluttempo.": "Three light enemies reward early kills, but every hit feeds the blood tempo.",
  "Eskalation": "Escalation",
  "Der Hunger wächst über gegnerische Züge; defensive Schleifen werden zunehmend teuer.": "Hunger grows across enemy turns; defensive loops become increasingly costly.",
  "Mini-Boss · Blutkreislauf": "Mini-boss · blood cycle",
  "Die Matron heilt durch Treffer und ihr Wächter rächt den gefallenen Partner.": "The Matron heals through hits and her guard avenges a fallen partner.",
  "Niedrige HP": "Low HP",
  "Ein Berserker ist am gefährlichsten kurz vor seinem Fall; beendet das Fenster gemeinsam.": "A berserker is most dangerous near defeat; close the window together.",
  "Counter und Blut": "Counter and blood",
  "Der Spiegel kontert große Würfe, während sein Partner eigene HP in Tempo tauscht.": "The mirror counters large rolls while its partner trades HP for tempo.",
  "Elite-Konvergenz": "Elite convergence",
  "Drei Rollen erzeugen einen späten Druckgipfel ohne aufgeblähte Einzel-HP.": "Three roles create a late pressure peak without inflated individual HP.",
  "Vor dem Thron": "Before the throne",
  "Heiler und Finisher müssen in einer klaren Reihenfolge getrennt werden.": "Healer and finisher must be separated in a clear order.",
  "Weltboss · Blutphasen": "World boss · blood phases",
  "Die Empress wechselt von Sustain zu aggressivem Last Stand; ihr Siphon stabilisiert die Mittelphase.": "The Empress shifts from sustain to aggressive Last Stand; her Siphon stabilizes the middle phase.",
  "Trio-Welt 3 · Prism Protocol": "Trio World 3 · Prism Protocol",
  "15 taktische Schlachtfelder mit drei Rollen, gemeinsamem Fokus und Ability-Koordination.": "15 tactical battlefields with three roles, shared focus, and ability coordination.",
  "🔒 Nach Helix Apex": "🔒 After Helix Apex",
  "Drei Rollen": "Three roles",
  "Guard, Striker und Scribe führen sofort in kontrolliertes Battlefield-Management ein.": "Guard, striker, and scribe immediately introduce controlled battlefield management.",
  "Gemeinsames Ziel": "Shared target",
  "Das Trio muss denselben Kern treffen, ohne die flankierenden Rollen zu ignorieren.": "The trio must strike the same core without ignoring the flanking roles.",
  "Zugfolge": "Turn order",
  "Drei Assassinen bestrafen doppelte Aktionen desselben Spielers in der Eröffnung.": "Three assassins punish repeated actions by the same player in the opening.",
  "Ability-Rollen": "Ability roles",
  "Snake Eyes synchronisiert die instabilen Würfel aller drei Helden.": "Snake Eyes synchronizes the unstable dice of all three heroes.",
  "Mini-Boss · Supportkern": "Mini-boss · support core",
  "Der Curator schützt zwei Spezialisten; alle drei Helden brauchen ein gemeinsames Ziel.": "The Curator protects two specialists; all three heroes need a shared target.",
  "Kill-Verteilung": "Distributed kills",
  "Drei fragile Splitter belohnen geplante Finisher jedes Teammitglieds.": "Three fragile shards reward planned finishers by every team member.",
  "Gemeinsame Antwort": "Shared answer",
  "Breite Angriffe treffen auf ein Counter-Paar; jeder Held muss die Technik beherrschen.": "Wide attacks meet a counter pair; every hero must master the technique.",
  "Heilfenster": "Healing window",
  "Support und Controller verlängern das Feld, bis das Trio seine Heilfenster koordiniert.": "Support and controller extend the field until the trio coordinates its healing windows.",
  "Markierter Held": "Marked hero",
  "Der markierte Held trägt den Druck, während zwei Partner die Hunters brechen.": "The marked hero carries the pressure while two partners break the hunters.",
  "Mini-Boss · Zielnetz": "Mini-boss · target web",
  "Der Knight reagiert auf fallende Adds; breite Zielabdeckung verhindert sein Schneeballtempo.": "The Knight reacts to falling adds; broad target coverage prevents its snowball tempo.",
  "Fokus-Peak": "Focus peak",
  "Drei ungleiche Rollen testen, ob das Trio sein Hauptziel wirklich teilt.": "Three unequal roles test whether the trio truly shares its main target.",
  "Damage-Prüfung": "Damage test",
  "Eine einzelne gepanzerte Elite fordert gebündelte Ability- und Angriffszüge.": "A single armored elite demands concentrated ability and attack turns.",
  "Rollenwechsel": "Role shift",
  "Beim Fall eines Supports wird sein Partner aggressiver; die Kill-Reihenfolge ist entscheidend.": "When a support falls its partner turns aggressive; kill order is decisive.",
  "Drei Eliten bilden eine kompakte Generalprobe für Zielwahl und Überleben.": "Three elites form a compact rehearsal for targeting and survival.",
  "Weltboss · Phasenwechsel": "World boss · phase shift",
  "Der Archon wechselt von Counter-Schutz zu offensiver Würfelkontrolle; sein Lens-Add lenkt den Fokus.": "The Archon shifts from counter defense to offensive dice control; its Lens add diverts focus.",
  "Trio-Welt 4 · Singularity Protocol": "Trio World 4 · Singularity Protocol",
  "15 finale Teamkämpfe über Markierung, Eskalation und asymmetrisches Battlefield-Management.": "15 final team battles about marking, escalation, and asymmetric battlefield management.",
  "🔒 Nach Prism Archon": "🔒 After Prism Archon",
  "Gebündelter Auftakt": "Concentrated opening",
  "Ein schwerer Controller zieht den Fokus auf sich, während ein kleiner Finisher lauert.": "A heavy controller draws focus while a small finisher waits.",
  "Ziel unter Druck": "Target under pressure",
  "Ein Held startet markiert; das Trio muss den Schaden über Rollen auffangen.": "One hero starts marked; the trio must absorb pressure across roles.",
  "Breite Kontrolle": "Broad control",
  "Drei Satelliten verlangen unterschiedliche Prioritäten statt eines festen Eröffnungsmusters.": "Three satellites demand different priorities instead of a fixed opening pattern.",
  "Instabile Würfel": "Unstable dice",
  "Koordinierte Ability-Nutzung stabilisiert eine einzelne, gefährliche Anomalie.": "Coordinated ability use stabilizes a single dangerous anomaly.",
  "Mini-Boss · Jagd": "Mini-boss · hunt",
  "Der Keeper markiert verwundbare Helden und schützt seinen aggressiven Add.": "The Keeper marks vulnerable heroes and protects its aggressive add.",
  "Fokus-Pässe": "Focus passes",
  "Support, Tank und Finisher zwingen das Trio zu wiederholten Zielübergaben.": "Support, tank, and finisher force repeated target handoffs.",
  "Defensive Linie": "Defensive line",
  "Eine Counter-Elite und ein Controller bestrafen unvorbereitete hohe Würfe.": "A counter elite and controller punish unprepared high rolls.",
  "Sustain gegen Zeit": "Sustain against time",
  "Heilung hält das Trio stabil, doch die gegnerische Eskalation verbietet Stalling.": "Healing stabilizes the trio, but enemy escalation prevents stalling.",
  "Markenwechsel": "Mark rotation",
  "Drei Jäger wechseln den Druck, sobald das ursprüngliche Ziel fällt oder ungültig wird.": "Three hunters rotate pressure when the original target falls or becomes invalid.",
  "Mini-Boss · Eskalation": "Mini-boss · escalation",
  "Der Herald wird über Zeit aggressiver; sein Anchor muss bewusst eingeordnet werden.": "The Herald grows aggressive over time; its Anchor must be prioritized deliberately.",
  "Kontrollierter Spike": "Controlled spike",
  "Ein Berserker erzeugt den größten Einzelziel-Druck der Welt, bleibt aber klar telegraphiert.": "A berserker creates the world's largest single-target pressure but remains clearly telegraphed.",
  "Finisher-Verteilung": "Distributed finishers",
  "Drei Gegner mit ungleichen HP verlangen geplante Abschlüsse durch das ganze Team.": "Three enemies with unequal HP demand planned finishes across the whole team.",
  "Anti-Stalling": "Anti-stalling",
  "Der Spiral-Kern eskaliert, während sein Support Zeit kauft; passives Spiel verliert den Rhythmus.": "The Spiral Core escalates while its support buys time; passive play loses tempo.",
  "Finale Vorhut": "Final vanguard",
  "Drei asymmetrische Eliten bilden den letzten Battlefield-Test vor der Singularität.": "Three asymmetric elites form the final battlefield test before the Singularity.",
  "Weltboss · Final Gravity": "World boss · Final Gravity",
  "Die Empress verdichtet sich defensiv und wechselt danach in markierten Finaldruck; ihr Anchor kontrolliert das Feld.": "The Empress condenses defensively, then shifts into marked final pressure; its Anchor controls the field.",
  "STERNENKRONE": "STAR CROWN",
  "Der Emperor heilt 6 HP und wechselt auf Counterattack + Blood Rush.": "The Emperor heals 6 HP and switches to Counterattack + Blood Rush.",
  "LEERE ENTFESSELT": "VOID UNBOUND",
  "Die Queen heilt 7 HP und wechselt auf Brutale Einsen + Wildcard.": "The Queen heals 7 HP and switches to Brutal Ones + Wildcard.",
  "Der Sovereign heilt 6 HP und erhöht den Angriffsdruck.": "The Sovereign heals 6 HP and increases attack pressure.",
  "Die Empress heilt 7 HP und kombiniert Blood Rush mit Last Stand.": "The Empress heals 7 HP and combines Blood Rush with Last Stand.",
  "Der Archon heilt 7 HP und wechselt auf Ricochet + Counterattack.": "The Archon heals 7 HP and switches to Ricochet + Counterattack.",
  "Die Empress heilt 8 HP und wechselt auf Twelve + Blood Rush.": "The Empress heals 8 HP and switches to Twelve + Blood Rush.",
  "Enraged": "Enraged",
  "Mehr Angriffsdruck, aber 10 % weniger Start-HP.": "More attack pressure, but 10% less starting HP.",
  "Armored": "Armored",
  "15 % mehr Start-HP; Hauptangriffe verursachen 1 weniger Schaden.": "15% more starting HP; main attacks deal 1 less damage.",
  "Vampiric": "Vampiric",
  "Heilt nach erfolgreichen Hauptangriffen 2 HP.": "Heals 2 HP after successful main attacks.",
  "Berserker": "Berserker",
  "Unter 40 % HP verursacht der Gegner 2 zusätzlichen Schaden.": "Below 40% HP the enemy deals 2 additional damage.",
  "Unstable": "Unstable",
  "Verursacht +2 Schaden, verliert danach bei einem Treffer 1 HP.": "Deals +2 damage, then loses 1 HP after a hit.",
  "Countertrained": "Countertrained",
  "Auf Counterattack abgestimmtes Loadout und 1 weniger eingehender Schaden.": "A Counterattack-focused loadout and 1 less incoming damage.",
  "Lucky": "Lucky",
  "Kontrollierte Würfelmanipulation durch Glück als Zusatzfähigkeit.": "Controlled dice manipulation through Luck as an extra ability.",
  "Relentless": "Relentless",
  "Erfolgreiche Angriffe bauen bis zu +3 Druck auf.": "Successful attacks build up to +3 pressure.",
  "No Recovery": "No Recovery",
  "Heilung der Helden ist auf 50 % reduziert.": "Hero healing is reduced to 50%.",
  "Blood Debt": "Blood Debt",
  "Freiwillige HP-Kosten erzeugen beim nächsten Angriff +1 Schaden.": "Voluntary HP costs grant +1 damage on the next attack.",
  "Hunted": "Hunted",
  "Ein Held startet für zwei gegnerische Züge markiert.": "One hero starts marked for two enemy turns.",
  "Rapid Escalation": "Rapid Escalation",
  "Ab gegnerischem Zug 4 steigt der Druck; Zug 7 verstärkt ihn erneut.": "Pressure rises at enemy turn 4 and again at turn 7.",
  "Glass Cannon": "Glass Cannon",
  "Hauptangriffe beider Teams verursachen +2 Rohschaden.": "Main attacks from both teams deal +2 raw damage.",
  "Last Breath": "Last Breath",
  "Unter 30 % HP verursachen Teilnehmer +1 Schaden.": "Below 30% HP combatants deal +1 damage.",
  "Precision Trial": "Precision Trial",
  "Der erste erfolgreiche Hauptangriff jedes Helden erhält +1 Schaden.": "Each hero's first successful main attack gains +1 damage.",
  "Hunter's Mark": "Hunter's Mark",
  "Der verwundbarste Held wird markiert und von offensiven Gegnern für zwei gegnerische Züge priorisiert.": "The most vulnerable hero is marked and prioritized by offensive enemies for two enemy turns.",
  "Der verwundbarste Held wird zwei gegnerische Züge priorisiert; im Solo erleidet er dabei +1 Hauptangriffsschaden.": "The most vulnerable hero is prioritized for two enemy turns; in solo they take +1 main attack damage while marked.",
  "Last Light": "Last Light",
  "Unter 30 % HP erhält der erste erfolgreiche Hauptangriff jedes Helden einmalig +2 Schaden.": "Below 30% HP, each hero's first successful main attack gains +2 damage once.",
  "Momentum War": "Momentum War",
  "Erfolgreiche Hauptangriffe bauen bis zu +2 Schaden auf; ein Fehlschlag setzt die Serie zurück.": "Successful main attacks build up to +2 damage; a miss resets the streak.",
  "Blood Moon": "Blood Moon",
  "Der bestehende Blood-Moon-Effekt verstärkt jede wirksame Heilung um 1 HP.": "The existing Blood Moon effect increases every effective heal by 1 HP.",
  "Lifesteal-, Twelve- und Borrowing-Life-Heilung erhalten durch den bestehenden Blood-Moon-Effekt +1 HP.": "The existing Blood Moon effect adds +1 HP to Lifesteal, Twelve, and Borrowing Life healing.",
  "Arcane Instability": "Arcane Instability",
  "Mit Würfelmanipulation ausgerüstete Helden erhalten auf ihren ersten erfolgreichen Hauptangriff +1 Schaden.": "Heroes equipped with dice manipulation gain +1 damage on their first successful main attack.",
  "Final Gravity": "Final Gravity",
  "Ab gegnerischem Zug 4 steigt der Schaden um 1; ab Zug 7 um insgesamt 2.": "Enemy damage rises by 1 from enemy turn 4 and by 2 total from turn 7.",
  "Weltregel": "World Rule",
  "Aktive Mechanik": "Active Mechanic",
  "Gegnerrollen": "Enemy Roles",
  "Eskalation in 1 gegnerischen Zug": "Escalation in 1 enemy turn",
  "ESKALATION AKTIV": "ESCALATION ACTIVE",
  "MARKIERT": "MARKED",
  "9 / 15 Encounter": "9 / 15 encounters",
  "Der Emperor stabilisiert seine Verteidigung und wechselt auf Counterattack.": "The Emperor stabilizes his defense and switches to Counterattack.",
  "Der verwundbarste Held wird markiert; Blood Rush erhöht den finalen Druck.": "The most vulnerable hero is marked; Blood Rush raises the final pressure.",
  "Die Queen wird defensiv und schützt ihren nächsten Übergang.": "The Queen turns defensive and protects her next transition.",
  "Die Queen markiert einen Helden und eskaliert mit Brutalen Einsen.": "The Queen marks a hero and escalates with Brutal Ones.",
  "Der Sovereign wechselt in eine defensive Counter-Phase.": "The Sovereign enters a defensive counter phase.",
  "Ein verwundbarer Held wird markiert; Double Tap erhöht den Finisher-Druck.": "A vulnerable hero is marked; Double Tap raises finisher pressure.",
  "Die Empress heilt und nutzt Lifesteal für die Mittelphase.": "The Empress heals and uses Lifesteal for the middle phase.",
  "Der niedrigste Held wird markiert; Blood Rush und Last Stand bestimmen das Finale.": "The lowest hero is marked; Blood Rush and Last Stand define the finale.",
  "Der Archon absorbiert Druck und kontert breite Angriffe.": "The Archon absorbs pressure and counters wide attacks.",
  "Ein Held wird markiert und das Loadout wechselt auf offensiven Würfeldruck.": "A hero is marked and the loadout switches to offensive dice pressure.",
  "Die Singularity verdichtet sich und reduziert eingehenden Schaden.": "The Singularity condenses and reduces incoming damage.",
  "Der schwächste Held wird markiert; Twelve und Blood Rush bilden die Finalphase.": "The weakest hero is marked; Twelve and Blood Rush form the final phase.",
  "Schließe den Astral Circuit ab.": "Complete the Astral Circuit.",
  "Schließe den Void Circuit ab.": "Complete the Void Circuit.",
  "Schließe den Eclipse Pact ab.": "Complete the Eclipse Pact.",
  "Schließe den Bloodmoon Pact ab.": "Complete the Bloodmoon Pact.",
  "Schließe das Prism Protocol ab.": "Complete the Prism Protocol.",
  "Schließe das Singularity Protocol ab.": "Complete the Singularity Protocol.",
  "Besiege einen Elite- oder Mini-Boss-Encounter.": "Defeat an elite or mini-boss encounter.",
  "Besiege einen mutierten Elite-Encounter ohne Heilung.": "Defeat a mutated elite encounter without healing.",
  "Gewinne einen Hunted-Encounter mit dem markierten Helden am Leben.": "Win a Hunted encounter with the marked hero alive.",
  "Besiege einen Endgame-Boss nach beiden Phasenwechseln.": "Defeat an endgame boss after both phase transitions.",
  "Schließe Boss Rush Stage 10 ab.": "Complete Boss Rush stage 10.",
  "Schließe einen Boss Rush ohne Verschnaufpause ab.": "Complete a Boss Rush without taking Rest."
}
  );
})();
