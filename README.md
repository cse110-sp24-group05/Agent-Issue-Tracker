# AIT — Agent Issue Tracker

An issue tracker built for AI-native workflows. Humans create and review issues through a clean UI. AI agents read, claim, and complete them through a structured JSON endpoint. No accounts, no installs — just open the URL and go.

---

## What it does

- Create and manage issues with priority, assignee, and token budgets
- List view and kanban board, always in sync
- AI agents read open issues via a clean JSON endpoint, claim them, and post results back
- Dashboard shows live agent activity, token burn, and sprint health
- Claim timeout system handles agent crashes automatically — issues return to open if an agent fails

---

## Stack

Vanilla HTML, CSS, JavaScript frontend in `src/`. API on Cloudflare Workers + D1 (`src/js/worker.js`). The older clickable mock lives in `prototype/` and is not used for local dev.

## Local development

**UI only** (static files in `src/`):

```bash
npm run dev
```

Open http://localhost:8080/ (redirects to the dashboard).

**API** (optional, for wiring the UI to real endpoints):

```bash
npm run dev:api
```

Runs `wrangler dev` — see [`Docs/api-contract.md`](Docs/api-contract.md).

---

## Team

CSE 110 — Spring 2026 — Teams #1–5
TA: Helena
