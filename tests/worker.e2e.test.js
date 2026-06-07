// End-to-end tests for the issues API.
//
// Unlike worker.test.js (which mocks env.issues_db with canned responses and
// only checks routing + handler guards), these drive worker.fetch() against a
// REAL in-memory SQLite database. The actual SQL in db.js runs — inserts,
// the per-user display_no subquery, the status-history triggers, FK and CHECK
// constraints — so a passing test means the whole stack agrees end to end.
//
// The database lives only in memory and is rebuilt for every test, so the
// remote D1 is never touched and tests never see each other's data.

import worker from '../src/js/worker.js';
import { createTestEnv } from './helpers/memory-d1.js';

let env;
let db;
let close;

beforeEach(() => {
  ({ env, db, close } = createTestEnv());
});

afterEach(() => {
  close();
});

// ── small request/response helpers ──────────────────────────────────────────

/**
 * Fire a request through the Worker against the current in-memory env.
 * @param {string} method - HTTP method.
 * @param {string} path - Path beginning with `/api/...`.
 * @param {object|null} [body] - JSON body; omitted when null/undefined.
 * @param {Record<string,string>} [headers] - Extra request headers.
 * @returns {Promise<{ status: number, data: any }>}
 */
async function call(method, path, body = null, headers = {}) {
  const init = { method, headers: { 'Content-Type': 'application/json', ...headers } };
  if (body !== null && body !== undefined) { init.body = JSON.stringify(body); }
  const res = await worker.fetch(new Request(`http://localhost${path}`, init), env);
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

/** Read a single issue row straight from the DB (proves what was persisted). */
function issueRow(id) {
  return db.prepare('SELECT * FROM issues WHERE id = ?').get(id);
}

/** Register/login a user and return their profile (creates the users row). */
async function makeUser(name = 'steven', email = 'steven@ucsd.edu') {
  const { status, data } = await call('POST', '/api/login', { name, email });
  expect(status).toBe(201);
  return data.profile;
}

/**
 * Create an open issue owned by `userId` and return its server-assigned row.
 * @param {string} userId - created_by_user.
 * @param {object} [overrides] - Fields to override in the POST body.
 * @returns {Promise<object>} The created issue object from the API response.
 */
async function makeIssue(userId, overrides = {}) {
  const now = new Date().toISOString();
  const body = {
    title: 'A test issue',
    issue_description: 'description',
    issue_status: 'open',
    issue_priority: 'high',
    assigned_to_user: 0,
    assigned_to_agent: 0,
    claim_expires_at: null,
    retry_count: 0,
    claim_timeout_minutes: 30,
    created_by_user: userId,
    created_at: now,
    updated_at: now,
    closed_at: null,
    ...overrides
  };
  const { status, data } = await call('POST', '/api/issues', body);
  expect(status).toBe(201);
  return data.issue;
}

// ── login / register ────────────────────────────────────────────────────────

describe('POST /api/login (end-to-end)', () => {
  test('registers a brand-new user and persists the users row', async () => {
    const { status, data } = await call('POST', '/api/login', {
      name: 'alice', email: 'alice@ucsd.edu'
    });

    expect(status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.profile.name).toBe('alice');
    expect(data.profile.id).toMatch(/^user-\d{5}$/);

    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(data.profile.id);
    expect(row.username).toBe('alice');
    expect(row.email).toBe('alice@ucsd.edu');
  });

  test('logs an existing user back in (200, no duplicate row)', async () => {
    const profile = await makeUser('bob', 'bob@ucsd.edu');

    const { status, data } = await call('POST', '/api/login', {
      name: 'bob', email: 'bob@ucsd.edu'
    });

    expect(status).toBe(200);
    expect(data.profile.id).toBe(profile.id);

    const count = db.prepare('SELECT COUNT(*) AS n FROM users').get();
    expect(count.n).toBe(1);
  });

  test('rejects a known username with the wrong email (401)', async () => {
    await makeUser('carol', 'carol@ucsd.edu');

    const { status, data } = await call('POST', '/api/login', {
      name: 'carol', email: 'someone-else@ucsd.edu'
    });

    expect(status).toBe(401);
    expect(data.success).toBe(false);
  });

  test('rejects a malformed email (400)', async () => {
    const { status, data } = await call('POST', '/api/login', {
      name: 'dave', email: 'not-an-email'
    });

    expect(status).toBe(400);
    expect(data.success).toBe(false);
  });
});

// ── update username ──────────────────────────────────────────────────────────

describe('PUT /api/users/:id (end-to-end)', () => {
  test('changes the username and persists it in the users row', async () => {
    const user = await makeUser('eve', 'eve@ucsd.edu');

    const { status, data } = await call('PUT', `/api/users/${user.id}`, { name: 'eve-renamed' });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.profile.id).toBe(user.id);
    expect(data.profile.name).toBe('eve-renamed');
    expect(data.profile.email).toBe('eve@ucsd.edu'); // email unchanged

    // It is actually written to the DB.
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    expect(row.username).toBe('eve-renamed');
    expect(row.email).toBe('eve@ucsd.edu');
  });

  test('trims surrounding whitespace from the new name', async () => {
    const user = await makeUser('frank', 'frank@ucsd.edu');

    const { status, data } = await call('PUT', `/api/users/${user.id}`, { name: '  spaced  ' });

    expect(status).toBe(200);
    expect(data.profile.name).toBe('spaced');
    expect(db.prepare('SELECT username FROM users WHERE id = ?').get(user.id).username).toBe('spaced');
  });

  test('the renamed user can still log in with the new name + same email', async () => {
    const user = await makeUser('grace', 'grace@ucsd.edu');
    await call('PUT', `/api/users/${user.id}`, { name: 'grace2' });

    const { status, data } = await call('POST', '/api/login', {
      name: 'grace2', email: 'grace@ucsd.edu'
    });

    expect(status).toBe(200); // existing user, logged back in
    expect(data.profile.id).toBe(user.id);
    expect(data.profile.name).toBe('grace2');
  });

  test('returns 404 for an unknown user and writes nothing', async () => {
    const { status, data } = await call('PUT', '/api/users/user-00000', { name: 'nobody' });

    expect(status).toBe(404);
    expect(data.success).toBe(false);
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get().n).toBe(0);
  });

  test('returns 400 when name is missing and leaves the row unchanged', async () => {
    const user = await makeUser('heidi', 'heidi@ucsd.edu');

    const { status, data } = await call('PUT', `/api/users/${user.id}`, {});

    expect(status).toBe(400);
    expect(data.success).toBe(false);
    expect(db.prepare('SELECT username FROM users WHERE id = ?').get(user.id).username).toBe('heidi');
  });
});

// ── create + read ────────────────────────────────────────────────────────────

describe('POST /api/issues (end-to-end)', () => {
  test('creates an issue, assigns a UUID + display_no, and fires the insert trigger', async () => {
    const user = await makeUser();
    const issue = await makeIssue(user.id, { title: 'First issue' });

    // Server assigns the id and the per-user display_no.
    expect(typeof issue.id).toBe('string');
    expect(issue.display_no).toBe(1);

    // It is actually in the DB.
    const row = issueRow(issue.id);
    expect(row.title).toBe('First issue');
    expect(row.issue_status).toBe('open');
    expect(row.created_by_user).toBe(user.id);

    // The AFTER INSERT trigger logged the initial 'open' status.
    const history = db.prepare('SELECT * FROM issue_status_history WHERE issue_id = ?').all(issue.id);
    expect(history).toHaveLength(1);
    expect(history[0].issue_status).toBe('open');
  });

  test('numbers each user\'s issues independently from 1 (per-user display_no)', async () => {
    const a = await makeUser('ua', 'ua@ucsd.edu');
    const b = await makeUser('ub', 'ub@ucsd.edu');

    const a1 = await makeIssue(a.id);
    const a2 = await makeIssue(a.id);
    const b1 = await makeIssue(b.id);

    expect(a1.display_no).toBe(1);
    expect(a2.display_no).toBe(2);
    expect(b1.display_no).toBe(1); // independent of user a
  });

  test('returns 400 when required fields are missing (nothing persisted)', async () => {
    const { status, data } = await call('POST', '/api/issues', { title: 'only a title' });

    expect(status).toBe(400);
    expect(data.success).toBe(false);

    const count = db.prepare('SELECT COUNT(*) AS n FROM issues').get();
    expect(count.n).toBe(0);
  });

  test('returns 500 when created_by_user violates the foreign key', async () => {
    // No such user → the FK on issues.created_by_user rejects the insert.
    const { status, data } = await call('POST', '/api/issues',
      await buildIssueBody('user-does-not-exist'));

    expect(status).toBe(500);
    expect(data.success).toBe(false);
    expect(db.prepare('SELECT COUNT(*) AS n FROM issues').get().n).toBe(0);
  });
});

describe('GET /api/issues (end-to-end)', () => {
  test('returns only the requesting user\'s issues', async () => {
    const a = await makeUser('ga', 'ga@ucsd.edu');
    const b = await makeUser('gb', 'gb@ucsd.edu');
    await makeIssue(a.id, { title: 'a-one' });
    await makeIssue(a.id, { title: 'a-two' });
    await makeIssue(b.id, { title: 'b-one' });

    const { status, data } = await call('GET', `/api/issues?user_id=${a.id}`);

    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data.map(i => i.title).sort()).toEqual(['a-one', 'a-two']);
  });

  test('returns 404 for an unknown user', async () => {
    const { status } = await call('GET', '/api/issues?user_id=user-00000');
    expect(status).toBe(404);
  });

  test('GET /api/issues/:id returns a created issue, 404 otherwise', async () => {
    const user = await makeUser();
    const issue = await makeIssue(user.id);

    const found = await call('GET', `/api/issues/${issue.id}`);
    expect(found.status).toBe(200);
    expect(found.data.issue.id).toBe(issue.id);

    const missing = await call('GET', '/api/issues/nope');
    expect(missing.status).toBe(404);
  });
});

// ── update / workflow transitions ────────────────────────────────────────────

describe('PUT /api/issues/:id (end-to-end)', () => {
  test('updates allowed fields and refreshes updated_at in the DB', async () => {
    const user = await makeUser();
    const issue = await makeIssue(user.id, { title: 'Before' });

    const { status, data } = await call('PUT', `/api/issues/${issue.id}`, {
      title: 'After', issue_priority: 'critical'
    });

    expect(status).toBe(200);
    expect(data.issue.title).toBe('After');
    expect(data.issue.issue_priority).toBe('critical');
    expect(issueRow(issue.id).title).toBe('After');
  });

  test('rejects an invalid issue_status and leaves the row unchanged', async () => {
    const user = await makeUser();
    const issue = await makeIssue(user.id);

    const { status } = await call('PUT', `/api/issues/${issue.id}`, { issue_status: 'pending' });

    expect(status).toBe(400);
    expect(issueRow(issue.id).issue_status).toBe('open');
  });
});

describe('claim → result → history → close workflow (end-to-end)', () => {
  test('runs the full agent lifecycle against real SQL', async () => {
    const user = await makeUser();
    const issue = await makeIssue(user.id);

    // 1. An agent claims the open issue.
    const claim = await call('PUT', `/api/issues/${issue.id}/claim`, { agent_id: 'agent-007' });
    expect(claim.status).toBe(200);
    expect(claim.data.issue.issue_status).toBe('in_progress');
    expect(claim.data.issue.assigned_to_agent).toBe(1);
    // ensureAgentRow inserted the agent.
    expect(db.prepare('SELECT * FROM agents WHERE id = ?').get('agent-007')).toBeTruthy();

    // 2. The agent posts a result, moving it to review.
    const result = await call('PUT', `/api/issues/${issue.id}/result`, {
      new_status: 'review', result_text: 'done', tokens_used: 123
    });
    expect(result.status).toBe(200);
    const afterResult = issueRow(issue.id);
    expect(afterResult.issue_status).toBe('review');
    expect(afterResult.result_text).toBe('done');
    expect(afterResult.tokens_used).toBe(123);

    // 3. History reflects every transition (trigger-driven). The three events
    //    can land in the same millisecond, so assert the set rather than a
    //    tie-break-dependent order — and verify changed_at is sorted newest
    //    first, which validates the ORDER BY without depending on the tie.
    const history = await call('GET', `/api/issues/${issue.id}/history`);
    expect(history.status).toBe(200);
    const statuses = history.data.history.map(h => h.issue_status);
    expect(statuses.slice().sort()).toEqual(['in_progress', 'open', 'review']);
    const times = history.data.history.map(h => h.changed_at);
    expect(times).toEqual(times.slice().sort().reverse());

    // 4. Closing stamps closed_at.
    const closed = await call('PUT', `/api/issues/${issue.id}/close`);
    expect(closed.status).toBe(200);
    const closedRow = issueRow(issue.id);
    expect(closedRow.issue_status).toBe('closed');
    expect(closedRow.closed_at).toBeTruthy();
  });

  test('an agent cannot claim a human-only issue', async () => {
    const user = await makeUser();
    const issue = await makeIssue(user.id, { assigned_to_user: 1, assigned_to_agent: 0 });

    const { status, data } = await call('PUT', `/api/issues/${issue.id}/claim`, { agent_id: 'agent-1' });

    expect(status).toBe(400);
    expect(data.error).toContain('human');
    expect(issueRow(issue.id).issue_status).toBe('open'); // untouched
  });

  test('posting a result before the issue is in_progress is rejected', async () => {
    const user = await makeUser();
    const issue = await makeIssue(user.id); // still 'open'

    const { status } = await call('PUT', `/api/issues/${issue.id}/result`, { new_status: 'review' });

    expect(status).toBe(400);
    expect(issueRow(issue.id).issue_status).toBe('open');
  });
});

describe('DELETE /api/issues/:id (end-to-end)', () => {
  test('deletes the issue and cascades its history via the BEFORE DELETE trigger', async () => {
    const user = await makeUser();
    const issue = await makeIssue(user.id);

    const { status, data } = await call('DELETE', `/api/issues/${issue.id}`);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(issueRow(issue.id)).toBeUndefined();
    const history = db.prepare('SELECT * FROM issue_status_history WHERE issue_id = ?').all(issue.id);
    expect(history).toHaveLength(0);
  });

  test('returns 404 when deleting a non-existent issue', async () => {
    const { status } = await call('DELETE', '/api/issues/ghost');
    expect(status).toBe(404);
  });
});

describe('PUT /api/issues/:id/block (end-to-end)', () => {
  test('blocks an open issue', async () => {
    const user = await makeUser();
    const issue = await makeIssue(user.id);

    const { status, data } = await call('PUT', `/api/issues/${issue.id}/block`);

    expect(status).toBe(200);
    expect(data.issue.issue_status).toBe('blocked');
    expect(issueRow(issue.id).issue_status).toBe('blocked');
  });

  test('refuses to block an already-closed issue', async () => {
    const user = await makeUser();
    const issue = await makeIssue(user.id);
    await call('PUT', `/api/issues/${issue.id}/close`);

    const { status, data } = await call('PUT', `/api/issues/${issue.id}/block`);

    expect(status).toBe(400);
    expect(data.error).toContain('closed');
  });
});

// helper kept at the bottom: build a create body for an arbitrary owner.
/**
 * @param {string} userId - value for created_by_user.
 * @returns {object} a complete POST /api/issues body.
 */
async function buildIssueBody(userId) {
  const now = new Date().toISOString();
  return {
    title: 'fk test', issue_status: 'open', issue_priority: 'low',
    assigned_to_user: 0, assigned_to_agent: 0, claim_expires_at: null,
    retry_count: 0, claim_timeout_minutes: 30, created_by_user: userId,
    created_at: now, updated_at: now, closed_at: null
  };
}
