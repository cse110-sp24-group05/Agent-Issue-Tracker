# AIT — System Architecture

## Overview

Agent Issue Tracker (AIT) is an issue tracker built for AI-native software teams.
Human developers create and review issues through a web interface; AI coding
agents pick up, work, and report on those issues through a JSON API. Both work
on the same shared data, so humans and agents always see one consistent view of
the work.

## High-Level Architecture

```
       HUMANS                                       AI AGENTS
   ┌──────────────┐                          ┌──────────────────┐
   │    Web UI    │                          │   AIT Runner     │
   │  (browser)   │                          │(CLI: npm run ait)│
   └──────┬───────┘                          └────────┬─────────┘
          │                                           │ print task to
          │                                           │
          │  HTTPS / JSON          HTTPS / JSON       v
          │                                  ┌──────────────────┐
          │                                  │ Claude Code      │
          │                                  │ (running locally)│
          │                                  └────────┬─────────┘
          │                                           │ work + curl
          └─────────────────────┬─────────────────────┘
                                v
                ┌───────────────────────────────────┐
                │             AIT API               │
                │        Cloudflare Worker          │
                │     REST · JSON · endpoints       │
                └────────────────┬──────────────────┘
                                 v
                ┌───────────────────────────────────┐
                │       Cloudflare D1 (SQLite)      │
                │  issues · users · agents · history│
                └───────────────────────────────────┘
```

AIT has three core parts: a **web UI** for humans, a **REST API** that is the
single gateway to all data, and a **database**. A separate **agent runner**
connects the API to an active Claude Code session. AIT tracks and records the
work but never executes code or accesses repositories directly.

## Components

### Web UI

Vanilla HTML, CSS, and JavaScript. Provides the login screen, the dashboard
(sprint health, activity feed), the issue list, and a kanban
board. Communicates with the API over HTTPS.

The UI stores the logged-in user's profile in `localStorage` under the
`ait_profile` key (`id`, `name`, `email`), so the user only logs in once per
device.

### AIT API

A Cloudflare Worker exposing a REST API. It is the only path to issue data:
every read and write that from the UI and from agents goes through it, and it
validates each request before the database is touched.

The API enforces:

- per-user scoping (every issue belongs to one user via `created_by_user`)
- mutex on assignment (issue assigned to a user OR an agent, never both)
- status transitions (claim only on `open`, result only on `in_progress`, etc.)
- self-healing claims (expired claims reset to `open` on `/api/issues/ready`)

### Database

Cloudflare D1 (SQLite). Stores issues, users, agents, and a full status-change
history. Triggers maintain the history table automatically — every status
change is logged, every issue deletion cascades.

The schema uses **per-user display numbers** so each user sees their own
`issue-001`, `issue-002` sequence that stays stable even when issues are
deleted.

### AIT Runner

A command-line program (`npm run ait`) designed to be called from *within* an
active Claude Code session. The runner:

1. Reads the user's id from `~/.ait/.env` (set after login)
2. Calls `GET /api/issues/ready` with the user's `X-User-ID` header
3. Claims the issue via `PUT /api/issues/:id/claim`
4. Prints the task description and a pre-filled curl command to stdout
5. Exits — Claude Code reads the task, does the work, then runs the printed
   curl to report the result back

This design lets the user pay for Claude through their existing Claude Code
subscription rather than supplying an API key. AIT itself never calls Claude.

## API Endpoints

Full contract in `Docs/archtiecture-docs/api-contract.md`.

| Method | Endpoint | Description |
|--------|----------------------------------|----------------------------------------|
| POST   | `/api/login`                     | Login or auto-register a user          |
| PUT    | `/api/users/:id`                 | Change a user's display name           |
| GET    | `/api/issues?user_id=:id`        | List issues for one user               |
| GET    | `/api/issues/ready`              | Get next ready issue (X-User-ID)       |
| GET    | `/api/issues/:id`                | Get one issue                          |
| GET    | `/api/issues/:id/history`        | Status change history for one issue    |
| POST   | `/api/issues`                    | Create an issue (server assigns id)    |
| PUT    | `/api/issues/:id`                | Update an issue                        |
| DELETE | `/api/issues/:id`                | Delete an issue                        |
| PUT    | `/api/issues/:id/claim`          | Claim an issue (lock to an agent)      |
| PUT    | `/api/issues/:id/result_text`         | Submit work result                     |
| PUT    | `/api/issues/:id/block`          | Block an issue (failure path)          |
| PUT    | `/api/issues/:id/close`          | Approve and close an issue             |

## Data Model

### issues

| Column | Type | Description |
|----------------------|----------------|----------------------------------------|
| id                   | TEXT           | Server-assigned UUID                   |
| display_no           | INTEGER        | Per-user sequential number (1, 2, 3…)  |
| title                | TEXT           | Issue title                            |
| issue_description    | TEXT           | User's original description            |
| issue_status         | TEXT           | open, in_progress, review, blocked, closed |
| issue_priority       | TEXT           | low, medium, high, critical         |
| assigned_to_user     | INTEGER (0/1)  | Boolean — assigned to the user         |
| assigned_to_agent    | INTEGER (0/1)  | Boolean — assigned to an agent |
| created_by_user      | TEXT           | users.id                          |
| claim_expires_at     | INTEGER        | Unix timestamp; null when not claimed  |
| retry_count          | INTEGER        | Failed claim attempts                  |
| claim_timeout_minutes| INTEGER        | Claim duration                         |
| agent_response       | TEXT           | Claude's raw response / block reason   |
| result_text          | TEXT           | Agent's work summary                   |
| created_at           | TEXT           | ISO 8601                               |
| updated_at           | TEXT           | ISO 8601                               |
| closed_at            | TEXT           | ISO 8601, null until closed            |

**Solo-dev assignment model.** `assigned_to_user` and `assigned_to_agent` are
booleans, not foreign keys. The issue records *whether* it's assigned to "a
user" or "an agent" — the specific identity is implicit from `created_by_user`.
This simplification keeps the schema small while supporting the
human-vs-agent kanban view.

### users
`id` · `username` · `email`

The id format is `user-XXXXX` (5-digit zero-padded random). Generated by the
server on first login.

### agents
`id` · `agent_name` · `agent_status` (`idle` · `running` · `offline`)

### issue_status_history

Audit log populated automatically by triggers on every status change.

`id` · `issue_id` · `issue_status` · `changed_at` · `changed_by_user` (0/1) ·
`changed_by_agent` (0/1)

## Issue Lifecycle

```
  ┌──────┐  claim   ┌─────────────┐  submit  ┌────────┐ approve  ┌────────┐
  │ open │ ───────► │ in progress │ ───────► │ review │ ───────► │ closed │
  └──────┘          └──────┬──────┘          └────────┘          └────────┘
     ▲                     │ blocked
     │                     ▼
     │                ┌─────────┐
     └────────────────┤ blocked │
         unblocked    └─────────┘
```

- **open** — created, not yet started
- **in_progress** — claimed by an agent or being worked on by the user
- **review** — work submitted, awaiting human approval
- **blocked** — cannot proceed; description unclear, prerequisite missing, or
  agent failure
- **closed** — approved and complete

Expired claims self-heal: when the runner calls `/api/issues/ready`, the API
resets any `in_progress` issues whose `claim_expires_at` has passed back to
`open`, so a runner that crashed mid-task doesn't leave issues stuck.

## Agent Runner Workflow

```
1. Read user id from ~/.ait/.env             ->  config
2. Fetch next ready issue                    ->  GET /api/issues/ready (X-User-ID)
3. Claim the issue                           ->  PUT /api/issues/:id/claim
4. Print task and curl command to stdout     ->  (Claude Code reads it)
5. Claude Code does the work locally
6. Claude Code runs the printed curl         ->  PUT /api/issues/:id/result_text
                                                 body: { new_status, result_text }
7. Human reviews the result in the UI
8. Human approves                            ->  PUT /api/issues/:id/close
```

AIT records every step in the `issue_status_history` table via triggers, so
the dashboard can show a full audit trail of who changed what and when.

## CI/CD Pipeline

Three GitHub Actions workflows under `.github/workflows/` automate quality
checks, deployment, and versioning:

- **`ci.yml`** — runs on every PR and push to `main`/`develop`. Three jobs:
  `commitlint` (PR only, enforces conventional commits), `lint`
  (ESLint + JSDoc), `test` (Jest). All must pass to merge.
- **`cd.yml`** — runs on push to `main`. Applies any new D1 migrations, then
  deploys the Worker to Cloudflare. Schema-first ordering ensures the new code
  never crashes on missing columns.
- **`semver.yml`** — runs on push to `main`. Uses `release-please` to compute
  the next version from commit messages (`feat: ...` -> minor, `fix: ...` ->
  patch, `BREAKING CHANGE` -> major) and opens a Release PR with an updated
  CHANGELOG.

## Technology Stack

| Layer        | Technology              |
|--------------|-------------------------|
| Frontend     | Vanilla HTML / CSS / JS |
| API          | Cloudflare Workers      |
| Database     | Cloudflare D1 (SQLite)  |
| Agent runner | Node.js CLI             |
| AI agent     | Claude Code (user's local install) |
| CI/CD        | GitHub Actions          |
| Hosting      | Cloudflare              |