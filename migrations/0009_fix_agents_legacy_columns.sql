-- The remote agents table was originally created with legacy column names
-- 'name' and 'status' (from the pre-migration schema in docs/schema.md).
-- Migrations 0005 and 0008 added 'agent_name' and 'agent_status' via ALTER
-- TABLE ADD COLUMN, but the original 'name TEXT NOT NULL' column has no
-- DEFAULT and was never removed. Every INSERT from ensureAgentRow() omits
-- 'name', triggering: NOT NULL constraint failed: agents.name.
--
-- This migration rebuilds agents with only the canonical columns, migrating
-- data from 'name'→agent_name and 'status'→agent_status where needed.
-- The issues and issue_status_history tables no longer FK-reference agents
-- (converted to boolean flags in 0007_assignment_booleans.sql), so the
-- DROP/RENAME swap is safe with no FK children to worry about.
--
-- Apply with: npx wrangler d1 migrations apply issues-db --remote

PRAGMA defer_foreign_keys = TRUE;

CREATE TABLE agents_canonical (
    id          TEXT PRIMARY KEY,
    agent_name  TEXT NOT NULL DEFAULT '',
    agent_status TEXT NOT NULL DEFAULT 'idle' CHECK (
        agent_status IN ('idle', 'running', 'offline')
    )
);

-- Prefer agent_name if already populated (by migration 0005 backfill),
-- otherwise fall back to the legacy 'name' column, then the id itself.
INSERT INTO agents_canonical (id, agent_name, agent_status)
SELECT
    id,
    CASE
        WHEN agent_name IS NOT NULL AND agent_name != '' THEN agent_name
        WHEN name       IS NOT NULL AND name       != '' THEN name
        ELSE id
    END,
    CASE
        WHEN agent_status IS NOT NULL AND agent_status != '' THEN agent_status
        WHEN status       IS NOT NULL AND status       != '' THEN status
        ELSE 'idle'
    END
FROM agents;

DROP TABLE agents;
ALTER TABLE agents_canonical RENAME TO agents;
