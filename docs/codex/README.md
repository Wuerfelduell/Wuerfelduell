# Codex-Prompts: Umzug Online-Kampf auf Supabase-Serverautorität

Stand 05.10.2026, Basis `main` = V28.14.22. Drei Prompts für drei **neue, leere** Codex-Chats.
Jeder Prompt ist vollständig eigenständig und kann 1:1 eingefügt werden. Die drei laufen
gleichzeitig: jeder hat seinen eigenen Branch und seine eigenen Dateien.
Versionssprung, Changelog und das Einhängen in `npm run check` macht Claude bei der Zusammenführung.

| Chat | Aufgabe | Branch |
|---|---|---|
| A | Restliche lokale Duelle auf die gemeinsame Engine umschalten | `codex/engine-5b2` |
| B | Engine in der Supabase Edge Function (Deno) lauffähig machen und gegen Node prüfen | `codex/engine-deno` |
| C | Datenbank für serverautoritative Online-Kämpfe (Migration + SQL-Tests) | `codex/server-authority-db` |

---

## Chat A: Lokale Duelle auf die gemeinsame Engine umschalten

```text
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
```

---

## Chat B: Engine in der Supabase Edge Function (Deno)

```text
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
```

---

## Chat C: Datenbank für serverautoritative Online-Kämpfe

```text
Du bist ab jetzt Backend-Entwickler am Spiel „Würfelduell“ (englisch „DiceDuel“).
Du kennst das Projekt noch nicht; alles Nötige steht hier. Antworte und committe
auf Deutsch.

## Projekt
- Repository: https://github.com/Wuerfelduell/Wuerfelduell (GitHub, du hast Lese- und
  Schreibrecht). Basis ist der Branch main, Stand V28.14.22.
- Würfelspiel als Progressive Web App. Backend ist Supabase: Postgres mit RLS,
  Realtime, Auth (auch anonym), Edge Functions in Deno.
- Online-Kampf heute („host-autoritativ“): Lobby, Raumcodes, Matchstart, Realtime
  und Reconnect laufen über Supabase. Die Spielregeln rechnet aber der Browser des
  Hosts und schreibt den fertigen Zustand per RPC dd_publish_battle_state in
  public.dd_battle_states. Gäste schicken ihre Eingaben per dd_submit_battle_action.
- Ziel: „serverautoritativ“. Die Edge Function supabase/functions/battle-action
  rechnet künftig mit der gemeinsamen Engine (wird parallel von einem Kollegen
  vorbereitet). Deine Aufgabe ist die DATENBANKSEITE dafür: die Edge Function holt
  sich über eine RPC den Kontext, rechnet, und schreibt über eine zweite RPC das
  Ergebnis atomar zurück.
- Projektregeln für Supabase: Alle Schreibzugriffe laufen über SECURITY DEFINER-RPCs
  mit set search_path = ''; Tabellen haben für Browser nur SELECT-Regeln. Im Browser
  liegt nur der publishable key. Keine Keys oder Tokens ins Repo.
- Pflichtlektüre vor dem Start:
  docs/PROJEKTREGELN.md (Abschnitt „Online / Supabase“),
  docs/SERVER-ENGINE-ENTWURF.md (Abschnitte „Zufall und Reproduzierbarkeit“ und
  „Online-Ablauf nach Phase 3“ — das ist die Spezifikation, an die du dich hältst),
  supabase/migrations/20260902170000_diceduel_backend_foundation.sql (Tabellen
  dd_battle_rooms, dd_battle_members, dd_battle_states, dd_battle_actions,
  dd_battle_events; RPCs dd_start_battle, dd_submit_battle_action,
  dd_publish_battle_state, dd_get_battle_snapshot),
  supabase/migrations/20260903120000_dd_room_idle_expiry.sql (aktuelle Fassung von
  dd_submit_battle_action und dd_publish_battle_state),
  die übrigen Migrationen in supabase/migrations/ (Online-Statistik hängt an
  dd_battle_states; nicht kaputt machen),
  supabase/tests/00-bootstrap.sql, 10-raum-ablauf.sql, 20-matchstart.sql und
  scripts/qa/supabase-raumtest.sh (so werden Migrationen lokal gegen echtes
  Postgres getestet; auth.uid() kommt dort aus der Sitzungsvariable wd.uid).
- Wer gerade am Zug ist bzw. entscheiden darf, steht heute im State-JSON:
  coalesce(state->>'interactionOwnerUid', state->>'currentPlayerUid').

## Deine Aufgabe
Eine NEUE Migration supabase/migrations/20261005120000_dd_server_authority.sql:

1. dd_battle_rooms.authority text not null default 'host'
   check (authority in ('host','server')). Alle bestehenden Räume bleiben 'host'.
   dd_create_battle_room bekommt KEINE neue Pflicht-Signatur; setze authority über
   eine eigene RPC dd_set_battle_authority(p_room_id, p_authority), nur Host, nur
   im Status 'lobby'.
2. Privates Schema dd_battle_private mit Tabelle match_rng(room_id pk/fk cascade,
   match_id, rule_version text, seed bigint 0..4294967295, rng_state bigint,
   draw_index bigint >= 0, created_at, updated_at). Kein Zugriff (auch kein SELECT,
   keine Realtime-Publication) für anon und authenticated.
3. Seed beim Matchstart: Wenn dd_start_battle einen Raum mit authority='server'
   startet, wird match_rng mit einem kryptographisch zufälligen uint32 angelegt
   (extensions.gen_random_bytes(4) aus pgcrypto; in 00-bootstrap.sql ggf.
   create extension pgcrypto with schema extensions ergänzen). Für 'host' bleibt
   dd_start_battle exakt funktionsgleich.
4. dd_server_load_action(p_room_id uuid, p_user_id uuid, p_client_action_id text,
   p_base_seq bigint, p_action_type text, p_payload jsonb) returns jsonb
   - nur für service_role ausführbar (revoke von public, anon, authenticated).
   - prüft: Mitglied, Raumstatus 'playing', authority='server', Entscheidungsrecht
     (s. o., mit p_user_id statt auth.uid()), Action-ID-Format und Typ wie im
     bestehenden dd_submit_battle_action, baseSeq = aktuelles seq.
   - Ist die Action-ID für diesen Raum schon verbucht: mit gleicher Nutzlast das
     gespeicherte Ergebnis zurückgeben ({replay:true, …}); mit anderer Nutzlast
     Fehler DD_ACTION_ID_REUSED.
   - liefert {state, seq, matchId, seat, rng:{seed, state, drawIndex}, ruleVersion}.
5. dd_server_commit_action(p_room_id uuid, p_user_id uuid, p_client_action_id text,
   p_base_seq bigint, p_action_type text, p_payload jsonb, p_next_state jsonb,
   p_rng_state bigint, p_draw_index bigint, p_events jsonb) returns jsonb
   - nur service_role. EINE Transaktion, Zeile in dd_battle_states mit FOR UPDATE.
   - prüft Berechtigung und baseSeq erneut (Compare-and-swap; bei Abweichung
     DD_STALE_STATE mit errcode '40001'), draw_index darf nicht sinken.
   - schreibt dd_battle_states (seq+1, state, action_id, action_type),
     match_rng (rng_state, draw_index), dd_battle_actions (Status 'applied',
     eindeutig je Raum + Action-ID) und je Event eine Zeile dd_battle_events.
   - Wiederholung derselben Action-ID: gespeichertes Ergebnis, KEIN zweiter
     seq-Sprung. Gleiche ID, andere Nutzlast: DD_ACTION_ID_REUSED.
   - Die bestehende Statistik-Erfassung (Trigger/Funktion
     dd_stats_private.capture_final_state) muss beim finalen State weiter greifen.
6. dd_publish_battle_state und dd_submit_battle_action: bei authority='server'
   Fehler DD_SERVER_AUTHORITATIVE. Für 'host' exakt wie heute (neue Fassung per
   create or replace, ausgehend von der aktuellsten Version aus idle_expiry).
7. Der Seed darf vor Matchende nie bei einem Browser ankommen:
   dd_get_battle_snapshot und alle für authenticated lesbaren Tabellen bleiben
   ohne Seed.
8. Am Ende der Migration: alle Rechte explizit (revoke/grant), wie in der
   Foundation-Migration.

Tests: neue Datei supabase/tests/30-server-autoritaet.sql im Stil von
20-matchstart.sql, mindestens diese Fälle:
- Host-Raum: Ablauf aus 10/20 unverändert grün.
- Server-Raum: Seed nach Start vorhanden, Snapshot ohne Seed.
- Server-Raum: dd_publish_battle_state und dd_submit_battle_action abgelehnt.
- Als authenticated: kein SELECT auf dd_battle_private.match_rng, kein EXECUTE auf
  dd_server_load_action / dd_server_commit_action.
- Commit mit falschem baseSeq: DD_STALE_STATE / 40001.
- Commit durch Nicht-Entscheider: abgelehnt.
- Doppelte Action-ID mit gleicher Nutzlast: gleiches Ergebnis, seq nur +1.
- Gleiche Action-ID, andere Nutzlast: DD_ACTION_ID_REUSED.
- draw_index rückwärts: abgelehnt.
Trage Migration und Test in scripts/qa/supabase-raumtest.sh ein (die Liste der
eingespielten Migrationen ist dort fest verdrahtet; alle Migrationen in
Zeitstempel-Reihenfolge einspielen).

Vorgehen:
1. git checkout -b codex/server-authority-db origin/main
2. Postgres lokal: das Skript sucht initdb; unter Debian/Ubuntu
   apt-get install -y postgresql.
3. Erst die Tests schreiben und gegen den alten Stand laufen lassen (müssen rot
   sein), dann die Migration bis alles grün ist.
4. npm ci && npm run check muss unverändert grün sein.

## Grenzen (wichtig, drei Kollegen arbeiten parallel im selben Repo)
- Du darfst NUR ändern/anlegen: die neue Migration, supabase/tests/30-server-autoritaet.sql,
  supabase/tests/00-bootstrap.sql (nur Ergänzungen), scripts/qa/supabase-raumtest.sh.
- Bestehende Migrationen NIE editieren, nur per neuer Migration ersetzen.
- NICHT anfassen: js/**, index.html, package.json, supabase/functions/**,
  supabase/config.toml, scripts/validate-supabase.mjs, version.json, sw.js,
  AI_Handover.md, docs/*.
- NICHTS im Live-Supabase-Projekt einspielen, keine Verbindung dorthin, keine Keys.
  Das entscheidet der Projektinhaber nach dem Review.
- KEIN node scripts/bump-version.mjs, KEIN Changelog-Eintrag.
- Kein Modellname in Commits, PR oder Code. Commitnachrichten auf Deutsch, sie
  erklären warum.

## Abgabe
- Pushe auf codex/server-authority-db und öffne einen Draft-Pull-Request auf main
  mit dem Titel „Serverautorität: Datenbank, privater Seed, Commit-RPC“.
- Im PR-Text: jede neue oder geänderte Funktion mit Signatur und wer sie ausführen
  darf, Ausgabe von bash scripts/qa/supabase-raumtest.sh, geänderte Dateien,
  offene Fragen.
- Fertig ist es erst, wenn bash scripts/qa/supabase-raumtest.sh und npm run check
  grün sind.
```
