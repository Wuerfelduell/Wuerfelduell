-- Spielernamen höchstens 12 Zeichen (Entscheidung 20.10.2026), passend zu PLAYER_NAME_MAX im Client.
-- Bestehende längere Anzeigenamen werden gekürzt.

update public.dd_accounts
set display_name=coalesce(nullif(rtrim(left(display_name,12)),''),'Player')
where char_length(display_name)>12;

do $$
declare c record;
begin
  for c in
    select con.conname from pg_constraint con
    where con.conrelid='public.dd_accounts'::regclass and con.contype='c'
      and pg_get_constraintdef(con.oid) ilike '%display_name%'
  loop
    execute format('alter table public.dd_accounts drop constraint %I',c.conname);
  end loop;
end $$;

alter table public.dd_accounts
  add constraint dd_accounts_display_name_check check (char_length(display_name) between 1 and 12);

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
    coalesce(nullif(rtrim(left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),nullif(split_part(coalesce(new.email,''),'@',1),''),'Player'),12)),''),'Player')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
