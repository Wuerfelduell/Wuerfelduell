Du bist ab jetzt Entwickler am Spiel „Würfelduell“ (englisch „DiceDuel“). Du kennst
das Projekt noch nicht; alles Nötige steht hier. Antworte und committe auf Deutsch.

## Projekt
- Repository: https://github.com/Wuerfelduell/Wuerfelduell (GitHub, du hast Lese- und
  Schreibrecht). Basis ist der Branch main, Stand V28.14.22.
- Würfelspiel als Progressive Web App in reinem JavaScript, kein Framework, kein
  Bundler. Backend ist Supabase (Postgres, Realtime, Edge Functions in Deno).
- Heute rechnet beim Online-Kampf der Browser des Hosts alle Regeln und schickt den
  fertigen Zustand an Supabase („host-autoritativ“). Ziel des Gesamtprojekts: Die
  Supabase Edge Function supabase/functions/battle-action rechnet mit derselben
  Engine wie der Browser; die Clients schicken nur noch Aktionen.
- Die gemeinsame, DOM-freie Duell-Engine liegt in js/engine/:
  01-rng.js (Mulberry32, registriert globalThis.WDRng),
  02-definitions.js, 03-state.js, 04-rules.js, 05-reduce.js (registrieren
  globalThis.WDEngine mit definitions, createState, validateState, actions,
  reduce(state, action, rng) -> {state, events, rejected?}).
  Jede Datei ist eine IIFE (function(root){…})(globalThis) ohne Imports.
  So lädt Node sie heute schon, siehe Kopf von scripts/qa/engine-runde.mjs:
    for (const file of ['../../js/engine/02-definitions.js', …]) await import(new URL(file, import.meta.url));
- Der State hat ein Feld rng = {algorithm:'mulberry32', seed, state, drawIndex}.
  Der Server soll später den Seed privat halten und den RNG-Fortschritt nach
  jeder Aktion speichern.
- Pflichtlektüre vor dem Start: docs/PROJEKTREGELN.md und in
  docs/SERVER-ENGINE-ENTWURF.md die Abschnitte „Zustandsschema und API“,
  „Reducer und Ereignisse“, „Zufall und Reproduzierbarkeit“ und
  „Online-Ablauf nach Phase 3“. Außerdem scripts/qa/engine-runde.mjs und
  scripts/qa/engine-paritaet.mjs ansehen (wie Duelle mit festen Seeds und Bots
  durchgespielt werden).

## Deine Aufgabe („Schritt 6, Deno-Teil“)
Die Engine soll unverändert unter Deno in einer Supabase Edge Function laufen und
dort bitgenau dieselben Ergebnisse liefern wie in Node. Edge Functions sehen beim
Deployment nur den Ordner supabase/functions/, deshalb wird die Engine dorthin
KOPIERT (nie von Hand gepflegt).

Liefern:
1. scripts/sync-engine-deno.mjs (Node):
   - kopiert js/engine/01-rng.js bis 05-reduce.js nach
     supabase/functions/_shared/engine/ und setzt oben einen Kopfkommentar
     „Erzeugt aus js/engine/<name> durch scripts/sync-engine-deno.mjs. Nicht von
     Hand ändern.“; der Rest der Datei ist bytegleich.
   - mit --check: ändert nichts, beendet mit Exit 1 und klarer Meldung, sobald eine
     Kopie fehlt oder vom Original abweicht.
2. supabase/functions/_shared/engine.ts:
   - lädt die fünf Kopien in fester Reihenfolge per Seiteneffekt-Import,
   - exportiert typisiert: createState, validateState, reduce, actions,
     definitions, sowie createServerRng(rngState) -> ein rng-Objekt für reduce,
     das ausschließlich aus state.rng zieht und drawIndex/state fortschreibt.
   - kein DOM, kein Date.now, kein Math.random, keine Netzwerkzugriffe.
   - Ändere battle-action/index.ts NICHT; die Verdrahtung kommt später.
3. scripts/qa/engine-deno-paritaet.mjs (Node, startet Deno als Kindprozess):
   - erzeugt in Node für alle 20 Kombinationen (classic, endurance50, overload75,
     mayhem × 2, 3, 4, 5, 6 Spieler) je mindestens 15 Seeds vollständige Duelle
     (mehrere Runden bis Matchende) mit einem Bot als Aktionsproduzent
     außerhalb des Reducers (Vorbild: engine-runde.mjs / engine-paritaet.mjs),
   - schreibt Setup, Seed und Aktionsfolge als JSON in ein Temp-Verzeichnis,
   - spielt dieselbe Folge unter Deno über supabase/functions/_shared/engine.ts
     nach (deno run --allow-read …, KEIN --allow-all),
   - vergleicht nach JEDER Aktion State und Events per JSON.stringify bytegenau
     und meldet die erste Abweichung mit Kombination, Seed, Aktionsindex und Diff,
   - gibt am Ende eine Tabelle Kombination | Duelle | Aktionen | Abweichungen aus,
   - ohne installiertes Deno: Exit 2 mit Installationshinweis, niemals grün.
   - Deno installieren, falls nicht vorhanden: curl -fsSL https://deno.land/install.sh | sh
     (Deno 2.x).

Vorgehen:
1. git checkout -b codex/engine-deno origin/main, dann npm ci.
2. Erst den Paritätsprüfstand bauen und mit einer absichtlich verfälschten Kopie
   zeigen, dass er rot wird (dann Kopie wiederherstellen).
3. Dann sync-Skript und engine.ts fertigstellen, bis alles grün ist.
4. npm run check muss unverändert grün sein.

## Grenzen (wichtig, drei Kollegen arbeiten parallel im selben Repo)
- Du darfst NUR anlegen/ändern: scripts/sync-engine-deno.mjs,
  scripts/qa/engine-deno-paritaet.mjs und Dateien unter
  supabase/functions/_shared/ (inkl. ggf. supabase/functions/_shared/deno.json).
- NICHT anfassen: js/** (auch nicht js/engine/*), index.html, package.json,
  package-lock.json, supabase/functions/battle-action/**, supabase/migrations/**,
  supabase/tests/**, supabase/config.toml, version.json, sw.js, AI_Handover.md, docs/*.
- Falls eine Engine-Datei unter Deno nicht läuft (z. B. ein Sloppy-Mode-Konstrukt
  oder ein Browser-Global): Engine-Datei NICHT ändern, sondern im PR genau benennen
  (Datei, Zeile, Fehlermeldung). Das wird separat gelöst.
- KEIN node scripts/bump-version.mjs, KEIN Changelog-Eintrag.
- Kein Deployment, keine Verbindung zum Live-Supabase-Projekt, keine Keys.
- Kein Modellname in Commits, PR oder Code. Commitnachrichten auf Deutsch, sie
  erklären warum.

## Abgabe
- Pushe auf codex/engine-deno und öffne einen Draft-Pull-Request auf main mit dem
  Titel „Schritt 6: Engine unter Deno, Parität Node/Deno“.
- Im PR-Text: Deno-Version, Ergebnistabelle aus engine-deno-paritaet.mjs, Beleg
  dass der Prüfstand bei verfälschter Kopie rot wird, geänderte Dateien,
  durchgeführte Prüfungen.
- Fertig ist es erst, wenn node scripts/sync-engine-deno.mjs --check,
  node scripts/qa/engine-deno-paritaet.mjs und npm run check grün sind.
