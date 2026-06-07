# API Contract

All endpoints are served by a Cloudflare Worker (`src/js/worker.js`) backed by Cloudflare D1 (`issues_db`). The frontend (Team 2) and the agent runner (Team 3) both call these same endpoints.

All requests and responses use JSON (`Content-Type: application/json`). Timestamps are ISO 8601 (`2026-05-14T09:00:00Z`).

---

## Database Schema Reference

Field names in API responses match the schema columns exactly. Schema is defined in `migrations/0001_schema.sql` and modified by later migrations.

**issues**

| Column | Type | Notes |
|---|---|---|
| id | TEXT PRIMARY KEY | Server-assigned UUID. Any client-supplied id is ignored. |
| display_no | INTEGER | Server-assigned per-user sequential number (1, 2, 3…). Stable, never reused. Used for cosmetic labels like `issue-001`. |
| title | TEXT NOT NULL | Issue title |
| issue_description | TEXT | Issue details |
| issue_status | TEXT NOT NULL | `open` · `in_progress` · `review` · `blocked` · `closed` |
| issue_priority | TEXT NOT NULL | `low` · `medium` · `high` · `critical` |
| assigned_to_user | INTEGER (0/1) | Boolean. `1` if assigned to the creating user. |
| assigned_to_agent | INTEGER (0/1) | Boolean. `1` if assigned to an agent. Mutex with `assigned_to_user`. |
| created_by_user | TEXT | FK → users.id. Who created this issue. |
| claim_expires_at | INTEGER | Unix timestamp when current claim expires. Expired claims self-heal on next `/ready` call. |
| retry_count | INTEGER NOT NULL | Default `0` |
| claim_timeout_minutes | INTEGER NOT NULL | Default `30` |
| agent_response | TEXT | Claude's raw response, or block reason. Null until processed. |
| result_text | TEXT | Agent's work summary posted with the result. Null until result is posted. |
| created_at | TEXT NOT NULL | ISO 8601 |
| updated_at | TEXT NOT NULL | ISO 8601 |
| closed_at | TEXT | ISO 8601, null until closed |

**Solo-dev assignment model:** `assigned_to_user` and `assigned_to_agent` are mutually-exclusive booleans, not foreign keys. The issue tracks *whether* it is currently assigned to a user or an agent, not *which* one. The specific user identity is implicit from `created_by_user`.

**users**

| Column | Type | Notes |
|---|---|---|
| id | TEXT PRIMARY KEY | Server-assigned, format `user-XXXXX` |
| username | TEXT NOT NULL | Display name |
| email | TEXT NOT NULL UNIQUE | User email |

**agents**

| Column | Type | Notes |
|---|---|---|
| id | TEXT PRIMARY KEY | Unique agent ID |
| agent_name | TEXT NOT NULL | Agent display name |
| agent_status | TEXT NOT NULL | `idle` · `running` · `offline` |

**issue_status_history**

Populated automatically by triggers on every status change.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PRIMARY KEY | UUID |
| issue_id | TEXT NOT NULL | FK → issues.id |
| issue_status | TEXT NOT NULL | The status the issue moved to |
| changed_at | TEXT NOT NULL | ISO 8601 timestamp |
| changed_by_user | INTEGER (0/1) | Boolean |
| changed_by_agent | INTEGER (0/1) | Boolean |

---

## Request Headers

| Header | Used by | Purpose |
|---|---|---|
| `X-User-ID` | `GET /api/issues/ready` | Scopes ready-issue lookup to this user. Falls back to global pool if absent. |
| `Content-Type: application/json` | All POST/PUT | Required for any JSON body |

---

## Endpoint Summary

| Method | Path | Purpose |
|---|---|---|
| POST | /api/login | Login or auto-register a user |
| GET | /api/issues?user_id=:id | List issues for one user |
| GET | /api/issues/ready | Get next ready issue for the calling user |
| GET | /api/issues/:id | Get a single issue |
| GET | /api/issues/:id/history | Status change history for an issue |
| POST | /api/issues | Create a new issue (server assigns id) |
| PUT | /api/issues/:id | Update fields on an existing issue |
| DELETE | /api/issues/:id | Delete an issue |
| PUT | /api/issues/:id/claim | Agent claims an issue |
| PUT | /api/issues/:id/result_text | Agent posts work result |
| PUT | /api/issues/:id/block | Block an issue (failure path) |
| PUT | /api/issues/:id/close | Close a reviewed issue |

---

## 1. POST /api/login

Login or auto-register by name and email.

- Name doesn't exist → creates a new user with id `user-XXXXX`
- Name exists, email matches → returns existing profile
- Name exists, email doesn't match → 401

### Request

```json
{ "name": "Hello", "email": "Hello@example.com" }
```

### Response — 200 OK / 201 Created

```json
{ "success": true, "profile": { "id": "user-01234", "name": "Hello", "email": "Hello@example.com" } }
```

### Response — 400 / 401

```json
{ "success": false, "error": "Missing required fields: name and email" }
{ "success": false, "error": "Email does not match the name provided" }
```

---

## 2. GET /api/issues

Returns all issues for one user as a plain array. `user_id` query parameter is required.

### Response — 200 OK

```json
[
  {
    "id": "f7c2e4b8-1234-5678-9abc-def012345678",
    "display_no": 1,
    "title": "Refactor auth module",
    "issue_description": "Split auth.js into login and session modules.",
    "issue_status": "open",
    "issue_priority": "high",
    "assigned_to_user": 1,
    "assigned_to_agent": 0,
    "created_by_user": "user-04821",
    "claim_expires_at": null,
    "retry_count": 0,
    "claim_timeout_minutes": 30,
    "agent_response": null,
    "result_text": null,
    "created_at": "2026-05-14T09:00:00Z",
    "updated_at": "2026-05-14T09:00:00Z",
    "closed_at": null
  }
]
```

### Response — 400 / 404

```json
{ "success": false, "error": "Missing user_id query parameter" }
{ "success": false, "error": "User not found" }
```

---

## 3. GET /api/issues/ready

Returns the next highest-priority open unclaimed issue for the calling user. Before responding, the server resets this user's expired claims back to `open`, so stuck `in_progress` issues self-heal.

Used by the agent runner (`npm run ait`) to fetch its next task.

### Request

Header: `X-User-ID: user-04821`

### Response — 200 OK

```json
{ "success": true, "issue": { "id": "f7c2e4b8-...", "display_no": 1, "...": "all fields" } }
```

### Response — 404 Not Found

```json
{ "success": false, "error": "No open issues available" }
```

---

## 4. GET /api/issues/:id

Single issue by UUID.

### Response — 200 OK

```json
{ "success": true, "issue": { "id": "f7c2e4b8-...", "...": "all fields" } }
```

### Response — 404 Not Found

```json
{ "success": false, "error": "Issue not found" }
```

---

## 5. GET /api/issues/:id/history

Full status change history for one issue, newest first.

### Response — 200 OK

```json
{
  "success": true,
  "issue_id": "f7c2e4b8-...",
  "history": [
    {
      "id": "bccaea938ce7a24931a3e12760d5a8...",
      "issue_id": "f7c2e4b8-...",
      "issue_status": "review",
      "changed_at": "2026-05-28T21:34:53Z",
      "changed_by_user": 0,
      "changed_by_agent": 1
    }
  ]
}
```

---

## 6. POST /api/issues

Create a new issue. Server assigns `id` (UUID) and `display_no` (per-user sequential). Any client-supplied `id` is ignored.

### Request

```json
{
  "title": "Write unit tests for data module",
  "issue_description": "Cover createIssue, updateIssue, and deleteIssue with Jest.",
  "issue_status": "open",
  "issue_priority": "high",
  "assigned_to_user": 1,
  "assigned_to_agent": 0,
  "created_by_user": "user-04821",
  "retry_count": 0,
  "claim_timeout_minutes": 30,
  "created_at": "2026-05-14T10:00:00Z",
  "updated_at": "2026-05-14T10:00:00Z"
}
```

| Field | Type | Required |
|---|---|---|
| title | string | yes |
| issue_status | string | yes |
| issue_priority | string | yes |
| assigned_to_user | integer (0/1) | no (default 0) |
| assigned_to_agent | integer (0/1) | no (default 0) |
| created_by_user | string | recommended |
| retry_count | integer | yes |
| claim_timeout_minutes | integer | yes |
| created_at | string | yes |
| updated_at | string | yes |
| issue_description | string | no |

### Response — 201 Created

```json
{
  "success": true,
  "message": "Issue created successfully",
  "issue": { "id": "f7c2e4b8-...", "display_no": 4, "...": "all fields" }
}
```

### Response — 400 Bad Request

```json
{ "success": false, "error": "Missing required fields" }
{ "success": false, "error": "Issue cannot be assigned to both a user and an agent" }
```

---

## 7. PUT /api/issues/:id

Update one or more fields. Only send what you want to change.

### Updatable Fields

`title`, `issue_description`, `issue_status`, `issue_priority`, `assigned_to_user`, `assigned_to_agent`, `claim_expires_at`, `retry_count`, `agent_response`, `result_text`, `claim_timeout_minutes`, `closed_at`

Immutable fields (`id`, `display_no`, `created_at`, `created_by_user`) are ignored if sent.

### Request

```json
{ "title": "Updated title", "issue_priority": "critical" }
```

### Response — 200 OK

```json
{ "success": true, "message": "Issue updated successfully", "issue": { "...": "all fields, refreshed" } }
```

### Response — 400 / 404

```json
{ "success": false, "error": "No updatable fields provided" }
{ "success": false, "error": "Issue not found" }
```

---

## 8. DELETE /api/issues/:id

Permanently deletes an issue. The status history is cascaded automatically by trigger.

### Response — 200 OK

```json
{ "success": true, "message": "Issue deleted successfully" }
```

---

## 9. PUT /api/issues/:id/claim

Agent claims an open issue. Sets `issue_status` to `in_progress`, flips `assigned_to_agent` to `1`, sets a 15-minute claim expiration.

Issue must have `issue_status = 'open'`.

### Request

```json
{ "agent_id": "agent-claude" }
```

### Response — 200 OK

```json
{ "success": true, "message": "Issue claimed successfully", "issue": { "...": "all fields" } }
```

### Response — 400 / 404

```json
{ "success": false, "error": "Missing agent_id" }
{ "success": false, "error": "Issue cannot be claimed (current status: in_progress)" }
{ "success": false, "error": "Issue not found" }
```

---

## 10. PUT /api/issues/:id/result_text

Agent posts the outcome of its work: work summary, new status. Transitions from `in_progress` to either `review` or `blocked`.

### Request

```json
{
  "new_status": "review",
  "result_text": "Refactored login.js into login and session modules. Added 5 unit tests.",
}
```

| Field | Type | Required |
|---|---|---|
| new_status | string | yes (must be `review` or `blocked`) |
| result_text | string | no |

### Response — 200 OK

```json
{ "success": true, "message": "Result posted successfully" }
```

### Response — 400 / 404

```json
{ "success": false, "error": "Invalid result status" }
{ "success": false, "error": "Issue must be in progress before posting results." }
{ "success": false, "error": "Issue not found" }
```

---

## 11. PUT /api/issues/:id/block

Transitions an issue to `blocked`. Used when work cannot proceed. Cannot block an already-blocked or already-closed issue.

### Response — 200 OK

```json
{ "success": true, "message": "Issue updated successfully", "issue": { "...": "all fields" } }
```

### Response — 400 Bad Request

```json
{ "success": false, "error": "Issue already blocked" }
```

---

## 12. PUT /api/issues/:id/close

Closes a reviewed issue. Sets `issue_status` to `closed` and records `closed_at`.

### Response — 200 OK

```json
{ "success": true, "message": "Issue closed successfully" }
```

---

## Status Flow

```
open ──(claim)──▸ in_progress ──(result: review)──▸ review ──(close)──▸ closed
                       │
                       └──(result: blocked OR block)──▸ blocked ──(manual edit)──▸ open
```

- `claim` only works on `open` issues
- `result` only works on `in_progress` issues, transitioning to `review` or `blocked`
- `block` is a dedicated endpoint for the failure path
- `close` finalizes a reviewed issue
- Blocked issues are manually moved back to `open` via PUT
- **Expired claims self-heal:** the server resets stale `in_progress` claims back to `open` on every `/api/issues/ready` call

---

## Response Format Convention

All responses follow this pattern except `GET /api/issues` (returns a plain array) and `GET /api/issues/ready` (returns `{ success, issue }`):

**Success:**
```json
{ "success": true, "message": "...", "...": "..." }
```

**Error:**
```json
{ "success": false, "error": "Error description" }
```