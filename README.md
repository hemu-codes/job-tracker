# Job Tracker

An AI-powered job search dashboard for software engineers on H-1B visas. Discovers roles in non-traditional industries, ranks them by resume match score, and tracks your full application pipeline.

**Live:** https://hemu-job-tracker.vercel.app

---

## Features

- **AI role discovery** — Claude AI generates a curated list of 20 H-1B-friendly roles every refresh, prioritizing non-traditional industries (HealthTech, FinTech, Aerospace, Logistics, Gaming, etc.)
- **Resume match scoring** — each role is scored 60–95 based on how well it matches your actual skills and experience
- **H-1B filter** — only includes established companies known to sponsor H-1B visas
- **Application tracker** — track every application: status, date applied, job link, notes
- **Pipeline view** — see your funnel at a glance: Saved → Applied → Interviewing → Offer
- **Auto-refresh** — Vercel cron job refreshes roles every 6 hours automatically

---

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **AI:** Anthropic Claude claude-sonnet-4-20250514 via `@anthropic-ai/sdk`
- **Styling:** CSS Modules (dark theme)
- **Deployment:** Vercel
- **Cron:** Vercel Cron Jobs (every 6 hours)
- **Storage:** localStorage (client-side application data)

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/hemu-codes/job-tracker.git
cd job-tracker
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...        # from console.anthropic.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=any-random-string
```

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/tracker`.

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "feat: initial job tracker"
git remote add origin https://github.com/hemu-codes/job-tracker.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `hemu-codes/job-tracker`
3. Add environment variables:
   - `ANTHROPIC_API_KEY` → your Anthropic key
   - `NEXT_PUBLIC_APP_URL` → `https://your-app.vercel.app` (fill in after first deploy)
   - `CRON_SECRET` → any random string (e.g. run `openssl rand -hex 16`)
4. Click **Deploy**

### 3. Configure Vercel Cron

The `vercel.json` already configures the cron schedule:
```json
{
  "crons": [{ "path": "/api/cron/refresh-jobs", "schedule": "0 */6 * * *" }]
}
```

This runs at `0:00, 6:00, 12:00, 18:00 UTC` daily. Vercel Hobby plans support 1 cron job for free. The cron endpoint is protected by `CRON_SECRET`.

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `GET /api/jobs` | GET | Returns cached roles (6-hour TTL) |
| `GET /api/jobs?force=true` | GET | Forces a fresh AI fetch |
| `GET /api/cron/refresh-jobs` | GET | Called by Vercel cron; triggers force refresh |

---

## Portfolio Integration

See `PORTFOLIO_INTEGRATION.ts` for a ready-to-paste project card for your portfolio at https://hemantha-personal-website.vercel.app.

---

## Updating the Resume / Scoring Prompt

Edit `src/lib/resume.ts`:
- `RESUME_CONTEXT` — your skills, experience, and preferences
- `buildJobsPrompt()` — the full prompt sent to Claude. Adjust industry weights, score criteria, or role types here.

---

## License

MIT
