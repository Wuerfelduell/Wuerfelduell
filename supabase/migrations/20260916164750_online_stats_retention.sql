-- Begrenzte private Diagnose und eine Kampfzahl ohne Einzelspieldaten.
create index capture_errors_created_at_idx on dd_stats_private.capture_errors(created_at);
create index capture_errors_match_created_at_idx on dd_stats_private.capture_errors(room_id,match_id,created_at);

create or replace function dd_stats_private.capture_final_state()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_report jsonb; v_host uuid; v_code text; v_message text;
begin
  begin
    if new.state#>'{ui,winner,open}' is distinct from 'true'::jsonb
       or new.state->'settled'='false'::jsonb
       or new.state->'statsReport' is null or new.state->'statsReport'='null'::jsonb then return new; end if;
    select r.host_user_id into v_host from public.dd_battle_rooms r where r.id=new.room_id;
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
  exception when others then
    get stacked diagnostics v_code=returned_sqlstate,v_message=message_text;
    -- Der fehlgeschlagene Statistikblock ist bereits zurückgerollt.
    -- Das Log gehört zur äußeren Transaktion des Spielzustands.
    begin
      insert into dd_stats_private.capture_errors(room_id,match_id,round_number,sqlstate,sqlerrm)
      values(new.room_id,new.match_id,
        case when new.state#>>'{battle,roundNumber}' ~ '^[0-9]{1,9}$'
          then (new.state#>>'{battle,roundNumber}')::integer else null end,
        v_code,v_message);
      delete from dd_stats_private.capture_errors where created_at < now()-interval '30 days';
      delete from dd_stats_private.capture_errors where id in (
        select id from dd_stats_private.capture_errors
        where room_id is not distinct from new.room_id and match_id is not distinct from new.match_id
        order by created_at desc,id desc offset 20
      );
    exception when others then
      -- Selbst ein Ausfall der Diagnosetabelle darf den Sieger nicht verbergen.
      raise log 'Statistik-Erfassung fehlgeschlagen [%]: %; Diagnose nicht gespeichert [%]: %',v_code,v_message,sqlstate,sqlerrm;
    end;
    return new;
  end;
  return new;
end;
$$;
revoke all on function dd_stats_private.capture_final_state() from public,anon,authenticated;

-- Einsaetze enthalten Mehrfachfaehigkeiten und ergeben keine Kampfzahl.
create function public.dd_global_stats_count() returns bigint
language sql stable security definer set search_path='' as $$
  select count(*) from dd_stats_private.reports;
$$;
revoke all on function public.dd_global_stats_count() from public,anon,authenticated;
grant execute on function public.dd_global_stats_count() to anon,authenticated;
