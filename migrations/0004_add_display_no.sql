-- Add a stable, server-assigned display number to issues.
-- Globally sequential and never reused, so the cosmetic `issue-NNN`
-- label stays fixed even after other issues are deleted (unlike the
-- previous positional labels, which renumbered on delete).
-- Apply with: npx wrangler d1 migrations apply issues-db --remote
ALTER TABLE issues ADD COLUMN display_no INTEGER;

-- Backfill existing rows with sequential numbers in row order so they
-- get stable labels too. rowid is unique and monotonic, so COUNT yields
-- 1..N with no duplicates.
UPDATE issues
SET display_no = (
    SELECT COUNT(*) FROM issues AS t WHERE t.rowid <= issues.rowid
)
WHERE display_no IS NULL;

-- Enforce uniqueness of the display number. D1 serializes writes, so the
-- MAX(display_no)+1 assignment on insert cannot race within a database.
CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_display_no ON issues(display_no);
