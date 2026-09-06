/* Zusicherungen zum Matchstart, gefahren als echte Rolle mit RLS.
   ==================================================================
   Warum getrennt von 10-raum-ablauf.sql: dort laeuft alles als
   Datenbank-Eigentuemer. Der umgeht die Zeilenregeln vollstaendig, also
   sagt ein gruener Lauf dort nichts darueber aus, ob ein angemeldeter
   Spieler dieselben Zeilen auch sehen darf. Genau daran haengt der
   Matchstart im Betrieb: der Browser ruft nicht nur die Funktionen auf,
   er liest dd_battle_actions und dd_battle_events auch direkt ueber
   PostgREST, und dort greifen die Regeln.

   Diese Datei wechselt deshalb mit "set role authenticated" in die Rolle,
   unter der PostgREST arbeitet, und spielt den Ablauf durch, den die
   Lobby ausloest:

     Raum anlegen - beitreten - beide bereit - starten - Zustand lesen

   Jede Pruefung gibt genau eine Zeile aus, die mit "ok:" oder "FEHLER:"
   beginnt.
*/
\t on
\pset format unaligned

insert into auth.users(id,email) values
  ('aaaaaaaa-0000-0000-0000-000000000001','host2@test'),
  ('aaaaaaaa-0000-0000-0000-000000000002','gast2@test'),
  ('aaaaaaaa-0000-0000-0000-000000000003','fremd2@test')
on conflict do nothing;

/* Kleine Hilfe, um einen erwarteten Fehlschlag als Zeile zu melden.
   Sie wird noch als Eigentuemer angelegt, laeuft aber mit den Rechten des
   Aufrufers (security invoker), also spaeter als "authenticated". */
create or replace function public.wd_test_start_darf_nicht(p_room uuid)
returns text language plpgsql as $$
begin
  perform public.dd_start_battle(p_room,'{"id":"x"}'::jsonb);
  return 'FEHLER: ein Gast konnte ein Match starten';
exception when others then
  return 'ok: ein Gast kann kein Match starten ('||sqlerrm||')';
end $$;

-- Ab hier ist der Eigentuemer aussen vor. Alles Folgende sieht die
-- Datenbank so, wie sie ein angemeldeter Spieler sieht.
set role authenticated;

-- ---------- Raum anlegen ----------
set wd.uid='aaaaaaaa-0000-0000-0000-000000000001';
select set_config('wd.room',(select id::text from public.dd_create_battle_room(2,'classic','test','{"name":"Host","profileId":"p1"}')),false);
select set_config('wd.code',(select code from public.dd_battle_rooms where id=current_setting('wd.room')::uuid),false);

select case when coalesce(current_setting('wd.code',true),'')<>''
  then 'ok: der Host legt einen Raum an und darf ihn danach selbst lesen'
  else 'FEHLER: der Host sieht seinen eigenen Raum nicht' end;

-- ---------- Beitreten ----------
set wd.uid='aaaaaaaa-0000-0000-0000-000000000002';
select set_config('wd.egal',(select id::text from public.dd_join_battle_room(current_setting('wd.code'),'{"name":"Gast","profileId":"p2"}') limit 1),false);

select case when (select count(*) from public.dd_battle_members where room_id=current_setting('wd.room')::uuid)=2
  then 'ok: der Gast tritt bei und sieht beide Mitglieder'
  else 'FEHLER: der Gast sieht nach dem Beitreten nicht beide Mitglieder' end;

-- Ein Unbeteiligter darf nichts davon sehen.
set wd.uid='aaaaaaaa-0000-0000-0000-000000000003';
select case when (select count(*) from public.dd_battle_rooms where id=current_setting('wd.room')::uuid)=0
  then 'ok: ein Unbeteiligter sieht den Raum nicht'
  else 'FEHLER: ein Unbeteiligter sieht den Raum' end;

-- ---------- Beide bereit ----------
set wd.uid='aaaaaaaa-0000-0000-0000-000000000002';
select set_config('wd.egal',(public.dd_set_battle_ready(current_setting('wd.room')::uuid,true))::text,false);
set wd.uid='aaaaaaaa-0000-0000-0000-000000000001';
select set_config('wd.egal',(public.dd_set_battle_ready(current_setting('wd.room')::uuid,true))::text,false);

select case when (select bool_and(ready) from public.dd_battle_members where room_id=current_setting('wd.room')::uuid)
  then 'ok: der Host sieht beide Spieler als bereit'
  else 'FEHLER: der Host sieht nicht beide Spieler als bereit' end;

-- ---------- Starten ----------
-- Derselbe Aufbau, den buildMatch() im Browser erzeugt: syncSchema 7 und
-- ein state-Objekt mit seq, Wuerfeln und Spielern.
select set_config('wd.match',jsonb_build_object(
  'id','m-test','roomCode',current_setting('wd.code'),'modeId','classic','startHp',100,
  'startAbilityCount',2,'syncSchema',7,
  'firstPlayerUid','aaaaaaaa-0000-0000-0000-000000000001',
  'currentPlayerUid','aaaaaaaa-0000-0000-0000-000000000001','turnNumber',1,
  'state',jsonb_build_object(
    'schema',7,'seq',0,'phase','idle',
    'currentPlayerUid','aaaaaaaa-0000-0000-0000-000000000001',
    'dice',jsonb_build_array(
      jsonb_build_object('value',null,'locked',false,'selected',false),
      jsonb_build_object('value',null,'locked',false,'selected',false)),
    'players',jsonb_build_array(
      jsonb_build_object('uid','aaaaaaaa-0000-0000-0000-000000000001','hp',100,'maxHp',100),
      jsonb_build_object('uid','aaaaaaaa-0000-0000-0000-000000000002','hp',100,'maxHp',100))),
  'players',jsonb_build_array(
    jsonb_build_object('uid','aaaaaaaa-0000-0000-0000-000000000001','name','Host','ability',3),
    jsonb_build_object('uid','aaaaaaaa-0000-0000-0000-000000000002','name','Gast','ability',9))
)::text,false);

select set_config('wd.start',(public.dd_start_battle(
  current_setting('wd.room')::uuid,current_setting('wd.match')::jsonb))::text,false);

select case when (select status from public.dd_battle_rooms where id=current_setting('wd.room')::uuid)='playing'
  then 'ok: der Raum steht nach dem Start auf playing'
  else 'FEHLER: der Raum steht nach dem Start nicht auf playing' end;

-- Der Rueckgabewert von dd_start_battle ist das, was der Browser sofort
-- bekommt. Steht dort kein Zustand mit Spielern, startet die Oberflaeche ins Leere.
select case when jsonb_array_length(coalesce(current_setting('wd.start')::jsonb->'match'->'state'->'players','[]'::jsonb))=2
  then 'ok: der Start liefert einen Zustand mit beiden Spielern zurueck'
  else 'FEHLER: der Start liefert keinen brauchbaren Zustand zurueck' end;

select case when current_setting('wd.start')::jsonb->'meta'->>'status'='playing'
  then 'ok: der zurueckgelieferte Schnappschuss meldet playing'
  else 'FEHLER: der zurueckgelieferte Schnappschuss meldet nicht playing' end;

-- ---------- Was der Gast danach sieht ----------
-- Der Gast bekommt vom Start nichts direkt; er lebt davon, dass sein
-- naechster Schnappschuss den laufenden Zustand traegt.
set wd.uid='aaaaaaaa-0000-0000-0000-000000000002';
select set_config('wd.gast',(public.dd_get_battle_snapshot(current_setting('wd.room')::uuid))::text,false);

select case when current_setting('wd.gast')::jsonb->'meta'->>'status'='playing'
  then 'ok: der Gast sieht den Raum als laufend'
  else 'FEHLER: der Gast sieht den Raum nicht als laufend' end;

select case when jsonb_array_length(coalesce(current_setting('wd.gast')::jsonb->'match'->'state'->'players','[]'::jsonb))=2
  then 'ok: der Gast bekommt den Startzustand mit beiden Spielern'
  else 'FEHLER: der Gast bekommt keinen brauchbaren Startzustand' end;

select case when coalesce(current_setting('wd.gast')::jsonb->'match'->>'id','')='m-test'
  then 'ok: die Match-Kennung ueberlebt den Start'
  else 'FEHLER: die Match-Kennung fehlt oder wurde ersetzt' end;

-- Die beiden Tabellen, die der Browser NEBEN der Funktion direkt liest.
-- Fehlt hier das Leserecht, bricht getSnapshot() im Browser ab und die
-- Lobby erfaehrt nie, dass das Match laeuft.
select case when (select count(*) from public.dd_battle_actions where room_id=current_setting('wd.room')::uuid)>=0
  then 'ok: der Gast darf dd_battle_actions direkt lesen'
  else 'FEHLER: der Gast darf dd_battle_actions nicht lesen' end;

select case when (select count(*) from public.dd_battle_events where room_id=current_setting('wd.room')::uuid)>=0
  then 'ok: der Gast darf dd_battle_events direkt lesen'
  else 'FEHLER: der Gast darf dd_battle_events nicht lesen' end;

select case when (select count(*) from public.dd_battle_states where room_id=current_setting('wd.room')::uuid)=1
  then 'ok: der Gast darf die Zustandszeile direkt lesen'
  else 'FEHLER: der Gast darf die Zustandszeile nicht lesen' end;

-- ---------- Wer darf starten ----------
-- Zurueck in die Lobby waere Hostsache; ein Gast darf ein Match nicht starten.
set wd.uid='aaaaaaaa-0000-0000-0000-000000000002';
select public.wd_test_start_darf_nicht(current_setting('wd.room')::uuid);

reset role;
