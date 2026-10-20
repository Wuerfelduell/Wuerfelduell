#!/usr/bin/env bash
# Migrationen gegen ein echtes Postgres pruefen.
# ==================================================================
# Wozu: SQL laesst sich nicht am Bildschirm nachlesen. Die Aenderung an
# der Ablaufzeit hat eine Falle, die man nur im Betrieb sieht - wer das
# Fenster kuerzt, ohne die Zeit bei Aktivitaet nachzuziehen, loescht
# laufende Matches, sobald irgendwer einen neuen Raum aufmacht.
#
# Das Skript startet dafuer ein eigenes Postgres im Temp-Verzeichnis,
# spielt Bootstrap und alle Migrationen in Zeitstempel-Reihenfolge ein und laesst die Zusicherungen
# aus supabase/tests/ laufen. Danach raeumt es sich wieder ab.
#
# Es prueft sich ausserdem selbst: in einer zweiten Datenbank wird die
# NAIVE Variante gebaut (Fenster gekuerzt, Zeit nicht nachgezogen). Dort
# MUSS das laufende Match sterben. Tut es das nicht, misst der Test nichts
# und meldet das statt gruen zu sein.
#
# Aufruf:  bash scripts/qa/supabase-raumtest.sh
set -uo pipefail

WURZEL="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BIN=""
for kandidat in /usr/lib/postgresql/*/bin /usr/local/pgsql/bin /opt/homebrew/opt/postgresql*/bin; do
  [ -x "$kandidat/initdb" ] && BIN="$kandidat" && break
done
if [ -z "$BIN" ]; then
  command -v initdb >/dev/null && BIN="$(dirname "$(command -v initdb)")"
fi
if [ -z "$BIN" ]; then
  echo "Kein Postgres gefunden. Unter Debian/Ubuntu:  apt-get install -y postgresql"
  exit 1
fi

ORT="$(mktemp -d /var/tmp/wd-pgtest.XXXXXX)"
PORT="${WD_PG_PORT:-5455}"

# Postgres weigert sich, als root zu laufen. Als root wird deshalb auf einen
# unprivilegierten Nutzer gewechselt, sonst laeuft alles unter dem eigenen.
ALS=""
if [ "$(id -u)" = "0" ]; then
  if id postgres >/dev/null 2>&1; then ALS="postgres"
  else echo "Als root wird der Benutzer 'postgres' gebraucht (useradd -m postgres)."; exit 1; fi
  chown "$ALS":"$ALS" "$ORT"
fi
lauf() { if [ -n "$ALS" ]; then su "$ALS" -c "$1"; else bash -c "$1"; fi; }

aufraeumen() {
  lauf "$BIN/pg_ctl -D $ORT/data -m immediate stop" >/dev/null 2>&1
  rm -rf "$ORT"
}
trap aufraeumen EXIT

cp "$WURZEL"/supabase/tests/*.sql "$WURZEL"/supabase/migrations/*.sql "$ORT"/
[ -n "$ALS" ] && chown "$ALS":"$ALS" "$ORT"/*.sql

lauf "$BIN/initdb -D $ORT/data -U postgres --auth=trust" >/dev/null 2>&1 || { echo "initdb fehlgeschlagen"; exit 1; }
lauf "$BIN/pg_ctl -D $ORT/data -o '-k $ORT -p $PORT -c listen_addresses=' -l $ORT/log start -w" >/dev/null 2>&1 \
  || { echo "Postgres startete nicht:"; cat "$ORT/log"; exit 1; }

psql_() { lauf "psql -h $ORT -p $PORT -U postgres -d $1 -v ON_ERROR_STOP=1 -q ${*:2}"; }

fehler=0

echo "== Migrationen einspielen =="
for datei in 00-bootstrap.sql \
  20260902170000_diceduel_backend_foundation.sql \
  20260903120000_dd_room_idle_expiry.sql \
  20260916120000_dd_touch_room_revoke_authenticated.sql \
  20260916135541_online_stats_foundation.sql \
  20260916141907_online_stats_capture.sql \
  20260916143946_online_stats_unarmed_bots.sql \
  20260916160029_online_stats_capture_fail_open.sql \
  20260916164750_online_stats_retention.sql \
  20261019120000_dd_server_authority.sql; do
  if ! psql_ postgres -f "$ORT/$datei" >/dev/null 2>&1; then
    echo "  FEHLER beim Einspielen von $datei"
    psql_ postgres -f "$ORT/$datei" 2>&1 | tail -5
    exit 1
  fi
  echo "  eingespielt: $datei"
done

# Wer keine CLI hat, fuegt die Migration im SQL-Editor ein. Dabei passiert es,
# dass jemand denselben Block ein zweites Mal einfuegt. Das darf nichts kaputt
# machen und muss ohne Fehler durchlaufen, sonst bleibt die Datenbank halb
# umgestellt zurueck. Die Wiederholung laeuft getrennt, damit sie neuere
# RPC-Fassungen in der eigentlichen Testdatenbank nicht ueberschreibt.
ablauf="$(basename "$WURZEL"/supabase/migrations/*idle_expiry.sql)"
if ! lauf "psql -h $ORT -p $PORT -U postgres -q -c 'create database wiederholung'" >/dev/null 2>&1 \
  || ! psql_ wiederholung -f "$ORT/00-bootstrap.sql" >/dev/null 2>&1 \
  || ! psql_ wiederholung -f "$ORT/20260902170000_diceduel_backend_foundation.sql" >/dev/null 2>&1 \
  || ! psql_ wiederholung -f "$ORT/$ablauf" >/dev/null 2>&1; then
  echo "  FEHLER: Wiederholungsdatenbank konnte nicht vorbereitet werden"
  exit 1
fi
if psql_ wiederholung -f "$ORT/$ablauf" >/dev/null 2>&1; then
  echo "  ok: die Ablauf-Migration laeuft auch ein zweites Mal durch"
else
  echo "  FEHLER: die Ablauf-Migration bricht beim zweiten Einspielen ab"
  psql_ wiederholung -f "$ORT/$ablauf" 2>&1 | tail -4
  fehler=1
fi

anzahl=0
for test in 10-raum-ablauf.sql 20-matchstart.sql 30-server-autoritaet.sql; do
  echo
  echo "== Zusicherungen: $test =="
  if ausgabe="$(psql_ postgres -f "$ORT/$test" 2>&1)"; then
    echo "$ausgabe" | grep -E '^(ok|FEHLER):' | sed 's/^/  /'
  else
    echo "  FEHLER: SQL-Abbruch in $test"
    echo "$ausgabe" | tail -12
    fehler=1
  fi
  if echo "$ausgabe" | grep -q '^FEHLER:'; then fehler=1; fi
  treffer="$(echo "$ausgabe" | grep -c '^ok:')"
  if [ "$treffer" -eq 0 ]; then
    echo "  FEHLER: $test hat keine Zusicherung ausgefuehrt"
    fehler=1
  fi
  anzahl=$((anzahl + treffer))
done

echo
echo "== Selbstprobe: die naive Variante MUSS durchfallen =="
lauf "psql -h $ORT -p $PORT -U postgres -q -c 'create database naiv'" >/dev/null 2>&1
psql_ naiv -f "$ORT/00-bootstrap.sql" >/dev/null 2>&1
psql_ naiv -f "$ORT/$(basename "$WURZEL"/supabase/migrations/*foundation.sql)" >/dev/null 2>&1
lauf "psql -h $ORT -p $PORT -U postgres -d naiv -q -c \"alter table public.dd_battle_rooms alter column expires_at set default (now() + interval '45 minutes')\"" >/dev/null 2>&1
probe="$(psql_ naiv -f "$ORT/10-raum-ablauf.sql" 2>&1 | grep -E '^(ok|FEHLER):')"
if echo "$probe" | grep -q 'FEHLER: das laufende Match wurde mitten im Spiel geloescht'; then
  echo "  ok: ohne das Nachziehen der Ablaufzeit stirbt das laufende Match - der Test greift"
else
  echo "  FEHLER: die naive Variante kam durch. Der Test misst nicht, was er messen soll."
  echo "$probe" | sed 's/^/    /'
  fehler=1
fi

echo
if [ "$fehler" = "0" ]; then
  echo "$anzahl Zusicherungen erfuellt, Selbstprobe bestanden."
else
  echo "Es gab Abweichungen."
fi
exit "$fehler"
