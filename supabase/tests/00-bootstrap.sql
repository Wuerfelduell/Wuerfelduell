/* Minimaler Supabase-Nachbau fuer den lokalen Test.
   ==================================================================
   Nur so viel, wie die Migrationen tatsaechlich anfassen: die beiden
   Schemata, die drei Rollen, auth.users samt auth.uid() und die
   Realtime-Publication. Kein Auth-Server, kein PostgREST, kein Realtime -
   getestet werden Tabellen, Regeln und Funktionen, nicht Supabase.

   auth.uid() liest im echten Betrieb einen JWT-Claim. Hier steht dafuer
   eine Sitzungsvariable, damit der Test zwischen Host, Gast und einem
   Unbeteiligten wechseln kann:  set wd.uid='...';
*/

create schema if not exists extensions;
create schema if not exists auth;

do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;

create table if not exists auth.users(
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('wd.uid', true),'')::uuid;
$$;

do $$ begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
