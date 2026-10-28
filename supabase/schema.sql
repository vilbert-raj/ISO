-- ISO Compliance Dashboard – Supabase schema
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Safe to re-run.

-- 1. Team members: only these emails can read or change data ---------------
create table if not exists public.members (
  email      text primary key check (email = lower(email)),
  name       text,
  role       text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where m.email = lower(auth.jwt() ->> 'email'));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where m.email = lower(auth.jwt() ->> 'email') and m.role = 'admin');
$$;

alter table public.members enable row level security;
drop policy if exists "members read" on public.members;
drop policy if exists "admins manage members" on public.members;
drop policy if exists "read own membership" on public.members;
create policy "read own membership" on public.members for select to authenticated
  using (email = lower(auth.jwt() ->> 'email') or public.is_member());
create policy "admins manage members" on public.members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2. All dashboard records: one row per item, grouped by collection ---------
create table if not exists public.records (
  collection text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text default lower(auth.jwt() ->> 'email'),
  primary key (collection, id)
);

alter table public.records replica identity full;  -- so live deletes reach other browsers

create or replace function public.touch_record() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(lower(auth.jwt() ->> 'email'), new.updated_by);
  return new;
end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
  for each row execute function public.touch_record();

alter table public.records enable row level security;
drop policy if exists "members read records" on public.records;
drop policy if exists "members write records" on public.records;
create policy "members read records" on public.records for select to authenticated using (public.is_member());
create policy "members write records" on public.records for all to authenticated using (public.is_member()) with check (public.is_member());

-- 3. Change history (who changed what, when) – useful audit evidence --------
create table if not exists public.record_history (
  seq        bigint generated always as identity primary key,
  changed_at timestamptz not null default now(),
  changed_by text,
  action     text not null,
  collection text not null,
  id         text not null,
  old_data   jsonb,
  new_data   jsonb
);

create or replace function public.log_record_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.record_history (changed_by, action, collection, id, old_data, new_data)
  values (
    lower(auth.jwt() ->> 'email'),
    tg_op,
    coalesce(new.collection, old.collection),
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE', 'DELETE') then old.data end,
    case when tg_op in ('INSERT', 'UPDATE') then new.data end
  );
  return coalesce(new, old);
end $$;
drop trigger if exists records_history on public.records;
create trigger records_history after insert or update or delete on public.records
  for each row execute function public.log_record_change();

alter table public.record_history enable row level security;
drop policy if exists "admins read history" on public.record_history;
create policy "admins read history" on public.record_history for select to authenticated using (public.is_admin());

-- 4. Live updates -----------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'records') then
    alter publication supabase_realtime add table public.records;
  end if;
end $$;

-- 5. First admin – change the email if needed --------------------------------
insert into public.members (email, name, role)
values ('vilbert@blackgoldsecurity.my', 'Vilbert Raj', 'admin')
on conflict (email) do update set role = 'admin';
