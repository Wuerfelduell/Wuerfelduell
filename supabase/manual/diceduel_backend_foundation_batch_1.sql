-- DiceDuel Supabase foundation — Batch 1 of 2
-- Run this entire file first in Supabase SQL Editor.
-- Creates tables, indexes, account hooks, RLS, save RPC and lobby RPCs.

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

commit;
