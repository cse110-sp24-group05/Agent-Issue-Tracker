-- Convert issues.assigned_to_user / assigned_to_agent from nullable TEXT foreign
-- keys into mutually-exclusive booleans (0/1). Solo-dev model: an issue is
-- assigned to the user OR an agent, never both, and which specific user/agent is
-- no longer tracked on the issue.
--
-- SQLite cannot change a column's type or drop a foreign key in place, so we
-- rebuild the issues table. issue_status_history.changed_by_user /
-- changed_by_agent are fed from assigned_to_* by the status triggers, so they
-- become booleans too.
--
-- Ordering matters: SQLite will not DROP a table while another table's FK still
-- references it (and defer_foreign_keys does not cover the implicit delete a
-- DROP performs). So we first stash the history rows in a constraint-free temp
-- table and drop the real history table, THEN rebuild issues (now unreferenced),
-- THEN recreate history with its FK and reload it. No step ever drops a table
-- that still has children.
--
-- Data conversion: a non-null/non-empty id becomes 1, otherwise 0. The legacy
-- app guard kept at most one of the two set; if any row somehow had both, the
-- mutex CHECK would reject it, so agent assignment wins (user -> 0).
--
-- Apply with: npx wrangler d1 migrations apply issues-db --remote

PRAGMA defer_foreign_keys = TRUE;

-- 1. Stash existing history (converted to booleans) in a constraint-free table,
--    then drop the real history table so it no longer references issues.
CREATE TABLE _issue_status_history_backup AS
SELECT
    id, issue_id, issue_status, changed_at,
    CASE WHEN (changed_by_agent IS NULL OR changed_by_agent = '')
              AND changed_by_user IS NOT NULL AND changed_by_user <> ''
         THEN 1 ELSE 0 END AS changed_by_user,
    CASE WHEN changed_by_agent IS NOT NULL AND changed_by_agent <> ''
         THEN 1 ELSE 0 END AS changed_by_agent
FROM issue_status_history;

DROP TABLE issue_status_history;

-- 2. Rebuild issues with boolean assignment columns + mutex CHECK. Nothing
--    references issues now, so the DROP/RENAME swap is safe.
CREATE TABLE issues_new (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    issue_description TEXT,
    issue_status TEXT NOT NULL CHECK (
        issue_status IN ('open', 'in_progress', 'blocked', 'review', 'closed')
    ),
    issue_priority TEXT NOT NULL CHECK (
        issue_priority IN ('low', 'medium', 'high', 'critical')
    ),

    assigned_to_user  INTEGER NOT NULL DEFAULT 0 CHECK (assigned_to_user IN (0, 1)),
    assigned_to_agent INTEGER NOT NULL DEFAULT 0 CHECK (assigned_to_agent IN (0, 1)),

    claim_expires_at INTEGER,        -- Unix timestamp
    retry_count INTEGER NOT NULL DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,   -- token consumed by agent
    claim_timeout_minutes INTEGER NOT NULL DEFAULT 30,
    agent_response TEXT,             -- Claude's response or block reason
    result_text TEXT,                -- from 0002

    created_by_user TEXT,            -- from 0003
    display_no INTEGER,              -- from 0004

    created_at TEXT NOT NULL,        -- ISO timestamp
    updated_at TEXT NOT NULL,        -- ISO timestamp
    closed_at TEXT,

    -- Mutex: an issue cannot be assigned to both a user and an agent at once.
    CHECK (assigned_to_user + assigned_to_agent <= 1),

    FOREIGN KEY (created_by_user) REFERENCES users(id)
);

INSERT INTO issues_new (
    id, title, issue_description, issue_status, issue_priority,
    assigned_to_user, assigned_to_agent, claim_expires_at, retry_count,
    tokens_used, claim_timeout_minutes, agent_response, result_text,
    created_by_user, display_no, created_at, updated_at, closed_at
)
SELECT
    id, title, issue_description, issue_status, issue_priority,
    CASE WHEN (assigned_to_agent IS NULL OR assigned_to_agent = '')
              AND assigned_to_user IS NOT NULL AND assigned_to_user <> ''
         THEN 1 ELSE 0 END,
    CASE WHEN assigned_to_agent IS NOT NULL AND assigned_to_agent <> ''
         THEN 1 ELSE 0 END,
    claim_expires_at, retry_count, tokens_used, claim_timeout_minutes,
    agent_response, result_text, created_by_user, display_no,
    created_at, updated_at, closed_at
FROM issues;

DROP TABLE issues;
ALTER TABLE issues_new RENAME TO issues;

-- Recreate the per-user display_no uniqueness index (established by
-- 0006_per_user_display_no.sql). The rebuild above dropped the old issues table
-- and with it every index, so restore the current per-user one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_display_no_per_user
    ON issues(created_by_user, display_no);

-- 3. Recreate issue_status_history (FK to the rebuilt issues) with boolean
--    changed_by_* columns, reload from the stash, then drop the stash.
CREATE TABLE issue_status_history (
    id                TEXT NOT NULL PRIMARY KEY,
    issue_id          TEXT NOT NULL,
    issue_status      TEXT NOT NULL CHECK (
        issue_status IN ('open', 'in_progress', 'blocked', 'review', 'closed')
    ),
    changed_at        TEXT NOT NULL,         -- ISO timestamp
    changed_by_user   INTEGER NOT NULL DEFAULT 0 CHECK (changed_by_user IN (0, 1)),
    changed_by_agent  INTEGER NOT NULL DEFAULT 0 CHECK (changed_by_agent IN (0, 1)),

    FOREIGN KEY (issue_id) REFERENCES issues(id)
);

INSERT INTO issue_status_history (
    id, issue_id, issue_status, changed_at, changed_by_user, changed_by_agent
)
SELECT id, issue_id, issue_status, changed_at, changed_by_user, changed_by_agent
FROM _issue_status_history_backup;

DROP TABLE _issue_status_history_backup;

-- 4. Recreate the triggers (dropped along with the old issues table). Bodies are
--    unchanged from 0001 — they copy NEW.assigned_to_* (now booleans) into
--    changed_by_* (now booleans).
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
