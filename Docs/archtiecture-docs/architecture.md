# AIT — System Architecture

## Overview

Agent Issue Tracker (AIT) is an issue tracker built for AI-native software teams.
Human developers create and review issues through a web interface; AI coding agents
pick up, work, and report on those issues through a JSON API. Both operate on the
same shared data, so humans and agents always see one consistent view of the work.

## High-Level Architecture

```
        HUMANS                                      AI AGENTS
   ┌──────────────┐                          ┌──────────────────┐
   │    Web UI    │                          │   Agent Runner   │
   │  (browser)   │                          │      (CLI)       │
   └──────┬───────┘                          └────┬────────┬────┘
          │                                       │        │ runs
          │                                       │        v
          │                                       │   ┌──────────────────┐
          │                                       │   │ AI Coding Agent  │
          │                                       │   │ + Code Repository│
          │                                       │   │   (external)     │
          │  HTTPS / JSON          HTTPS / JSON   │   └──────────────────┘
          └───────────────┬───────────────────────┘
                          v
          ┌───────────────────────────────────┐
          │             AIT API               │
          │        Cloudflare Worker          │
          │      REST · JSON · 8 endpoints    │
          └────────────────┬──────────────────┘
                           v
          ┌───────────────────────────────────┐
          │       Cloudflare D1 (SQLite)      │
          │       issues · users · agents     │
          └───────────────────────────────────┘
```

AIT has three core parts — a **web UI** for humans, a **REST API** that is the single
gateway to all data, and a **database**. A separate **agent runner** connects the API
to external AI coding tools.

## Components

### Web UI
Vanilla HTML, CSS, and JavaScript. Provides the dashboard (sprint health, activity
feed, token usage), the issue list, and a kanban board. Communicates with the API
over HTTPS.

### AIT API
A Cloudflare Worker exposing a REST API. It is the only path to issue data: every
read and write — from the UI and from agents — goes through it, and it validates
each request before the database is touched.

### Database
Cloudflare D1 (SQLite). Stores issues, users, and agents.

### Agent Runner
A command-line program that lets an AI coding agent do work. It polls the API for
open issues, claims one, runs a coding agent (such as Claude Code) against the target
code repository, and posts the result back to the API. AIT coordinates and records
the work — it never executes code itself.

## API Endpoints

All requests and responses are JSON.

| Method | Endpoint | Description |
|--------|------------------------------|------------------------------------|
| GET    | `/api/issues`                | List all issues                    |
| GET    | `/api/issues/:id`            | Get one issue                      |
| POST   | `/api/issues`                | Create an issue                    |
| PUT    | `/api/issues/:id`            | Update an issue                    |
| DELETE | `/api/issues/:id`            | Delete an issue                    |
| PUT   | `/api/issues/:id/claim`      | Claim an issue (lock to a user/agent) |
| PUT   | `/api/issues/:id/result`     | Submit completed work for review   |
| PUT   | `/api/issues/:id/close`      | Approve and close an issue         |

## Data Model

### issues

| Column | Type | Description |
|----------------------|---------|----------------------------------------------------------|
| id                   | TEXT    | Unique issue identifier (primary key)                    |
| title                | TEXT    | Issue title                                              |
| issue_description    | TEXT    | Issue details                                            |
| issue_status         | TEXT    | `open` · `in_progress` · `review` · `blocked` · `closed` |
| issue_priority       | TEXT    | `low` · `medium` · `high` · `critical`                   |
| assigned_to_user     | TEXT    | Assigned person (exclusive with agent)                   |
| assigned_to_agent    | TEXT    | Assigned agent (exclusive with user)                     |
| claim_expires_at     | INTEGER | When an agent's claim lapses                             |
| retry_count          | INTEGER | Number of failed claim attempts                          |
| claim_timeout_minutes| INTEGER | Claim duration                                           |
| created_at           | TEXT    | Creation timestamp (ISO 8601)                            |
| updated_at           | TEXT    | Last-update timestamp (ISO 8601)                         |
| closed_at            | TEXT    | Close timestamp (ISO 8601)                               |

### users
`id` · `username` · `email`

### agents
`id` · `agent_name` · `agent_status` (`idle` · `running` · `offline`)

## Issue Lifecycle

```
  ┌──────┐  claim   ┌─────────────┐  submit  ┌────────┐ approve  ┌────────┐
  │ open │ ───────► │ in_progress │ ───────► │ review │ ───────► │ closed │
  └──────┘          └──────┬──────┘          └────────┘          └────────┘
     ▲                     │ blocked
     │                     ▼
     │               ┌──────────┐
     └───────────────┤ blocked  │
        unblocked    └──────────┘
```

- **open** — created, not yet started
- **in_progress** — claimed by a person or an agent
- **review** — work submitted, awaiting human approval
- **blocked** — cannot proceed; needs attention before returning to `open`
- **closed** — approved and complete

## Technology Stack

| Layer        | Technology              |
|--------------|-------------------------|
| Frontend     | Vanilla HTML / CSS / JS |
| API          | Cloudflare Workers      |
| Database     | Cloudflare D1 (SQLite)  |
| Agent runner | Node.js CLI             |
| CI/CD        | GitHub Actions          |
| Hosting      | Cloudflare              |

## Agent Runner Workflow

1. Fetch open issues        →  GET  /api/issues
2. Pick highest priority    →  (local sort)
3. Claim the issue          →  PUT  /api/issues/:id/claim
4. Run coding agent         →  (external: Claude, Codex, etc.)
5. Post result              →  PUT  /api/issues/:id/result
6. Human reviews            →  (manual)
7. Close                    →  PUT  /api/issues/:id/close