# Agent Issue Tracker — Runner Flow

This document traces exactly how an issue moves from creation to closure, covering both the human path and the agent (runner) path.

---

## The Full Loop at a Glance

```
 Human / Agent
      │
      ▼
 CREATE issue ──────────────────────────────────► localStorage
      │                                               │
      ▼                                               ▼
 READ queue (open, unclaimed, sorted by priority)     │
      │                                               │
      ▼                                               │
 CLAIM issue ──────────────── status = in-progress ◄──┘
      │
      ▼
 DO WORK  (real or simulated)
      │
      ▼
 POST RESULT ────────────────────────────────────────────────────┐
      │                                                          │
      │  auto-close mode                    require-review mode  │
      ▼                                           ▼              │
 CLOSE immediately                        status = pending-review│
 status = closed                                  │              │
                                        Human APPROVES           │
                                                  │              │
                                         status = closed ◄───────┘
```

---

## Phase 1: Create

An issue enters the system through one of three paths:

### Manual (Human)
1. User clicks "New Issue" on `index.html`.
2. Fills in title, description, priority, token budget, time estimate.
3. `data.js::createIssue()` writes to localStorage with `status = open`, `created_by = human-manual`.
4. `ait:data-changed` event fires → list re-renders.

### AI-Assisted (Heuristic)
1. User types a freeform description into the "AI-Assist" field.
2. `structureIssue()` in `data.js` runs keyword detection to infer priority and extract a title.
3. A preview card is shown; user confirms → `createIssue()` with `created_by = llm-assist`.

### Agent
1. The agent simulator panel (or a real agent hitting the production API) calls `createIssue()` directly.
2. `created_by` is set to the agent name.

All three paths produce identical issue objects in localStorage.

---

## Phase 2: Queue (Read)

Before claiming, an agent reads the open queue:

```javascript
// Prototype (data.js equivalent)
const queue = getIssues()
  .filter(i => i.status === 'open' && !i.claimed_by)
  .sort((a, b) => priority_order[a.priority] - priority_order[b.priority])
// P0 first, then P1, P2, P3
```

```
// Production (worker.js)
GET /api/issues
// Agent filters client-side by status=open, assigned_to_agent=null
```

The queue is re-read at the start of every loop cycle so newly created issues are picked up without a restart.

---

## Phase 3: Claim

```javascript
claimIssue(issueId, agentName)
```

What happens:
- `status` → `in-progress`
- `claimed_by` → agent name
- `claimed_at` → current timestamp
- Audit log entry added: `{ action: "claimed", by: agentName, at: now }`
- `github.js::claimGithubIssue()` called (stub — logs to console only)
- `ait:data-changed` dispatched → UI flashes amber

In production (worker.js):
- `POST /api/issues/:id/claim`
- `claim_expires_at` = now + 15 minutes — if the agent goes silent, the claim can be reclaimed after timeout

---

## Phase 4: Work

In the prototype, "work" is simulated by the agent simulator panel sleeping for a configurable delay:

| Speed  | Delay per step |
|--------|---------------|
| Slow   | 4.0 s         |
| Medium | 2.5 s (default) |
| Fast   | 0.8 s         |

In a real agent integration, the agent would perform actual work (code generation, analysis, etc.) during this phase. The issue stays `in-progress` throughout.

---

## Phase 5: Post Result

```javascript
postResult(issueId, resultText, tokensUsed, timeSpentMinutes)
```

What happens:
- `result` → agent's output text
- `tokens_used` → recorded for budget tracking
- `time_spent` → recorded
- `status` → depends on approval mode (see Phase 6)
- Audit log entry: `{ action: "submitted for review", by: agentName, at: now }`
- `ait:data-changed` dispatched

In production:
- `POST /api/issues/:id/result`
- `updated_at` auto-stamped

---

## Phase 6: Close (Two Modes)

### Auto-Close Mode

```javascript
postResult(...)        // status → in-progress (momentarily)
closeIssue(issueId)    // immediately follows
```

- `status` → `closed`
- `completed_at` → current timestamp
- Audit log entry: `{ action: "closed", by: agentName, at: now }`
- `github.js::closeGithubIssue()` called (stub)
- UI flashes dark green

No human intervention required.

### Require-Review Mode

```javascript
postResult(...)
// status → pending-review (stops here)
```

Issue sits in `pending-review` until a human:
1. Navigates to the issue detail page (`issue.html?id=...`).
2. Reviews the `result` field.
3. Clicks **Approve & Close**.

```javascript
closeIssue(issueId)    // triggered by human click
```

- Same outcome as auto-close, but human is the `by` actor in the audit entry.

The current mode is stored in localStorage: `ait_approval_mode = 'auto-close' | 'require-review'`.

---

## Phase 7: Block (Optional, Any Time)

Any actor can pause work at any point:

```javascript
blockIssue(issueId, reason)
```

- `status` → `blocked`
- `blocked_reason` → reason text
- Audit entry logged
- UI flashes red

To resume, the issue is manually transitioned back to `open` or `in-progress`. A blocked issue will not be picked up by the queue filter.

---

## Auto-Run Loop (Agent Simulator)

The simulator in `agent-sim.js` runs the full Phase 2–6 sequence in a loop:

```
start loop
  │
  ├── getReadyQueue()  → empty? → stop
  │
  ├── claimIssue(queue[0], agentName)
  │   └── sleep (configurable)
  │
  ├── postResult(issue.id, randomResult, randomTokens, randomTime)
  │   └── sleep
  │
  ├── if auto-close: closeIssue(issue.id)
  │   └── sleep
  │
  └── repeat ──────────────────────────────────────────────────┐
                                                               │
       (loop exits automatically when queue is empty)          │
       (loop can be stopped manually at any time)              │
```

Simulated values:
- `tokens_used`: random integer in [800, 2400]
- `time_spent`: random integer in [10, 45] minutes
- `result`: one of several preset result strings

---

## Audit Trail

Every state transition writes to `issue.audit_log`:

```json
[
  { "action": "created",             "by": "human-manual", "at": "2026-05-19T10:00:00Z" },
  { "action": "claimed",             "by": "claude-agent-sim", "at": "2026-05-19T10:01:00Z" },
  { "action": "submitted for review","by": "claude-agent-sim", "at": "2026-05-19T10:05:00Z" },
  { "action": "closed",              "by": "claude-agent-sim", "at": "2026-05-19T10:05:02Z" }
]
```

The audit log is append-only and visible on the issue detail page. It is the authoritative record of who did what and when.

---

## Sequence Diagram (Auto-Close Mode)

```
Human          data.js      localStorage     github.js    slack.js   UI
  │                │               │               │           │       │
  │ fill form      │               │               │           │       │
  ├───────────────►│ createIssue() │               │           │       │
  │                ├──────────────►│ write         │           │       │
  │                │◄──────────────┤               │           │       │
  │                ├──────────────────────────────►│ stub log  │       │
  │                ├──────────────────────────────────────────►│ toast │
  │                │   ait:data-changed                         │       │
  │                ├───────────────────────────────────────────────────►│ render
  │                │               │               │           │       │
Agent             │               │               │           │       │
  │ read queue     │               │               │           │       │
  ├───────────────►│ getIssues()   │               │           │       │
  │                ├──────────────►│ read          │           │       │
  │                │◄──────────────┤               │           │       │
  │◄───────────────┤ [issue list]  │               │           │       │
  │                │               │               │           │       │
  │ claimIssue()   │               │               │           │       │
  ├───────────────►│               │               │           │       │
  │                ├──────────────►│ status=in-prog│           │       │
  │                ├──────────────────────────────►│ stub log  │       │
  │                │   ait:data-changed             │           │       │
  │                ├───────────────────────────────────────────────────►│ flash amber
  │                │               │               │           │       │
  │ (work…)        │               │               │           │       │
  │                │               │               │           │       │
  │ postResult()   │               │               │           │       │
  ├───────────────►│               │               │           │       │
  │                ├──────────────►│ tokens, result│           │       │
  │                │               │               │           │       │
  │ closeIssue()   │               │               │           │       │
  ├───────────────►│               │               │           │       │
  │                ├──────────────►│ status=closed │           │       │
  │                ├──────────────────────────────►│ stub log  │       │
  │                ├──────────────────────────────────────────►│ toast │
  │                │   ait:data-changed             │           │       │
  │                ├───────────────────────────────────────────────────►│ flash green
```

---

## Key Invariants

1. **Only `data.js` touches localStorage** — no other file reads or writes `ait_*` keys.
2. **`ait:data-changed` is always fired after any mutation** — ensures all open pages stay in sync.
3. **An issue in `blocked` state is invisible to the queue** — `getReadyQueue()` filters by `status === 'open'` only.
4. **`claimed_by` and `status` change atomically** — both are set in the same `updateIssue()` call so the issue can never appear unclaimed while `in-progress`.
5. **Audit log is append-only** — entries are never removed or edited.
