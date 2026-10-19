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
| **Settings** | Company details, certificate expiry dates, hours worked (for LTIFR), backup export and import |

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

Version 0.1 saves data in **the browser** (localStorage), so it runs on Vercel with no database setup. Each person's browser therefore holds its own copy. Use **Settings → Export backup** regularly, and **Import** to move data between computers.

The app loads with demo data. Use **Settings → Start blank** to begin with your own records.

**Next step for team use:** add a shared database, such as Vercel Postgres/Neon or Supabase, plus sign-in. All reads and writes go through `src/store.tsx` (`load()` and `save()`), so only that file needs to change.

## Project structure

```
src/
  clauses.ts        clause lists for ISO 9001 and ISO 45001
  types.ts          data model
  store.tsx         data layer (persistence)
  metrics.ts        KPIs and "needs attention" logic
  seed.ts           demo data
  components/       CrudTable (generic register) and UI bits
  views/            Overview, Modules (Clauses/Audits/OH&S/Records), Settings
```
