-- Add result tracking fields populated by the Claude Code runner.
-- Apply with: npx wrangler d1 migrations apply issues-db --remote
ALTER TABLE issues ADD COLUMN result_text TEXT;
ALTER TABLE issues ADD COLUMN tokens_used INTEGER;
