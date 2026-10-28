# ISO Compliance Dashboard (ISO 9001 & ISO 45001)

A web dashboard for monitoring and tracking compliance with **ISO 9001:2015 (Quality)** and **ISO 45001:2018 (OH&S)**.

## What it tracks

| Section | Contents |
|---|---|
| **Overview** | Readiness % per standard, open/overdue CAPA, days since last LTI, LTIFR/TRIR, high risks, a "needs attention" list, incident trend, residual-risk matrix, upcoming audits, objectives, certificate expiry |
| **Clauses** | Register of every requirement clause 4–10 for both standards: status, owner, evidence, last reviewed |
| **Audits & CAPA** | Audit programme (internal, surveillance, supplier, management review) and the findings / corrective-action log |
| **OH&S** | Incident & near-miss log, hazard & risk register (HIRARC, 5×5 matrix, initial vs residual risk) |
| **Records** | Controlled documents with review dates, training & competence with expiry dates, quality & OH&S objectives |
| **Calendar** | Recurring obligations (audits, management review, SHC meetings, drills, inspections, HIRARC and register reviews) with last done / next due |
| **Objectives** | Quality and OSH objectives with a month-by-month results grid |
| **Legal & risks** | Legal register & evaluation of compliance (BGS-F28) and risk & opportunity register (BGS-F11) |
| **Actions** | Follow-up actions that are not formal NCRs |
| **Settings** | Company details, certificate expiry dates, hours worked (for LTIFR), team members, backup export and import |

Every table supports search, filters, a "needs attention" filter, add/edit/delete, and CSV export.

## Run locally

```bash
npm install
npm run dev
```

## Deploy on Vercel

1. Push this repo to GitHub.
2. In Vercel, choose **Add New → Project**, import the GitHub repo, and click **Deploy**. Vercel detects Vite automatically (build command `npm run build`, output `dist`).
3. Every push to `main` redeploys automatically.

## Where the data is stored

Team data lives in **Supabase** (one shared database with sign-in). Only people listed under
**Settings → Team members** can sign in and see records, and every change is logged with who
made it. Setup steps are in [`supabase/README.md`](supabase/README.md).

Without Supabase settings (e.g. running locally with no `.env.local`), the app falls back to
browser-only storage with demo data.

## Project structure

```
src/
  clauses.ts        clause lists for ISO 9001 and ISO 45001
  types.ts          data model
  store.tsx         data layer (Supabase, or localStorage fallback)
  auth.tsx          sign-in gate and team membership
  supabase.ts       Supabase client
  metrics.ts        KPIs and "needs attention" logic
  seed.ts           demo data
  components/       CrudTable (generic register) and UI bits
  views/            Overview, Modules (Clauses/Audits/OH&S/Records), Compliance (Calendar/Objectives/Registers/Actions), Settings
supabase/
  schema.sql        tables, access rules, change history
```
