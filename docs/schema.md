# JSON Schema

## Structure

```json
{
  "users": [],
  "agents": [],
  "issues": []
}
```

---

# Users

```json
{
  "id": "USR-001",
  "username": "steven",
  "email": "steven@example.com",
}
```

## Fields

| Field | Type | Description |
|---|---|---|
| id | string | Unique user ID |
| username | string | Username |
| email | string | User email |

---

# Agents

```json
{
  "id": "AGENT-001",
  "name": "Claude",
  "status": "idle",
}
```

## Fields

| Field | Type | Description |
|---|---|---|
| id | string | Unique agent ID |
| name | string | Agent name |
| status | string | idle/running/offline |

---

# Issues

```json
{
  "id": "ISSUE-001",
  "title": "Fix login bug",
  "description": "OAuth redirect fails on Safari",
  "status": "open",
  "priority": "high",
  "assignedTo": "USR-001",
  "createdAt": 1747170000000,
  "updatedAt": 1747170000000,
  "closedAt": null
}
```

## Fields

| Field | Type | Description |
|---|---|---|
| id | string | Unique issue ID |
| title | string | Issue title |
| description | string | Detailed description |
| status | string | open/in_progress/review/closed |
| priority | string | low/medium/high/critical |
| assignedTo | string/null | Assigned user ID |
| createdAt | number | Creation timestamp |
| updatedAt | number | Last updated timestamp |
| closedAt | number/null | Close timestamp |

---