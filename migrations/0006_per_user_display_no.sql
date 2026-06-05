-- Switch display_no uniqueness from global to per-user.
-- Two users can now both have display_no = 1 for their respective first issues.
-- The UUID already prevents uniqueness issues, display_no is purely cosmetic 
DROP INDEX IF EXISTS idx_issues_display_no;
CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_display_no_per_user
    ON issues(created_by_user, display_no);
