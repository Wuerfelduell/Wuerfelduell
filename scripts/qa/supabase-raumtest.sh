#!/usr/bin/env bash
# Migrationen gegen ein echtes Postgres pruefen.
# ==================================================================
# Wozu: SQL laesst sich nicht am Bildschirm nachlesen. Die Aenderung an
# der Ablaufzeit hat eine Falle, die man nur im Betrieb sieht - wer das
# Fenster kuerzt, ohne die Zeit bei Aktivitaet nachzuziehen, loescht
# laufende Matches, sobald irgendwer einen neuen Raum aufmacht.
#
# Das Skript startet dafuer ein eigenes Postgres im Temp-Verzeichnis,
# spielt Bootstrap und beide Migrationen ein und laesst die Zusicherungen
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
for datei in 00-bootstrap.sql "$(basename "$WURZEL"/supabase/migrations/*foundation.sql)" "$(basename "$WURZEL"/supabase/migrations/*idle_expiry.sql)"; do
  if ! psql_ postgres -f "$ORT/$datei" >/dev/null 2>&1; then
    echo "  FEHLER beim Einspielen von $datei"
    psql_ postgres -f "$ORT/$datei" 2>&1 | tail -5
    exit 1
  fi
  echo "  eingespielt: $datei"
done

echo
echo "== Zusicherungen =="
ausgabe="$(psql_ postgres -f "$ORT/10-raum-ablauf.sql" 2>&1 | grep -E '^(ok|FEHLER):')"
echo "$ausgabe" | sed 's/^/  /'
if echo "$ausgabe" | grep -q '^FEHLER:'; then fehler=1; fi
anzahl="$(echo "$ausgabe" | grep -c '^ok:')"

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
