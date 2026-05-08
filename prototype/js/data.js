/**
 * data.js — single source of truth for all localStorage reads and writes.
 * No other file in this codebase may call localStorage directly.
 *
 * Top-level await seeds the store from api/issues.json on first visit.
 * Importing pages wait for this to complete before any function runs.
 */

const ISSUES_KEY = 'ait_issues';

// ── Seed on first visit ─────────────────────────────────────────
if (!localStorage.getItem(ISSUES_KEY)) {
  const res  = await fetch('api/issues.json');
  const seed = await res.json();
  localStorage.setItem(ISSUES_KEY, JSON.stringify(seed));
}

// ── Private helpers ─────────────────────────────────────────────
function _read() {
  return JSON.parse(localStorage.getItem(ISSUES_KEY) || '[]');
}

function _save(issues) {
  localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
}

function _now() {
  return new Date().toISOString();
}

function _nextId(issues) {
  const max = issues.reduce((m, i) => {
    const n = parseInt(i.id.replace('issue-', ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return 'issue-' + String(max + 1).padStart(3, '0');
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Returns all issues from localStorage.
 * @returns {Object[]}
 */
export function getIssues() {
  return _read();
}

/**
 * Returns a single issue by id, or null if not found.
 * @param {string} id
 * @returns {Object|null}
 */
export function getIssue(id) {
  return _read().find(i => i.id === id) ?? null;
}

/**
 * Creates a new issue with schema-compliant defaults, saves it, and returns it.
 * @param {{ title: string, description?: string, priority?: string,
 *           assignee?: string, token_budget?: number, time_estimate?: number,
 *           creator?: string,
 *           created_by?: 'human-manual'|'llm-assist'|string }} fields
 * @returns {Object}
 */
export function createIssue(fields) {
  const issues = _read();
  const now    = _now();
  const issue  = {
    id:             _nextId(issues),
    title:          fields.title        || '',
    description:    fields.description  || '',
    status:         'open',
    priority:       fields.priority     || 'P2',
    assignee:       fields.assignee     || 'unassigned',
    created_at:     now,
    updated_at:     now,
    token_budget:   Number(fields.token_budget)  || 2000,
    tokens_used:    0,
    time_estimate:  Number(fields.time_estimate) || 60,
    time_spent:     0,
    claimed_by:     null,
    claimed_at:     null,
    completed_at:   null,
    blocked_reason: null,
    result:         null,
    created_by:     fields.created_by || 'human-manual',
    audit_log:      [{ action: 'created', by: fields.creator || 'unknown', at: now }]
  };
  issues.push(issue);
  _save(issues);
  return issue;
}

/**
 * Updates specified fields on an issue.
 * Adds one audit_log entry per changed field (title, description, priority,
 * assignee, status, token_budget, time_estimate, blocked_reason).
 * @param {string} id
 * @param {Object} fields — values to update, plus optional `updatedBy`
 * @returns {Object|null} updated issue, or null if id not found
 */
export function updateIssue(id, fields) {
  const issues = _read();
  const idx    = issues.findIndex(i => i.id === id);
  if (idx === -1) return null;

  const issue = issues[idx];
  const now   = _now();
  const by    = fields.updatedBy || getSettings().ait_user || 'unknown';
  const TRACKED = ['title', 'description', 'priority', 'assignee', 'status',
                   'token_budget', 'time_estimate', 'blocked_reason'];

  TRACKED.forEach(key => {
    if (fields[key] === undefined) return;
    if (String(fields[key]) === String(issue[key])) return;
    issue.audit_log.push({
      action: `${key.replace(/_/g, '-')} changed from "${issue[key]}" to "${fields[key]}"`,
      by,
      at: now
    });
    issue[key] = fields[key];
  });

  issue.updated_at = now;
  _save(issues);
  return issue;
}

/**
 * Claims an open issue: sets claimed_by, claimed_at, and status to in-progress.
 * @param {string} id
 * @param {string} claimedBy
 * @returns {Object|null}
 */
export function claimIssue(id, claimedBy) {
  const issues = _read();
  const idx    = issues.findIndex(i => i.id === id);
  if (idx === -1) return null;

  const now = _now();
  issues[idx] = {
    ...issues[idx],
    claimed_by: claimedBy,
    claimed_at: now,
    status:     'in-progress',
    updated_at: now,
    audit_log:  [...issues[idx].audit_log, { action: 'claimed', by: claimedBy, at: now }]
  };
  _save(issues);
  return issues[idx];
}

/**
 * Posts a result for an in-progress issue, moving it to pending-review.
 * @param {string} id
 * @param {string} result
 * @param {number} tokensUsed
 * @param {number} timeSpent
 * @returns {Object|null}
 */
export function postResult(id, result, tokensUsed, timeSpent) {
  const issues = _read();
  const idx    = issues.findIndex(i => i.id === id);
  if (idx === -1) return null;

  const now = _now();
  const by  = getSettings().ait_user || 'unknown';
  issues[idx] = {
    ...issues[idx],
    result:      result,
    tokens_used: Number(tokensUsed) || 0,
    time_spent:  Number(timeSpent)  || issues[idx].time_spent,
    status:      'pending-review',
    updated_at:  now,
    audit_log:   [...issues[idx].audit_log, { action: 'submitted for review', by, at: now }]
  };
  _save(issues);
  return issues[idx];
}

/**
 * Closes an issue (approve & close): sets status to closed and completed_at to now.
 * @param {string} id
 * @returns {Object|null}
 */
export function closeIssue(id) {
  const issues = _read();
  const idx    = issues.findIndex(i => i.id === id);
  if (idx === -1) return null;

  const now = _now();
  const by  = getSettings().ait_user || 'unknown';
  issues[idx] = {
    ...issues[idx],
    status:       'closed',
    completed_at: now,
    updated_at:   now,
    audit_log:    [...issues[idx].audit_log, { action: 'approved and closed', by, at: now }]
  };
  _save(issues);
  return issues[idx];
}

/**
 * Marks an issue as blocked with a reason, setting status to "blocked".
 * @param {string} id
 * @param {string} reason - short description of what is blocking progress
 * @returns {Object|null}
 */
export function blockIssue(id, reason) {
  const issues = _read();
  const idx    = issues.findIndex(i => i.id === id);
  if (idx === -1) return null;

  const now = _now();
  const by  = getSettings().ait_user || 'unknown';
  issues[idx] = {
    ...issues[idx],
    status:         'blocked',
    blocked_reason: reason,
    updated_at:     now,
    audit_log:      [...issues[idx].audit_log, { action: `blocked: ${reason}`, by, at: now }]
  };
  _save(issues);
  return issues[idx];
}

/**
 * Returns the current approval mode ('auto-close' or 'require-review').
 * @returns {'auto-close'|'require-review'}
 */
export function getApprovalMode() {
  return localStorage.getItem('ait_approval_mode') || 'auto-close';
}

/**
 * Saves the approval mode to localStorage.
 * @param {'auto-close'|'require-review'} mode
 */
export function saveApprovalMode(mode) {
  localStorage.setItem('ait_approval_mode', mode);
}

/**
 * Returns the sprint token budget from localStorage (default 20000).
 * @returns {number}
 */
export function getSprintBudget() {
  return parseInt(localStorage.getItem('ait_sprint_budget'), 10) || 20000;
}

/**
 * Saves the sprint token budget to localStorage.
 * @param {number} n
 */
export function saveSprintBudget(n) {
  localStorage.setItem('ait_sprint_budget', String(Number(n) || 20000));
}

/**
 * Returns all settings from localStorage as a plain object.
 * @returns {{ ait_user: string, ait_repo: string, ait_token: string,
 *             ait_slack: string, ait_llm: string }}
 */
export function getSettings() {
  return {
    ait_user:  localStorage.getItem('ait_user')  || '',
    ait_repo:  localStorage.getItem('ait_repo')  || '',
    ait_token: localStorage.getItem('ait_token') || '',
    ait_slack: localStorage.getItem('ait_slack') || '',
    ait_llm:   localStorage.getItem('ait_llm')   || ''
  };
}

/**
 * Saves settings to localStorage. Each key maps directly to one localStorage entry.
 * @param {{ ait_user?: string, ait_repo?: string, ait_token?: string,
 *           ait_slack?: string, ait_llm?: string }} settings
 */
export function saveSettings(settings) {
  for (const [key, val] of Object.entries(settings)) {
    localStorage.setItem(key, String(val));
  }
}
