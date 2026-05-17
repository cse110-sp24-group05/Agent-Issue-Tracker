CREATE TABLE IF NOT EXISTS issues (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    issue_description TEXT,
    issue_status TEXT NOT NULL CHECK (
        issue_status IN ('open', 'in_progress', 'review', 'closed')
    ),
    issue_priority TEXT NOT NULL CHECK (
        issue_priority IN ('low', 'medium', 'high', 'critical')
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

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,              
    agent_name TEXT NOT NULL,
    agent_status TEXT NOT NULL CHECK (
        agent_status IN ('idle', 'running', 'offline')
    )
);
