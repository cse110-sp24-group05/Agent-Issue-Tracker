CREATE TABLE IF NOT EXISTS issues (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    issue_description TEXT,
    issue_status TEXT NOT NULL CHECK (
        issue_status IN ('open', 'in_progress', 'blocked', 'review', 'closed')
    ),
    issue_priority TEXT NOT NULL CHECK (
        issue_priority IN ('low', 'medium', 'high', 'critical')
    ),

    assigned_to_user TEXT,
    assigned_to_agent TEXT,          --Only one of these two can be filled, the other should be null

    claim_expires_at INTEGER,        -- Unix timestamp
    retry_count INTEGER NOT NULL DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,   -- token consumed by agent
    claim_timeout_minutes INTEGER NOT NULL DEFAULT 30,
    agent_response TEXT,             -- Claude's response or block reason

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

CREATE TABLE IF NOT EXISTS issue_status_history (
    id                TEXT NOT NULL PRIMARY KEY,
    issue_id          TEXT NOT NULL,
    issue_status      TEXT NOT NULL CHECK (
        issue_status IN ('open', 'in_progress', 'blocked', 'review', 'closed')
    ),
    changed_at        TEXT NOT NULL,         -- ISO timestamp
    changed_by_user   TEXT,
    changed_by_agent  TEXT,                  -- Only one of these two should be filled

    FOREIGN KEY (issue_id)         REFERENCES issues(id),
    FOREIGN KEY (changed_by_user)  REFERENCES users(id),
    FOREIGN KEY (changed_by_agent) REFERENCES agents(id)
);

CREATE TRIGGER IF NOT EXISTS trg_issue_status_history
AFTER UPDATE OF issue_status ON issues
WHEN OLD.issue_status != NEW.issue_status
BEGIN
    INSERT INTO issue_status_history (id, issue_id, issue_status, changed_at, changed_by_user, changed_by_agent)
    VALUES (
        lower(hex(randomblob(16))),
        NEW.id,
        NEW.issue_status,
        NEW.updated_at,
        NEW.assigned_to_user,
        NEW.assigned_to_agent
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_issue_status_history_insert
AFTER INSERT ON issues
BEGIN
    INSERT INTO issue_status_history (id, issue_id, issue_status, changed_at, changed_by_user, changed_by_agent)
    VALUES (
        lower(hex(randomblob(16))),
        NEW.id,
        NEW.issue_status,
        NEW.created_at,
        NEW.assigned_to_user,
        NEW.assigned_to_agent
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_delete_issue_status_history
BEFORE DELETE ON issues
BEGIN
    DELETE FROM issue_status_history WHERE issue_id = OLD.id;
END;