-- Mit dem finalen Spielzustand atomar archivieren, bevor Raum/Revanche ihn ersetzt.
create or replace function dd_stats_private.capture_final_state()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_report jsonb; v_host uuid;
begin
  if new.state#>'{ui,winner,open}' is distinct from 'true'::jsonb
     or new.state->'settled'='false'::jsonb
     or new.state->'statsReport' is null or new.state->'statsReport'='null'::jsonb then return new; end if;
  select r.host_user_id into v_host from public.dd_battle_rooms r where r.id=new.room_id;
  -- Alte Clients und reine Gast-Auth-Spiele bleiben kompatibel, zählen aber nicht.
  if not exists(select 1 from auth.users u where u.id=v_host and u.is_anonymous is false) then return new; end if;
  if v_host is distinct from auth.uid() then raise exception 'DD_STATS_NOT_HOST'; end if;
  v_report:=new.state->'statsReport';
  if v_report->>'source' is distinct from 'online'
     or v_report->>'room_id' is distinct from new.room_id::text
     or v_report->>'match_id' is distinct from new.match_id
     or v_report->'round_number' is distinct from new.state#>'{battle,roundNumber}'
     or jsonb_array_length(v_report->'players') is distinct from jsonb_array_length(new.state->'players')
     or (select p->'seat' from jsonb_array_elements(v_report->'players') p where p->'won'='true'::jsonb limit 1)
        is distinct from new.state#>'{battle,roundWinnerIndex}' then
    raise exception 'DD_STATS_INVALID_FINAL_STATE';
  end if;
  perform public.dd_submit_stats_report(v_host,v_report);
  return new;
end;
$$;
revoke all on function dd_stats_private.capture_final_state() from public,anon,authenticated;
create trigger dd_stats_capture_final_state
after insert or update of state on public.dd_battle_states
for each row execute function dd_stats_private.capture_final_state();
