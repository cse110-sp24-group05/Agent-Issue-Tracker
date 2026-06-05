-- The remote agents table was created before agent_status was present in
-- 0001_schema.sql, so it is missing the column (same pattern as 0005 for agent_name).
-- Fresh DBs already have the column from 0001, so the ALTER TABLE is guarded by a
-- comment here; it must be applied to the remote DB manually (see below).
-- Apply the column to remote first, then run this migration normally:
--   npx wrangler d1 execute issues-db --remote \
--     --command "ALTER TABLE agents ADD COLUMN agent_status TEXT NOT NULL DEFAULT 'idle'"
-- Then apply the full migration set:
--   npx wrangler d1 migrations apply issues-db --remote
--
-- ALTER TABLE agents ADD COLUMN agent_status TEXT NOT NULL DEFAULT 'idle';

-- Backfill: any existing rows that somehow have a NULL or empty status get 'idle'.
UPDATE agents SET agent_status = 'idle' WHERE agent_status IS NULL OR agent_status = '';
