# Gemeinsame Duell-Engine – Phase 2, Schritt 3

Stand: V28.14.6, Ausgangspunkt `eb21d96` (V28.14.5), 17.09.2026.
Der Phase-1-Entwurf ist freigegeben. Geliefert sind **Schritt 2 von 6:
Basisphase** und **Schritt 3 von 6: Angriffsphase**. Das Spiel liest die gemeinsamen Definitionen; Kampfentscheidungen
laufen weiterhin im bisherigen Browsercode. Es gibt noch keinen Browseradapter
und keinen neuen Online-Payload.
Kein Deployment und keine Migration.

## Freigegebener Umfang und Lieferreihenfolge

Die Engine umfasst ausschließlich das Duell: `classic`, `endurance50`,
`overload75`, `mayhem`, zwei bis sechs Spieler, Fähigkeitseffekte auf Level 0,
in Mayhem das erzwungene `allMasteryLevel: 2`. Keine Profilwerte im State;
Online hat keine Profil-Mastery. Kampagne, Encounter, Weltregeln, Boss Rush,
Tutorial und Testumgebung bleiben im Browser. Gemeinsame reine Helfer werden
in späteren Schritten von beiden Pfaden benutzt, ohne zweite Regelkopie.

Nach Nutzer-Nachtrag vom 17.09. erfolgt jeder Schritt als eigenes geprüftes
Release auf `main`; anschließend Bericht und **Warten auf „Weiter“**:

| Schritt | Umfang | Stand |
|---|---|---|
| 1 | Gemeinsame Definitionen und serialisierbarer Zustand | V28.14.0 |
| 2 | Basisphase, nur Engine und Node-Tests | V28.14.3 |
| 3 | Angriff, nur Engine und Node-Tests | V28.14.6 |
| 4 | Spezialwürfel, Drafts und Rundenwechsel, nur Engine und Node-Tests | V28.14.10 |
| 5a | Browserübersetzer im Schatten und Bot-Paritätsprüfstand | V28.14.16 |
| 5b-1 | Lokales Classic-1:1-Duell produktiv auf den Reducer umschalten | V28.14.19 |
| 5b-2 | Weitere lokale Duelle produktiv auf den Reducer umschalten | offen; eigener Auftrag nach Freigabe |
| 6 | Deno-Parität und Online-Schatten | offen; kein Deployment |

Die bestehende Browseroberfläche behält ihre bisherigen Spielergrenzen und
Botfreigaben aus `LOCAL_MODES`. Die Engine kann unabhängig davon alle
20 Kombinationen aus vier Modi und zwei bis sechs Sitzen darstellen. Erst
Schritt 5 übernimmt lokale Duelle und die Hostberechnung. Online-Protokoll
und Hostautorität bleiben in Phase 2 erhalten. Schatten und spätere
Serverumschaltung sind auf Classic 1:1 begrenzt; keine Sonderregeln im Reducer.

## Gemeinsame Datenquelle

`js/engine/02-definitions.js` registriert `WDEngine.definitions`:
`RULE_VERSION`, `STATE_VERSION`, `START_HP`, `DICE_COUNT`, `SECOND_ABILITY_HP`,
`REAL_ABILITY_IDS`, `CHOOSABLE_ABILITY_IDS`, `LOCAL_MODES`, `ABILITIES`.
Alle Daten sind rekursiv eingefroren. `js/01-config.js` und
`js/05-game-data-state.js` halten nur Referenzen auf diese Daten. Namen,
Beschreibungen und Modusparameter wurden unverändert aus V28.13.2 übernommen.
Der Tutorial-Anzeigetext für ID 0 bleibt im gemeinsamen Katalog, wird aber
von `createState` als Duellfähigkeit abgelehnt.

Der Bestand enthält **24 echte Fähigkeiten** (1–25 ohne 6), davon 23 frei
wählbare (zusätzlich ohne 7). W25=6 ist eine freie Auswahl, keine eigene
Fähigkeit. Die geforderte Abnahmematrix „25 Fähigkeiten je 20 Auslösungen“
muss vor Schritt 5 geklärt werden. Vorschlag: 24 echte Fähigkeiten jeweils
20-mal wirksam auslösen und 20 freie W25=6-Auswahlen gesondert prüfen.
ID 0 darf diese Lücke nicht als Tutorial-Platzhalter verdecken.

## Zustandsschema und API – Schritt 1

`js/engine/03-state.js` ergänzt `WDEngine.createState(setup)` und
`WDEngine.validateState(state)`. Die IIFEs benötigen ausschließlich
`globalThis`, keine Browserobjekte, Timer, Speicherung, Netzwerk oder Uhrzeit.
Sie verbrauchen keinen Zufall. Im Browser werden sie mit geordneten
`defer`-Tags vor `js/01-config.js` geladen; `createState` wird vom laufenden
Spiel noch nicht benutzt.

```js
const state = WDEngine.createState({
  modeId: 'classic',
  players: [{seat: 0, abilities: [1]}, {seat: 1, abilities: [2]}],
  startingSeat: 0,
  roundNumber: 1
});
const {valid, errors} = WDEngine.validateState(state);
```

`modeId` und `players` sind Pflicht. Sitze sind eindeutige Ganzzahlen 0–5;
die Reihenfolge im Array ist die Zugfolge. `startingSeat` muss belegt sein
und ist standardmäßig der erste Sitz. `roundNumber` beginnt standardmäßig
bei 1. Die Fähigkeiten müssen vorab ausgewählt sein, beim Start exakt so
viele wie der Modus verlangt, ohne Duplikate; weder ID 0 noch ID 6 ist erlaubt.
Die Auswahlpools der bisherigen lokalen und Online-Vorbereitung bleiben
unverändert. Die Engine kann Fähigkeit 7 auswerten, unabhängig davon, über
welchen erlaubten Vorbereitungspfad sie erworben wurde.

Ungültiges Setup wirft `TypeError`; der Validator meldet
`{valid: false, errors: [{path, reason}]}`. Er verändert den Eingang nicht.
Unbekannte Felder, Profilwerte, falsche Referenzen, nicht endliche Zahlen,
Funktionen, Sets und zyklische Strukturen werden nicht still übernommen.
Neue Zustände teilen keine veränderlichen Arrays oder Objekte miteinander
oder mit dem Setup. JSON-Rundreisen erhalten sämtliche Werte.

| Feld | Inhalt |
|---|---|
| `ruleVersion`, `stateVersion` | `duel-1`, 1; unabhängig von der App-Version |
| `modeId`, `masteryLevel` | Modus und ausschließlich dessen erzwungene Stufe (Mayhem 2, sonst 0) |
| `players` | Sitze, HP/Max-HP, Fähigkeits-IDs, Bonusfreigabe, Rundensiege, aktive Effekte und Regelzähler |
| `turn` | Zugnummer, aktiver Sitz, Phase und Entscheidungsinhaber |
| `dice` | Fünf Würfel mit Wert, Lock und Auswahl, ohne Animationsflags |
| `base` | Letzte Wurfindizes und Verbrauchszähler der Basisfähigkeiten |
| `attack` | Ziel/Summe/Quelle, Treffer und Schaden, Wurf-/Fähigkeitszähler, Wildcard, Blutpreis, Momentum und weitere temporäre Flags |
| `counter` | Konterkontext, Konterwürfel, Treffer und vorgemerkter Konter |
| `draft` | Aktuelle Auswahl, Warteschlange ohne vorgezogene Optionen und ausstehende Fortsetzungen |
| `special` | Gambling Man, Perfect 25, High Stakes und Insurance-Kontexte |
| `round` | Nummer, Ausscheidereihenfolge, letzter Platz, Sieger/Ergebnis und Vorbereitung |
| `rng` | Algorithmus, optionaler Seed/PRNG-Zustand und Ziehungszähler; keine globale RNG-Instanz |
| `sequence` | Aktions- und Ereigniszähler für spätere stabile Ereignis-IDs |

`rng` ist optional im Setup. Standard ist
`{algorithm: 'external', seed: null, state: null, drawIndex: 0}`. Für
`mulberry32` werden ein uint32-Seed, ein uint32-Zustand und ein nicht negativer
sicherer Ziehungszähler verlangt. Die State-Helfer erzeugen weder Seed noch
Ziehungen. Der Zufallsadapter aus Phase 1 bleibt davon getrennt.

Die unveränderlichen Regeln werden über `ruleVersion` und `modeId` aus den
eingefrorenen Definitionen gelesen. Ein abweichender Regelstand wird nicht
mit aktuellen Regeln weiterinterpretiert, sondern als ungültig abgewiesen.

Prüfung für Schritt 1: `scripts/qa/engine-state.mjs` umfasst 52 gültige
Fälle und 123 erwartete Ablehnungen, einschließlich JSON-Rundreise,
Instanztrennung und Entscheidungsinhabern bei Draft und Konter.
`scripts/qa/engine-state-browser.mjs` vergleicht 20 Startzustände byteweise
mit Node und prüft 40 Kampfansichten (vier Modi, DE/EN, 320/360/390/412/1280 px).
Dies ist ausdrücklich noch keine Reducer-Matchparität.

## Reducer und Ereignisse – Schritte 2 bis 4

`js/engine/04-rules.js` und `js/engine/05-reduce.js` liefern den bestätigten
Schnitt für Schritte 2–4:

```js
const {state: next, events} = WDEngine.reduce(state, action, rng);
```

Der Eingang bleibt unverändert. Ungültige Aktionen liefern den unveränderten
Zustand, leere Ereignisse sowie `{rejected: true, reason}` ohne RNG-Verbrauch.
Automatische Folgen laufen bis zur nächsten echten Spielerentscheidung. Die
Basisphase umfasst Würfeln, Auswahl und Locken, Glückswurf, Loaded Dice,
Snake Eyes, Blutpreis, Insurance, Eigenschaden und Last Stand. Die Angriffsphase
ergänzt Zielwahl, Angriffswürfe samt Nachbarn, Zweite Chance, Attack Power,
Double Tap, Momentum, Rache, Underdog, Blood Rush, Lifesteal, Ricochet,
Toxic Bomb, Snake Bite, Blood Credit, Ausscheiden und Counterattack. Last Stand
bleibt mit Mastery auf 6 HP, sonst auf 1 HP. Mehrspielerangriffe blockieren an
der Zielwahl; Counterattack ist ein eigener Angriff des Verteidigers. Nach der
letzten Angriffsfolge steht der Zustand auf `turn_done`.

Gambling Man, Perfect 25 und High Stakes laufen als blockierende Entscheidungen
mit D6/D4 und optionalem Überspringen. Fällige Fähigkeitsdrafts ziehen ihr
Auswahlpaar erst beim Öffnen aus dem Reducer-RNG; die Wahl löst Warteschlange und
Fortsetzung (`finish_base`, `finish_attack`, `start_counter`) auf. Damit gilt
verbindlich: Draft zuerst, danach wird die unterbrochene Folge fortgesetzt.
Zugende, Gift am Zugstart, Last-Stand-Abklingzeit, Blood Rush, Underdog,
Siegerprüfung sowie Runden-vorbereitung und -start sind ebenfalls Entscheidungen
ohne Timer. Die Rundenvorbereitung bildet W25=6, freie Startwahlen,
`lastPlaceFreeChoices`, modusspezifische Startfähigkeiten und Sitzreihenfolge ab.

Ereignisse besitzen monotone stabile IDs und reine JSON-Nutzlasten, darunter
`DiceRolled`, `AttackRolled`, `SpecialDieRolled`, `HitsResolved`, `DamageApplied`,
`Healed`, `AbilityDraftOpened`, `AbilityChosen`, `CounterattackStarted`,
`PlayerEliminated`, `RoundEnded`, `RoundStarted`, `DecisionRequired`, `TurnEnded`
und `TurnStarted`; Texte, HTML, Timer und UI-Rückrufe bleiben im Adapter.
`scripts/qa/engine-basis.mjs`, `scripts/qa/engine-angriff.mjs` und
`scripts/qa/engine-runde.mjs` prüfen die Regeln mit festem Zufall, Ablehnungen
ohne Ziehung, JSON-Rundreisen sowie vollständige Classic- und Mayhem-Runden mit
zwei und vier Spielern. Botlogik bleibt ein Aktionsproduzent außerhalb des Reducers.

## Nachgewiesene Regelunklarheit vor Schritt 4

In Mayhem öffnet Jump Ahead bei Basissumme 24 und 31 HP durch einen Punkt
Eigenschaden den dritten Fähigkeitsdraft. `applyBaseSelfDamage` plant
gleichzeitig den Angriff nach 520 ms, ohne auf diesen Draft zu warten.
Mit Startfähigkeiten `[5,4]` bietet Seed 10 legal `[9,17]` an:

| Auswahl von Wildcard (17) | Ergebnis bei `attack_ready` | Ziehungen |
|---|---|---:|
| Vor dem 520-ms-Timer | `wildcardFace: 3` | 21 |
| Nach dem 520-ms-Timer | `wildcardFace: null` | 20 |

HP, gewählte Fähigkeit und Angriffszahl sind gleich, der regelwirksame
Zustand und RNG-Verbrauch hängen aber von der Antwortgeschwindigkeit ab.
Nachgewiesen mit Originalfunktionen aus `js/13-battle-actions.js` und
kontrollierter Timerfolge, ohne Änderung der Spielregeln.
Relevante Pfade: `resolveBase`, `applyBaseSelfDamage`,
`initializeAttackAfterTarget`, `chooseSecondAbility`.
Vor Umsetzung dieses Pfads ist gemäß Nutzerauftrag zu klären, ob der
Angriff verbindlich nach der Draftwahl initialisiert werden soll.
**Schritt 1 verändert diesen Pfad nicht.**

## Zufall und Reproduzierbarkeit

Phase 1 verwendet Mulberry32 mit uint32-Seed, genau definierten Bitoperationen
und Ziehungen in [0,1). `WDRng.random()` delegiert regulär an `Math.random()`;
`useSeed(uint32)` und `reset()` erlauben reproduzierbare Testläufe. `useTape`
spielt die tatsächlich erfassten Ziehungen ab und scheitert bei Verbrauchsfehlern.
Ein Seed allein reicht nicht: Initialzustand, Regelversion und Aktionsreihenfolge
müssen ebenfalls gleich sein. Aufgezeichnete Werte erlauben auch Replays von
normalen Math.random-Partien, die keinen auslesbaren Seed besitzen.

Spezialwürfel-Animationsaugen benutzen `visual(callback)` und verbrauchen keinen
Testseed. Im Standardbetrieb ziehen sie weiter wie zuvor aus Math.random;
es wird kein globales Math.random ersetzt. Audio, Partikel, zufällige Kosmetik,
IDs und Shop/Kisten bleiben unabhängig und unverändert.

Ab Phase 3 erzeugt die Datenbank einen kryptographisch zufälligen Matchseed und
verwahrt Seed und Fortschritt privat, atomar mit der Zustandssequenz. Der Browser
darf den Seed nicht vor Matchende erfahren: ein schneller PRNG ist reproduzierbar,
aber kein Schutz vor Vorhersage. Für öffentliche Ranglisten zusätzlich
Manipulations-/Vorhersagerisiko bewerten; gegebenenfalls kryptographischer Stream
oder vom geheimen Matchschlüssel abgeleitete Ziehungen. Offline bleibt der
RNG-Adapter Math.random-basiert. Tutorial-Vorgaben bleiben explizite Testinputs.

## Online-Ablauf nach Phase 3

1. Beide Geräte senden `{actionId, baseSeq, type, payload}` an `battle-action`.
   Auth wie heute serverseitig prüfen; Identität nicht aus der Nutzlast übernehmen.
2. Eine interne Datenbankfunktion prüft Mitgliedschaft, Matchstatus, Zug-/Dialogrecht
   und liefert Zustand, Version und privaten RNG-Fortschritt an die Edge Function.
3. Die gemeinsame Engine reduziert. Ein interner Commit-RPC prüft nochmals
   Berechtigung und `baseSeq`, schreibt Zustand, RNG-Fortschritt, Ergebnis/Events
   sowie die eindeutige Action-ID **in einer Transaktion**.
4. Konkurrenz: Compare-and-swap verwirft den Verlierer; Zustand neu lesen.
   Wiederholung derselben Action-ID liefert das gespeicherte Ergebnis, niemals
   einen neuen Wurf. Gleiche ID mit anderer Nutzlast wird abgewiesen.
5. Realtime verteilt den bestätigten Zustand; Reconnect liest das letzte Commit.

Eine JS-Engine in einer gewöhnlichen SQL-RPC läuft nicht einfach mit: deshalb
Edge Function als Rechenort, RPCs als atomare Datenbankgrenze. Privilegierter
Serverzugang nur dort, intern ausführbare Commit-Funktion ohne Browserrechte.
Der bisherige Host-Publish-Weg muss bei umgeschalteten Matches gesperrt sein.
Ein Client-Flag reicht nicht. Regeln und Version eines laufenden Matches sind
eingefroren; ältere PWA-Versionen müssen vor dem Beitritt aktualisieren.

### Latenz

Heute entscheidet der Host lokal ohne Netzwerkwartezeit. Danach kommen
Edge-Aufruf, DB-Lesen, Reduktion, Commit und Antwort/Realtime hinzu; ein Cold Start
kann zusätzlich verzögern. Keine ungemessene Millisekunden-Zusage. Vor Umschaltung
p50/p95/p99 für warme/kalte Aufrufe und zwei Mobilgeräte messen.

Wie `previewMainRoll`/`previewSpecialRoll` sofort Würfel drehen und Eingabe als
ausstehend markieren. Sichere deterministische Auswahl kann lokal vorgezeichnet
werden; **kein geratenes Würfelergebnis, Schaden, Sieg oder Guthaben** bestätigen.
Bei Bestätigung finalen Wert aufdecken; bei Ablehnung Vorschau zurücknehmen und
Snapshot übernehmen. Pro Entscheidung zunächst nur eine ausstehende Aktion.
Timeout zeigt Wiederholen mit derselben ID. Reconnect beendet die Vorschau und
stellt anhand bestätigter Sequenz/Event-ID wieder her. Zufallsseed offenlegen,
um volle Spekulation zu ermöglichen, wird ausdrücklich nicht empfohlen.

## Browsergrenze und spätere Abnahme

Kampagne, Encounter, Weltregeln, Boss Rush, Tutorial und Testumgebung bleiben
im Browser. Seit Schritt 5b-1 berechnet der gemeinsame Reducer ausschließlich
neu gestartete lokale Classic-1:1-Duelle; weitere lokale Varianten und der
Online-Host folgen in eigenen Schritten. Profilpersistenz, Statistik, Freischaltungen,
Texte, Audio, Animationen und Botplanung bleiben außerhalb der Engine.
Der Engine-State enthält keine Profilobjekte oder Profil-Mastery.

Schritt 5a verlangt 1.000 Classic-1:1-Botduelle und ergänzende Läufe für die
anderen Modi und Spielerzahlen, mit gleicher Zustands- und Ereignisfolge
im Browser und Node. Schritt 6 ergänzt Deno mit denselben relativen
Side-Effect-Imports in `battle-action`, lokalem `supabase functions serve`
und Classic-1:1-Schatten im RAM. Kein Deployment in Phase 2. Ein reiner
Startzustandsvergleich ist kein Ersatz für die vollständige Matchparität.
Echte Zwei-Geräte-Spieltests führt der Nutzer getrennt nach dem Umbau durch.

### Ergebnis Schritt 5a

`js/engine/06-adapter.js` bildet Browserzüge rein auf Reducer-Aktionen und
Reducer-Ereignisse auf bestehende Browseraufrufe ab. Der bisherige lokale
Browserkampf bleibt autoritativ; der Adapter zeichnet je Zug Aktion, geordnete
Regelziehungen und den normalisierten Folgezustand aus HP, Fähigkeiten,
Ausscheiden, Sieger und Phase nur im RAM auf. DOM, Texte, Timer, Kampagne,
Tutorial, Testumgebung und Onlinepfad bleiben außerhalb des Übersetzers.

`scripts/qa/engine-paritaet.mjs` spielt den alten Browserpfad mit gesetztem Seed
und wiederholt dieselben Aktionen und Ziehungen im Reducer. Die kurze Stichprobe
läuft in `npm run check`, der Vollumfang über
`npm run check:engine-paritaet:full`. Geprüft wurden 1.500 vollständige Duelle
mit 303.947 Aktionen: Classic 1:1 1.000 Läufe, Endurance/Overload/Mayhem 1:1 je
100 Läufe sowie Classic und Mayhem mit drei und vier Spielern je 50 Läufe. Alle
normalisierten Folgezustände stimmen überein.

Die Paritätsfunde wurden vor der Freigabe in beiden Pfaden vereinheitlicht. Dazu
gehören insbesondere Heilung auf Hauptangriffswürfen, erneut auslösbare Snake
Eyes einschließlich durch Glückswurf ergänzter gleicher Augen, Momentum und
Blood Rush erst ab Erwerb, keine Fähigkeitswahl nach Rundenende sowie die
vollständige HP-Wiederherstellung durch Perfect Parry auch nach einem
dazwischengeschalteten Fähigkeitsdraft. Schritt 5a schaltet kein Gameplay um.

### Ergebnis Schritt 5b-1

`ENGINE_LOKALES_DUELL` ist standardmäßig aktiv. Ausschließlich ein neu
gestartetes lokales Classic-Duell mit genau zwei Spielern verwendet damit den
Reducer als Regelquelle. Kampagne, Tutorial, Testumgebung, Online-Duelle und
alle anderen lokalen Modi oder Spielerzahlen bleiben im bisherigen Browserpfad.
Mit `false` steht für Diagnose und Paritätsprüfung weiterhin der alte Pfad bereit.

Der Browseradapter hält einen flüchtigen Reducer-State, übersetzt die bestehenden
UI-Aktionen und spiegelt HP, Fähigkeiten, Ausscheiden, Sieger, Rundenwerte und
Phasen zurück in die vorhandenen Browservariablen. Darstellung, Texte, Audio,
Animationen, Profilpersistenz, Statistiken, Duellmarken und Achievements bleiben
Browseraufgaben. Rundenende, Vorbereitung, Start und Fähigkeitswahl laufen für
diesen Gate ebenfalls über Reducer-Aktionen; nach einem Runden-Kill entsteht
kein Draft und keine gewählte Fähigkeit wird in die nächste Runde übernommen.

`scripts/qa/engine-umschaltung.mjs` spielt bei identischem Seed den alten und
neuen Pfad gegeneinander: 20 vollständige Classic-1:1-Duelle im normalen Check,
300 im Vollumfang. Verglichen werden HP, Fähigkeiten, Ausscheiden, Sieger,
Rundenstatistiken, Profile, Siege, Duellmarken und Achievements. Zusätzlich
prüft der Prüfstand echte UI-Klicks für Wurf, Lock, Angriff, Spezialwürfel,
Counterattack, Draft und Rundenwechsel in Deutsch und Englisch bei 320, 360,
390, 412 und 1280 Pixeln – ohne Seitenfehler, 404, horizontalen Überlauf oder
Zustandsänderung im Leerlauf. Der ältere Paritätsprüfstand erzwingt ausdrücklich
`ENGINE_LOKALES_DUELL=false` und bleibt damit ein unabhängiger Altpfadvergleich.

Phase 2 zuerst gegen aufgezeichnete Altpartien vergleichen. Im echten
Schattenbetrieb bleibt der Host autoritativ; Serverantworten ändern kein Gameplay.
Pro Action: Initial-/Vorzustand, Engineversion, Aktion, **dieselben Ziehungen**,
normalisierter Folgezustand, erste abweichende Felder und Hash protokollieren.
Ein unabhängiger Serverseed bei weiterem Math.random-Host wäre kein sinnvoller
Vergleich. Deshalb im Schattenbetrieb Host-Ziehungen als ausdrücklich untrusted
Diagnoseinput verwenden; alternativ gemeinsamer Seed nur für Testmatches.
Erst Phase 3 wechselt auf den geheimen Serverseed. Schattenausfall darf das Match
nicht beeinflussen. Datenmenge begrenzen, private Logs, kurze Aufbewahrung.

Freigabekriterium vor Phase 3: gemeinsame Regeln im Browser produktiv,
Browser/Deno-Replays gleich, vollständige Aktions-/Fähigkeitsmatrix grün,
mindestens 1.000 vollständig verglichene Testmatches ohne ungeklärte
Regelabweichung, echte Zwei-Geräte-Messung, Rollen-/RLS-/Retry-/Race-Tests.
Ausrollen nur für neu gestartete Matches mit serverseitigem Versionsflag.
Rollback betrifft neue Matches; laufende Servermatches beenden oder kontrolliert
abbrechen, nicht während eines Zuges die Autorität wechseln.

## Grenzen der gelieferten Vorarbeit

`WDRng.getTrace()` liefert eine Kopie des RAM-Protokolls: Initialabbild, Seed
(null im Normalbetrieb), ausgeführte Aktionen, geordnete Ziehungen und Status.
Der Host zeichnet von der ersten Aktion nach Start/Reconnect bis zum nächsten
Matchstart auf. Es gibt keinen Upload und keine Speicherung im Save. Diagnosefehler
werden abgefangen. Ein Reload verliert die Aufzeichnung; Reconnect beginnt ein
neues Segment. Das ist kein fälschungssicheres Audit und kein vollständiges
Matcharchiv. Für lange Matches wächst das Array im RAM; eine Export-/Begrenzungs-
strategie gehört zur späteren Diagnoselösung, nicht ins Online-Protokoll dieser Phase.

Manuelle Nutzung in der Browserkonsole vor einem lokalen Testkampf:
`WDRng.useSeed(12345)`, danach die Testumgebung starten. Gleiche Startauswahl und
Aktionen verwenden. `WDRng.reset()` kehrt zum normalen Zufall zurück und löscht
die Diagnose; ein Online-Matchstart setzt den Adapter ebenfalls zurück, damit
ein vergessener Testseed nicht in ein reguläres Online-Match gelangt.
`WDRng.getTrace()` liest das Host-Protokoll, ohne es hochzuladen. Im normalen
Browser ist es bewusst nicht über einen neuen Menüpunkt zugänglich.

Der Prüfstand spielt eine lokale Classic-Partie mit zwei echten Bots ab und
wiederholt ihre Bot-Schritte mit den aufgezeichneten Ziehungen zweimal in frischen
Browserseiten. Er prüft Ergebnis und Ziehungsfolge. Das beweist die getestete
Partie, nicht alle 24 echten Fähigkeiten, Mastery-Kombinationen oder Kampagnen.
Der vollständige State- und Online-Replay-Importer ist Arbeit von Phase 2.

## Noch offene Entscheidungen

- Vor Schritt 4: Reihenfolge des nachgewiesenen Mayhem-Drafts gegenüber
  dem verzögerten Angriff, siehe oben; keine stille Verhaltensänderung.
- Vor Schritt 5: Abnahmematrix mit 24 echten Fähigkeiten und W25=6 als
  gesondertem Auswahlfall statt einer erfundenen 25. Fähigkeit.
- Phase 3: Ausfall-/Wiederaufnahmeregel und gemessene Latenzgrenzen. Die
  Hostvorschau (sofort drehen, Ergebnis nach Bestätigung) gehört in Phase 3.
  Online hat keine Profil-Mastery; diese Entscheidung ist bereits getroffen.

## Funktionsinventar

Ausgelagert nach `docs/SERVER-ENGINE-INVENTAR.md` (Zufallsquellen und alle
313 Funktionen mit Zeilen und Einstufung). Für einen Teilschritt nur die
dort genannten Funktionen des Schritts lesen, nicht die ganze Datei.
