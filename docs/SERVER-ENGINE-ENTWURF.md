# Gemeinsame Kampf-Engine – Entwurf, Phase 1

Stand: V28.13.2, Ausgangspunkt `453217f` (V28.13.0), 17.09.2026.
**Nicht zur Umsetzung freigegeben.** Diese Lieferung enthält nur Zufallsadapter,
flüchtiges Aktionsprotokoll und Prüfstand. Host, Regeln, RPCs, Speicherformate und
Edge Function bleiben in ihrer bisherigen Rolle. Keine Migration erforderlich.

## Befund und Grenze

Die sieben untersuchten Dateien enthalten rund 5.300 Zeilen. Dateinamen sind
keine Modulgrenzen: `12-battle-ui` enthält Zielwahl und Schadensberechnung;
`13-battle-actions` kombiniert Regelentscheidungen mit Dialogen und Timern.
`23-mastery` mischt Kampfeffekte, permanente Profilfortschritte und Oberfläche.
Außerdem liegen Regeln in `06-campaign`, `37-duo-boss-rush`, `44-trio-boss-rush`
und statische Definitionen in `01`, `02`, `03`, `03b`, `03c`, `05`.
Diese Abhängigkeiten gehören zur Phase-2-Extraktion, nicht nur die sieben Dateien.

Der aktuelle Zustand `exportOnlineState` (Schema 6) ist ein Transportabbild mit
HTML, Zeitstempeln und Animationen, **kein vollständiger Engine-State**. Zum
Beispiel müssen alle Mastery-Zähler, temporäre Angriffsflags, ausstehende
Entscheidungen und Encounter-Sets explizit aufgenommen werden. Blindes Übernehmen
dieses Snapshots wäre keine belastbare Engine-Grenze.

## Zielschnitt: eine Quelle, zwei Laufzeiten

`js/engine/` wird nach Freigabe eine Bibliothek aus klassischen IIFEs. Jede
registriert ausschließlich auf `globalThis.WDEngine`; kein `window`, DOM,
Storage, Timer, Audio, Netzwerk oder versteckter globaler Kampfzustand.
Der Browser lädt die Dateien mit geordneten `defer`-Tags vor dem UI-Adapter.
Ein Deno-Einstieg importiert dieselben Dateien als Side-Effect-Imports und liest
anschließend `globalThis.WDEngine`. Die IIFE selbst hat keine ES-Exports und
läuft deshalb unverändert in beiden Umgebungen.

Vorschlag: `01-rng.js`, `02-definitions.js`, `03-state.js`, `04-rules.js`,
`05-reduce.js`; Nummern und Zuschnitt erst bei Umsetzung festlegen. Der heutige
Zufallsadapter ist Vorarbeit und kein freigegebener Reducer. Sein globaler
Testzustand darf später **nicht** zwischen parallelen Edge-Anfragen geteilt werden.
Der Reducer erhält je Anfrage eine eigene RNG-Instanz.

```js
const {state: next, events} = WDEngine.reduce(state, action, rng);
// Ereignisse: DiceRolled, DamageApplied, Healed, AbilityDraftOpened,
// DecisionRequired, TurnStarted, PlayerEliminated, MatchFinished.
```

Der Eingang bleibt unverändert; `next` ist ein neuer serialisierbarer Zustand.
Aktion enthält Typ, Sitz und validierte Nutzlast. Ungültige Aktionen liefern
einen definierten Ablehnungsgrund und verbrauchen keinen RNG-Zustand. Ereignisse
enthalten IDs und Werte, keine deutschen Sätze, HTML oder UI-Rückrufe.
Der Browser leitet daraus Animation, übersetztes Log und modale Auswahl ab.
Animationen dürfen niemals die Reihenfolge der Regeln bestimmen. Automatische
Folgen laufen im Reducer bis zur nächsten echten Spielerentscheidung; sichtbare
Pausen verarbeitet nur die UI. Stabile Event-IDs verhindern doppelte Animationen.

State: Engine-/Regelversion, Modus und unveränderliche Regeln, Teilnehmer und
Sitzreihenfolge, HP/Fähigkeiten/effektive Mastery, Phase/Entscheidungsinhaber,
Würfel und Locks, Angriffs-/Konterkontext, Draft, aktive Effekte und Zähler,
Encounter-Runtime, Rundenergebnis sowie RNG-Zustand/Ziehungszähler. Sets werden
explizit zu Arrays oder Maps mit definierten Schlüsseln. Keine Profilobjekte,
Guthaben, DOM-Auswahlwerte, Wallclock oder Kosmetik im regelwirksamen Zustand.
Permanente Freischaltungen und Statistik reagieren außerhalb der Engine auf Events.
Geliehene Boss-Rush-Mastery bleibt strikt von gekaufter Mastery getrennt.

Für Deployment entweder relative Imports auf die kanonischen Dateien (mit
lokalem `supabase functions serve` und Bundle-Test nachweisen) oder ein
Buildschritt, der **byteidentische generierte Kopien** unter `functions/_shared`
erzeugt und deren Hash prüft. Keine handgepflegte zweite Regelquelle. Bevorzugt
relative Imports; generierte Kopie nur, falls die Paketgrenze das verlangt.
Supabase empfiehlt je Function eine eigene `deno.json` für Abhängigkeiten:
[offizielle Dokumentation](https://supabase.com/docs/guides/functions/dependencies).
Changelog am 17.09. geprüft; keine einschlägige Änderung für diesen Entwurf.

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

## Was im Browser bleibt

Tutorial und Testumgebung steuern ihre Szenarien lokal. Solo, Kampagne, lokales
Spiel und Boss Rush rufen dieselbe Engine ohne Netzwerk auf. Botplanung bleibt
ein separater Aktionsproduzent. UI/Audio/Animationen, Karten und Fortschrittsmenüs,
Profilpersistenz und lokale Belohnungsverarbeitung bleiben Browseradapter.
Online setzt die Datenbank autorisierte Startparameter; effektive Mastery darf
später nicht ungeprüft aus einem manipulierten Clientprofil übernommen werden.

## Phasen und Aufwand

| Phase | Arbeit und Abnahme | Schätzung |
|---|---|---|
| 1 | Inventar, Entwurf, RNG-Adapter, RAM-Protokoll, erster echter Bot-Replay; keine Serveränderung | 2–4 Arbeitstage |
| 2 | State vollständig definieren; Regeln schrittweise extrahieren; Browseradapter; alle Fähigkeiten/Level, Entscheidungen, Kampagnen-/Rush-Regeln testen; identische Datei in Deno; Schattenvergleich | 15–25 Arbeitstage |
| 3 | Seed-/Commit-/Idempotenz-Migrationen, Rechtewechsel, Vorschau für Host, Reconnect/Timeout/Konkurrenz, gestufter Rollout und Betrieb | 6–10 Arbeitstage |

Schätzungen für eine umsetzende Person inklusive Tests, keine Terminzusage;
ungewöhnliche Wechselwirkungen können 30–50 % Reserve verlangen. Größter Aufwand
ist die Abtrennung von Timern, DOM-gesteuerten Entscheidungen und Persistenz,
nicht das Hosting der Function. Shop/Kisten/Währung gehören nicht zu diesen Phasen.

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
Partie, nicht alle 24 wählbaren Fähigkeiten, Mastery-Kombinationen oder Kampagnen.
Der vollständige State- und Online-Replay-Importer ist Arbeit von Phase 2.

## Entscheidungen vor Phase 2/3

1. **Schnitt freigeben?** Gemeinsame JS-IIFE-Engine mit State + Events; Edge Function
   rechnet, SQL-RPC committed atomar. Empfehlung: ja, nach Prüfung dieses Entwurfs.
2. **Schattenbetrieb wie beginnen?** Empfehlung: private Testmatches mit aufgezeichneten
   Host-Ziehungen, danach begrenzte echte Matches; keine sofortige Umschaltung.
3. **Host-Vorschau akzeptiert?** Empfehlung: sofortige Animation, Ergebnis erst nach
   Serverbestätigung; keine vorgetäuschten Treffer und kein veröffentlichter Seed.
4. **Freigabe- und Betriebsbudget?** Empfehlung: obige Testmatrix und 1.000 Matches,
   Latenzgrenze nach Mobilmessung festlegen; private Abweichungslogs sieben Tage.
5. **Online-Startdaten und Ausfallregel?** Vor Phase 3 festlegen, welche Mastery-
   /Profilwerte serverseitig gelten und wie lange unterbrochene Matches warten.
   Empfehlung: bestehende Online-Regeln unverändert, kein lokaler Ersatzhost bei
   Serverausfall; Wiederaufnahme desselben bestätigten Matches.

## Funktionsinventar

### Inventar der Zufallsquellen

| Datei/Funktion (Zeile in Phase 1) | Zweck | Behandlung |
|---|---|---|
| `03d-endgame-mechanics.js:105`, `chooseHuntedHero` | Markierten Helden ziehen | WDRng; explizite Testquelle weiterhin möglich |
| `06-campaign.js:1147`, `pickRandomTrioStartAbility` | Trio-Startfähigkeit | WDRng |
| `08-profiles-stats.js:32,88`, `shuffledCopy`, `randomizePlayerOrder` | Sitz-/Gegnerreihenfolge | WDRng |
| `09-battle-stats.js:1,2`, `randAbilityRoll`, `randD4` | W25 und W4 | WDRng |
| `10-bots.js:6,11`, `randDieForPlayer` | W6 einschließlich Lucky-Gewichtung | WDRng |
| `10-bots.js:77,83,478`, `botPickAbility`, `botShouldGambleHighStakes` | Botentscheidungen | WDRng |
| `11-setup.js:4`, `randomUniqueAbilityIds` | Startfähigkeiten mischen | WDRng |
| `12-battle-ui.js:45`, `campaignEnemyAttackTarget` | Zufälliges gültiges Gegnerziel | WDRng; wird derzeit auch von UI/Bot-Bewertungen gelesen, in Phase 2 einmalig als Regelentscheidung festlegen |
| `13-battle-actions.js:230`, `randomSecondAbilityChoices` | Bonusfähigkeitsdraft | WDRng |
| `13-battle-actions.js:31,787` | Animierte W6-/W4-Augen, ohne Regelwirkung | `WDRng.visual`, kein Verbrauch des Replay-Streams |
| `21-test-lab.js:290` | Testwürfel 5 oder 6 | WDRng |
| `37-duo-boss-rush.js:112`, `44-trio-boss-rush.js:141`, `shuffled` | Perks/Loadouts und Rush-Auswahl | WDRng |
| `online/01-online.js:105,334,338` | Online-Sitzreihenfolge und Startfähigkeiten | WDRng; keine Änderung des Transportformats |
| `04-save.js:128,134,137`, `42-supabase-account.js:14`, `online/01-online.js:113,117,343` | IDs, Tags, Raumcode-Fallback | Unverändert, keine Kampfentscheidung |
| `16-audio.js`, `18-attack-fx.js`, übrige `21-test-lab.js`-Ziehungen | Audio/Partikel/FX | Unverändert, separater visueller Zufall |
| `20-v276.js:9`, `randomPick` | Zufällige Kosmetik | Unverändert |
| `45-kistentest.js`, `46-shop-daten.js` | Kisten/Kauf und Partikel | Ausdrücklich außerhalb des Auftrags, unverändert |

Indirekte Ziehungen über `randDie`, `rollTrackedD6`, `rollTrackedD6Excluding`,
`randAbilityRoll`, `randD4` und Shuffle-Helfer laufen damit ebenfalls über den
Adapter. `14-round-flow` und `23-mastery` haben keine eigene Math.random-Stelle.
Weitere Entkopplungsrisiken: `Date.now` in Ereignis-/Statistikmetadaten, Timer,
DOM-Auswahlwerte und implizite `window.WDMastery`-/`WDBossRush`-Aufrufe. Sie sind
keine zusätzlichen Zufallsquellen, aber für State-Vergleiche explizit zu trennen.

### Funktionen

Zeilen beziehen sich auf diese Phase-1-Fassung. Die 311 benannten Funktionsdeklarationen
der sieben Dateien sind aufgeführt, einschließlich verschachtelter Helfer;
die benannte Pfeilfunktion und die Debug-Methode stehen ergänzend am Tabellenende.
Anonyme Listener/Wrapper sind der umgebenden Funktion bzw. dem IIFE zugeordnet.
R = reine Berechnung aus Parametern/statischen Definitionen; G = Regellogik ohne
eigene DOM-Ausgabe, aber mit globalem Zustand/Zufall (noch nicht rein);
U = Darstellung/DOM/Animation/Audio; M = vermischte Regel-, Darstellungs- oder
Persistenzverantwortung, auch über aufgerufene Helfer. Konservative Einstufung:
M ist ein Trennauftrag, keine Behauptung, dass jede Ausführung DOM verändert.

| Datei | Funktion | Zeilen | Einstufung |
|---|---|---:|---|
| `js/03d-endgame-mechanics.js` | `inferEnemyRole` | 37–42 | R |
| `js/03d-endgame-mechanics.js` | `defaultAiForRole` | 43–43 | R |
| `js/03d-endgame-mechanics.js` | `bossPhaseThresholdsCrossed` | 44–49 | R |
| `js/03d-endgame-mechanics.js` | `endgameEncounterKind` | 50–50 | R |
| `js/03d-endgame-mechanics.js` | `applyEndgameMechanics` | 51–72 | G |
| `js/03d-endgame-mechanics.js` | `setEndgameBossPhases` | 79–79 | G |
| `js/03d-endgame-mechanics.js` | `campaignMechanicSummary` | 87–94 | U |
| `js/03d-endgame-mechanics.js` | `campaignWorldDescription` | 95–95 | U |
| `js/03d-endgame-mechanics.js` | `campaignMechanicDetailHtml` | 96–96 | U |
| `js/03d-endgame-mechanics.js` | `buildCampaignEnemyPlayer` | 97–102 | G |
| `js/03d-endgame-mechanics.js` | `getActiveWorldRule` | 103–103 | G |
| `js/03d-endgame-mechanics.js` | `chooseValidMarkedHero` | 104–104 | G |
| `js/03d-endgame-mechanics.js` | `chooseHuntedHero` | 105–105 | G |
| `js/03d-endgame-mechanics.js` | `applyWorldRuleOnEncounterStart` | 106–106 | G |
| `js/03d-endgame-mechanics.js` | `queueOneShotDamageBonus` | 107–107 | G |
| `js/03d-endgame-mechanics.js` | `commitOneShotDamageBonuses` | 108–108 | G |
| `js/03d-endgame-mechanics.js` | `worldRuleDamageBonus` | 109–109 | G |
| `js/03d-endgame-mechanics.js` | `applyWorldRuleAfterAttack` | 110–110 | G |
| `js/03d-endgame-mechanics.js` | `applyWorldRuleOnEnemyTurn` | 111–111 | M |
| `js/03d-endgame-mechanics.js` | `campaignOutgoingDamageModifier` | 115–115 | G |
| `js/03d-endgame-mechanics.js` | `campaignIncomingDamageModifier` | 116–116 | G |
| `js/03d-endgame-mechanics.js` | `initializeEncounterMechanics` | 117–117 | M |
| `js/03d-endgame-mechanics.js` | `updateEncounterEscalation` | 118–118 | M |
| `js/03d-endgame-mechanics.js` | `campaignAfterSuccessfulAttack` | 119–119 | M |
| `js/03d-endgame-mechanics.js` | `campaignHandleDeathReaction` | 120–120 | M |
| `js/03d-endgame-mechanics.js` | `awardEndgameEncounterAchievements` | 130–130 | M |
| `js/09-battle-stats.js` | `randAbilityRoll` | 1–1 | G |
| `js/09-battle-stats.js` | `randD4` | 2–2 | G |
| `js/09-battle-stats.js` | `resetRoundStats` | 4–23 | M |
| `js/09-battle-stats.js` | `recordD6` | 25–32 | M |
| `js/09-battle-stats.js` | `recordSelfDamage` | 34–39 | M |
| `js/09-battle-stats.js` | `rollTrackedD6` | 41–46 | M |
| `js/09-battle-stats.js` | `rollTrackedD6Excluding` | 48–54 | M |
| `js/09-battle-stats.js` | `applyTwelveHeal` | 56–82 | M |
| `js/09-battle-stats.js` | `isUniqueUnderdog` | 84–94 | G |
| `js/09-battle-stats.js` | `prepareBloodRushForTurn` | 96–115 | M |
| `js/09-battle-stats.js` | `activateBloodRushForMainAttack` | 117–129 | M |
| `js/09-battle-stats.js` | `activateBloodRushMidAttackIfEligible` | 131–147 | M |
| `js/09-battle-stats.js` | `consumeBloodRushForCounter` | 149–159 | G |
| `js/09-battle-stats.js` | `recordDamageDealt` | 161–172 | G |
| `js/09-battle-stats.js` | `noteCampaignHeroAttack` | 174–180 | G |
| `js/09-battle-stats.js` | `campaignLastHeroAttacker` | 182–197 | G |
| `js/09-battle-stats.js` | `recordCampaignRawDamage` | 199–211 | G |
| `js/09-battle-stats.js` | `recordCampaignAttackResult` | 212–217 | G |
| `js/09-battle-stats.js` | `recordCampaignEnemyElimination` | 218–225 | G |
| `js/09-battle-stats.js` | `recordCampaignKill` | 226–231 | M |
| `js/09-battle-stats.js` | `recordHealing` | 233–238 | M |
| `js/09-battle-stats.js` | `statLeader` | 240–248 | G |
| `js/09-battle-stats.js` | `statZeilen` | 256–259 | U |
| `js/09-battle-stats.js` | `renderRoundStats` | 261–295 | U |
| `js/10-bots.js` | `randDieForPlayer` | 1–12 | G |
| `js/10-bots.js` | `randDie` | 14–16 | G |
| `js/10-bots.js` | `freshDice` | 18–20 | G |
| `js/10-bots.js` | `escapeHtml` | 21–23 | R |
| `js/10-bots.js` | `defaultSeatFor` | 25–27 | R |
| `js/10-bots.js` | `isBotPlayer` | 30–32 | G |
| `js/10-bots.js` | `setupBotLevel` | 34–36 | U |
| `js/10-bots.js` | `botLevelLabel` | 38–40 | G |
| `js/10-bots.js` | `botAbilitySynergyScore` | 42–65 | G |
| `js/10-bots.js` | `botPickAbility` | 67–89 | G |
| `js/10-bots.js` | `syncSetupBotChoice` | 91–120 | U |
| `js/10-bots.js` | `clearBotAutomation` | 122–129 | U |
| `js/10-bots.js` | `botActionOwner` | 131–150 | M |
| `js/10-bots.js` | `scheduleBotAction` | 152–168 | M |
| `js/10-bots.js` | `botBaseFinalUtility` | 170–208 | G |
| `js/10-bots.js` | `botDieProb` | 210–216 | G |
| `js/10-bots.js` | `botPopCount` | 218–225 | R |
| `js/10-bots.js` | `botHardBestLocks` | 227–326 | G |
| `js/10-bots.js` | `futureValue` | 237–282 | G |
| `js/10-bots.js` | `enumerate` | 246–277 | G |
| `js/10-bots.js` | `botChooseBaseLocks` | 328–369 | G |
| `js/10-bots.js` | `botShouldUseLoaded` | 371–421 | G |
| `js/10-bots.js` | `botShouldUseBloodPrice` | 423–463 | G |
| `js/10-bots.js` | `botShouldUseSecondChance` | 465–468 | G |
| `js/10-bots.js` | `botShouldGambleHighStakes` | 470–496 | G |
| `js/10-bots.js` | `snakeEyesGroup` | 498–512 | G |
| `js/10-bots.js` | `botHandleBaseSelect` | 514–542 | M |
| `js/10-bots.js` | `botHandleAttackReady` | 544–552 | M |
| `js/10-bots.js` | `botPickSecondAbility` | 554–557 | G |
| `js/10-bots.js` | `performBotAction` | 559–620 | M |
| `js/12-battle-ui.js` | `aliveCount` | 1–1 | G |
| `js/12-battle-ui.js` | `nextAlive` | 2–7 | G |
| `js/12-battle-ui.js` | `campaignTeamIndices` | 9–13 | G |
| `js/12-battle-ui.js` | `campaignEnemyUsesRotatingTarget` | 15–26 | G |
| `js/12-battle-ui.js` | `campaignEnemyAttackTarget` | 28–62 | G |
| `js/12-battle-ui.js` | `commitCampaignEnemyAttackTarget` | 64–77 | M |
| `js/12-battle-ui.js` | `nextAttackTarget` | 79–88 | G |
| `js/12-battle-ui.js` | `combatLogText` | 94–100 | U |
| `js/12-battle-ui.js` | `addLog` | 101–105 | U |
| `js/12-battle-ui.js` | `battleSheetCopy` | 115–129 | U |
| `js/12-battle-ui.js` | `battleSheetHasContent` | 130–132 | U |
| `js/12-battle-ui.js` | `renderBattleSheetInfo` | 133–158 | U |
| `js/12-battle-ui.js` | `renderBattleSheetLog` | 159–178 | U |
| `js/12-battle-ui.js` | `openBattleSheet` | 179–187 | U |
| `js/12-battle-ui.js` | `closeBattleSheet` | 188–188 | U |
| `js/12-battle-ui.js` | `refreshBattleInfoButton` | 191–199 | U |
| `js/12-battle-ui.js` | `maxHpForPlayer` | 200–204 | G |
| `js/12-battle-ui.js` | `applyHealingToPlayer` | 208–228 | M |
| `js/12-battle-ui.js` | `playerAbilities` | 230–234 | G |
| `js/12-battle-ui.js` | `hasAbility` | 236–239 | G |
| `js/12-battle-ui.js` | `currentAbility` | 241–243 | G |
| `js/12-battle-ui.js` | `renderPlayers` | 245–283 | U |
| `js/12-battle-ui.js` | `applySeatRotation` | 285–319 | U |
| `js/12-battle-ui.js` | `testLabDieSymbol` | 324–324 | U |
| `js/12-battle-ui.js` | `diceArtworkAsset` | 327–332 | U |
| `js/12-battle-ui.js` | `clearDiceArtwork` | 333–337 | U |
| `js/12-battle-ui.js` | `applyDiceArtwork` | 338–347 | U |
| `js/12-battle-ui.js` | `galaxyA50CompatibilityMode` | 352–360 | U |
| `js/12-battle-ui.js` | `ensureSpecialPipDieStructure` | 375–394 | U |
| `js/12-battle-ui.js` | `renderSpecialPipDie` | 396–409 | U |
| `js/12-battle-ui.js` | `ensure3DDieStructure` | 411–436 | U |
| `js/12-battle-ui.js` | `stampArtFaces` | 438–455 | U |
| `js/12-battle-ui.js` | `ensureArtSprite` | 457–469 | U |
| `js/12-battle-ui.js` | `applyArtCube` | 471–484 | U |
| `js/12-battle-ui.js` | `renderSpecialDieFace` | 486–520 | U |
| `js/12-battle-ui.js` | `sizeSpecialCube` | 547–553 | U |
| `js/12-battle-ui.js` | `messeSpecialCube` | 555–568 | U |
| `js/12-battle-ui.js` | `render3DDieNode` | 570–596 | U |
| `js/12-battle-ui.js` | `ensureFlatDieStructure` | 598–617 | U |
| `js/12-battle-ui.js` | `renderFlatDieNode` | 619–627 | U |
| `js/12-battle-ui.js` | `currentSum` | 629–629 | G |
| `js/12-battle-ui.js` | `stackingDamageBonus` | 630–637 | G |
| `js/12-battle-ui.js` | `isNormalAttackHitValue` | 639–642 | G |
| `js/12-battle-ui.js` | `damagePerAttackHit` | 644–651 | G |
| `js/12-battle-ui.js` | `precisionHitDamage` | 653–655 | G |
| `js/12-battle-ui.js` | `totalAttackDamage` | 656–656 | G |
| `js/12-battle-ui.js` | `ensureKantenlaeufer` | 668–682 | U |
| `js/12-battle-ui.js` | `renderDice` | 684–718 | U |
| `js/12-battle-ui.js` | `updateHeader` | 720–806 | U |
| `js/12-battle-ui.js` | `campaignEnemyTargets` | 808–812 | G |
| `js/12-battle-ui.js` | `renderCampaignTargetChoices` | 813–819 | U |
| `js/12-battle-ui.js` | `chooseCampaignAttackTarget` | 820–826 | M |
| `js/12-battle-ui.js` | `battleAction` | 828–837 | U |
| `js/12-battle-ui.js` | `hideAllControls` | 838–843 | U |
| `js/12-battle-ui.js` | `updateButtons` | 844–947 | U |
| `js/12-battle-ui.js` | `queueEventPopup` | 950–953 | U |
| `js/12-battle-ui.js` | `runEventPopupQueue` | 955–973 | U |
| `js/12-battle-ui.js` | `cardValuePop` | 982–992 | U |
| `js/12-battle-ui.js` | `playDamageAnimation` | 994–1016 | U |
| `js/12-battle-ui.js` | `playHealAnimation` | 1018–1040 | U |
| `js/12-battle-ui.js` | `flushPendingFx` | 1042–1071 | U |
| `js/12-battle-ui.js` | `renderAll` | 1073–1085 | M |
| `js/13-battle-actions.js` | `animateIndices` | 1–21 | M |
| `js/13-battle-actions.js` | `tickSpecialDie` | 29–32 | U |
| `js/13-battle-actions.js` | `isStraightFive` | 34–37 | R |
| `js/13-battle-actions.js` | `isFullHouseFive` | 39–44 | R |
| `js/13-battle-actions.js` | `resetFirstClassStreak` | 46–48 | G |
| `js/13-battle-actions.js` | `recordAttackDamageForAchievements` | 50–62 | M |
| `js/13-battle-actions.js` | `rollBase` | 64–82 | M |
| `js/13-battle-actions.js` | `useBaseReroll` | 84–115 | M |
| `js/13-battle-actions.js` | `useLoadedDice` | 118–159 | M |
| `js/13-battle-actions.js` | `useSnakeEyes` | 161–194 | M |
| `js/13-battle-actions.js` | `lockSelected` | 196–217 | M |
| `js/13-battle-actions.js` | `randomSecondAbilityChoices` | 220–234 | G |
| `js/13-battle-actions.js` | `campaignBonusDraftSlot` | 236–245 | G |
| `js/13-battle-actions.js` | `maybeTriggerCampaignStandardBonusDraft` | 247–264 | M |
| `js/13-battle-actions.js` | `bonusAbilityRuleFor` | 266–278 | G |
| `js/13-battle-actions.js` | `maybeTriggerLocalBonusDraft` | 280–301 | M |
| `js/13-battle-actions.js` | `maybeTriggerSecondAbility` | 303–321 | M |
| `js/13-battle-actions.js` | `openAbilityDraftForSlot` | 323–357 | M |
| `js/13-battle-actions.js` | `openSecondAbilityDraft` | 359–365 | M |
| `js/13-battle-actions.js` | `maybeTriggerCampaignKillAbilityDraft` | 371–391 | M |
| `js/13-battle-actions.js` | `maybeTriggerKillBonusDraft` | 393–397 | M |
| `js/13-battle-actions.js` | `chooseSecondAbility` | 399–462 | M |
| `js/13-battle-actions.js` | `applyDamageToPlayer` | 464–493 | M |
| `js/13-battle-actions.js` | `nextRicochetTarget` | 495–505 | G |
| `js/13-battle-actions.js` | `nextRicochetTargetExcluding` | 507–516 | G |
| `js/13-battle-actions.js` | `triggerToxicBomb` | 518–551 | M |
| `js/13-battle-actions.js` | `markEliminated` | 553–559 | M |
| `js/13-battle-actions.js` | `beginAttackWithFace` | 562–577 | M |
| `js/13-battle-actions.js` | `initializeAttackAfterTarget` | 579–625 | M |
| `js/13-battle-actions.js` | `openGamblingMan` | 627–642 | M |
| `js/13-battle-actions.js` | `rollGamblingMan` | 644–677 | M |
| `js/13-battle-actions.js` | `offerGamblingRetry` | 680–685 | M |
| `js/13-battle-actions.js` | `startGamblingRetry` | 686–689 | M |
| `js/13-battle-actions.js` | `declineGamblingRetry` | 690–692 | M |
| `js/13-battle-actions.js` | `openPerfect25` | 694–707 | M |
| `js/13-battle-actions.js` | `queuePerfect25` | 709–715 | M |
| `js/13-battle-actions.js` | `rollPerfect25` | 717–763 | M |
| `js/13-battle-actions.js` | `openPerfect25D4` | 765–776 | M |
| `js/13-battle-actions.js` | `rollPerfect25D4` | 778–808 | M |
| `js/13-battle-actions.js` | `openHighStakes` | 810–823 | M |
| `js/13-battle-actions.js` | `skipHighStakes` | 825–829 | M |
| `js/13-battle-actions.js` | `rollHighStakes` | 831–880 | M |
| `js/13-battle-actions.js` | `openInsurance` | 883–897 | M |
| `js/13-battle-actions.js` | `resolveBaseSelfDamage` | 899–905 | M |
| `js/13-battle-actions.js` | `applyBaseSelfDamage` | 907–948 | M |
| `js/13-battle-actions.js` | `rollInsurance` | 950–991 | M |
| `js/13-battle-actions.js` | `masteryMomentumFail` | 993–997 | G |
| `js/13-battle-actions.js` | `resolveBase` | 999–1054 | M |
| `js/13-battle-actions.js` | `useBloodPrice` | 1056–1100 | M |
| `js/13-battle-actions.js` | `useBloodRushSelfHarm` | 1102–1115 | M |
| `js/13-battle-actions.js` | `rollAttack` | 1117–1182 | M |
| `js/13-battle-actions.js` | `useAttackPower` | 1184–1213 | M |
| `js/13-battle-actions.js` | `retireWildcardAfterRoll` | 1215–1217 | G |
| `js/13-battle-actions.js` | `continueDoubleTapAttack` | 1219–1229 | M |
| `js/13-battle-actions.js` | `resolveCurrentAttackRoll` | 1231–1301 | M |
| `js/13-battle-actions.js` | `dealAttackDamage` | 1303–1345 | M |
| `js/13-battle-actions.js` | `counterattackDamagePerHit` | 1349–1359 | G |
| `js/13-battle-actions.js` | `queueCounterattack` | 1361–1371 | M |
| `js/13-battle-actions.js` | `renderCounterDice` | 1373–1393 | U |
| `js/13-battle-actions.js` | `openCounterattack` | 1395–1429 | M |
| `js/13-battle-actions.js` | `finishCounterattackDamage` | 1431–1552 | M |
| `js/13-battle-actions.js` | `rollCounterattack` | 1554–1620 | M |
| `js/13-battle-actions.js` | `finishAttackAfterCounter` | 1622–1632 | M |
| `js/13-battle-actions.js` | `finalizeAttackDamage` | 1634–1789 | M |
| `js/13-battle-actions.js` | `finishBaseTurn` | 1791–1808 | M |
| `js/13-battle-actions.js` | `endTurn` | 1810–1817 | M |
| `js/13-battle-actions.js` | `applyMasteryPoisonTurnStart` | 1819–1823 | M |
| `js/13-battle-actions.js` | `advanceTurn` | 1825–1860 | M |
| `js/13-battle-actions.js` | `checkWinner` | 1862–1957 | M |
| `js/14-round-flow.js` | `makeAbilityChoiceSelect` | 1–12 | U |
| `js/14-round-flow.js` | `makeSpecialAbilityChoiceSelect` | 14–19 | U |
| `js/14-round-flow.js` | `prepareNextRound` | 21–91 | M |
| `js/14-round-flow.js` | `startNextRound` | 93–165 | M |
| `js/23-mastery.js` | `normalizeAbilityLevels` | 73–82 | R |
| `js/23-mastery.js` | `defaults` | 84–86 | R |
| `js/23-mastery.js` | `normalize` | 88–104 | R |
| `js/23-mastery.js` | `normalizeInPlace` | 106–111 | G |
| `js/23-mastery.js` | `ensureModes` | 113–133 | G |
| `js/23-mastery.js` | `ensure` | 135–138 | G |
| `js/23-mastery.js` | `perkCost` | 140–140 | R |
| `js/23-mastery.js` | `branchSpent` | 141–141 | R |
| `js/23-mastery.js` | `abilitySpent` | 142–144 | R |
| `js/23-mastery.js` | `totalSpent` | 145–148 | G |
| `js/23-mastery.js` | `modeLabel` | 150–150 | R |
| `js/23-mastery.js` | `soloWorldIndex` | 151–151 | G |
| `js/23-mastery.js` | `duoWorldIndex` | 152–152 | G |
| `js/23-mastery.js` | `trioWorldIndex` | 153–153 | G |
| `js/23-mastery.js` | `encounterLevelInWorld` | 154–162 | G |
| `js/23-mastery.js` | `encounterEligible` | 165–177 | G |
| `js/23-mastery.js` | `standardEligible` | 180–191 | G |
| `js/23-mastery.js` | `completedSetForMode` | 193–203 | G |
| `js/23-mastery.js` | `modeUnlocked` | 205–219 | G |
| `js/23-mastery.js` | `hpBonus` | 221–221 | G |
| `js/23-mastery.js` | `damageBonus` | 222–222 | G |
| `js/23-mastery.js` | `abilityThreshold` | 223–223 | G |
| `js/23-mastery.js` | `currentBattleMode` | 225–229 | G |
| `js/23-mastery.js` | `isJuergenProfile` | 232–235 | R |
| `js/23-mastery.js` | `abilityLevel` | 236–238 | G |
| `js/23-mastery.js` | `l2Unlocked` | 240–242 | G |
| `js/23-mastery.js` | `l2Progress` | 243–245 | G |
| `js/23-mastery.js` | `l2ChallengeEligible` | 246–252 | G |
| `js/23-mastery.js` | `playerProfileAndMode` | 254–265 | G |
| `js/23-mastery.js` | `l2TrackingContext` | 278–283 | G |
| `js/23-mastery.js` | `unlockL2ForPlayer` | 284–293 | M |
| `js/23-mastery.js` | `addL2Progress` | 294–301 | M |
| `js/23-mastery.js` | `runState` | 302–313 | G |
| `js/23-mastery.js` | `noteAbilityUse` | 314–319 | G |
| `js/23-mastery.js` | `noteSelfDamage` | 320–332 | M |
| `js/23-mastery.js` | `noteHealing` | 333–341 | M |
| `js/23-mastery.js` | `noteKill` | 342–349 | M |
| `js/23-mastery.js` | `noteAttackRoll` | 350–361 | M |
| `js/23-mastery.js` | `noteRerolledSixes` | 362–364 | M |
| `js/23-mastery.js` | `noteAnyD6` | 365–367 | M |
| `js/23-mastery.js` | `noteAttackStart` | 368–381 | M |
| `js/23-mastery.js` | `noteAttackResolved` | 382–390 | M |
| `js/23-mastery.js` | `notePoison` | 391–396 | M |
| `js/23-mastery.js` | `noteInsurance` | 397–402 | M |
| `js/23-mastery.js` | `noteCounterDamage` | 403–408 | M |
| `js/23-mastery.js` | `noteTurnStart` | 409–420 | M |
| `js/23-mastery.js` | `notePerfect25Base` | 421–426 | M |
| `js/23-mastery.js` | `notePerfect25Break` | 427–430 | G |
| `js/23-mastery.js` | `notePerfect25Permit` | 431–436 | M |
| `js/23-mastery.js` | `notePerfect25D4` | 437–441 | M |
| `js/23-mastery.js` | `noteMatchEnd` | 442–446 | M |
| `js/23-mastery.js` | `abilityLevelForPlayer` | 448–459 | G |
| `js/23-mastery.js` | `hasAbilityUpgrade` | 460–460 | G |
| `js/23-mastery.js` | `damageBonusForPlayer` | 462–469 | G |
| `js/23-mastery.js` | `abilityThresholdForPlayer` | 470–477 | G |
| `js/23-mastery.js` | `isBossMasteryEncounter` | 479–488 | R |
| `js/23-mastery.js` | `xpReward` | 490–494 | R |
| `js/23-mastery.js` | `awardXp` | 496–502 | G |
| `js/23-mastery.js` | `profileIdsForMode` | 504–508 | U |
| `js/23-mastery.js` | `profilesForMode` | 509–509 | U |
| `js/23-mastery.js` | `selectedMasteryProfile` | 510–513 | U |
| `js/23-mastery.js` | `branchData` | 515–522 | G |
| `js/23-mastery.js` | `standardNode` | 523–526 | U |
| `js/23-mastery.js` | `closePurchaseConfirm` | 527–532 | U |
| `js/23-mastery.js` | `resolveMasteryProfile` | 534–544 | G |
| `js/23-mastery.js` | `executeMasteryPurchase` | 546–618 | M |
| `js/23-mastery.js` | `ensurePurchaseConfirm` | 620–642 | U |
| `js/23-mastery.js` | `showPurchaseConfirm` | 644–659 | U |
| `js/23-mastery.js` | `bossXpBalance` | 662–665 | G |
| `js/23-mastery.js` | `renderBossXpConversion` | 667–689 | U |
| `js/23-mastery.js` | `renderStandard` | 691–718 | U |
| `js/23-mastery.js` | `abilityUnlockSequence` | 720–732 | G |
| `js/23-mastery.js` | `abilityGate` | 733–736 | G |
| `js/23-mastery.js` | `abilityGateLabel` | 737–741 | U |
| `js/23-mastery.js` | `abilityGateReached` | 742–746 | G |
| `js/23-mastery.js` | `abilityNode` | 748–763 | U |
| `js/23-mastery.js` | `abilityBranch` | 764–766 | U |
| `js/23-mastery.js` | `abilityPair` | 767–769 | U |
| `js/23-mastery.js` | `standaloneCard` | 770–773 | U |
| `js/23-mastery.js` | `showAbilityInfo` | 775–780 | U |
| `js/23-mastery.js` | `renderAbilitySheet` | 781–825 | U |
| `js/23-mastery.js` | `renderProfilePicker` | 827–830 | U |
| `js/23-mastery.js` | `renderModal` | 831–834 | U |
| `js/23-mastery.js` | `open` | 835–837 | U |
| `js/23-mastery.js` | `close` | 838–838 | U |
| `js/23-mastery.js` | `summaryFor` | 839–839 | U |
| `js/23-mastery.js` | `refreshMode` | 840–843 | U |
| `js/23-mastery.js` | `refreshAll` | 844–844 | U |
| `js/23-mastery.js` | `refreshCampaignUi` | 845–845 | U |
| `js/23-mastery.js` | `retroCompletedEncountersForProfile` | 847–869 | G |
| `js/23-mastery.js` | `applyRetroBackfill` | 871–913 | M |
| `js/23-mastery.js` | `findProfileByNames` | 915–918 | G |
| `js/23-mastery.js` | `stripJuergenPrecisionOnce` | 919–934 | M |
| `js/23-mastery.js` | `applyTrioThreefoldVerdictRetro` | 935–957 | M |
| `js/23-mastery.js` | `init` | 959–1014 | M |
| `js/23-mastery.js` | `abilityUpgrade` | 1017–1021 | G |
| `js/03d-endgame-mechanics.js` | `WDEndgameDebug.inspect` | 132 | G |
| `js/23-mastery.js` | `tr` (in `showAbilityInfo`) | 776 | U |
