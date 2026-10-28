# Supabase setup (shared team data + sign-in)

The app stores everything in one table, `records`, protected by row-level security:
only email addresses listed in `members` can read or change data. Every change is
also written to `record_history` (who, when, before/after) for audit evidence.

## One-time setup

1. **Create the tables.** Supabase → SQL Editor → New query → paste `schema.sql` → Run.
   It also makes `vilbert@blackgoldsecurity.my` the first admin.
2. **Load the starting data.** Run the separate `bgs-seed.sql` file the same way.
   That file contains company records, so it is **not** kept in this public repository.
3. **Allow sign-in from the website.** Authentication → URL Configuration:
   - Site URL: your Vercel address (e.g. `https://iso-xxxx.vercel.app`)
   - Redirect URLs: add the same address, plus `http://localhost:5173` for local work.
4. **(Optional) Show a 6-digit code in the sign-in email**, for people whose email app
   opens links in a different browser: Authentication → Email Templates → Magic Link →
   add `Your code: {{ .Token }}` to the message.
5. **Add the team** in the app: Settings → Team members (admins only).

## Notes

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are in `.env.production`. The anon key
  is designed to be public; data is protected by the rules in `schema.sql`.
  Never put the `service_role` key in this repository or in Vercel.
- Supabase's built-in email sender is limited to a few emails per hour. If the team
  signs in often, connect your own SMTP under Authentication → Emails → SMTP Settings.
- Without the two environment variables (e.g. `npm run dev` with no `.env.local`), the app
  runs in browser-only demo mode.
