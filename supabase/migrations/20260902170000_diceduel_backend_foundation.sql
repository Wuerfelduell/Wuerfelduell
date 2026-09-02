begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.dd_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player' check (char_length(display_name) between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dd_account_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  game_version text not null,
  save_schema integer not null check (save_schema > 0),
  client_modified_at timestamptz not null,
  server_updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  device_id text not null default '' check (char_length(device_id) <= 128)
);

create table if not exists public.dd_battle_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby','playing','closed')),
  max_players smallint not null default 2 check (max_players between 2 and 4),
  mode_id text not null default 'classic' check (mode_id ~ '^[a-z0-9_-]{1,40}$'),
  game_version text not null,
  sync_schema integer not null default 1 check (sync_schema > 0),
  match_id text not null default '',
  match jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours')
);

create table if not exists public.dd_battle_members (
  room_id uuid not null references public.dd_battle_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat smallint not null check (seat between 0 and 3),
  ready boolean not null default false,
  profile jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id,user_id),
  unique (room_id,seat)
);

create table if not exists public.dd_battle_states (
  room_id uuid primary key references public.dd_battle_rooms(id) on delete cascade,
  match_id text not null,
  seq bigint not null default 0 check (seq >= 0),
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  action_id text not null default '',
  action_type text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.dd_battle_actions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.dd_battle_rooms(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  client_action_id text not null check (char_length(client_action_id) between 1 and 128),
  base_seq bigint not null check (base_seq >= 0),
  action_type text not null check (action_type ~ '^[a-z0-9_]{1,64}$'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'queued' check (status in ('queued','applied','rejected')),
  error_message text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (room_id,client_action_id)
);

create table if not exists public.dd_battle_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.dd_battle_rooms(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  event jsonb not null check (jsonb_typeof(event) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.dd_battle_post_match (
  room_id uuid not null references public.dd_battle_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (choice in ('rematch','lobby')),
  updated_at timestamptz not null default now(),
  primary key (room_id,user_id)
);

create index if not exists dd_battle_rooms_code_idx on public.dd_battle_rooms(code);
create index if not exists dd_battle_rooms_expiry_idx on public.dd_battle_rooms(expires_at);
create index if not exists dd_battle_members_user_idx on public.dd_battle_members(user_id,room_id);
create index if not exists dd_battle_actions_queue_idx on public.dd_battle_actions(room_id,status,created_at);
create index if not exists dd_battle_events_room_idx on public.dd_battle_events(room_id,created_at desc);

create or replace function public.dd_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists dd_accounts_touch_updated_at on public.dd_accounts;
create trigger dd_accounts_touch_updated_at before update on public.dd_accounts
for each row execute function public.dd_touch_updated_at();

drop trigger if exists dd_rooms_touch_updated_at on public.dd_battle_rooms;
create trigger dd_rooms_touch_updated_at before update on public.dd_battle_rooms
for each row execute function public.dd_touch_updated_at();

create or replace function public.dd_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.dd_accounts(user_id,display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),nullif(split_part(coalesce(new.email,''),'@',1),''),'Player'),24)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists dd_on_auth_user_created on auth.users;
create trigger dd_on_auth_user_created after insert on auth.users
for each row execute function public.dd_handle_new_auth_user();

insert into public.dd_accounts(user_id,display_name)
select id,left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),nullif(split_part(coalesce(email,''),'@',1),''),'Player'),24)
from auth.users
on conflict (user_id) do nothing;

create or replace function public.dd_is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.dd_battle_members m
    where m.room_id=p_room_id and m.user_id=auth.uid()
  );
$$;

create or replace function public.dd_is_room_host(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.dd_battle_rooms r
    where r.id=p_room_id and r.host_user_id=auth.uid()
  );
$$;

alter table public.dd_accounts enable row level security;
alter table public.dd_account_saves enable row level security;
alter table public.dd_battle_rooms enable row level security;
alter table public.dd_battle_members enable row level security;
alter table public.dd_battle_states enable row level security;
alter table public.dd_battle_actions enable row level security;
alter table public.dd_battle_events enable row level security;
alter table public.dd_battle_post_match enable row level security;

drop policy if exists "dd_accounts_select_own" on public.dd_accounts;
drop policy if exists "dd_saves_select_own" on public.dd_account_saves;
drop policy if exists "dd_rooms_select_member" on public.dd_battle_rooms;
drop policy if exists "dd_members_select_member" on public.dd_battle_members;
drop policy if exists "dd_states_select_member" on public.dd_battle_states;
drop policy if exists "dd_actions_select_member" on public.dd_battle_actions;
drop policy if exists "dd_events_select_member" on public.dd_battle_events;
drop policy if exists "dd_post_match_select_member" on public.dd_battle_post_match;

create policy "dd_accounts_select_own" on public.dd_accounts for select to authenticated using (user_id=auth.uid());
create policy "dd_saves_select_own" on public.dd_account_saves for select to authenticated using (user_id=auth.uid());
create policy "dd_rooms_select_member" on public.dd_battle_rooms for select to authenticated using (public.dd_is_room_member(id));
create policy "dd_members_select_member" on public.dd_battle_members for select to authenticated using (public.dd_is_room_member(room_id));
create policy "dd_states_select_member" on public.dd_battle_states for select to authenticated using (public.dd_is_room_member(room_id));
create policy "dd_actions_select_member" on public.dd_battle_actions for select to authenticated using (public.dd_is_room_member(room_id));
create policy "dd_events_select_member" on public.dd_battle_events for select to authenticated using (public.dd_is_room_member(room_id));
create policy "dd_post_match_select_member" on public.dd_battle_post_match for select to authenticated using (public.dd_is_room_member(room_id));

revoke all on public.dd_accounts,public.dd_account_saves,public.dd_battle_rooms,public.dd_battle_members,public.dd_battle_states,public.dd_battle_actions,public.dd_battle_events,public.dd_battle_post_match from anon,authenticated;
grant select on public.dd_accounts,public.dd_account_saves,public.dd_battle_rooms,public.dd_battle_members,public.dd_battle_states,public.dd_battle_actions,public.dd_battle_events,public.dd_battle_post_match to authenticated;

create or replace function public.dd_put_account_save(
  p_payload jsonb,
  p_game_version text,
  p_save_schema integer,
  p_client_modified_at timestamptz,
  p_device_id text default '',
  p_expected_revision bigint default null
)
returns setof public.dd_account_saves
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid:=auth.uid();
  v_revision bigint;
begin
  if v_user is null then raise exception 'DD_AUTH_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'DD_INVALID_SAVE'; end if;
  if coalesce(p_save_schema,0)<1 then raise exception 'DD_INVALID_SAVE_SCHEMA'; end if;

  select s.revision into v_revision
  from public.dd_account_saves s
  where s.user_id=v_user
  for update;

  if found then
    if p_expected_revision is not null and p_expected_revision<>v_revision then
      raise exception 'DD_SAVE_CONFLICT expected %, current %',p_expected_revision,v_revision using errcode='40001';
    end if;
    return query
      update public.dd_account_saves
      set payload=p_payload,
          game_version=left(coalesce(p_game_version,'unknown'),40),
          save_schema=p_save_schema,
          client_modified_at=coalesce(p_client_modified_at,now()),
          server_updated_at=now(),
          revision=v_revision+1,
          device_id=left(coalesce(p_device_id,''),128)
      where user_id=v_user
      returning *;
  else
    if p_expected_revision is not null and p_expected_revision<>0 then
      raise exception 'DD_SAVE_CONFLICT expected %, current 0',p_expected_revision using errcode='40001';
    end if;
    return query
      insert into public.dd_account_saves(user_id,payload,game_version,save_schema,client_modified_at,device_id)
      values (v_user,p_payload,left(coalesce(p_game_version,'unknown'),40),p_save_schema,coalesce(p_client_modified_at,now()),left(coalesce(p_device_id,''),128))
      returning *;
  end if;
end;
$$;

create or replace function public.dd_generate_room_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_chars constant text:='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text:='';
  i integer;
begin
  for i in 1..6 loop
    v_code:=v_code||substr(v_chars,1+floor(random()*length(v_chars))::integer,1);
  end loop;
  return v_code;
end;
$$;

create or replace function public.dd_create_battle_room(
  p_max_players integer,
  p_mode_id text,
  p_game_version text,
  p_profile jsonb default '{}'::jsonb
)
returns table(id uuid,code text,host_user_id uuid,status text,max_players smallint,mode_id text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid:=auth.uid();
  v_room_id uuid;
  v_code text;
  v_attempt integer;
begin
  if v_user is null then raise exception 'DD_AUTH_REQUIRED'; end if;
  if p_max_players not between 2 and 4 then raise exception 'DD_INVALID_PLAYER_COUNT'; end if;
  if coalesce(p_mode_id,'')!~'^[a-z0-9_-]{1,40}$' then raise exception 'DD_INVALID_MODE'; end if;
  if p_profile is null or jsonb_typeof(p_profile)<>'object' then raise exception 'DD_INVALID_PROFILE'; end if;

  -- Opportunistic cleanup keeps abandoned private rooms bounded without exposing a public delete endpoint.
  delete from public.dd_battle_rooms where expires_at<=now();

  for v_attempt in 1..24 loop
    v_code:=public.dd_generate_room_code();
    begin
      insert into public.dd_battle_rooms(code,host_user_id,max_players,mode_id,game_version)
      values (v_code,v_user,p_max_players,left(p_mode_id,40),left(coalesce(p_game_version,'unknown'),40))
      returning public.dd_battle_rooms.id into v_room_id;
      exit;
    exception when unique_violation then
      v_room_id:=null;
    end;
  end loop;
  if v_room_id is null then raise exception 'DD_ROOM_CODE_EXHAUSTED'; end if;

  insert into public.dd_battle_members(room_id,user_id,seat,profile)
  values (v_room_id,v_user,0,p_profile);

  return query select r.id,r.code,r.host_user_id,r.status,r.max_players,r.mode_id
  from public.dd_battle_rooms r where r.id=v_room_id;
end;
$$;

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

  return query select r.id,r.code,r.host_user_id,r.status,r.max_players,r.mode_id
  from public.dd_battle_rooms r where r.id=v_room.id;
end;
$$;

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
  return v_result;
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
