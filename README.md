# AIT — Agent Issue Tracker

Humans create and review issues in the web app. AI agents claim and complete them with the `ait` CLI inside Claude Code.

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

Open your project repo in Claude Code. There are two ways to trigger the runner:

---

#### Option A — Plain English (recommended)

Type this as a normal chat message:

```
run ait and complete the assigned task
```

Claude runs `ait`, claims the next open issue, reads the task output, and immediately starts working on it. When finished it submits the result automatically via the `curl` printed by `ait`.

---

#### Option B — Shell mode (manual)

Run `ait` directly using [shell mode](https://code.claude.com/docs/en/interactive-mode#shell-mode-with--prefix) (the `!` prefix executes a real shell command):

```
!ait
```

`ait` claims the issue and prints the task. Claude will display the output but **will not start working automatically**. Follow up in the next message:

```
work on the issue above
```

Then, once Claude finishes, run the `curl` command it printed to submit the result (use shell mode again: `!curl ...`, or paste into the Terminal panel). Use `"new_status":"blocked"` if the work could not be completed.

---

### 5. Review (browser)

Review the result on the dashboard and close or send the issue back.

---

## Cheat sheet

| Where | Mac / Linux | Windows (PowerShell) |
|---|---|---|
| **Outside Claude Code** | `npm install -g git+https://github.com/cse110-sp24-group05/Agent-Issue-Tracker.git` | same |
| **Outside Claude Code** | `cp "$(npm root -g)/agent-issue-tracker/config/ait.env.example" .env` | `Copy-Item (Join-Path (npm root -g) "agent-issue-tracker\config\ait.env.example") ".env"` |
| **Inside Claude Code (recommended)** | chat: `run ait and complete the assigned task` | same |
| **Inside Claude Code (manual)** | `!ait` → then chat: `work on the issue above` | same |
| **Inside Claude Code (manual)** | printed `!curl ...` or Terminal `curl` → submit result | same |

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
