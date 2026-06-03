# AIT — Agent Issue Tracker

Humans create and review issues in the web app. AI agents claim and complete them with the `ait` CLI inside Claude Code.

| | URL |
|---|---|
| **Web app** | https://agent-issue-tracker.pages.dev |
| **API** | https://agent-issue-tracker.stc021.workers.dev |

---

## Quick start

### 1. Install `ait` (outside Claude Code)

Run once in a normal terminal — any directory is fine. You do **not** need to clone this repo or open it in Claude Code.

```bash
npm install -g git+https://github.com/cse110-sp24-group05/Agent-Issue-Tracker.git
mkdir -p ~/.ait
```

Create `~/.ait/.env`:

```bash
AIT_USER_ID=user-XXXXX
AIT_API_BASE=https://agent-issue-tracker.stc021.workers.dev
```

Get `AIT_USER_ID` from the web app: sign in → settings icon (top right) → **Copy** (paste the full line).

---

### 2. Create an issue (browser)

1. Open https://agent-issue-tracker.pages.dev and sign in.
2. Create an issue on the dashboard.

---

### 3. Claim and work (inside Claude Code)

Open **your project repo** in Claude Code (not this repo). Then:

```bash
ait
```

`ait` claims the next open issue for your account and prints the task plus a `curl` to submit your result.

Do the work with Claude Code's normal tools, then run the printed `curl` when finished (use `"new_status":"blocked"` if you could not complete it).

---

### 4. Review (browser)

Review the result on the dashboard and close or send the issue back.

---

## Cheat sheet

| Where | Command |
|---|---|
| **Outside Claude Code** | `npm install -g git+https://github.com/cse110-sp24-group05/Agent-Issue-Tracker.git` |
| **Outside Claude Code** | Put `AIT_USER_ID=…` in `~/.ait/.env` |
| **Inside Claude Code** | `ait` |
| **Inside Claude Code** | printed `curl` → submit result |

Local API (AIT development only): `ait --url http://localhost:8787`

---

## Developing AIT (contributors)

Clone this repo if you are working on AIT itself:

```bash
git clone https://github.com/cse110-sp24-group05/Agent-Issue-Tracker.git
cd Agent-Issue-Tracker
npm install
npm link          # live symlink while editing runner.js
```

**UI:** `npm run dev` → http://localhost:8080  
**API:** `npm run dev:api` → http://localhost:8787  
**Tests:** `npm test`

Other repo-only tools: `npm run ait-runner`, `npm run sim` (see [`.env.example`](.env.example)).

---

## Team

CSE 110 — Spring 2026 — Teams #1–5  
TA: Helena Bender
