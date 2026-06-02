// api-map.js
// Translates between UI issue shape (list/kanban/detail pages) and the
// Cloudflare Worker / D1 API shape documented in Docs/api-contract.md.

const UI_STATUS_TO_API = {
  open: 'open',
  'in-progress': 'in_progress',
  'pending-review': 'review',
  blocked: 'blocked',
  closed: 'closed'
};

const API_STATUS_TO_UI = {
  open: 'open',
  in_progress: 'in-progress',
  review: 'pending-review',
  blocked: 'blocked',
  closed: 'closed'
};

const UI_PRIORITY_TO_API = {
  P0: 'critical',
  P1: 'high',
  P2: 'medium',
  P3: 'low'
};

const API_PRIORITY_TO_UI = {
  critical: 'P0',
  high: 'P1',
  medium: 'P2',
  low: 'P3'
};

/**
 * @param {object} row - D1 / API issue row
 * @returns {object}
 */
export function toUiIssue(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.issue_description || '',
    status: API_STATUS_TO_UI[row.issue_status] || row.issue_status,
    priority: API_PRIORITY_TO_UI[row.issue_priority] || 'P2',
    assignee: row.assigned_to_user || row.assigned_to_agent || 'unassigned',
    created_at: row.created_at,
    updated_at: row.updated_at,
    token_budget: 2000,
    tokens_used: 0,
    time_estimate: 60,
    time_spent: 0,
    claimed_by: row.assigned_to_agent || null,
    claimed_at: null,
    completed_at: row.closed_at || null,
    blocked_reason: null,
    result: null,
    created_by: 'human-manual',
    audit_log: []
  };
}

/**
 * @param {object} fields - createIssue() input from the UI
 * @param {string} id
 * @param {string} now
 * @param {string|null} [createdByUserId] - DB user id of the logged-in user
 * @returns {object} POST /api/issues body
 */
export function toApiCreate(fields, id, now, createdByUserId = null) {
  const assignee = fields.assignee && fields.assignee !== 'unassigned'
    ? fields.assignee
    : null;

  return {
    id,
    title: fields.title || '',
    issue_description: fields.description || null,
    issue_status: 'open',
    issue_priority: UI_PRIORITY_TO_API[fields.priority] || 'medium',
    assigned_to_user: assignee,
    assigned_to_agent: null,
    claim_expires_at: null,
    retry_count: 0,
    claim_timeout_minutes: 30,
    created_by_user: createdByUserId,
    created_at: now,
    updated_at: now,
    closed_at: null
  };
}

/**
 * @param {object} fields - updateIssue() input from the UI
 * @returns {object} PUT /api/issues/:id body
 */
export function toApiUpdate(fields) {
  /** @type {Record<string, unknown>} */
  const body = {};

  if (fields.title !== undefined) { body.title = fields.title; }
  if (fields.description !== undefined) { body.issue_description = fields.description; }
  if (fields.status !== undefined) {
    body.issue_status = UI_STATUS_TO_API[fields.status] || fields.status;
  }
  if (fields.priority !== undefined) {
    body.issue_priority = UI_PRIORITY_TO_API[fields.priority] || fields.priority;
  }
  if (fields.assignee !== undefined) {
    const assignee = fields.assignee && fields.assignee !== 'unassigned'
      ? fields.assignee
      : null;
    body.assigned_to_user = assignee;
    body.assigned_to_agent = null;
  }

  return body;
}

/**
 * @param {object[]} issues
 * @returns {string}
 */
export function nextIssueId(issues) {
  const max = issues.reduce((m, i) => {
    const n = parseInt(String(i.id).replace('issue-', ''), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `issue-${String(max + 1).padStart(3, '0')}`;
}
