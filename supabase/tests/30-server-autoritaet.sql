/* RPC-Vertrag gegen echtes Postgres und echte Rollen, ohne Live-Projekt.
   Fehlerhelfer prueft Fehlercode UND Meldung; unerwartete Fehler sind rot. */
\t on
\pset format unaligned
create or replace function public.wd_server_assert(ok boolean, label text)
returns text language sql as $$
  select case when ok is true then 'ok: ' else 'FEHLER: ' end || label;
$$;
create or replace function public.wd_server_error(command text, message text, code text default 'P0001')
returns text language plpgsql security invoker as $$
begin
  execute command;
  return 'FEHLER: erwartet '||message;
exception when others then
  return public.wd_server_assert(sqlstate=code and position(message in sqlerrm)>0,
    message||' ['||sqlstate||'] '||sqlerrm);
end $$;

insert into auth.users(id,email) values
 ('bbbbbbbb-0000-0000-0000-000000000001','serverhost@test'),
 ('bbbbbbbb-0000-0000-0000-000000000002','servergast@test'),
 ('bbbbbbbb-0000-0000-0000-000000000003','serverfremd@test');
set role authenticated;
set wd.uid='bbbbbbbb-0000-0000-0000-000000000001';
select id as room, code from public.dd_create_battle_room(2,'classic','test','{}') \gset
select public.wd_server_assert((select authority='host' from public.dd_battle_rooms where id=:'room'),
 'Neue Raeume bleiben standardmaessig host-autoritativ');
select public.wd_server_error(format('select public.dd_set_battle_authority(%L, %L)', :'room','falsch'),'DD_INVALID_AUTHORITY');
select public.dd_set_battle_authority(:'room','server');
select public.dd_set_battle_authority(:'room','host');
select public.dd_set_battle_authority(:'room','server');
set wd.uid='bbbbbbbb-0000-0000-0000-000000000002';
select * from public.dd_join_battle_room(:'code','{}');
select public.wd_server_error(format('select public.dd_set_battle_authority(%L, %L)', :'room','host'),'DD_HOST_REQUIRED');
select public.dd_set_battle_ready(:'room',true);
set wd.uid='bbbbbbbb-0000-0000-0000-000000000001';
select public.dd_set_battle_ready(:'room',true);
select public.dd_start_battle(:'room','{"id":"server-match","state":{"seq":0,"interactionOwnerUid":"bbbbbbbb-0000-0000-0000-000000000001"}}');
select public.wd_server_error(format('select public.dd_set_battle_authority(%L, %L)', :'room','host'),'DD_ROOM_NOT_IN_LOBBY');
select public.wd_server_error(format('select public.dd_publish_battle_state(%L,1,%L)', :'room','{}'),'DD_SERVER_AUTHORITATIVE');
select public.wd_server_error(format('select public.dd_submit_battle_action(%L,%L,0,%L,%L)', :'room','browser','init_match','{}'),'DD_SERVER_AUTHORITATIVE');
select public.wd_server_error('select * from dd_battle_private.match_rng','permission denied','42501');
select public.wd_server_error(format('select public.dd_server_load_action(%L,%L,%L,0,%L,%L)', :'room',current_setting('wd.uid'),'init','init_match','{}'),'permission denied','42501');
select public.wd_server_error(format('select public.dd_server_commit_action(%L,%L,%L,0,%L,%L,%L,1,1,%L)', :'room',current_setting('wd.uid'),'init','init_match','{}','{}','[]'),'permission denied','42501');
select public.wd_server_assert(public.dd_get_battle_snapshot(:'room')::text !~ '"(seed|rng_state)"','Schnappschuss enthaelt keinen Seed');
reset role;
select public.wd_server_assert(seed between 0 and 4294967295 and seed=rng_state and draw_index=0
 and match_id='server-match' and rule_version='duel-1','Start erzeugt privaten uint32-Seed')
 from dd_battle_private.match_rng where room_id=:'room';
select public.wd_server_assert(not has_schema_privilege('anon','dd_battle_private','USAGE')
 and not has_schema_privilege('authenticated','dd_battle_private','USAGE')
 and not has_table_privilege('authenticated','dd_battle_private.match_rng','SELECT'),
 'Privater RNG hat keine Browser-Leserechte');
select public.wd_server_assert(not has_function_privilege('anon',
 'public.dd_server_load_action(uuid,uuid,text,bigint,text,jsonb)','EXECUTE')
 and not has_function_privilege('anon',
 'public.dd_server_commit_action(uuid,uuid,text,bigint,text,jsonb,jsonb,bigint,bigint,jsonb)','EXECUTE'),
 'Auch anon darf keine internen RPCs aufrufen');
select public.wd_server_assert(not exists(select 1 from dd_battle_private.match_rng rng
 join public.dd_battle_rooms r on r.id=rng.room_id where r.authority='host'),
 'Host-Raeume aus 10/20 besitzen keinen privaten RNG');
select seed as first_seed from dd_battle_private.match_rng where room_id=:'room' \gset
select public.wd_server_assert(not exists(select 1 from pg_publication_tables where schemaname='dd_battle_private'),
 'Privater RNG ist nicht in Realtime');
set role service_role;
set wd.uid='';
select public.dd_server_load_action(:'room','bbbbbbbb-0000-0000-0000-000000000001','init',0,'init_match','{}') as context \gset
select public.wd_server_assert(:'context'::jsonb->>'seq'='0' and :'context'::jsonb->>'seat'='0'
 and :'context'::jsonb->>'matchId'='server-match' and :'context'::jsonb->>'ruleVersion'='duel-1'
 and (:'context'::jsonb#>>'{rng,seed}')::bigint=:'first_seed'::bigint
 and :'context'::jsonb#>>'{rng,drawIndex}'='0','load liefert den Edge-Kontext ohne auth.uid');
select public.wd_server_error(format('select public.dd_server_load_action(%L,%L,%L,99,%L,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000003','unknown','roll_base','{}'),'DD_NOT_ROOM_MEMBER','P0001');
select public.wd_server_error(format('select public.dd_server_load_action(%L,%L,%L,99,%L,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000002','stale','roll_base','{}'),'DD_STALE_STATE','40001');
select public.wd_server_error(format('select public.dd_server_load_action(%L,%L,%L,0,%L,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000002','owner','roll_base','{}'),'DD_NOT_INTERACTION_OWNER','P0001');
select public.wd_server_error(format('select public.dd_server_commit_action(%L,%L,%L,99,%L,%L,%L,123,2,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000003','unknown','roll_base','{}','{}','[]'),'DD_NOT_ROOM_MEMBER','P0001');
select public.wd_server_error(format('select public.dd_server_commit_action(%L,%L,%L,99,%L,%L,%L,123,2,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000002','stale','roll_base','{}','{}','[]'),'DD_STALE_STATE','40001');
select public.wd_server_error(format('select public.dd_server_commit_action(%L,%L,%L,0,%L,%L,%L,123,2,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000002','owner','roll_base','{}','{}','[]'),'DD_NOT_INTERACTION_OWNER','P0001');
select public.dd_server_commit_action(:'room','bbbbbbbb-0000-0000-0000-000000000001','init',0,'init_match','{}',
 '{"schema":"server-1","interactionOwnerUid":"bbbbbbbb-0000-0000-0000-000000000002","currentPlayerUid":"bbbbbbbb-0000-0000-0000-000000000001","finished":false}',
 4294967295,3,'[{"type":"MatchInitialized"},{"type":"SecondEvent"}]') as result \gset
select public.wd_server_assert(:'result'::jsonb->>'seq'='1' and jsonb_array_length(:'result'::jsonb->'events')=2,'commit liefert seq+1 und Events');
select public.wd_server_assert(public.dd_server_load_action(:'room','bbbbbbbb-0000-0000-0000-000000000001','init',0,'init_match','{}')=jsonb_build_object('replay',true,'result',:'result'::jsonb),'load replay vor baseSeq und Besitzer');
select public.wd_server_error(format('select public.dd_server_load_action(%L,%L,%L,0,%L,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000003','init','init_match','{}'),'DD_NOT_ROOM_MEMBER');
select public.wd_server_error(format('select public.dd_server_load_action(%L,%L,%L,0,%L,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000001','init','init_match','{"changed":true}'),'DD_ACTION_ID_REUSED');
select public.wd_server_error(format('select public.dd_server_load_action(%L,%L,%L,0,%L,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000001','init','roll_base','{}'),'DD_ACTION_ID_REUSED');
select public.wd_server_assert(public.dd_server_commit_action(:'room','bbbbbbbb-0000-0000-0000-000000000001','init',0,'init_match','{}','{}',0,0,'[]')=:'result'::jsonb,'commit replay ohne erneuten Wurf');
select public.wd_server_error(format('select public.dd_server_commit_action(%L,%L,%L,0,%L,%L,%L,123,2,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000003','init','init_match','{}','{}','[]'),'DD_NOT_ROOM_MEMBER');
select public.wd_server_error(format('select public.dd_server_commit_action(%L,%L,%L,0,%L,%L,%L,123,2,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000001','init','init_match','{"changed":true}','{}','[]'),'DD_ACTION_ID_REUSED');
select public.wd_server_error(format('select public.dd_server_commit_action(%L,%L,%L,0,%L,%L,%L,123,2,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000001','init','roll_base','{}','{}','[]'),'DD_ACTION_ID_REUSED');
select public.wd_server_error(format('select public.dd_server_commit_action(%L,%L,%L,1,%L,%L,%L,12,2,%L)',
 :'room','bbbbbbbb-0000-0000-0000-000000000002','rewind','roll_base','{}','{}','[]'),'DD_RNG_REWIND');
-- Das zweite Event scheitert erst nach dem ersten Insert: alles muss zurueckrollen.
select public.wd_server_error(format('select public.dd_server_commit_action(%L,%L,%L,1,%L,%L,%L,12,4,%L)',
 :'room','bbbbbbbb-0000-0000-0000-000000000002','rollback','roll_base','{}','{}','[{"type":"valid"},7]'),
 'dd_battle_events_event_check','23514');
reset role;
select public.wd_server_assert(s.seq=1 and s.state=(:'result'::jsonb->'state') and s.action_id='init'
 and s.action_type='init_match' and r.rng_state=4294967295 and r.draw_index=3
 and (select count(*)=1 from public.dd_battle_actions where room_id=:'room')
 and (select count(*)=2 from public.dd_battle_events where room_id=:'room'),
 'Replay und Fehler veraendern weder State, RNG, Aktion noch Events')
 from public.dd_battle_states s join dd_battle_private.match_rng r using(room_id) where s.room_id=:'room';
select public.wd_server_assert(status='applied' and actor_user_id='bbbbbbbb-0000-0000-0000-000000000001'
 and result=:'result'::jsonb and resolved_at is not null,'Aktion mit Actor und Replay-Ergebnis gespeichert')
 from public.dd_battle_actions where room_id=:'room';
select public.wd_server_assert(bool_and(actor_user_id='bbbbbbbb-0000-0000-0000-000000000001'),
 'Alle Events tragen den wirklichen Actor') from public.dd_battle_events where room_id=:'room';
set role service_role;
select public.dd_server_commit_action(:'room','bbbbbbbb-0000-0000-0000-000000000002','finish',1,'roll_base','{}',
 '{"schema":"server-1","interactionOwnerUid":"","currentPlayerUid":"bbbbbbbb-0000-0000-0000-000000000001","finished":true}',12,4,'[]');
select public.wd_server_error(format('select public.dd_server_load_action(%L,%L,%L,2,%L,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000001','after','roll_base','{}'),'DD_NOT_INTERACTION_OWNER');
select public.wd_server_error(format('select public.dd_server_commit_action(%L,%L,%L,2,%L,%L,%L,12,4,%L)',:'room','bbbbbbbb-0000-0000-0000-000000000001','after','roll_base','{}','{}','[]'),'DD_NOT_INTERACTION_OWNER');
reset role;
select public.wd_server_assert(not exists(select 1 from dd_stats_private.capture_errors where room_id=:'room'),
 'Server-Umschlag stoert Statistik-Trigger nicht');
set role authenticated;
set wd.uid='bbbbbbbb-0000-0000-0000-000000000001';
select public.dd_reset_battle_lobby(:'room','server-match',true,true);
reset role;
set role service_role;
select public.wd_server_error(format('select public.dd_server_load_action(%L,%L,%L,0,%L,%L)',
 :'room','bbbbbbbb-0000-0000-0000-000000000001','lobby','init_match','{}'),'DD_ROOM_NOT_PLAYING');
reset role;
set role authenticated;
select public.dd_start_battle(:'room','{"id":"server-rematch","state":{"interactionOwnerUid":"bbbbbbbb-0000-0000-0000-000000000001"}}');
reset role;
select public.wd_server_assert(match_id='server-rematch' and rng_state=seed and draw_index=0,
 'Revanche ersetzt RNG-Zeile und setzt Ziehungen zurueck') from dd_battle_private.match_rng where room_id=:'room';
-- Kein probabilistischer Vergleich zweier uint32: gleiche Seeds sind selten, aber erlaubt.
select public.wd_server_assert(not exists(select 1 from public.dd_battle_actions where room_id=:'room'),
 'Revanche entfernt alte Replay-Ergebnisse');
select public.wd_server_assert(count(*)=1,'Statistik-Trigger bleibt aktiv') from pg_trigger
 where tgrelid='public.dd_battle_states'::regclass and tgname='dd_stats_capture_final_state' and tgenabled='O';
set role authenticated;
select public.wd_server_assert(public.dd_get_battle_snapshot(:'room')::text !~ '"(seed|rng_state)"',
 'Auch Revanche-Schnappschuss ohne Seed');
select public.dd_leave_battle_room(:'room');
reset role;
-- Laufender Host-Raum aus 20-matchstart.sql; jede Datei laeuft in eigener Sitzung.
select id as hostroom from public.dd_battle_rooms where host_user_id='aaaaaaaa-0000-0000-0000-000000000001'
 and status='playing' and authority='host' order by created_at desc limit 1 \gset
set role service_role;
select public.wd_server_error(format('select public.dd_server_load_action(%L,%L,%L,0,%L,%L)',
 :'hostroom','aaaaaaaa-0000-0000-0000-000000000001','host-rpc','init_match','{}'),'DD_NOT_SERVER_AUTHORITATIVE');
reset role;
select public.wd_server_assert(not exists(select 1 from dd_battle_private.match_rng where room_id=:'room'),
 'Raumloeschung entfernt privaten RNG per Cascade');
