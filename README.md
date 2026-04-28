# Fieldline

The CRM for trade businesses — lawn care, HVAC, plumbing — in NW Ohio & SE Michigan.

## Stack

- **Next.js 14** (App Router)
- **Upstash Redis** — sessions, leads, jobs, reviews, AI activity log
- **Anthropic Claude** — AI quote generator, review responder, follow-up writer
- **Iron Session** — cookie-based auth
- **Tailwind CSS** — Warm Void design system

## What's in here

### App
- `/login` — sign in or claim free pilot (creates account + seeds demo data)
- `/dashboard` — live stats, pipeline, AI activity, quick AI quote tool
- `/leads` — kanban pipeline with full CRUD + AI quote generation per lead
- `/calendar` — weekly schedule view
- `/reviews` — Google review feed with one-click AI replies
- `/settings` — account info & AI voice config (placeholder)

### API
- `POST /api/auth/{signup,login,logout}` — auth
- `GET/POST /api/leads`, `PATCH/DELETE /api/leads/[id]` — lead CRUD
- `GET/POST /api/jobs` — jobs
- `GET/POST /api/reviews`, `POST /api/reviews/[id]/reply` — reviews + AI reply
- `POST /api/ai/quote` — AI quote generator
- `POST /api/ai/followup` — AI lead follow-up writer
- `GET /api/stats` — dashboard stats

## Setup

```bash
npm install
cp .env.example .env.local
# fill in env vars
npm run dev
```

## Deploy

Push to GitHub → import in Vercel → add env vars from `.env.example` → deploy.
