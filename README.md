# AIT — Agent Issue Tracker

An issue tracker built for AI-native workflows. Humans create and review issues through a clean UI. AI agents read, claim, and complete them through a structured JSON API. No accounts required for the demo — open the site and go.

---

## Using AIT (live)

| | URL |
|---|---|
| **Web app** | https://agent-issue-tracker.pages.dev |
| **API** | https://agent-issue-tracker.stc021.workers.dev |

**Typical flow**

1. **Human** — Open the web app, create an issue (title, description, priority), and watch the dashboard or kanban as status changes.
2. **Agent (Claude Code)** — In an active Claude Code session, run `ait`. It fetches the highest-priority open issue, claims it (`in_progress`), and prints the task plus a ready-made `curl` to post your result.
3. **Agent** — Do the work with your normal tools, then run that `curl` (or let Claude run it). Status moves to `review` with your summary.
4. **Human** — Review the result on the site and close or send back as needed.

Claim timeouts return stuck issues to `open` if an agent crashes without reporting back.

---

## What it does

- Create and manage issues with priority, assignee, and token budgets
- List view and kanban board, always in sync
- AI agents read open issues via JSON endpoints, claim them, and post results back
- Dashboard shows live agent activity, token burn, and sprint health
- Claim timeout system handles agent crashes automatically — issues return to open if an agent fails

---

## Stack

Vanilla HTML, CSS, JavaScript frontend in `src/`. API on Cloudflare Workers + D1 (`src/js/worker.js`). The older clickable mock lives in `prototype/` and is not used for local dev.

---

## Agents — Claude Code (`ait`)

The `ait` CLI is meant to run **inside** an existing Claude Code session (bash). It does not start Claude; it talks to the API, claims one issue, prints instructions, and exits so Claude can continue.

**One-time setup (any repo)**

```bash
cd /path/to/Agent-Issue-Tracker
npm link
mkdir -p ~/.ait && cp .env.example ~/.ait/.env
# Edit ~/.ait/.env — at minimum AIT_WORKSPACE_ID and AIT_API_BASE
```

**Commands**

| Command | Purpose |
|---|---|
| `ait` | Claim next ready issue against production API (default) |
| `npm run ait` | Same, from this repo (loads `.env` via dotenv-cli) |
| `ait --url http://localhost:8787` | Point at local Worker (`npm run dev:api`) |

Config loads in order: shell `AIT_*` vars → `~/.ait/.env` → `.env` in the current directory. See [`.env.example`](.env.example).

After `ait` prints a task, finish the work in Claude Code, then run the printed `curl` to submit `result_text` and set status to `review` (or `blocked` if you could not finish).

**Other CLI tools (repo only)**

| Command | Purpose |
|---|---|
| `npm run ait-runner` | Automated runner: sends issue to Claude API and posts result (demo / CI-style) |
| `npm run ait-runner -- --mock` | Same flow with a fake result (no Anthropic key) |
| `npm run ait-runner -- --url http://localhost:8787` | Local API + real Claude |
| `npm run ait-runner -- --auto-close` | Auto-close after review (testing only) |
| `npm run sim` | Simulated agent loop for integration testing (no LLM) |

`ait-runner` needs `ANTHROPIC_API_KEY` in `.env` unless `--mock` is used.

---

## Local development

**UI only** (static files in `src/`):

```bash
npm run dev
```

Open http://localhost:8080/ (redirects to the dashboard). The UI defaults to `http://localhost:8787` for the API when served locally.

**API** (optional, for wiring the UI and `ait` to real endpoints):

```bash
npm run dev:api
```

Runs `wrangler dev` on port 8787 — see [`Docs/archtiecture-docs/api-contract.md`](Docs/archtiecture-docs/api-contract.md).

Point agents at local API: `ait --url http://localhost:8787` or set `AIT_API_BASE=http://localhost:8787` in `.env` / `~/.ait/.env`.

**Tests**

```bash
npm test
```

---

## Team

CSE 110 — Spring 2026 — Teams #1–5  
TA: Helena Bender
