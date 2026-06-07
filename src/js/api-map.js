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

export const UI_PRIORITY_TO_API = {
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

// Assignment is modelled as two mutually-exclusive booleans on the issue row.
// The UI exposes a single dropdown over these three tokens:
//   human-only  → assigned_to_user  = 1
//   ai-only     → assigned_to_agent = 1
//   open-to-all → both 0 (anyone/no one yet)
const ASSIGNEE_LABEL = {
  'human-only': 'Human-only',
  'ai-only': 'AI-only',
  'open-to-all': 'Open-to-all'
};

/**
 * Derive the assignee token ('human-only' | 'ai-only' | 'open-to-all') from a
 * D1 / API issue row's boolean assignment columns.
 * @param {object} row - D1 / API issue row
 * @returns {string}
 */
function assigneeKind(row) {
  if (row.assigned_to_agent) { return 'ai-only'; }
  if (row.assigned_to_user) { return 'human-only'; }
  return 'open-to-all';
}

/**
 * Translate an assignee token into the two boolean assignment columns.
 * @param {string|null|undefined} kind - 'human-only' | 'ai-only' | 'open-to-all'
 * @returns {{ assigned_to_user: number, assigned_to_agent: number }}
 */
function assigneeToBooleans(kind) {
  return {
    assigned_to_user: kind === 'human-only' ? 1 : 0,
    assigned_to_agent: kind === 'ai-only' ? 1 : 0
  };
}

/**
 * Map a D1 / API issue row to the UI issue shape used by list, kanban, and detail pages.
 * @param {object} row - D1 / API issue row
 * @returns {object} UI issue object
 */
export function toUiIssue(row) {
  const kind = assigneeKind(row);

  return {
    id: row.id,
    display_id: Number.isInteger(row.display_no) ? formatDisplayId(row.display_no) : '',
    title: row.title,
    description: row.issue_description || '',
    status: API_STATUS_TO_UI[row.issue_status] || row.issue_status,
    priority: API_PRIORITY_TO_UI[row.issue_priority] || 'P2',
    assignee: ASSIGNEE_LABEL[kind],
    assignee_kind: kind,
    created_at: row.created_at,
    updated_at: row.updated_at,
    token_budget: 2000,
    tokens_used: 0,
    time_estimate: 60,
    time_spent: 0,
    claimed_by: row.assigned_to_agent ? 'Agent' : null,
    claimed_at: null,
    completed_at: row.closed_at || null,
    blocked_reason: null,
    result_text: row.result_text,
    created_by: 'human-manual',
    audit_log: []
  };
}

/**
 * Map UI create-issue fields to the POST /api/issues request body.
 * @param {object} fields - createIssue() input from the UI
 * @param {string} now - ISO timestamp for created_at and updated_at
 * @param {string|null} [createdByUserId] - DB user id of the logged-in user
 * @returns {object} POST /api/issues body
 */
export function toApiCreate(fields, now, createdByUserId = null) {
  return {
    title: fields.title || '',
    issue_description: fields.description || null,
    issue_status: 'open',
    issue_priority: UI_PRIORITY_TO_API[fields.priority] || 'medium',
    ...assigneeToBooleans(fields.assignee),
    claim_expires_at: null,
    retry_count: 0,
    claim_timeout_minutes: 30,
    created_by_user: createdByUserId,
    created_at: now,
    updated_at: now,
    closed_at: null,
    result_text: null,
  };
}

/**
 * Map UI update-issue fields to the PUT /api/issues/:id request body.
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
    const { assigned_to_user, assigned_to_agent } = assigneeToBooleans(fields.assignee);
    body.assigned_to_user = assigned_to_user;
    body.assigned_to_agent = assigned_to_agent;
  }
  return body;
}

/**
 * Format a cosmetic, human-friendly issue label (e.g. `issue-001`). This is a
 * display-only reference, not the stored id (which is a server-assigned UUID).
 * @param {number} n - 1-based rank within the user's issues.
 * @returns {string}
 */
export function formatDisplayId(n) {
  return `issue-${String(n).padStart(3, '0')}`;
}
