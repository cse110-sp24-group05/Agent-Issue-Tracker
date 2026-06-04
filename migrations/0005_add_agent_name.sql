-- The agents table was deployed without the agent_name column that 0001_schema.sql
-- defined, causing ensureAgentRow() to fail with SQLITE_ERROR on every claim.
-- SQLite requires a DEFAULT when adding a NOT NULL column to an existing table,
-- so we add it nullable first, backfill from id, then leave it nullable so future
-- rows still work when agent_name is not supplied (ensureAgentRow falls back to id).
-- Apply with: npx wrangler d1 migrations apply issues-db --remote
ALTER TABLE agents ADD COLUMN agent_name TEXT NOT NULL DEFAULT '';
UPDATE agents SET agent_name = id WHERE agent_name = '';
