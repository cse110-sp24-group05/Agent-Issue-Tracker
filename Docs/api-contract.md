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

## Endpoint Summary

| Method | Path | Purpose |
|---|---|---|
| GET | /api/issues | List all issues |
| GET | /api/issues/:id | Get a single issue |
| POST | /api/issues | Create a new issue |
| PUT | /api/issues/:id | Update fields on an existing issue |
| DELETE | /api/issues/:id | Delete an issue |
| PUT | /api/issues/:id/claim | Agent claims an issue |
| PUT | /api/issues/:id/result | Agent posts work result |
| PUT | /api/issues/:id/close | Close a reviewed issue |

---

## 1. GET /api/issues

Returns all issues as an array. The frontend uses this for board and list views. The runner uses this to discover open work.

### Response — 200 OK

```json
[
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
]
```

Note: currently returns a plain array, not a `{ success, issues, count }` wrapper.

---

## 2. GET /api/issues/:id

Returns a single issue by ID.

### Response — 200 OK

```json
{
  "success": true,
  "issue": {
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
}
```

### Response — 404 Not Found

```json
{
  "success": false,
  "error": "Issue not found"
}
```

---

## 3. POST /api/issues

Create a new issue.

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
| issue_status | string | yes | Must be `open`, `in_progress`, `review`, `blocked`, or `closed` |
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

---

## 4. PUT /api/issues/:id

Update one or more fields on an existing issue. Only send the fields you want to change. The `updated_at` timestamp is set automatically.

### Updatable Fields

`title`, `issue_description`, `issue_status`, `issue_priority`, `assigned_to_user`, `assigned_to_agent`, `claim_expires_at`, `retry_count`, `claim_timeout_minutes`, `closed_at`

Fields not in this list (`id`, `created_at`) are immutable and ignored if sent.

### Request

```json
{
  "title": "Updated title",
  "issue_priority": "critical"
}
```

### Response — 200 OK

```json
{
  "success": true,
  "message": "Issue updated successfully",
  "issue": { ... }
}
```

### Response — 400 Bad Request

```json
{
  "success": false,
  "error": "No updatable fields provided"
}
```

### Response — 404 Not Found

```json
{
  "success": false,
  "error": "Issue not found"
}
```

---

## 5. DELETE /api/issues/:id

Delete an issue permanently.

### Response — 200 OK

```json
{
  "success": true,
  "message": "Issue deleted successfully"
}
```

### Response — 404 Not Found

```json
{
  "success": false,
  "error": "Issue not found"
}
```

---

## 6. PUT /api/issues/:id/claim

An agent claims an open issue, locking it for work. Sets `issue_status` to `in_progress`, assigns the agent, and sets a 15-minute claim expiration.

The issue must have `issue_status = 'open'` to be claimed.

### Request

```json
{
  "agent_id": "agent-simulator-01"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| agent_id | string | yes | ID of the claiming agent |

### Response — 200 OK

```json
{
  "success": true,
  "message": "Issue claimed successfully"
}
```

### Response — 400 Bad Request

```json
{
  "success": false,
  "error": "Missing agent_id"
}
```

```json
{
  "success": false,
  "error": "Issue cannot be claimed (current status: in_progress)"
}
```

### Response — 404 Not Found

```json
{
  "success": false,
  "error": "Issue not found"
}
```

---

## 7. PUT /api/issues/:id/result

The agent posts the outcome of its work. Transitions the issue from `in_progress` to either `review` or `blocked`.

The issue must have `issue_status = 'in_progress'` before posting a result.

### Request

```json
{
  "new_status": "review"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| new_status | string | yes | Must be `review` or `blocked` |

### Response — 200 OK

```json
{
  "success": true,
  "message": "Result posted successfully"
}
```

### Response — 400 Bad Request

```json
{
  "success": false,
  "error": "Invalid result status"
}
```

```json
{
  "success": false,
  "error": "Issue must be in progress before posting results."
}
```

### Response — 404 Not Found

```json
{
  "success": false,
  "error": "Issue not found"
}
```

---

## 8. PUT /api/issues/:id/close

Closes an issue that has been reviewed. Sets `issue_status` to `closed` and records the `closed_at` timestamp.

### Response — 200 OK

```json
{
  "success": true,
  "message": "Issue closed successfully"
}
```

### Response — 404 Not Found

```json
{
  "success": false,
  "error": "Issue not found"
}
```

---

## Status Flow

```
open ──(claim)──▸ in_progress ──(result: review)──▸ review ──(close)──▸ closed
                       │
                       └──(result: blocked)──▸ blocked ──(manual edit)──▸ open
```

- `claim` only works on `open` issues
- `result` only works on `in_progress` issues, and must go to `review` or `blocked`
- `close` finalizes a reviewed issue
- Blocked issues are manually moved back to `open` via PUT

---

## Response Format Convention

All responses follow this pattern (except GET /api/issues which returns a plain array):

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