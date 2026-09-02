-- DiceDuel Supabase foundation — Batch 2 of 2
-- Run only after Batch 1 completed successfully.
-- Creates battle RPCs, permissions and Supabase Realtime publication entries.

begin;
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
  if not exists(select 1 from public.dd_battle_rooms r where r.id=p_room_id and r.status='playing') then raise exception 'DD_ROOM_NOT_PLAYING'; end if;
  if coalesce(p_client_action_id,'')='' or char_length(p_client_action_id)>128 then raise exception 'DD_INVALID_ACTION_ID'; end if;
  if coalesce(p_action_type,'')!~'^[a-z0-9_]{1,64}$' then raise exception 'DD_INVALID_ACTION_TYPE'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'DD_INVALID_ACTION_PAYLOAD'; end if;

  select * into v_state from public.dd_battle_states s where s.room_id=p_room_id for update;
  if not found then raise exception 'DD_STATE_MISSING'; end if;
  if p_base_seq<>v_state.seq then raise exception 'DD_STALE_STATE expected %, current %',p_base_seq,v_state.seq using errcode='40001'; end if;
  v_owner:=coalesce(v_state.state->>'interactionOwnerUid',v_state.state->>'currentPlayerUid','');
  if v_owner<>v_user::text then raise exception 'DD_NOT_INTERACTION_OWNER'; end if;

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
  if p_state is null or jsonb_typeof(p_state)<>'object' then raise exception 'DD_INVALID_MATCH_STATE'; end if;
  select s.seq,s.match_id into v_current,v_match_id from public.dd_battle_states s where s.room_id=p_room_id for update;
  if not found then raise exception 'DD_STATE_MISSING'; end if;
  if p_seq<>v_current+1 then raise exception 'DD_STATE_SEQUENCE expected %, got %',v_current+1,p_seq using errcode='40001'; end if;

  update public.dd_battle_states
  set seq=p_seq,state=p_state,action_id=left(coalesce(p_action_id,''),128),action_type=left(coalesce(p_action_type,''),64),updated_at=now()
  where room_id=p_room_id;
  update public.dd_battle_rooms
  set match=jsonb_set(coalesce(match,'{}'::jsonb),'{state}',p_state,true)
  where id=p_room_id and status='playing';
  if coalesce(p_action_id,'')<>'' then
    update public.dd_battle_actions set status='applied',resolved_at=now()
    where room_id=p_room_id and client_action_id=p_action_id and status='queued';
  end if;
  return jsonb_build_object('room_id',p_room_id,'match_id',v_match_id,'seq',p_seq,'state',p_state);
end;
$$;

create or replace function public.dd_resolve_battle_action(p_room_id uuid,p_action_id text,p_status text,p_error text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_result jsonb;
begin
  if not public.dd_is_room_host(p_room_id) then raise exception 'DD_HOST_REQUIRED'; end if;
  if p_status not in ('applied','rejected') then raise exception 'DD_INVALID_ACTION_STATUS'; end if;
  update public.dd_battle_actions a
  set status=p_status,error_message=left(coalesce(p_error,''),300),resolved_at=now()
  where a.room_id=p_room_id and a.client_action_id=p_action_id
  returning to_jsonb(a.*) into v_result;
  if v_result is null then raise exception 'DD_ACTION_NOT_FOUND'; end if;
  return v_result;
end;
$$;

create or replace function public.dd_emit_battle_event(p_room_id uuid,p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid:=auth.uid(); v_result jsonb;
begin
  if v_user is null or not public.dd_is_room_member(p_room_id) then raise exception 'DD_NOT_ROOM_MEMBER'; end if;
  if p_event is null or jsonb_typeof(p_event)<>'object' then raise exception 'DD_INVALID_EVENT'; end if;
  insert into public.dd_battle_events as e(room_id,actor_user_id,event)
  values (p_room_id,v_user,p_event)
  returning to_jsonb(e.*) into v_result;
  return v_result;
end;
$$;

create or replace function public.dd_set_post_match_choice(p_room_id uuid,p_choice text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null or not public.dd_is_room_member(p_room_id) then raise exception 'DD_NOT_ROOM_MEMBER'; end if;
  if p_choice not in ('rematch','lobby') then raise exception 'DD_INVALID_POST_MATCH_CHOICE'; end if;
  insert into public.dd_battle_post_match(room_id,user_id,choice)
  values (p_room_id,v_user,p_choice)
  on conflict (room_id,user_id) do update set choice=excluded.choice,updated_at=now();
  return jsonb_build_object('room_id',p_room_id,'user_id',v_user,'choice',p_choice);
end;
$$;

create or replace function public.dd_reset_battle_lobby(p_room_id uuid,p_match_id text,p_rematch boolean default false,p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_room public.dd_battle_rooms%rowtype; v_members integer; v_choices integer;
begin
  select * into v_room from public.dd_battle_rooms r where r.id=p_room_id for update;
  if not found then raise exception 'DD_ROOM_NOT_FOUND'; end if;
  if v_room.host_user_id<>auth.uid() then raise exception 'DD_HOST_REQUIRED'; end if;
  if v_room.status<>'playing' or v_room.match_id<>coalesce(p_match_id,'') then raise exception 'DD_MATCH_CHANGED'; end if;

  if not coalesce(p_force,false) then
    select count(*) into v_members from public.dd_battle_members m where m.room_id=p_room_id;
    if coalesce(p_rematch,false) then
      select count(*) into v_choices from public.dd_battle_post_match p where p.room_id=p_room_id and p.choice='rematch';
      if v_members<2 or v_choices<>v_members then raise exception 'DD_REMATCH_NOT_READY'; end if;
    else
      if not exists(select 1 from public.dd_battle_post_match p where p.room_id=p_room_id and p.choice='lobby') then raise exception 'DD_LOBBY_NOT_REQUESTED'; end if;
    end if;
  end if;

  update public.dd_battle_rooms set status='lobby',match_id='',match=null where id=p_room_id;
  update public.dd_battle_members set ready=coalesce(p_rematch,false),last_seen_at=now() where room_id=p_room_id;
  delete from public.dd_battle_states where room_id=p_room_id;
  delete from public.dd_battle_actions where room_id=p_room_id;
  delete from public.dd_battle_events where room_id=p_room_id;
  delete from public.dd_battle_post_match where room_id=p_room_id;
  return public.dd_get_battle_snapshot(p_room_id);
end;
$$;

create or replace function public.dd_leave_battle_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid:=auth.uid(); v_host uuid;
begin
  if v_user is null then raise exception 'DD_AUTH_REQUIRED'; end if;
  select r.host_user_id into v_host from public.dd_battle_rooms r where r.id=p_room_id;
  if not found then return; end if;
  if v_host=v_user then
    delete from public.dd_battle_rooms where id=p_room_id;
  else
    delete from public.dd_battle_members where room_id=p_room_id and user_id=v_user;
  end if;
end;
$$;

create or replace function public.dd_get_battle_snapshot(p_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.dd_is_room_member(p_room_id) then raise exception 'DD_NOT_ROOM_MEMBER'; end if;
  select jsonb_build_object(
    'id',r.id,
    'code',r.code,
    'meta',jsonb_build_object(
      'hostUid',r.host_user_id,
      'status',r.status,
      'maxPlayers',r.max_players,
      'modeId',r.mode_id,
      'version',r.game_version,
      'syncSchema',r.sync_schema,
      'matchId',r.match_id,
      'createdAt',extract(epoch from r.created_at)*1000
    ),
    'players',coalesce((
      select jsonb_object_agg(m.user_id::text,m.profile||jsonb_build_object(
        'ready',m.ready,
        'joinedOrder',m.seat,
        'joinedAt',extract(epoch from m.joined_at)*1000
      )) from public.dd_battle_members m where m.room_id=r.id
    ),'{}'::jsonb),
    'match',case when r.match is null then null else jsonb_set(
      r.match,'{state}',coalesce((select s.state from public.dd_battle_states s where s.room_id=r.id),'{}'::jsonb),true
    ) end,
    'postMatch',coalesce((
      select jsonb_object_agg(p.user_id::text,p.choice) from public.dd_battle_post_match p where p.room_id=r.id
    ),'{}'::jsonb)
  ) into v_result
  from public.dd_battle_rooms r where r.id=p_room_id;
  return v_result;
end;
$$;

revoke all on function public.dd_touch_updated_at(),public.dd_handle_new_auth_user(),public.dd_generate_room_code() from public,anon,authenticated;
revoke all on function public.dd_is_room_member(uuid),public.dd_is_room_host(uuid) from public,anon;
revoke all on function public.dd_put_account_save(jsonb,text,integer,timestamptz,text,bigint) from public,anon;
revoke all on function public.dd_create_battle_room(integer,text,text,jsonb) from public,anon;
revoke all on function public.dd_join_battle_room(text,jsonb) from public,anon;
revoke all on function public.dd_set_battle_ready(uuid,boolean) from public,anon;
revoke all on function public.dd_start_battle(uuid,jsonb) from public,anon;
revoke all on function public.dd_submit_battle_action(uuid,text,bigint,text,jsonb) from public,anon;
revoke all on function public.dd_publish_battle_state(uuid,bigint,jsonb,text,text) from public,anon;
revoke all on function public.dd_resolve_battle_action(uuid,text,text,text) from public,anon;
revoke all on function public.dd_emit_battle_event(uuid,jsonb) from public,anon;
revoke all on function public.dd_set_post_match_choice(uuid,text) from public,anon;
revoke all on function public.dd_reset_battle_lobby(uuid,text,boolean,boolean) from public,anon;
revoke all on function public.dd_leave_battle_room(uuid) from public,anon;
revoke all on function public.dd_get_battle_snapshot(uuid) from public,anon;
grant execute on function public.dd_is_room_member(uuid),public.dd_is_room_host(uuid) to authenticated;
grant execute on function public.dd_put_account_save(jsonb,text,integer,timestamptz,text,bigint) to authenticated;
grant execute on function public.dd_create_battle_room(integer,text,text,jsonb) to authenticated;
grant execute on function public.dd_join_battle_room(text,jsonb) to authenticated;
grant execute on function public.dd_set_battle_ready(uuid,boolean) to authenticated;
grant execute on function public.dd_start_battle(uuid,jsonb) to authenticated;
grant execute on function public.dd_submit_battle_action(uuid,text,bigint,text,jsonb) to authenticated;
grant execute on function public.dd_publish_battle_state(uuid,bigint,jsonb,text,text) to authenticated;
grant execute on function public.dd_resolve_battle_action(uuid,text,text,text) to authenticated;
grant execute on function public.dd_emit_battle_event(uuid,jsonb) to authenticated;
grant execute on function public.dd_set_post_match_choice(uuid,text) to authenticated;
grant execute on function public.dd_reset_battle_lobby(uuid,text,boolean,boolean) to authenticated;
grant execute on function public.dd_leave_battle_room(uuid) to authenticated;
grant execute on function public.dd_get_battle_snapshot(uuid) to authenticated;

do $$
declare v_table text;
begin
  foreach v_table in array array['dd_battle_rooms','dd_battle_members','dd_battle_states','dd_battle_actions','dd_battle_events','dd_battle_post_match'] loop
    if not exists(
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I',v_table);
    end if;
  end loop;
end;
$$;

commit;
