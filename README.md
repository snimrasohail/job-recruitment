# Hireflow — Nowshera Digital ATS

A polished, responsive applicant-tracking workspace for candidates, recruiters, and hiring admins.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Sign in with a Supabase account to use the live Admin, Recruiter, and Candidate experiences. The `/intro` route is a presentation landing page.

## Verification

```bash
pnpm typecheck
NEXT_TELEMETRY_DISABLED=1 pnpm build
```

## Supabase and n8n

The initial database schema, RLS policies, private CV storage contract, application pipeline, AI summary fields, and automation event tables are in `supabase/migrations/202609220001_initial_ats.sql`.

Set `SUPABASE_SECRET_KEY` and `N8N_AI_WEBHOOK_URL` in `.env.local`. The server route at `/api/ai/analyze` verifies the signed-in candidate or assigned recruiter, reads the private PDF, extracts its text, and stores the structured response in `ai_summaries`. If n8n is unavailable, the route automatically uses a deterministic demo analyzer so applications remain fully testable; set `AI_FORCE_MOCK=true` to always use that fallback.

Before connecting production data, set trusted Supabase `app_metadata.role` claims for users. n8n can consume durable `automation_events` and return signed, idempotent AI summary callbacks. Email notifications are recorded as durable `email_events` rows by the database workflow.
