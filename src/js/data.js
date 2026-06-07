/**
 * data.js — frontend client for the Cloudflare Worker issues API.
 * All issue reads/writes go through fetch(). UI pages import from here only.
 *
 * Auth model:
 *   After login(), the user profile { id, name, email } is stored in
 *   localStorage. Every request attaches X-User-ID so the Worker can scope
 *   issue queries to the logged-in user.
 */

import { toApiCreate, toApiUpdate, toUiIssue } from './api-map.js';

/** @typedef {ReturnType<typeof toUiIssue>} UiIssue */
/** @typedef {{ id: string, name: string, email: string }} UserProfile */

const API_BASE =
  localStorage.getItem('ait_api_base')
  || ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:8787'
    : 'https://agent-issue-tracker.stc021.workers.dev');

/** @type {UiIssue[]} */
let _issues = [];

// ── Auth helpers ───────────────────────────────────────────────────────────

/**
 * Returns the stored user profile from localStorage, or null if not logged in.
 * @returns {UserProfile|null}
 */
export function getProfile() {
  const raw = localStorage.getItem('ait_profile');
  if (!raw) { return null; }
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * @param {UserProfile} profile
 */
function saveProfile(profile) {
  localStorage.setItem('ait_profile', JSON.stringify(profile));
  // Keep legacy ait_user in sync so any code still reading it gets the name.
  localStorage.setItem('ait_user', profile.name);
}

/**
 * POST /api/login — registers the user on first call, signs them in on return.
 * On success, saves the profile to localStorage and returns it.
 * @param {string} name  - Display name / username
 * @param {string} email - Email address
 * @returns {Promise<UserProfile>}
 */
export async function login(name, email) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email })
  });

  let body = null;
  try { body = await res.json(); } catch { body = null; }

  if (!res.ok) {
    const msg = (body && body.error) ? body.error : res.statusText || 'Login failed';
    throw new Error(msg);
  }

  const profile = body.profile;
  saveProfile(profile);
  return profile;
}

/**
 * PUT /api/users/:id — change the logged-in user's display name.
 * On success, updates the stored profile in localStorage and returns it.
 * @param {string} name - The new display name / username.
 * @returns {Promise<UserProfile>}
 */
export async function updateName(name) {
  const profile = getProfile();
  if (!profile) {
    throw new Error('Not logged in');
  }

  const data = await request(`/api/users/${encodeURIComponent(profile.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ name })
  });

  const updated = data.profile;
  saveProfile(updated);
  return updated;
}

/**
 * Clear the stored profile (log out). Callers should redirect to login.html.
 */
export function logout() {
  localStorage.removeItem('ait_profile');
  localStorage.removeItem('ait_user');
}

// ── Request helper ─────────────────────────────────────────────────────────

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<unknown>}
 */
async function request(path, options = {}) {
  const profile = getProfile();
  const authHeader = profile ? { 'X-User-ID': profile.id } : {};

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers
    },
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

// ── Data change notification ───────────────────────────────────────────────

function notifyChange() {
  document.dispatchEvent(new CustomEvent('ait:data-changed'));
}

// ── Local-only patch (no API call) ─────────────────────────────────────────

/**
 * Update the in-memory issue cache without making an API call.
 * Use for display-only fields (e.g. free-text assignee) that can't be written
 * to the DB directly due to schema constraints.
 * @param {string} id
 * @param {object} fields
 */
export function patchIssueLocal(id, fields) {
  const idx = _issues.findIndex(i => i.id === id);
  if (idx !== -1) {
    _issues[idx] = { ..._issues[idx], ...fields };
    notifyChange();
  }
}

// ── Issue reads ────────────────────────────────────────────────────────────

/**
 * Load all issues visible to the logged-in user from the API.
 * Call once on page load before reading with getIssues() / getIssue().
 * @returns {Promise<UiIssue[]>}
 */
export async function initData() {
  const profile = getProfile();
  const query = profile ? `?user_id=${encodeURIComponent(profile.id)}` : '';
  const data = await request(`/api/issues${query}`);
  _issues = Array.isArray(data) ? data.map(row => toUiIssue(row, profile)) : [];
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

// ── Issue writes ───────────────────────────────────────────────────────────

/**
 * @param {{ title: string, description?: string, priority?: string,
 *           assignee?: string, token_budget?: number, time_estimate?: number,
 *           creator?: string, created_by?: string }} fields
 * @returns {Promise<UiIssue>}
 */
export async function createIssue(fields) {
  const now     = new Date().toISOString();
  const profile = getProfile();
  const payload = toApiCreate(fields, now, profile?.id ?? null);

  const data = await request('/api/issues', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  // The server assigns the id (a UUID); trust the response over the payload.
  const issue = toUiIssue(data.issue || payload, profile);
  issue.created_by    = fields.created_by || 'human-manual';
  issue.token_budget  = Number(fields.token_budget) || 2000;
  issue.time_estimate = Number(fields.time_estimate) || 60;
  issue.audit_log = [{
    action: 'created',
    by: fields.creator || profile?.name || getSettings().ait_user || 'unknown',
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

  const issue = toUiIssue(data.issue, getProfile());
  const idx = _issues.findIndex(i => i.id === id);
  if (idx !== -1) {
    _issues[idx] = { ..._issues[idx], ...issue };
  }

  notifyChange();
  return getIssue(id);
}

/**
 * @param {string} id
 * @returns {Promise<UiIssue|null>}
 */
export async function claimIssue(id) {
  const profile = getProfile();
  // Claiming assigns the issue to the user (assigned_to_user = 1).
  const payload = toApiUpdate({ status: 'in-progress', assignee: 'human-only' });
  const data = await request(`/api/issues/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

  const issue = toUiIssue(data.issue, profile);

  const idx = _issues.findIndex(i => i.id === id);
  if (idx !== -1) {
    _issues[idx] = { ..._issues[idx], ...issue };
  }

  notifyChange();
  return getIssue(id);
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

// ── Settings (legacy + convenience) ───────────────────────────────────────

/**
 * Returns display-name and user_id from the stored profile (or fallbacks).
 * Callers that only need ait_user for audit labels can keep using this.
 * @returns {{ ait_user: string, user_id: string|null }}
 */
export function getSettings() {
  const profile = getProfile();
  return {
    ait_user: profile?.name || localStorage.getItem('ait_user') || 'local-dev',
    user_id:  profile?.id   || null
  };
}

/**
 * Ready-to-paste line for ~/.ait/.env (AIT runner user scoping).
 * @returns {string|null}
 */
export function getAgentEnvLine() {
  const profile = getProfile();
  return profile?.id ? `AIT_USER_ID=${profile.id}` : null;
}

/**
 * @param {{ ait_user?: string }} settings
 */
export function saveSettings(settings) {
  if (settings.ait_user !== undefined) {
    localStorage.setItem('ait_user', String(settings.ait_user));
  }
}
