/* Räume nach Leerlauf ablaufen lassen, und den State nur noch einmal schreiben.
   ==================================================================
   Zwei Änderungen, beide am Grundgerüst aus
   20260902170000_diceduel_backend_foundation.sql.

   1) expires_at war eine absolute Lebensdauer: einmal bei der
      Raumerstellung auf now() + 6 Stunden gesetzt und nie wieder
      angefasst. Die Aufräumzeile in dd_create_battle_room

        delete from public.dd_battle_rooms where expires_at<=now();

      fragt nicht, ob in dem Raum gerade gespielt wird. Bei sechs Stunden
      fällt das nicht auf. Wer das Fenster verkürzt, ohne die Zeit
      nachzuziehen, löscht laufende Matches mitten im Spiel - per Cascade
      samt State, Aktionen und Events. Deshalb wird hier zuerst das
      Nachziehen eingebaut und erst dann das Fenster verkürzt:
      45 Minuten Leerlauf in der Lobby, 2 Stunden im laufenden Match.

   2) dd_publish_battle_state hat den kompletten State zweimal
      geschrieben - nach dd_battle_states.state und nochmal nach
      dd_battle_rooms.match->state. Beide Tabellen liegen in der
      Realtime-Publication, die Zustandsblase ging also pro Zug doppelt
      an jeden Mitspieler. Gelesen wurde die zweite Kopie nie:
      dd_get_battle_snapshot ersetzt match->state ohnehin wieder aus
      dd_battle_states. Die Kopie entfällt.

   Nichts an den Signaturen ändert sich, der Client bleibt unberührt.
*/

begin;

/* Schiebt die Ablaufzeit nach, aber nur wenn nötig.

   Der Vorbehalt ist wichtig: jede Zeilenänderung an dd_battle_rooms geht
   über Realtime an alle Mitspieler. Ein Nachziehen bei jedem Würfelwurf
   würde genau den Verkehr erzeugen, den Änderung 2 einspart. Deshalb
   schreibt die Funktion nur, wenn die gespeicherte Zeit mehr als fünf
   Minuten hinter dem Ziel liegt - im Match also etwa alle fünf Minuten
   statt bei jedem Zug. */
create or replace function public.dd_touch_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_fenster interval;
begin
  select case when r.status='playing' then interval '2 hours' else interval '45 minutes' end
  into v_fenster
  from public.dd_battle_rooms r
  where r.id=p_room_id;
  if v_fenster is null then return; end if;

  update public.dd_battle_rooms
  set expires_at=now()+v_fenster
  where id=p_room_id
    and expires_at < now()+v_fenster-interval '5 minutes';
end;
$$;

revoke all on function public.dd_touch_room(uuid) from public,anon;
-- Kein grant an authenticated: die Funktion wird ausschliesslich aus den
-- anderen security-definer-Funktionen heraus gerufen, die als Eigentuemer
-- laufen. Von aussen soll niemand die Ablaufzeit verschieben koennen.

/* Neue Raeume starten mit 45 Minuten statt sechs Stunden. Bestehende
   Zeilen behalten ihre alte Zeit und laufen normal aus. */
alter table public.dd_battle_rooms
  alter column expires_at set default (now() + interval '45 minutes');

/* --- Beitritt: Lobby-Uhr neu stellen --- */
create or replace function public.dd_join_battle_room(p_code text,p_profile jsonb default '{}'::jsonb)
returns table(id uuid,code text,host_user_id uuid,status text,max_players smallint,mode_id text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid:=auth.uid();
  v_room public.dd_battle_rooms%rowtype;
  v_count integer;
  v_seat smallint;
begin
  if v_user is null then raise exception 'DD_AUTH_REQUIRED'; end if;
  if p_profile is null or jsonb_typeof(p_profile)<>'object' then raise exception 'DD_INVALID_PROFILE'; end if;

  select * into v_room from public.dd_battle_rooms r
  where r.code=upper(trim(coalesce(p_code,''))) for update;
  if not found then raise exception 'DD_ROOM_NOT_FOUND'; end if;
  if v_room.status<>'lobby' then raise exception 'DD_ROOM_STARTED'; end if;
  if v_room.expires_at<=now() then raise exception 'DD_ROOM_EXPIRED'; end if;

  select m.seat into v_seat from public.dd_battle_members m
  where m.room_id=v_room.id and m.user_id=v_user;
  if found then
    update public.dd_battle_members set profile=p_profile,last_seen_at=now()
    where room_id=v_room.id and user_id=v_user;
  else
    select count(*) into v_count from public.dd_battle_members m where m.room_id=v_room.id;
    if v_count>=v_room.max_players then raise exception 'DD_ROOM_FULL'; end if;
    select s::smallint into v_seat
    from generate_series(0,v_room.max_players-1) s
    where not exists(select 1 from public.dd_battle_members m where m.room_id=v_room.id and m.seat=s)
    order by s limit 1;
    insert into public.dd_battle_members(room_id,user_id,seat,profile)
    values (v_room.id,v_user,v_seat,p_profile);
  end if;

  perform public.dd_touch_room(v_room.id);

  return query select r.id,r.code,r.host_user_id,r.status,r.max_players,r.mode_id
  from public.dd_battle_rooms r where r.id=v_room.id;
end;
$$;

/* --- Bereitschaft: haelt eine wartende Lobby am Leben --- */
create or replace function public.dd_set_battle_ready(p_room_id uuid,p_ready boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid:=auth.uid(); v_result jsonb;
begin
  if v_user is null then raise exception 'DD_AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.dd_battle_rooms r where r.id=p_room_id and r.status='lobby') then raise exception 'DD_ROOM_NOT_IN_LOBBY'; end if;
  update public.dd_battle_members set ready=coalesce(p_ready,false),last_seen_at=now()
  where room_id=p_room_id and user_id=v_user
  returning jsonb_build_object('user_id',user_id,'ready',ready) into v_result;
  if v_result is null then raise exception 'DD_NOT_ROOM_MEMBER'; end if;
  perform public.dd_touch_room(p_room_id);
  return v_result;
end;
$$;

/* --- Gastaktion: haelt ein laufendes Match am Leben --- */
create or replace function public.dd_submit_battle_action(
  p_room_id uuid,
  p_client_action_id text,
  p_base_seq bigint,
  p_action_type text,
  p_payload jsonb default '{}'::jsonb
)
returns setof public.dd_battle_actions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid:=auth.uid();
  v_state public.dd_battle_states%rowtype;
  v_owner text;
begin
  if v_user is null then raise exception 'DD_AUTH_REQUIRED'; end if;
  if not public.dd_is_room_member(p_room_id) then raise exception 'DD_NOT_ROOM_MEMBER'; end if;
  if not exists(select 1 from public.dd_battle_rooms r where r.id=p_room_id and r.status='playing') then raise exception 'DD_ROOM_NOT_PLAYING'; end if;
  if coalesce(p_client_action_id,'')='' or char_length(p_client_action_id)>128 then raise exception 'DD_INVALID_ACTION_ID'; end if;
  if coalesce(p_action_type,'')!~'^[a-z0-9_]{1,64}$' then raise exception 'DD_INVALID_ACTION_TYPE'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'DD_INVALID_ACTION_PAYLOAD'; end if;

  select * into v_state from public.dd_battle_states s where s.room_id=p_room_id for update;
  if not found then raise exception 'DD_STATE_MISSING'; end if;
  if p_base_seq<>v_state.seq then raise exception 'DD_STALE_STATE expected %, current %',p_base_seq,v_state.seq using errcode='40001'; end if;
  v_owner:=coalesce(v_state.state->>'interactionOwnerUid',v_state.state->>'currentPlayerUid','');
  if v_owner<>v_user::text then raise exception 'DD_NOT_INTERACTION_OWNER'; end if;

  -- Vor dem return query, danach laeuft nichts mehr.
  perform public.dd_touch_room(p_room_id);

  return query
    insert into public.dd_battle_actions(room_id,actor_user_id,client_action_id,base_seq,action_type,payload)
    values (p_room_id,v_user,p_client_action_id,p_base_seq,p_action_type,p_payload)
    on conflict (room_id,client_action_id) do update set client_action_id=excluded.client_action_id
    returning *;
end;
$$;

/* --- State veroeffentlichen: nur noch eine Kopie, Uhr nachziehen --- */
create or replace function public.dd_publish_battle_state(
  p_room_id uuid,
  p_seq bigint,
  p_state jsonb,
  p_action_id text default '',
  p_action_type text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_current bigint; v_match_id text;
begin
  if not public.dd_is_room_host(p_room_id) then raise exception 'DD_HOST_REQUIRED'; end if;
  if p_state is null or jsonb_typeof(p_state)<>'object' then raise exception 'DD_INVALID_MATCH_STATE'; end if;
  select s.seq,s.match_id into v_current,v_match_id from public.dd_battle_states s where s.room_id=p_room_id for update;
  if not found then raise exception 'DD_STATE_MISSING'; end if;
  if p_seq<>v_current+1 then raise exception 'DD_STATE_SEQUENCE expected %, got %',v_current+1,p_seq using errcode='40001'; end if;

  update public.dd_battle_states
  set seq=p_seq,state=p_state,action_id=left(coalesce(p_action_id,''),128),action_type=left(coalesce(p_action_type,''),64),updated_at=now()
  where room_id=p_room_id;

  -- Frueher stand hier zusaetzlich:
  --   update public.dd_battle_rooms
  --   set match=jsonb_set(coalesce(match,'{}'::jsonb),'{state}',p_state,true)
  --   where id=p_room_id and status='playing';
  -- Diese zweite Kopie hat nie jemand gelesen: dd_get_battle_snapshot setzt
  -- match->state ohnehin aus dd_battle_states neu. Sie hat pro Zug nur eine
  -- weitere Realtime-Nachricht mit der vollen Zustandsblase erzeugt.

  if coalesce(p_action_id,'')<>'' then
    update public.dd_battle_actions set status='applied',resolved_at=now()
    where room_id=p_room_id and client_action_id=p_action_id and status='queued';
  end if;

  perform public.dd_touch_room(p_room_id);

  return jsonb_build_object('room_id',p_room_id,'match_id',v_match_id,'seq',p_seq,'state',p_state);
end;
$$;

commit;
