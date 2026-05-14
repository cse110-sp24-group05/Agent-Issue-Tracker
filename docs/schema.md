# SQL Schema

Defines the JSON data structure used by the AIT issue tracking system.

This schema includes:
- users
- agents
- issues

---

# Structure

# Users

```
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);
```

## Fields

| id | username | email |
|---|---|---|
| USER-001 | jaylen | jaylen@example.com|
| USER-002 | steven | steven@example.com|
| USER-003 | pranav | pranav@example.com|

---

# Agents

```
CREATE TABLE agents (
    id TEXT PRIMARY KEY,              
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (
        status IN ('idle', 'running', 'offline')
    )
);
```

## Fields

| id        | name   | status  |
| --------- | ------ | ------- |
| AGENT-001 | Claude | idle    |
| AGENT-002 | GPT-5  | running |
| AGENT-003 | Gemini | offline |


---

# Issues

```
CREATE TABLE issues (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (
        status IN ('open', 'in_progress', 'review', 'closed')
    ),
    priority TEXT NOT NULL CHECK (
        priority IN ('low', 'medium', 'high', 'critical')
    ),

    assigned_to_user TEXT,
    assigned_to_agent TEXT,          --Only one of these two can be filled, the other should be null

    claim_expires_at INTEGER,        -- Unix timestamp
    retry_count INTEGER NOT NULL DEFAULT 0,
    claim_timeout_minutes INTEGER NOT NULL DEFAULT 30,

    created_at TEXT NOT NULL,        -- ISO timestamp
    updated_at TEXT NOT NULL,        -- ISO timestamp
    closed_at TEXT,

    FOREIGN KEY (assigned_to_user) REFERENCES users(id),
    FOREIGN KEY (assigned_to_agent) REFERENCES agents(id) 
);
```

## Fields

| id        | title           | description                      | status      | priority | assigned_to_user | assigned_to_agent | claim_expires_at  | retry_count | claim_timeout_minutes | created_at           | updated_at           | closed_at            |
| --------- | --------------- | -------------------------------- | ----------- | -------- | ---------------- | ----------------- | ----------------- | ----------- | --------------------- | -------------------- | -------------------- | -------------------- |
| ISSUE-001 | Fix login bug   | OAuth redirect fails on Safari   | open        | high     | USR-001          | null              | null              | 0           | 30                    | 2026-05-13T15:25:43Z | 2026-05-13T15:25:43Z | null                 |
| ISSUE-002 | API timeout     | Requests fail under heavy load   | in_progress | critical | null             | AGENT-001         | 2026-05-14T10:30Z | 1           | 30                    | 2026-05-12T09:00:00Z | 2026-05-14T09:10:00Z | null                 |
| ISSUE-003 | UI misalignment | Buttons overflow on mobile       | review      | medium   | USR-002          | null              | null              | 0           | 30                    | 2026-05-11T08:00:00Z | 2026-05-13T18:00:00Z | null                 |
| ISSUE-004 | Fix typo        | Settings page has spelling error | closed      | low      | null             | AGENT-002         | null              | 0           | 30                    | 2026-05-10T10:00:00Z | 2026-05-11T10:00:00Z | 2026-05-11T10:00:00Z |




---
