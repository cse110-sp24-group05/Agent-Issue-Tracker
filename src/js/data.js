/**
 * data.js — frontend client for the Cloudflare Worker issues API.
 * All issue reads/writes go through fetch(). UI pages import from here only.
 */

import { toApiCreate, toApiUpdate, toUiIssue } from './api-map.js';

/** @typedef {ReturnType<typeof toUiIssue>} UiIssue */

const API_BASE =
  localStorage.getItem('ait_api_base')
  || ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:8787'
    : 'https://agent-issue-tracker.stc021.workers.dev');

/** @type {UiIssue[]} */
let _issues = [];

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<unknown>}
 */
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const msg = (body && body.error) ? body.error : res.statusText || 'Request failed';
    throw new Error(msg);
  }

  return body;
}

/**
 *
 */
function notifyChange() {
  document.dispatchEvent(new CustomEvent('ait:data-changed'));
}

/**
 * Load all issues from the API into the in-memory cache.
 * Call once before reading with getIssues() / getIssue().
 * @returns {Promise<UiIssue[]>}
 */
export async function initData() {
  const data = await request('/api/issues');
  _issues = Array.isArray(data) ? data.map(toUiIssue) : [];
  return _issues;
}

/**
 * @returns {UiIssue[]}
 */
export function getIssues() {
  return _issues;
}

/**
 * @param {string} id
 * @returns {UiIssue|null}
 */
export function getIssue(id) {
  return _issues.find(i => i.id === id) ?? null;
}

/**
 * @param {{ title: string, description?: string, priority?: string,
 *           assignee?: string, token_budget?: number, time_estimate?: number,
 *           creator?: string, created_by?: string }} fields
 * @returns {Promise<UiIssue>}
 */
export async function createIssue(fields) {
  const now = new Date().toISOString();
  const payload = toApiCreate(fields, now);

  const data = await request('/api/issues', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  // The server assigns the id (a UUID); trust the response over the payload.
  const issue = toUiIssue(data.issue || payload);
  issue.created_by = fields.created_by || 'human-manual';
  issue.token_budget = Number(fields.token_budget) || 2000;
  issue.time_estimate = Number(fields.time_estimate) || 60;
  issue.audit_log = [{
    action: 'created',
    by: fields.creator || getSettings().ait_user || 'unknown',
    at: now
  }];

  _issues.push(issue);
  notifyChange();
  return issue;
}

/**
 * @param {string} id
 * @param {object} fields
 * @returns {Promise<UiIssue|null>}
 */
export async function updateIssue(id, fields) {
  const payload = toApiUpdate(fields);
  if (Object.keys(payload).length === 0) {
    return getIssue(id);
  }

  const data = await request(`/api/issues/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

  const issue = toUiIssue(data.issue);
  const idx = _issues.findIndex(i => i.id === id);
  if (idx !== -1) {
    _issues[idx] = { ..._issues[idx], ...issue };
  }

  notifyChange();
  return getIssue(id);
}

/**
 * @param {string} id
 * @param {string} claimedBy
 * @returns {Promise<UiIssue|null>}
 */
export async function claimIssue(id, claimedBy) {
  return updateIssue(id, { status: 'in-progress', assignee: claimedBy });
}

/**
 * @param {string} id
 * @param {string} result
 * @param {number} tokensUsed
 * @param {number} timeSpent
 * @returns {Promise<UiIssue|null>}
 */
export async function postResult(id, result, tokensUsed, timeSpent) {
  await request(`/api/issues/${encodeURIComponent(id)}/result`, {
    method: 'PUT',
    body: JSON.stringify({ new_status: 'review' })
  });

  const idx = _issues.findIndex(i => i.id === id);
  if (idx !== -1) {
    _issues[idx] = {
      ..._issues[idx],
      result,
      tokens_used: Number(tokensUsed) || 0,
      time_spent: Number(timeSpent) || _issues[idx].time_spent,
      status: 'pending-review',
      updated_at: new Date().toISOString()
    };
  }

  notifyChange();
  return getIssue(id);
}

/**
 * @param {string} id
 * @returns {Promise<UiIssue|null>}
 */
export async function closeIssue(id) {
  await request(`/api/issues/${encodeURIComponent(id)}/close`, {
    method: 'PUT'
  });

  const idx = _issues.findIndex(i => i.id === id);
  if (idx !== -1) {
    const now = new Date().toISOString();
    _issues[idx] = {
      ..._issues[idx],
      status: 'closed',
      completed_at: now,
      updated_at: now
    };
  }

  notifyChange();
  return getIssue(id);
}

/**
 * @param {string} id
 * @param {string} reason
 * @returns {Promise<UiIssue|null>}
 */
export async function blockIssue(id, reason) {
  const issue = await updateIssue(id, { status: 'blocked' });
  if (issue) {
    issue.blocked_reason = reason;
  }
  return issue;
}

/**
 * @returns {{ ait_user: string }}
 */
export function getSettings() {
  return {
    ait_user: localStorage.getItem('ait_user') || 'local-dev'
  };
}

/**
 * @param {{ ait_user?: string }} settings
 */
export function saveSettings(settings) {
  if (settings.ait_user !== undefined) {
    localStorage.setItem('ait_user', String(settings.ait_user));
  }
}
