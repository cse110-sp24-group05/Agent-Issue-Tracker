# JSON Schema

Defines the JSON data structure used by the AIT issue tracking system.

This schema includes:
- users
- agents
- issues

---

# Structure

```json
{
  "users": [],
  "agents": [],
  "issues": []
}
```
## Fields

| Field | Type | Description |
|---|---|---|
| users | array | An array of Users |
| agents | array | An array of Agents |
| issues | array | An array of Issues |
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
  "claimExpiresAt": null,
  "retryCount": 0,
  "claimTimeoutMinutes": 30,
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
| claimExpiresAt | string/null | Claim expiration ISO timestamp |
| retryCount | number | How many times this issue has been claimed and expired |
| claimTimeoutMinutes | number | How long a claim is valid before expiring |
| createdAt | number | Creation timestamp |
| updatedAt | number | Last updated timestamp |
| closedAt | number/null | Close timestamp |

---