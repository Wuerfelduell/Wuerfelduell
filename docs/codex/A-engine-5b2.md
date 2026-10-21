Du bist ab jetzt Entwickler am Spiel „Würfelduell“ (englisch „DiceDuel“). Du kennst
das Projekt noch nicht; alles Nötige steht hier. Antworte und committe auf Deutsch.

## Projekt
- Repository: https://github.com/Wuerfelduell/Wuerfelduell (GitHub, du hast Lese- und
  Schreibrecht). Basis ist der Branch main, Stand V28.14.22.
- Würfelspiel als Progressive Web App in reinem JavaScript. Kein Framework, kein
  Bundler, keine ES-Module im Browser: die Dateien js/00-*.js bis js/47-*.js werden
  in dieser Reihenfolge per <script> aus index.html geladen, jede ist eine IIFE.
  ACHTUNG: js/01-config.js bis js/15-app.js teilen sich einen Scope. Ein doppelter
  const-Name über zwei Dateien killt still das ganze Script.
- Online-Spiel läuft über Supabase. Heute rechnet beim Online-Kampf der Browser des
  Hosts alle Regeln und schickt den Zustand an Supabase („host-autoritativ“). Ziel
  des Gesamtprojekts: Der Server rechnet. Dafür gibt es eine gemeinsame,
  DOM-freie Duell-Engine, die Browser und Server gleich benutzen.
- Die Engine liegt in js/engine/:
  01-rng.js (Mulberry32-Zufall), 02-definitions.js (Fähigkeiten, Modi),
  03-state.js (createState/validateState), 04-rules.js, 05-reduce.js
  (WDEngine.reduce(state, action, rng) -> {state, events}), 06-adapter.js
  (Übersetzer zwischen dem alten Browser-Spielzustand und dem Engine-State).
- Pflichtlektüre vor dem Start, in dieser Reihenfolge:
  docs/PROJEKTREGELN.md, docs/SERVER-ENGINE-ENTWURF.md (vor allem die Tabelle
  „Freigegebener Umfang und Lieferreihenfolge“ und „Reducer und Ereignisse“),
  docs/SERVER-ENGINE-INVENTAR.md, im AI_Handover.md den Abschnitt
  „Fallen in diesem Repo“.

## Ausgangslage
Seit V28.14.19 („Schritt 5b-1“) läuft genau EIN Fall produktiv über die Engine: das
lokale Duell im Modus classic mit 2 Spielern. Das steuert:
- js/01-config.js Zeile 5: let ENGINE_LOKALES_DUELL=true;
- js/13-battle-actions.js ab Zeile ~36: die Bedingung
  ENGINE_LOKALES_DUELL===true && localModeId==="classic" && players.length===2 && …
  plus die Umschaltlogik (Engine-Pfad mit Fallback auf den Altpfad)
- js/14-round-flow.js: Rundenwechsel im Engine-Pfad
- js/engine/06-adapter.js: Spiegel Engine-State <-> Browser-State
  (Zuordnung je Spieler über engineSeat, nicht über den Array-Index!)
- scripts/qa/engine-umschaltung.mjs: Playwright-Prüfstand, spielt Bot-Duelle im
  echten Browser einmal über den Altpfad und einmal über die Engine und vergleicht
  alles. Standard 20 Seeds, --full 300 Seeds.
Die Engine selbst kann alle vier Modi (classic, endurance50, overload75, mayhem)
mit 2 bis 6 Spielern; das ist in Node-Tests (scripts/qa/engine-basis.mjs,
engine-angriff.mjs, engine-runde.mjs) und mit 1.500 Schattenduellen belegt.

## Deine Aufgabe („Schritt 5b-2“)
Schalte ALLE übrigen lokalen Duelle produktiv auf die Engine um:
classic mit mehr als 2 Spielern, endurance50, overload75 und mayhem, jeweils mit
genau den Spielerzahlen und Botfreigaben, die die Spielvorbereitung heute erlaubt
(siehe LOCAL_MODES in js/engine/02-definitions.js und die Setup-Oberfläche).
Kampagne, Encounter, Boss Rush, Tutorial, Testumgebung und Online bleiben auf dem
Altpfad und dürfen sich nicht verändern.

Vorgehen:
1. Branch anlegen: git checkout -b codex/engine-5b2 origin/main
2. Einmalig: npm ci. Chromium: Wenn /opt/pw-browsers/chromium existiert, wird es
   benutzt; sonst npx playwright install chromium (Linux ggf. --with-deps).
3. ZUERST den Prüfstand erweitern, dann umschalten (Regel des Projekts: Messskript
   vor der Änderung, gegen die Anforderung). engine-umschaltung.mjs soll jede
   neu umgeschaltete Kombination Modus × Spielerzahl abdecken, je Seed drei Runden,
   und Zustand nach jeder Aktion vergleichen. Standardlauf schlank (ca. 5 Seeds je
   Kombination), --full mindestens 50 Seeds je Kombination.
4. Prüfstand laufen lassen: er muss für die neuen Kombinationen ROT sein, solange
   sie noch nicht umgeschaltet sind (beweist, dass er misst).
5. Bedingung in js/13 erweitern, Spiegel in 06-adapter.js und Rundenfluss in js/14
   nachziehen, bis alles grün ist. Der Fallback auf den Altpfad bleibt erhalten.
6. npm run check muss grün sein.

## Grenzen (wichtig, drei Kollegen arbeiten parallel im selben Repo)
- Du darfst NUR diese Dateien ändern: js/13-battle-actions.js, js/14-round-flow.js,
  js/15-app.js, js/engine/06-adapter.js, scripts/qa/engine-umschaltung.mjs.
  js/01-config.js nur, wenn ein zusätzlicher Schalter wirklich nötig ist.
- NICHT anfassen: js/engine/01-rng.js bis 05-reduce.js (Engine-Kern), index.html,
  package.json, package-lock.json, version.json, sw.js, lang/*, AI_Handover.md,
  docs/*, supabase/**, js/online/**, js/40-* bis js/47-*.
- KEIN node scripts/bump-version.mjs, KEIN Changelog-Eintrag. Das macht die
  Zusammenführung.
- Spielregeln nicht ändern. Findest du eine Abweichung, die nur durch eine
  Änderung im Engine-Kern lösbar wäre: nicht still korrigieren. Diese Kombination
  im Altpfad lassen und im PR mit Modus, Spielerzahl, Seed und Aktionsfolge
  beschreiben.
- Kein Modellname in Commits, PR oder Code. Commitnachrichten auf Deutsch, sie
  erklären warum.

## Abgabe
- Pushe auf codex/engine-5b2 und öffne einen Draft-Pull-Request auf main mit dem
  Titel „Schritt 5b-2: lokale Duelle auf die Engine“.
- Im PR-Text: Tabelle Kombination | Seeds | Aktionen | Abweichungen (aus dem
  --full-Lauf), jede im Altpfad belassene Kombination mit Grund, geänderte
  Dateien, durchgeführte Prüfungen mit Ergebnis.
- Fertig ist es erst, wenn npm run check und
  node scripts/qa/engine-umschaltung.mjs --full grün sind.
