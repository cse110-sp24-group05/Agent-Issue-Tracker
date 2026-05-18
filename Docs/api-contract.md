# API Contract

All endpoints are served by a Cloudflare Worker (`src/js/worker.js`) backed by Cloudflare D1 (binding: `issues_db`). The frontend (Team 2) and the agent runner (Team 3) both call these same endpoints.

All requests and responses use JSON (`Content-Type: application/json`). Timestamps are ISO 8601 (`2026-05-14T09:00:00Z`).

---

## Database Schema Reference

Field names in API responses match the `schema.sql` columns exactly.

**issues**

| Column | Type | Notes |
|---|---|---|
| id | TEXT PRIMARY KEY | Unique issue ID |
| title | TEXT NOT NULL | Issue title |
| issue_description | TEXT | Issue details |
| issue_status | TEXT NOT NULL | `open` · `in_progress` · `review` · `blocked` · `closed` |
| issue_priority | TEXT NOT NULL | `low` · `medium` · `high` · `critical` |
| assigned_to_user | TEXT | FK → users.id. Null if unassigned or agent-assigned |
| assigned_to_agent | TEXT | FK → agents.id. Null if unassigned or user-assigned |
| claim_expires_at | INTEGER | Unix timestamp when claim expires |
| retry_count | INTEGER NOT NULL | Default `0` |
| claim_timeout_minutes | INTEGER NOT NULL | Default `30` |
| created_at | TEXT NOT NULL | ISO 8601 |
| updated_at | TEXT NOT NULL | ISO 8601 |
| closed_at | TEXT | ISO 8601, null until closed |

Only one of `assigned_to_user` or `assigned_to_agent` can be set. The other must be null.

**users**

| Column | Type | Notes |
|---|---|---|
| id | TEXT PRIMARY KEY | Unique user ID |
| username | TEXT NOT NULL | Display name |
| email | TEXT NOT NULL UNIQUE | User email |

**agents**

| Column | Type | Notes |
|---|---|---|
| id | TEXT PRIMARY KEY | Unique agent ID |
| agent_name | TEXT NOT NULL | Agent display name |
| agent_status | TEXT NOT NULL | `idle` · `running` · `offline` |

---

## 1. GET /api/issues

Returns all issues. The frontend uses this for the board and list views. The runner uses this to discover open work.

### Query Parameters (all optional)

| Param | Type | Example | Description |
|---|---|---|---|
| issue_status | string | `?issue_status=open` | Filter by issue status |
| issue_priority | string | `?issue_priority=critical` | Filter by priority level |
| assigned_to_agent | string | `?assigned_to_agent=agent-01` | Filter by assigned agent |
| assigned_to_user | string | `?assigned_to_user=user-jayden` | Filter by assigned user |

### Response — 200 OK

```json
{
  "success": true,
  "issues": [
    {
      "id": "issue-001",
      "title": "Refactor auth module",
      "issue_description": "Split auth.js into login and session modules.",
      "issue_status": "open",
      "issue_priority": "high",
      "assigned_to_user": null,
      "assigned_to_agent": null,
      "claim_expires_at": null,
      "retry_count": 0,
      "claim_timeout_minutes": 30,
      "created_at": "2026-05-14T09:00:00Z",
      "updated_at": "2026-05-14T09:00:00Z",
      "closed_at": null
    }
  ],
  "count": 1
}
```

---

## 2. POST /api/issues

Create a new issue. Used by the frontend when a human creates an issue.

### Request

```json
{
  "id": "issue-002",
  "title": "Write unit tests for data module",
  "issue_description": "Cover createIssue, updateIssue, and deleteIssue with Vitest.",
  "issue_status": "open",
  "issue_priority": "high",
  "assigned_to_user": null,
  "assigned_to_agent": null,
  "claim_expires_at": null,
  "retry_count": 0,
  "claim_timeout_minutes": 30,
  "created_at": "2026-05-14T10:00:00Z",
  "updated_at": "2026-05-14T10:00:00Z",
  "closed_at": null
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string | yes | Unique issue ID |
| title | string | yes | Issue title |
| issue_description | string | no | Defaults to null |
| issue_status | string | yes | Must be `open`, `in_progress`, `review`, or `closed` |
| issue_priority | string | yes | Must be `low`, `medium`, `high`, or `critical` |
| assigned_to_user | string | no | Cannot set both this and assigned_to_agent |
| assigned_to_agent | string | no | Cannot set both this and assigned_to_user |
| claim_expires_at | integer | no | Unix timestamp |
| retry_count | integer | yes | Default `0` |
| claim_timeout_minutes | integer | yes | Default `30` |
| created_at | string | yes | ISO 8601 |
| updated_at | string | yes | ISO 8601 |
| closed_at | string | no | Null until closed |

### Response — 201 Created

```json
{
  "success": true,
  "message": "Issue created successfully",
  "issue": { ... }
}
```

### Response — 400 Bad Request

```json
{
  "success": false,
  "error": "Missing required fields"
}
```

```json
{
  "success": false,
  "error": "Issue cannot be assigned to both a user and an agent"
}
```

---

## 3. POST /api/claim

An agent or human claims an issue, locking it from double-claiming. Sets `issue_status` to `in_progress`. The runner calls this after selecting an issue to work on.

If the issue is already claimed and the claim has not expired, the request is rejected.

### Request

```json
{
  "issue_id": "issue-001",
  "agent_id": "agent-claude-01",
  "user_id": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| issue_id | string | yes | ID of the issue to claim |
| agent_id | string | one required | ID of the claiming agent (must exist in agents table) |
| user_id | string | one required | ID of the claiming human (must exist in users table) |

Provide `agent_id` if an agent is claiming, `user_id` if a human is claiming. Exactly one must be non-null.

### Response — 200 OK

```json
{
  "success": true,
  "issue_id": "issue-001",
  "issue_status": "in_progress",
  "assigned_to_agent": "agent-claude-01",
  "assigned_to_user": null,
  "claim_expires_at": 1747224300,
  "message": "Issue claimed successfully."
}
```

### Response — 409 Conflict

Returned when the issue is already claimed and the claim has not expired.

```json
{
  "success": false,
  "error": "Issue already claimed",
  "issue_id": "issue-001",
  "assigned_to_agent": "agent-claude-02",
  "claim_expires_at": 1747224300
}
```

### Response — 404 Not Found

```json
{
  "success": false,
  "error": "Issue not found",
  "issue_id": "issue-999"
}
```

---

## 4. POST /api/complete

The agent or human posts results back to a claimed issue. What happens next depends on priority (per ADR 2):

- **high / critical:** Status changes to `review`. A human must approve before the issue closes.
- **low / medium:** Status changes to `closed` automatically. `closed_at` is set.

Token usage is recorded but does not enforce a budget limit (per ADR 3).

Only the currently assigned agent/user can complete an issue.

### Request

```json
{
  "issue_id": "issue-001",
  "agent_id": "agent-claude-01",
  "result": "Refactored auth.js into login.js and session.js. All tests pass.",
  "tokens_used": 3200
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| issue_id | string | yes | ID of the issue being completed |
| agent_id | string | yes | Must match the current assigned_to_agent |
| result | string | yes | Summary of work done |
| tokens_used | number | no | Tokens consumed during this work session |

### Response — 200 OK (high/critical, needs human review)

```json
{
  "success": true,
  "issue_id": "issue-001",
  "issue_status": "review",
  "requires_approval": true,
  "tokens_used": 3200,
  "message": "Result posted. Human approval required to close."
}
```

### Response — 200 OK (low/medium, auto-closed)

```json
{
  "success": true,
  "issue_id": "issue-001",
  "issue_status": "closed",
  "requires_approval": false,
  "tokens_used": 3200,
  "closed_at": "2026-05-14T11:00:00Z",
  "message": "Issue auto-closed."
}
```

### Response — 403 Forbidden

Returned when the requesting agent does not match the assigned claimant.

```json
{
  "success": false,
  "error": "Only the assigned agent can complete this issue",
  "issue_id": "issue-001",
  "assigned_to_agent": "agent-claude-02"
}
```

---

## Additional Endpoints (to add as needed)

| Endpoint | Method | Purpose |
|---|---|---|
| GET /api/issues/:id | GET | Get a single issue by ID |
| PUT /api/issues/:id | PUT | Update an issue |
| DELETE /api/issues/:id | DELETE | Delete an issue |
| POST /api/block | POST | Agent marks issue as blocked, escalates to human (ADR 4) |
| POST /api/issues/:id/close | POST | Human reviewer approves or rejects after `review` (ADR 2) |

---

## Status Flow

```
open ──(claim)──▸ in_progress ──(complete low/medium)──▸ closed
                       │
                       ├──(complete high/critical)──▸ review ──(approve)──▸ closed
                       │                                │
                       │                           (reject)
                       │                                │
                       ◂────────────────────────────────┘
```

---

## Response Format Convention

All responses follow this pattern:

**Success:**
```json
{
  "success": true,
  "message": "...",
  ...
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error description"
}
```
