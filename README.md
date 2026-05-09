# H-1B Job Tracker

A personal job search dashboard for software engineers on H-1B visas. Discovers roles in non-traditional industries, scores them against your resume using AI, and tracks your full application pipeline with cross-device sync.

---
**Live:** [https://job-tracker-bs7i.vercel.app/tracker](https://job-tracker-bs7i.vercel.app/tracker)

---

## Features

- **Discover Companies** — AI-researched company recommendations across 12 non-traditional industries (HealthTech, FinTech, Aerospace, Gaming, Logistics, and more), pre-vetted for H-1B sponsorship
- **Live Postings** — Real job postings from LinkedIn, Indeed, and Glassdoor via JSearch API, scored against your resume
- **Contract Roles** — Contract and C2C roles in a separate tab
- **Resume match scoring** — Each role scored 60–95 based on match quality using Google Gemini AI
- **H-1B filter** — 300+ verified H-1B sponsoring companies list with fuzzy matching
- **Application tracker** — Track status, date applied, job link, and notes per role
- **Pipeline view** — Saved → Applied → Interviewing → Offer → Rejected/Withdrawn
- **Resume manager** — Upload multiple PDF resumes, set active resume for scoring
- **Cross-device sync** — Applications and resumes stored in Upstash Redis
- **Auto-refresh** — Vercel cron job refreshes daily (Hobby plan limit)

---

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **AI:** Google Gemini 2.5 Flash Lite via `@google/generative-ai`
- **Job Data:** JSearch API (via RapidAPI) — aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter
- **Storage:** Upstash Redis (cross-device sync) + localStorage (cache)
- **PDF Parsing:** unpdf
- **Styling:** CSS Modules (dark theme)
- **Deployment:** Vercel
- **Cron:** Vercel Cron Jobs (daily)

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google AI Studio API key |
| `JSEARCH_API_KEY` | RapidAPI key for JSearch |
| `KV_REST_API_URL` | Upstash Redis REST URL (auto-added by Vercel) |
| `KV_REST_API_TOKEN` | Upstash Redis token (auto-added by Vercel) |
| `CRON_SECRET` | Secret to protect the cron endpoint |

---

## Local Development

```bash
git clone https://github.com/hemu-codes/job-tracker.git
cd job-tracker
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
npm run dev
```

Open http://localhost:3000 — redirects to `/tracker`.

---

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/discover-jobs` | AI-generated company + role recommendations |
| `GET /api/live-jobs` | Real postings from JSearch, scored by Gemini |
| `GET /api/contract-jobs` | Contract/C2C roles from JSearch |
| `GET /api/apps` | Read/write tracked applications (Redis) |
| `GET /api/resumes` | Read/write uploaded resumes (Redis) |
| `POST /api/parse-resume` | Extract text from uploaded PDF |
| `GET /api/cron/refresh-jobs` | Called by Vercel cron daily |

---

## Updating Resume / Scoring

Edit `src/lib/resume.ts` to update `RESUME_CONTEXT` with your skills and experience. All AI scoring uses this context.

Edit `src/lib/h1b-sponsors.ts` to add or remove companies from the H-1B sponsors list.

---

## License

MIT
