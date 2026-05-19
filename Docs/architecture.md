# Agent Issue Tracker — Architecture

## Overview

The Agent Issue Tracker (AIT) is a dual-layer system: a **client-side prototype** for rapid iteration and demos, and a **production backend** built on Cloudflare Workers. Both layers share the same issue schema and status lifecycle.

---

## Layer Map

```
┌──────────────────────────────────────────────────────┐
│                  Browser (Prototype)                 │
│                                                      │
│  index.html  dashboard.html  issue.html  settings.html│
│       │             │             │            │      │
│       └─────────────┴─────────────┴────────────┘      │
│                          │                            │
│                       js/data.js  ◄──── SINGLE SOURCE │
│                     (localStorage)      OF TRUTH      │
│                          │                            │
│              ┌───────────┼───────────┐               │
│           js/ui.js  js/github.js  js/slack.js        │
│          (render)   (stubbed)     (stubbed)           │
│                          │                            │
│                    js/agent-sim.js                    │
│                  (floating dev panel)                 │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│              Production (Cloudflare Workers)          │
│                                                      │
│   REST API (src/js/worker.js)                        │
│       │                                              │
│   D1 SQLite Database                                 │
│   (issues table — schema below)                      │
└──────────────────────────────────────────────────────┘
```

The prototype and production backend are **not yet connected** — the prototype runs entirely from localStorage.

---

## Folder Structure

```
Agent-Issue-Tracker/
├── prototype/                  # Client-side demo (no server needed)
│   ├── index.html              # Issue list (main entry point)
│   ├── dashboard.html          # Sprint health & token burn overview
│   ├── issue.html              # Issue detail + claim/complete workflow
│   ├── settings.html           # First-run setup
│   ├── api/
│   │   └── issues.json         # Seed data — loaded into localStorage on first visit
│   ├── css/
│   │   ├── main.css            # Global styles + CSS variables
│   │   ├── list.css            # Table list view
│   │   ├── dashboard.css       # Dashboard grid & token progress bar
│   │   ├── issue.css           # Detail page + modals
│   │   ├── agent-sim.css       # Simulator panel
│   │   └── demo.css            # Demo-only overrides
│   └── js/
│       ├── data.js             # localStorage layer — all reads/writes here
│       ├── ui.js               # Pure rendering helpers (no DOM access)
│       ├── agent-sim.js        # Floating agent simulator panel
│       ├── github.js           # GitHub API stubs (console.log only)
│       └── slack.js            # Slack notification stubs (console.log only)
├── src/
│   └── js/
│       └── worker.js           # Cloudflare Workers — production REST API
├── wrangler.toml               # Workers config + D1 binding
├── docs/                       # Project documentation
├── CLAUDE.md                   # Project intent & mocking philosophy
└── package.json                # Dev tooling only
```

---

## Data Model

### Issue Object (Prototype Schema)

```json
{
  "id": "issue-001",
  "title": "string",
  "description": "string",
  "status": "open | in-progress | pending-review | closed | blocked",
  "priority": "P0 | P1 | P2 | P3",
  "assignee": "string",
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601",
  "token_budget": 2000,
  "tokens_used": 0,
  "time_estimate": 60,
  "time_spent": 0,
  "claimed_by": "agent-name | null",
  "claimed_at": "ISO 8601 | null",
  "completed_at": "ISO 8601 | null",
  "blocked_reason": "string | null",
  "result": "string",
  "created_by": "human-manual | llm-assist | agent-name",
  "github_number": "number | undefined",
  "audit_log": [
    { "action": "string", "by": "string", "at": "ISO 8601" }
  ]
}
```

### Production D1 Schema (worker.js)

```sql
CREATE TABLE issues (
  id                     TEXT PRIMARY KEY,
  title                  TEXT NOT NULL,
  issue_description      TEXT,
  issue_status           TEXT NOT NULL,      -- open | in_progress | blocked | review | closed
  issue_priority         TEXT NOT NULL,      -- low | medium | high | critical
  assigned_to_user       TEXT,
  assigned_to_agent      TEXT,               -- mutually exclusive with assigned_to_user
  claim_expires_at       TIMESTAMP,          -- now + 15 minutes on claim
  retry_count            INTEGER NOT NULL,
  claim_timeout_minutes  INTEGER NOT NULL,
  created_at             TIMESTAMP NOT NULL,
  updated_at             TIMESTAMP NOT NULL,
  closed_at              TIMESTAMP
);
```

---

## Status Lifecycle

```
        ┌──────────────────────────────────────┐
        │                                      │
   ┌────▼────┐   claim    ┌─────────────┐      │
   │  open   ├───────────►│ in-progress │      │
   └─────────┘            └──────┬──────┘      │
                                 │             │
                        post     │     block   │
                       result    │    ─────────►│ blocked │
                                 │             │         │
                    ┌────────────▼────────┐    └────┬────┘
                    │  pending-review     │         │ unblock
                    │  (require-review    │◄────────┘
                    │   mode only)        │
                    └────────────┬────────┘
                                 │ approve
                    ┌────────────▼────────┐
                    │      closed         │
                    └─────────────────────┘

  auto-close mode: in-progress ──────────────► closed
                               (skips pending-review)
```

---

## Data Flow (Prototype)

```
User Action (UI click / form submit)
         │
         ▼
    data.js function
    (e.g. claimIssue, postResult, closeIssue)
         │
         ├──► localStorage['ait_issues']  ← mutated in place
         │
         ├──► github.js stub (console.log)
         │
         ├──► slack.js stub (toast + console.log)
         │
         └──► document.dispatchEvent('ait:data-changed')
                       │
                       ▼
              All pages listen → applyFilters() → re-render
```

**Rule:** No file other than `data.js` may read or write localStorage directly.

---

## Reactive UI

All pages import `data.js` and register a listener on `ait:data-changed`. When any mutation fires the event, every open page re-renders its view from the updated localStorage state — no manual refresh required.

Flash animations in `ui.js` give immediate visual confirmation of state changes:

| Event    | Color  | Duration |
|----------|--------|----------|
| create   | green  | 2.2s     |
| claim    | amber  | 1.8s     |
| complete | purple | 1.8s     |
| close    | dark green | 1.8s |
| block    | red    | 1.8s     |
| update   | blue   | 1.8s     |

---

## Production REST API (worker.js)

| Method | Route                       | Action                       |
|--------|-----------------------------|------------------------------|
| GET    | /api/issues                 | List all issues              |
| GET    | /api/issues/:id             | Get single issue             |
| POST   | /api/issues                 | Create issue                 |
| PUT    | /api/issues/:id             | Update issue fields          |
| DELETE | /api/issues/:id             | Delete issue                 |
| POST   | /api/issues/:id/claim       | Claim (lock) to agent/user   |
| POST   | /api/issues/:id/result      | Post agent result            |
| POST   | /api/issues/:id/close       | Close issue                  |

Validation rules enforced at every endpoint:
- Status and priority values must match allowed enums
- `assigned_to_user` and `assigned_to_agent` are mutually exclusive
- `updated_at` is auto-stamped on every mutation
- Claim sets `claim_expires_at = now + 15 minutes`

---

## External Integrations (All Stubbed in Prototype)

| System | File         | Behavior                          |
|--------|--------------|-----------------------------------|
| GitHub | js/github.js | `console.log` only — no API calls |
| Slack  | js/slack.js  | Toast notification + `console.log` |
| LLM    | js/data.js   | Heuristic keyword detection (no real model) |

Settings (`ait_token`, `ait_slack`, `ait_llm`) are stored in localStorage and displayed in the settings page, but never used in network requests in the prototype.

---

## Token Budget Tracking

Each issue has a `token_budget` (default 2000) and `tokens_used` (set when an agent posts a result). The dashboard aggregates these across the sprint:

- **Sprint Budget**: editable total cap (localStorage `ait_sprint_budget`, default 20 000)
- **Used**: sum of `tokens_used` across all issues
- **Progress bar**: green < 70%, yellow 70–90%, red > 90%
- **Per-agent breakdown**: grouped by `claimed_by`
