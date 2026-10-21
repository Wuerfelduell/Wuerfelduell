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
