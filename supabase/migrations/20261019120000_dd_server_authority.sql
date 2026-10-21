/* Serverautoritaet: Der Browser sieht nur bestaetigte Zustaende.
   Seed und PRNG-Fortschritt bleiben privat. Action-ID und Ergebnis werden
   atomar gespeichert, damit Wiederholungen keinen zweiten Wurf ausloesen. */
begin;

alter table public.dd_battle_rooms add column authority text not null default 'host'
  check(authority in ('host','server'));
alter table public.dd_battle_actions add column result jsonb;

create schema dd_battle_private;
create table dd_battle_private.match_rng (
  room_id uuid primary key references public.dd_battle_rooms(id) on delete cascade,
  match_id text not null,
  rule_version text not null,
  seed bigint not null check(seed between 0 and 4294967295),
  rng_state bigint not null check(rng_state between 0 and 4294967295),
  draw_index bigint not null check(draw_index>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table dd_battle_private.match_rng enable row level security;

create or replace function public.dd_set_battle_authority(p_room_id uuid,p_authority text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_room public.dd_battle_rooms%rowtype;
begin
  select * into v_room from public.dd_battle_rooms where id=p_room_id for update;
  if not found then raise exception 'DD_ROOM_NOT_FOUND'; end if;
  if auth.uid() is null or v_room.host_user_id<>auth.uid() then raise exception 'DD_HOST_REQUIRED'; end if;
  if v_room.status<>'lobby' then raise exception 'DD_ROOM_NOT_IN_LOBBY'; end if;
  if p_authority is null or p_authority not in ('host','server') then raise exception 'DD_INVALID_AUTHORITY'; end if;
  update public.dd_battle_rooms set authority=p_authority where id=p_room_id;
  return jsonb_build_object('room_id',p_room_id,'authority',p_authority);
end;
$$;

create or replace function public.dd_start_battle(p_room_id uuid,p_match jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid:=auth.uid();
  v_room public.dd_battle_rooms%rowtype;
  v_count integer;
  v_all_ready boolean;
  v_match_id text;
  v_state jsonb;
  v_bytes bytea;
  v_seed bigint;
begin
  select * into v_room from public.dd_battle_rooms r where r.id=p_room_id for update;
  if not found then raise exception 'DD_ROOM_NOT_FOUND'; end if;
  if v_user is null or v_room.host_user_id<>v_user then raise exception 'DD_HOST_REQUIRED'; end if;
  if v_room.status<>'lobby' then raise exception 'DD_ROOM_NOT_IN_LOBBY'; end if;
  if p_match is null or jsonb_typeof(p_match)<>'object' then raise exception 'DD_INVALID_MATCH'; end if;

  select count(*),coalesce(bool_and(m.ready),false) into v_count,v_all_ready
  from public.dd_battle_members m where m.room_id=p_room_id;
  if v_count<>v_room.max_players or not v_all_ready then raise exception 'DD_PLAYERS_NOT_READY'; end if;

  v_match_id:=coalesce(nullif(p_match->>'id',''),gen_random_uuid()::text);
  v_state:=coalesce(p_match->'state','{}'::jsonb);
  if jsonb_typeof(v_state)<>'object' then raise exception 'DD_INVALID_MATCH_STATE'; end if;

  update public.dd_battle_rooms
  set status='playing',match_id=v_match_id,match=jsonb_set(p_match,'{id}',to_jsonb(v_match_id),true),sync_schema=coalesce((p_match->>'syncSchema')::integer,1)
  where public.dd_battle_rooms.id=p_room_id;
  insert into public.dd_battle_states(room_id,match_id,seq,state)
  values (p_room_id,v_match_id,coalesce((v_state->>'seq')::bigint,0),v_state)
  on conflict (room_id) do update set match_id=excluded.match_id,seq=excluded.seq,state=excluded.state,action_id='',action_type='',updated_at=now();
  delete from public.dd_battle_actions where room_id=p_room_id;
  delete from public.dd_battle_events where room_id=p_room_id;
  delete from public.dd_battle_post_match where room_id=p_room_id;
  if v_room.authority='server' then
    v_bytes:=extensions.gen_random_bytes(4);
    v_seed:=get_byte(v_bytes,0)::bigint*16777216
      +get_byte(v_bytes,1)::bigint*65536+get_byte(v_bytes,2)::bigint*256+get_byte(v_bytes,3);
    insert into dd_battle_private.match_rng(room_id,match_id,rule_version,seed,rng_state,draw_index)
    values(p_room_id,v_match_id,'duel-1',v_seed,v_seed,0)
    on conflict(room_id) do update set match_id=excluded.match_id,rule_version=excluded.rule_version,
      seed=excluded.seed,rng_state=excluded.rng_state,draw_index=0,created_at=now(),updated_at=now();
  end if;
  return public.dd_get_battle_snapshot(p_room_id);
end;
$$;

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
  if exists(select 1 from public.dd_battle_rooms r where r.id=p_room_id and r.authority='server') then
    raise exception 'DD_SERVER_AUTHORITATIVE';
  end if;
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
  if exists(select 1 from public.dd_battle_rooms r where r.id=p_room_id and r.authority='server') then
    raise exception 'DD_SERVER_AUTHORITATIVE';
  end if;
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

create or replace function public.dd_server_load_action(
  p_room_id uuid,p_user_id uuid,p_client_action_id text,
  p_base_seq bigint,p_action_type text,p_payload jsonb
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_room public.dd_battle_rooms%rowtype;
  v_state public.dd_battle_states%rowtype;
  v_rng dd_battle_private.match_rng%rowtype;
  v_action public.dd_battle_actions%rowtype;
  v_seat smallint;
begin
  -- Gleiche Sperrreihenfolge wie Start/Reset: Raum vor State. Die Raumsperre
  -- verhindert einen Lobbywechsel zwischen Autorisierung und Commit.
  select * into v_room from public.dd_battle_rooms where id=p_room_id for update;
  select seat into v_seat from public.dd_battle_members
    where room_id=p_room_id and user_id=p_user_id for share;
  if not found then raise exception 'DD_NOT_ROOM_MEMBER'; end if;
  if v_room.status<>'playing' then raise exception 'DD_ROOM_NOT_PLAYING'; end if;
  if v_room.authority<>'server' then raise exception 'DD_NOT_SERVER_AUTHORITATIVE'; end if;
  select * into v_state from public.dd_battle_states where room_id=p_room_id for update;
  if not found then raise exception 'DD_STATE_MISSING'; end if;

  -- Mitgliedschaft vor Replay; Replay vor Sequenz und Entscheidungsrecht.
  -- Die ID gilt raumweit, genau wie in fakeStore.authorize.
  select * into v_action from public.dd_battle_actions
    where room_id=p_room_id and client_action_id=p_client_action_id;
  if found then
    if v_action.action_type is distinct from p_action_type or v_action.payload is distinct from p_payload then
      raise exception 'DD_ACTION_ID_REUSED';
    end if;
    return jsonb_build_object('replay',true,'result',v_action.result);
  end if;
  if p_base_seq is distinct from v_state.seq then
    raise exception 'DD_STALE_STATE expected %, current %',p_base_seq,v_state.seq using errcode='40001';
  end if;
  if p_user_id is null or coalesce(v_state.state->>'interactionOwnerUid',v_state.state->>'currentPlayerUid','')<>p_user_id::text then
    raise exception 'DD_NOT_INTERACTION_OWNER';
  end if;
  if coalesce(p_client_action_id,'')='' or char_length(p_client_action_id)>128 then raise exception 'DD_INVALID_ACTION_ID'; end if;
  if coalesce(p_action_type,'')!~'^[a-z0-9_]{1,64}$' then raise exception 'DD_INVALID_ACTION_TYPE'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'DD_INVALID_ACTION_PAYLOAD'; end if;
  select * into v_rng from dd_battle_private.match_rng where room_id=p_room_id;
  if not found or v_rng.match_id is distinct from v_state.match_id then raise exception 'DD_RNG_MISSING'; end if;
  return jsonb_build_object('state',v_state.state,'seq',v_state.seq,'matchId',v_state.match_id,
    'seat',v_seat,'ruleVersion',v_rng.rule_version,
    'rng',jsonb_build_object('seed',v_rng.seed,'state',v_rng.rng_state,'drawIndex',v_rng.draw_index));
end;
$$;

create or replace function public.dd_server_commit_action(
  p_room_id uuid,p_user_id uuid,p_client_action_id text,
  p_base_seq bigint,p_action_type text,p_payload jsonb,p_next_state jsonb,
  p_rng_state bigint,p_draw_index bigint,p_events jsonb
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_context jsonb; v_result jsonb; v_seq bigint;
begin
  -- load sperrt auch dd_battle_states FOR UPDATE. In diesem verschachtelten
  -- Aufruf bleiben alle Sperren bis zum Ende derselben Transaktion bestehen.
  v_context:=public.dd_server_load_action(p_room_id,p_user_id,p_client_action_id,p_base_seq,p_action_type,p_payload);
  if v_context->'replay'='true'::jsonb then return v_context->'result'; end if;
  if p_draw_index<(v_context#>>'{rng,drawIndex}')::bigint then raise exception 'DD_RNG_REWIND'; end if;
  if jsonb_typeof(p_events) is distinct from 'array' then raise exception 'DD_INVALID_EVENTS'; end if;
  v_seq:=(v_context->>'seq')::bigint+1;
  v_result:=jsonb_build_object('seq',v_seq,'state',p_next_state,'events',p_events);

  update public.dd_battle_states set seq=v_seq,state=p_next_state,
    action_id=p_client_action_id,action_type=p_action_type,updated_at=now() where room_id=p_room_id;
  update dd_battle_private.match_rng set rng_state=p_rng_state,draw_index=p_draw_index,updated_at=now()
    where room_id=p_room_id;
  insert into public.dd_battle_actions(room_id,actor_user_id,client_action_id,base_seq,action_type,payload,status,resolved_at,result)
    values(p_room_id,p_user_id,p_client_action_id,p_base_seq,p_action_type,p_payload,'applied',now(),v_result);
  insert into public.dd_battle_events(room_id,actor_user_id,event)
    select p_room_id,p_user_id,value from jsonb_array_elements(p_events);
  perform public.dd_touch_room(p_room_id);
  return v_result;
end;
$$;

-- Keine Browserrechte auf RNG, keine Aufnahme in die Realtime-Publication.
revoke all on schema dd_battle_private from public,anon,authenticated,service_role;
revoke all on all tables in schema dd_battle_private from public,anon,authenticated,service_role;
revoke all on function public.dd_server_load_action(uuid,uuid,text,bigint,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.dd_server_commit_action(uuid,uuid,text,bigint,text,jsonb,jsonb,bigint,bigint,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.dd_server_load_action(uuid,uuid,text,bigint,text,jsonb) to service_role;
grant execute on function public.dd_server_commit_action(uuid,uuid,text,bigint,text,jsonb,jsonb,bigint,bigint,jsonb) to service_role;

revoke all on function public.dd_set_battle_authority(uuid,text),public.dd_start_battle(uuid,jsonb),
  public.dd_publish_battle_state(uuid,bigint,jsonb,text,text),public.dd_submit_battle_action(uuid,text,bigint,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.dd_set_battle_authority(uuid,text),public.dd_start_battle(uuid,jsonb),
  public.dd_publish_battle_state(uuid,bigint,jsonb,text,text),public.dd_submit_battle_action(uuid,text,bigint,text,jsonb)
  to authenticated;

commit;
