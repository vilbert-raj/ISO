-- Switch sign-in back ON: only listed team members can read or change records.
-- Run in Supabase SQL Editor, and set VITE_REQUIRE_LOGIN=true in .env.production.
drop policy if exists "public read records" on public.records;
drop policy if exists "public write records" on public.records;
revoke insert, update, delete on public.records from anon;
