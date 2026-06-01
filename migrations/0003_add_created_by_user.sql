-- Add created_by_user to issues to track which user created each issue.
-- Enables filtering issues by creator on GET /api/issues.
-- Apply with: npx wrangler d1 migrations apply issues-db --remote
ALTER TABLE issues ADD COLUMN created_by_user TEXT REFERENCES users(id);