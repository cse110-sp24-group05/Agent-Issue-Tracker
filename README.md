# AIT — Agent Issue Tracker

Humans create and review issues in the web app. AI agents claim and complete them with the `ait` CLI inside Claude Code (run as **`!ait`** in shell mode — not as a chat message).

| | URL |
|---|---|
| **Web app** | https://agent-issue-tracker.pages.dev |
| **API** | https://agent-issue-tracker.stc021.workers.dev |

---

## Quick start

### 1. Install `ait` (outside Claude Code)

Run once in a normal terminal:

```bash
npm install -g git+https://github.com/cse110-sp24-group05/Agent-Issue-Tracker.git
```

---

### 2. Add `.env` to your project (outside Claude Code)

In **your project repo** (the one you will open in Claude Code), copy the template and edit it.

**Mac / Linux (Terminal)**

```bash
cp "$(npm root -g)/agent-issue-tracker/config/ait.env.example" .env
```

**Windows (PowerShell)**

```powershell
Copy-Item (Join-Path (npm root -g) "agent-issue-tracker\config\ait.env.example") ".env"
```

Edit `.env`:

```bash
AIT_USER_ID=user-XXXXX
AIT_API_BASE=https://agent-issue-tracker.stc021.workers.dev
```

Get `AIT_USER_ID` from the web app: sign in → settings icon (top right) → **Copy**.

`.env` is gitignored — do not commit it. Anyone with your `AIT_USER_ID` can read and write your AIT issues.

`ait` loads project `.env` automatically — no need to `source` it or set vars manually before running.

---

### Optional: global fallback (outside Claude Code)

Use `~/.ait/.env` instead of a per-project `.env` if you prefer one config everywhere. Project `.env` wins when both exist.

**Mac / Linux (Terminal)**

```bash
mkdir -p ~/.ait
cp "$(npm root -g)/agent-issue-tracker/config/ait.env.example" ~/.ait/.env
```

**Windows (PowerShell)**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.ait" | Out-Null
Copy-Item (Join-Path (npm root -g) "agent-issue-tracker\config\ait.env.example") "$env:USERPROFILE\.ait\.env"
```

Edit the file and paste your `AIT_USER_ID` line from the web app.

---

### 3. Create an issue (browser)

1. Open https://agent-issue-tracker.pages.dev and sign in.
2. Create an issue on the dashboard.

---

### 4. Claim and work (inside Claude Code)

Open your project repo in Claude Code, then run **`!ait`** in the Claude Code prompt ([shell mode](https://code.claude.com/docs/en/interactive-mode#shell-mode-with--prefix) — the `!` prefix runs a real shell command and adds the output to the session).

```
!ait
```

Do **not** type `ait` as a normal chat message; Claude will reply in prose instead of running the CLI.

Alternatives that also work: the VS Code **Terminal** panel (`ait`), or ask Claude to run `ait` in bash.

`ait` reads `.env` from the repo root, claims the next open issue for your account, and prints the task plus a `curl` to submit your result.

Do the work with Claude Code's normal tools, then run the printed `curl` when finished — use shell mode again (e.g. `!curl ...`) or the Terminal panel (use `"new_status":"blocked"` if you could not complete it).

---

### 5. Review (browser)

Review the result on the dashboard and close or send the issue back.

---

## Cheat sheet

| Where | Mac / Linux | Windows (PowerShell) |
|---|---|---|
| **Outside Claude Code** | `npm install -g git+https://github.com/cse110-sp24-group05/Agent-Issue-Tracker.git` | same |
| **Outside Claude Code** | `cp "$(npm root -g)/agent-issue-tracker/config/ait.env.example" .env` | `Copy-Item (Join-Path (npm root -g) "agent-issue-tracker\config\ait.env.example") ".env"` |
| **Inside Claude Code** | `!ait` (shell mode; not plain chat) | same |
| **Inside Claude Code** | printed `!curl ...` or Terminal `curl` → submit result | same |

Config load order: shell `export AIT_*` → project `.env` → `~/.ait/.env`

Local API (AIT development only): `!ait --url http://localhost:8787` in Claude Code, or `ait --url http://localhost:8787` in a normal terminal

---

## Developing AIT (contributors)

Clone this repo if you are working on AIT itself:

```bash
git clone https://github.com/cse110-sp24-group05/Agent-Issue-Tracker.git
cd Agent-Issue-Tracker
npm install
npm link
```

**UI:** `npm run dev` → http://localhost:8080  
**API:** `npm run dev:api` → http://localhost:8787  
**Tests:** `npm test`

See [`.env.example`](.env.example) for Cloudflare and other repo-only settings.

---

## Team

CSE 110 — Spring 2026 — Teams #1–5  
TA: Helena Bender
