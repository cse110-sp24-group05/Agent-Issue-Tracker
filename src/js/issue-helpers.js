// issue-helpers.js
// helper functions specific to issues: tokenLevel, filterIssues, countByStatus

/**
 * Returns the token usage level based on remaining budget
 * @param {number} used - Number of tokens used
 * @param {number} budget - Total token buget remaining
 * @returns {string}
 */
export function tokenLevel(used, budget) {
  const remaining = budget ? 1 - used / budget : 1;
  if (remaining < 0.3) {
    return 'token-over';
  }

  if (remaining < 0.6) {
    return 'token-warn';
  }

  return 'token-ok';
}

/**
 * Filters issues based on status, priority, assignee, and search
 * @param {Array} issues - list of all issues
 * @param {string} status - status filter value
 * @param {string} priority - priority filter value
 * @param {string} assignee - assignee kind ('human-only'|'open-to-all'|'ai-only'); '' = all
 * @param {string} search - search filter value
 * @returns {Array} - Filtered list of issue objects
 */
export function filterIssues(issues, status, priority, assignee, search) {
  return issues.filter(
    (i) =>
      (!status || i.status === status) &&
      (!priority || i.priority === priority) &&
      (!assignee || i.assignee_kind === assignee) &&
      (!search || i.title.toLowerCase().includes(search)),
  );
}

/**
 * Count issues grouped by status for dashboard summary widgets.
 * @param {Array} issues - list of all issues
 * @returns {object} - count of issues per status
 */
export function countByStatus(issues) {
  const count = {
    open: 0,
    'in-progress': 0,
    'pending-review': 0,
    blocked: 0,
    closed: 0,
  };
  issues.forEach((i) => {
    if (i.status in count) {
      count[i.status]++;
    }
  });
  return count;
}
