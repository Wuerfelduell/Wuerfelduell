-- First Blood: Bots ohne Fähigkeit erzeugen keinen Fähigkeitseinsatz.
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
     or coalesce(p_report->>'mode_id','') not in ('classic','endurance50','overload75','mayhem','campaign_solo','campaign_duo','campaign_trio','boss_rush_duo','boss_rush_trio')
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
       or jsonb_array_length(v_player->'abilities') not between (case when v_source='local' and (v_player->>'is_bot')::boolean then 0 else 1 end) and 25 then
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
  if v_humans=0 or (v_source='online' and v_bots)
     or (case when v_source='local' and p_report->>'mode_id' in ('campaign_solo','campaign_duo','campaign_trio','boss_rush_duo','boss_rush_trio')
        then v_winners<1 or v_winners>=v_count else v_winners<>1 end) then
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
    select 1 from public.dd_battle_rooms r join public.dd_battle_states s on s.room_id=r.id
    where r.id=v_room and r.host_user_id=v_uid and r.match_id=v_match
      and r.mode_id=p_report->>'mode_id' and r.game_version=p_report->>'game_version'
      and v_count<=r.max_players
      and s.match_id=v_match and s.state->'statsReport'=p_report
      and s.state#>'{ui,winner,open}'='true'::jsonb
      and s.state->'settled' is distinct from 'false'::jsonb
  ) then raise exception 'DD_STATS_NOT_HOST'; end if;

  -- Pro Konto serialisieren, damit parallele Uploads das Tageslimit nicht umgehen.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,914));
  if (select count(*) from dd_stats_private.reports r where r.account_id=v_uid and r.received_at>=now()-interval '1 day')>=10000 then
    raise exception 'DD_STATS_RATE_LIMIT';
  end if;

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

