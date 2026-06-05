-- Ensure the agents table has an agent_name column, backfilled from id.
--
-- The agents table was deployed without the agent_name column that
-- 0001_schema.sql defines, causing ensureAgentRow() to fail with SQLITE_ERROR on
-- every claim. The original fix here was `ALTER TABLE agents ADD COLUMN
-- agent_name ...`, but because 0001 now also declares agent_name, a fresh replay
-- of all migrations hit "duplicate column name: agent_name" at this step.
--
-- SQLite has no `ADD COLUMN IF NOT EXISTS`, so instead we rebuild the table
-- idempotently: copy the columns that exist in BOTH the deployed and current
-- shapes (id, agent_status) into a new table that has agent_name, then backfill
-- agent_name from id. This yields the same end state whether or not agent_name
-- already existed. agent_name is only ever set to the id by ensureAgentRow, so
-- backfilling from id is lossless.
--
-- Apply with: npx wrangler d1 migrations apply issues-db --remote

-- Defer FK enforcement so the drop/rename swap doesn't trip issues /
-- issue_status_history → agents while the table is being rebuilt.
PRAGMA defer_foreign_keys = TRUE;

CREATE TABLE agents_new (
    id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL DEFAULT '',
    agent_status TEXT NOT NULL CHECK (
        agent_status IN ('idle', 'running', 'offline')
    )
);

INSERT INTO agents_new (id, agent_status)
SELECT id, agent_status FROM agents;

UPDATE agents_new SET agent_name = id WHERE agent_name = '';

DROP TABLE agents;
ALTER TABLE agents_new RENAME TO agents;
