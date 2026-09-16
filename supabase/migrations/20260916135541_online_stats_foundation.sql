-- Ergebnisarchiv für Fähigkeitsstatistiken. Noch nicht im Spiel aktiviert.
-- Absichtlich getrennt von Profil-Saves und kurzlebigen Online-Räumen.
create schema if not exists dd_stats_private;
revoke all on schema dd_stats_private from public, anon, authenticated;

create table dd_stats_private.reports (
  event_id uuid primary key,
  account_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('local','online')),
  room_id uuid,
  match_id text,
  round_number integer not null check (round_number>0),
  mode_id text not null,
  game_version text not null,
  player_count smallint not null check (player_count between 2 and 8),
  has_bots boolean not null,
  report jsonb not null,
  received_at timestamptz not null default now(),
  check ((source='local' and room_id is null and match_id is null)
      or (source='online' and room_id is not null and match_id is not null))
);
create unique index stats_online_round_once
  on dd_stats_private.reports(room_id,match_id,round_number) where source='online';
create index stats_reports_account on dd_stats_private.reports(account_id);

create table dd_stats_private.ability_uses (
  event_id uuid not null references dd_stats_private.reports(event_id) on delete cascade,
  seat smallint not null,
  ability_id smallint not null check (ability_id between 1 and 25),
  ability_level smallint not null check (ability_level between 0 and 2),
  acquired text not null check (acquired in ('start','later','unknown')),
  is_bot boolean not null,
  won boolean not null,
  primary key(event_id,seat,ability_id)
);
alter table dd_stats_private.reports enable row level security;
alter table dd_stats_private.ability_uses enable row level security;
revoke all on all tables in schema dd_stats_private from public, anon, authenticated;

create or replace function public.dd_submit_stats_report(p_account_id uuid,p_report jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_event uuid; v_room uuid; v_source text; v_match text;
  v_round integer; v_count integer; v_winners integer:=0; v_humans integer:=0;
  v_bots boolean:=false; v_seats integer[]:='{}'; v_ids integer[];
  v_player jsonb; v_ability jsonb; v_seat integer; v_id integer;
  v_stored dd_stats_private.reports%rowtype;
  v_inserted uuid;
begin
  -- auth.uid + Kontoparameter verhindert Uploads unter gewechselter Session.
  -- Gastprofile sind Sitze innerhalb einer Meldung, keine Gast-Auth-Konten.
  if v_uid is null or p_account_id is distinct from v_uid
     or not exists(select 1 from auth.users u where u.id=v_uid and u.is_anonymous is false) then
    raise exception 'DD_STATS_ACCOUNT_REQUIRED';
  end if;
  if jsonb_typeof(p_report) is distinct from 'object' or octet_length(p_report::text)>32768 then
    raise exception 'DD_STATS_INVALID_REPORT';
  end if;
  if not (p_report ?& array['schema_version','event_id','source','game_version','mode_id','round_number','room_id','match_id','players'])
     or exists(select 1 from jsonb_object_keys(p_report) k where k not in
       ('schema_version','event_id','source','game_version','mode_id','round_number','room_id','match_id','players'))
     or p_report->'schema_version' is distinct from '1'::jsonb
     or jsonb_typeof(p_report->'event_id') is distinct from 'string'
     or coalesce(p_report->>'event_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or jsonb_typeof(p_report->'source') is distinct from 'string'
     or coalesce(p_report->>'source','') not in ('local','online')
     or jsonb_typeof(p_report->'game_version') is distinct from 'string'
     or coalesce(p_report->>'game_version','') !~ '^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$'
     or jsonb_typeof(p_report->'mode_id') is distinct from 'string'
     or coalesce(p_report->>'mode_id','') !~ '^[a-zA-Z0-9_-]{1,40}$'
     or jsonb_typeof(p_report->'round_number') is distinct from 'number'
     or coalesce(p_report->>'round_number','') !~ '^[1-9][0-9]{0,6}$'
     or jsonb_typeof(p_report->'players') is distinct from 'array' then
    raise exception 'DD_STATS_INVALID_REPORT';
  end if;
  v_event:=(p_report->>'event_id')::uuid;
  v_source:=p_report->>'source';
  v_round:=(p_report->>'round_number')::integer;
  v_count:=jsonb_array_length(p_report->'players');
  if v_count not between 2 and 8 or v_round>1000000 then raise exception 'DD_STATS_INVALID_REPORT'; end if;
  if v_source='local' then
    if p_report->'room_id' is distinct from 'null'::jsonb or p_report->'match_id' is distinct from 'null'::jsonb then
      raise exception 'DD_STATS_INVALID_REPORT';
    end if;
  else
    if jsonb_typeof(p_report->'room_id') is distinct from 'string'
       or coalesce(p_report->>'room_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or jsonb_typeof(p_report->'match_id') is distinct from 'string'
       or coalesce(p_report->>'match_id','') !~ '^[a-zA-Z0-9_-]{1,100}$' then
      raise exception 'DD_STATS_INVALID_REPORT';
    end if;
    v_room:=(p_report->>'room_id')::uuid;v_match:=p_report->>'match_id';
  end if;
  for v_player in select value from jsonb_array_elements(p_report->'players') loop
    if jsonb_typeof(v_player) is distinct from 'object' then raise exception 'DD_STATS_INVALID_REPORT'; end if;
    if not (v_player ?& array['seat','is_bot','won','abilities'])
       or exists(select 1 from jsonb_object_keys(v_player) k where k not in ('seat','is_bot','won','abilities'))
       or jsonb_typeof(v_player->'seat') is distinct from 'number'
       or coalesce(v_player->>'seat','') !~ '^[0-7]$'
       or jsonb_typeof(v_player->'is_bot') is distinct from 'boolean'
       or jsonb_typeof(v_player->'won') is distinct from 'boolean'
       or jsonb_typeof(v_player->'abilities') is distinct from 'array' then
      raise exception 'DD_STATS_INVALID_REPORT';
    end if;
    v_seat:=(v_player->>'seat')::integer;
    if v_seat>=v_count or v_seat=any(v_seats)
       or jsonb_array_length(v_player->'abilities') not between 1 and 25 then
      raise exception 'DD_STATS_INVALID_REPORT';
    end if;
    v_seats:=array_append(v_seats,v_seat);v_ids:='{}';
    if (v_player->>'won')::boolean then v_winners:=v_winners+1; end if;
    if (v_player->>'is_bot')::boolean then v_bots:=true; else v_humans:=v_humans+1; end if;
    for v_ability in select value from jsonb_array_elements(v_player->'abilities') loop
      if jsonb_typeof(v_ability) is distinct from 'object' then raise exception 'DD_STATS_INVALID_REPORT'; end if;
      if not (v_ability ?& array['id','level','acquired'])
         or exists(select 1 from jsonb_object_keys(v_ability) k where k not in ('id','level','acquired'))
         or jsonb_typeof(v_ability->'id') is distinct from 'number'
         or coalesce(v_ability->>'id','') !~ '^([1-9]|1[0-9]|2[0-5])$'
         or jsonb_typeof(v_ability->'level') is distinct from 'number'
         or coalesce(v_ability->>'level','') !~ '^[0-2]$'
         or jsonb_typeof(v_ability->'acquired') is distinct from 'string'
         or coalesce(v_ability->>'acquired','') not in ('start','later','unknown') then
        raise exception 'DD_STATS_INVALID_REPORT';
      end if;
      v_id:=(v_ability->>'id')::integer;
      if v_id=any(v_ids) then raise exception 'DD_STATS_INVALID_REPORT'; end if;
      v_ids:=array_append(v_ids,v_id);
    end loop;
  end loop;
  if v_winners<>1 or v_humans=0 or (v_source='online' and v_bots) then
    raise exception 'DD_STATS_INVALID_REPORT';
  end if;

  -- Wiederholungen dürfen auch nach Raumlöschung quittiert werden.
  select * into v_stored from dd_stats_private.reports r where r.event_id=v_event
    or (v_source='online' and r.source='online' and r.room_id=v_room and r.match_id=v_match and r.round_number=v_round);
  if found then
    if v_stored.account_id<>v_uid then raise exception 'DD_STATS_OWNER_CONFLICT'; end if;
    if (v_stored.report-'event_id') is distinct from (p_report-'event_id') then raise exception 'DD_STATS_REPORT_CONFLICT'; end if;
    return jsonb_build_object('event_id',v_event,'status','duplicate');
  end if;
  if v_source='online' and not exists(
    select 1 from public.dd_battle_rooms r
    where r.id=v_room and r.host_user_id=v_uid and r.match_id=v_match
      and r.mode_id=p_report->>'mode_id' and r.game_version=p_report->>'game_version'
      and v_count<=r.max_players
  ) then raise exception 'DD_STATS_NOT_HOST'; end if;

  insert into dd_stats_private.reports(event_id,account_id,source,room_id,match_id,round_number,mode_id,game_version,player_count,has_bots,report)
  values(v_event,v_uid,v_source,v_room,v_match,v_round,p_report->>'mode_id',p_report->>'game_version',v_count,v_bots,p_report)
  on conflict do nothing returning event_id into v_inserted;
  if v_inserted is null then
    -- Zweiter paralleler Request: gleiche Prüfung nach dem Unique-Lock.
    select * into v_stored from dd_stats_private.reports r where r.event_id=v_event
      or (v_source='online' and r.source='online' and r.room_id=v_room and r.match_id=v_match and r.round_number=v_round);
    if not found then raise exception 'DD_STATS_RETRY'; end if;
    if v_stored.account_id<>v_uid then raise exception 'DD_STATS_OWNER_CONFLICT'; end if;
    if (v_stored.report-'event_id') is distinct from (p_report-'event_id') then raise exception 'DD_STATS_REPORT_CONFLICT'; end if;
    return jsonb_build_object('event_id',v_event,'status','duplicate');
  end if;
  insert into dd_stats_private.ability_uses(event_id,seat,ability_id,ability_level,acquired,is_bot,won)
  select v_event,(p.value->>'seat')::smallint,(a.value->>'id')::smallint,
    (a.value->>'level')::smallint,a.value->>'acquired',(p.value->>'is_bot')::boolean,(p.value->>'won')::boolean
  from jsonb_array_elements(p_report->'players') p
  cross join lateral jsonb_array_elements(p.value->'abilities') a;
  return jsonb_build_object('event_id',v_event,'status','accepted');
end;
$$;
revoke all on function public.dd_submit_stats_report(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.dd_submit_stats_report(uuid,jsonb) to authenticated;

-- Absichtlich öffentliche Aggregate; keine Kennungen, Namen oder Einzelspiele.
-- Ein Einsatz = eine Fähigkeit pro Teilnehmer und abgeschlossenem Kampf.
create or replace function public.dd_global_ability_stats()
returns table(source text,mode_id text,game_version text,player_count smallint,
  has_bots boolean,is_bot boolean,ability_id smallint,ability_level smallint,
  acquired text,uses bigint,wins bigint,win_rate numeric)
language sql stable security definer set search_path=''
as $$
  select r.source,r.mode_id,r.game_version,r.player_count,r.has_bots,a.is_bot,
    a.ability_id,a.ability_level,a.acquired,count(*),
    count(*) filter(where a.won),
    round(100.0*(count(*) filter(where a.won))/count(*),2)
  from dd_stats_private.reports r
  join dd_stats_private.ability_uses a using(event_id)
  group by r.source,r.mode_id,r.game_version,r.player_count,r.has_bots,
    a.is_bot,a.ability_id,a.ability_level,a.acquired
  order by r.source,r.mode_id,r.game_version,r.player_count,r.has_bots,
    a.is_bot,a.ability_id,a.ability_level,a.acquired;
$$;
revoke all on function public.dd_global_ability_stats() from public,anon,authenticated;
grant execute on function public.dd_global_ability_stats() to anon,authenticated;
