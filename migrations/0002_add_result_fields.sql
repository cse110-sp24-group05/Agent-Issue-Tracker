-- Add result_text for storing the agent's work summary (Claude Code runner).
-- tokens_used and agent_response are already defined in 0001_schema.sql.
-- Apply with: npx wrangler d1 migrations apply issues-db --remote
ALTER TABLE issues ADD COLUMN result_text TEXT;
