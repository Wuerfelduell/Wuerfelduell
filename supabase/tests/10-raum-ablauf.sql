/* Zusicherungen zu Raumablauf und State-Schreibweg.
   ==================================================================
   Laeuft gegen eine Datenbank mit 00-bootstrap.sql und beiden
   Migrationen. Jede Pruefung gibt genau eine Zeile aus, die mit "ok:"
   oder "FEHLER:" beginnt; der Laeufer sucht nach "FEHLER:".

   Geprueft wird das, was beim Kuerzen der Ablaufzeit schiefgehen kann:
   dass ein laufendes Match das opportunistische Aufraeumen ueberlebt,
   und dass eine verlassene Lobby es nicht ueberlebt.
*/
\t on
\pset format unaligned

insert into auth.users(id,email) values
  ('11111111-1111-1111-1111-111111111111','host@test'),
  ('22222222-2222-2222-2222-222222222222','gast@test'),
  ('33333333-3333-3333-3333-333333333333','fremd@test')
on conflict do nothing;

-- Raum anlegen
set wd.uid='11111111-1111-1111-1111-111111111111';
select set_config('wd.room',(select id::text from public.dd_create_battle_room(2,'classic','test','{"name":"Host"}')),false);
select set_config('wd.code',(select code from public.dd_battle_rooms where id=current_setting('wd.room')::uuid),false);

select case when round(extract(epoch from (expires_at-now()))/60) between 40 and 50
  then 'ok: neuer Raum laeuft in '||round(extract(epoch from (expires_at-now()))/60)::text||' Minuten ab'
  else 'FEHLER: neuer Raum laeuft in '||round(extract(epoch from (expires_at-now()))/60)::text||' Minuten ab, erwartet ~45' end
from public.dd_battle_rooms where id=current_setting('wd.room')::uuid;

-- Beitreten, bereit melden, starten
set wd.uid='22222222-2222-2222-2222-222222222222';
select set_config('wd.egal',(select id::text from public.dd_join_battle_room(current_setting('wd.code'),'{"name":"Gast"}') limit 1),false);
select set_config('wd.egal',(public.dd_set_battle_ready(current_setting('wd.room')::uuid,true))::text,false);
set wd.uid='11111111-1111-1111-1111-111111111111';
select set_config('wd.egal',(public.dd_set_battle_ready(current_setting('wd.room')::uuid,true))::text,false);
select set_config('wd.egal',(public.dd_start_battle(current_setting('wd.room')::uuid,'{"matchId":"m1"}'))::text,false);

-- Einen erkennbar grossen State veroeffentlichen
select set_config('wd.egal',(public.dd_publish_battle_state(
  current_setting('wd.room')::uuid,1,
  jsonb_build_object('grosserBlock',repeat('x',2000))))::text,false);

select case when (match->'state') ? 'grosserBlock'
  then 'FEHLER: der State steht doppelt, auch in dd_battle_rooms.match'
  else 'ok: der State steht nur in dd_battle_states' end
from public.dd_battle_rooms where id=current_setting('wd.room')::uuid;

select case when (public.dd_get_battle_snapshot(current_setting('wd.room')::uuid)->'match'->'state') ? 'grosserBlock'
  then 'ok: der Snapshot liefert den State vollstaendig'
  else 'FEHLER: der Snapshot hat den State verloren' end;

select case when round(extract(epoch from (expires_at-now()))/60) between 110 and 125
  then 'ok: laufendes Match laeuft in '||round(extract(epoch from (expires_at-now()))/60)::text||' Minuten ab'
  else 'FEHLER: laufendes Match laeuft in '||round(extract(epoch from (expires_at-now()))/60)::text||' Minuten ab, erwartet ~120' end
from public.dd_battle_rooms where id=current_setting('wd.room')::uuid;

-- Die Schreibsperre: ein zweiter Publish darf die Raumzeile nicht erneut anfassen,
-- sonst kostet das Nachziehen genau die Realtime-Nachricht, die wir sparen wollen.
select set_config('wd.xmin',(select xmin::text from public.dd_battle_rooms where id=current_setting('wd.room')::uuid),false);
select set_config('wd.egal',(public.dd_publish_battle_state(current_setting('wd.room')::uuid,2,'{"a":1}'::jsonb))::text,false);
select case when xmin::text=current_setting('wd.xmin')
  then 'ok: die Raumzeile bleibt beim naechsten Zug unberuehrt'
  else 'FEHLER: jeder Zug schreibt die Raumzeile neu' end
from public.dd_battle_rooms where id=current_setting('wd.room')::uuid;

/* Kernpunkt. Ohne vergangene Zeit beweist das Aufraeumen nichts - ein Raum,
   der vor zwei Sekunden entstand, ueberlebt es in jeder Variante. Deshalb
   wird hier Spielzeit vorgespult: die Ablaufzeit wird von Hand in die
   Vergangenheit gesetzt, so wie sie nach einer langen Partie oder einer
   Denkpause ohne Nachziehen staende. Danach folgt ein ganz normaler Zug.
   Der muss den Raum retten. Tut er das nicht, loescht der naechste Spieler,
   der irgendwo einen Raum aufmacht, das laufende Match. */
update public.dd_battle_rooms set expires_at=now()-interval '1 minute'
where id=current_setting('wd.room')::uuid;
set wd.uid='11111111-1111-1111-1111-111111111111';
select set_config('wd.egal',(public.dd_publish_battle_state(current_setting('wd.room')::uuid,3,'{"b":1}'::jsonb))::text,false);

select case when round(extract(epoch from (expires_at-now()))/60) between 110 and 125
  then 'ok: ein Zug zieht die abgelaufene Zeit wieder auf ~120 Minuten nach'
  else 'FEHLER: nach dem Zug steht die Ablaufzeit bei '||round(extract(epoch from (expires_at-now()))/60)::text||' Minuten' end
from public.dd_battle_rooms where id=current_setting('wd.room')::uuid;

set wd.uid='33333333-3333-3333-3333-333333333333';
select set_config('wd.egal',(select code from public.dd_create_battle_room(2,'classic','test','{"name":"Fremd"}')),false);
select case when exists(select 1 from public.dd_battle_rooms where id=current_setting('wd.room')::uuid)
  then 'ok: das laufende Match hat das Aufraeumen ueberlebt'
  else 'FEHLER: das laufende Match wurde mitten im Spiel geloescht' end;
select case when exists(select 1 from public.dd_battle_states where room_id=current_setting('wd.room')::uuid)
  then 'ok: der State des laufenden Matches lebt noch'
  else 'FEHLER: der State wurde per Cascade mitgeloescht' end;

-- Gegenrichtung: eine verlassene Lobby soll sehr wohl verschwinden.
set wd.uid='22222222-2222-2222-2222-222222222222';
select set_config('wd.leer',(select id::text from public.dd_create_battle_room(2,'classic','test','{"name":"Leer"}')),false);
update public.dd_battle_rooms set expires_at=now()-interval '1 minute' where id=current_setting('wd.leer')::uuid;
set wd.uid='33333333-3333-3333-3333-333333333333';
select set_config('wd.egal',(select code from public.dd_create_battle_room(2,'classic','test','{"name":"Neu"}')),false);
select case when exists(select 1 from public.dd_battle_rooms where id=current_setting('wd.leer')::uuid)
  then 'FEHLER: die verlassene Lobby blieb liegen'
  else 'ok: die verlassene Lobby wurde abgeraeumt' end;
select case when exists(select 1 from public.dd_battle_rooms where id=current_setting('wd.room')::uuid)
  then 'ok: das laufende Match steht immer noch'
  else 'FEHLER: das laufende Match wurde beim zweiten Aufraeumen geloescht' end;
