-- Account selbst löschen (Google Play verlangt das bei Apps mit Accounts).
-- Löscht den eigenen auth.users-Eintrag. Alle dd_-Tabellen hängen mit
-- "on delete cascade" daran: Profil, Cloud-Save, eigene Räume,
-- Mitgliedschaften, Aktionen, Ereignisse und Statistik-Meldungen gehen mit.
-- Anonyme Online-Gäste haben keinen Account und werden abgewiesen.
create or replace function public.dd_delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'DD_AUTH_REQUIRED';
  end if;
  if exists(select 1 from auth.users where id = v_uid and coalesce(is_anonymous, false)) then
    raise exception 'DD_ACCOUNT_REQUIRED';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.dd_delete_own_account() from public, anon, authenticated;
grant execute on function public.dd_delete_own_account() to authenticated;
