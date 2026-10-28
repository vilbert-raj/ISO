-- Switch OFF sign-in: anyone with the website link can read and change dashboard records.
-- Run in Supabase SQL Editor. Undo with restore-login.sql.
grant select, insert, update, delete on public.records to anon;
drop policy if exists "public read records" on public.records;
drop policy if exists "public write records" on public.records;
create policy "public read records" on public.records for select to anon using (true);
create policy "public write records" on public.records for all to anon using (true) with check (true);

-- make the timestamp trigger work for visitors who are not signed in
create or replace function public.touch_record() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(lower(auth.jwt() ->> 'email'), new.updated_by);
  return new;
end $$;
