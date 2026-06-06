/**
 * Runner endpoint tests
 *
 * Covers the three API interactions that runner.js makes:
 *   GET  /api/issues/ready        — new endpoint, returns highest-priority open issue
 *   PUT  /api/issues/:id/claim    — existing endpoint (existing tests in src/tests)
 *   PUT  /api/issues/:id/result   — updated to accept result_text + tokens_used
 *
 * ─── AUTH / WORKSPACE NOTE ───────────────────────────────────────────────────
 * There is NO server-side auth or workspace filtering yet.
 *
 *   - X-Workspace-ID is accepted as a header and logged, but the Worker does NOT
 *     filter issues by workspace. All callers see the same global issue pool.
 *   - X-Agent-ID is forwarded for observability only.
 *   - AIT_WORKSPACE_ID in ~/.ait/.env is loaded by runner.js (via dotenv) and
 *     sent as the X-Workspace-ID header. Claude Code itself does NOT read .env
 *     files — it inherits whatever env vars were already in the shell that
 *     launched it. runner.js is responsible for dotenv loading.
 *
 * This means: any user running `ait` with any workspace ID will claim issues
 * from the shared pool. Per-user issue isolation requires auth (future work).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { jest } from '@jest/globals';
import worker from '../src/js/worker.js';

const env = {
  issues_db: {
    prepare: jest.fn()
  }
};

/**
 * Mirror of the helper in tests/worker.test.js.
 * Sets up a D1 mock chain and wires the requested method to return `response`.
 * Uses mockReturnValue — every call to prepare() gets this chain.
 *
 * @param {any} response - Value the mocked D1 method should resolve to
 * @param {'first'|'all'|'run'} method - Which chained method receives the response
 * @returns {object} The mocked D1 statement chain
 */
function mockD1Response(response, method = 'first') {
  const chain = {
    bind: jest.fn().mockReturnThis(),
    first: jest.fn(),
    all:   jest.fn(),
    run:   jest.fn()
  };
  chain[method].mockResolvedValue(response);
  env.issues_db.prepare.mockReturnValue(chain);
  return chain;
}

/**
 * Queue multiple D1 responses in order for handlers that call prepare() more
 * than once. Matches the signature used in tests/worker.test.js (main's impl).
 *
 * @param {Array<{ response: any, method: 'first'|'all'|'run' }>} calls - Ordered mock responses
 */
function mockD1Sequence(calls) {
  let callIndex = 0;
  env.issues_db.prepare.mockImplementation(() => {
    const { response, method = 'first' } = calls[callIndex] ?? calls[calls.length - 1];
    callIndex++;
    const chain = {
      bind: jest.fn().mockReturnThis(),
      first: jest.fn(),
      all:   jest.fn(),
      run:   jest.fn()
    };
    chain[method].mockResolvedValue(response);
    return chain;
  });
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal open-issue row for runner endpoint tests.
 * @param {object} [overrides] - Fields to override on the default row
 * @returns {object} Open issue row shaped like a D1 record
 */
function openIssue(overrides = {}) {
  return {
    id: 'issue-001',
    title: 'Test open issue',
    issue_status: 'open',
    issue_priority: 'high',
    issue_description: 'Something needs fixing.',
    assigned_to_agent: 0,
    assigned_to_user: 0,
    retry_count: 0,
    claim_timeout_minutes: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Build a minimal in-progress issue row for runner endpoint tests.
 * @param {object} [overrides] - Fields to override on the default row
 * @returns {object} In-progress issue row shaped like a D1 record
 */
function inProgressIssue(overrides = {}) {
  return openIssue({
    issue_status: 'in_progress',
    assigned_to_agent: 1,
    ...overrides
  });
}

// ─── GET /api/issues/ready ────────────────────────────────────────────────────

describe('GET /api/issues/ready', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 200 and the highest-priority open issue', async () => {
    mockD1Response(openIssue(), 'first');

    const res = await worker.fetch(
      new Request('http://localhost/api/issues/ready', {
        method: 'GET',
        headers: { 'X-Workspace-ID': 'ws-placeholder-001' }
      }),
      env
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(data.success).toBe(true);
    expect(data.issue).toHaveProperty('id', 'issue-001');
    expect(data.issue.issue_status).toBe('open');
  });

  test('returns 404 when no open issues exist', async () => {
    mockD1Response(null, 'first');

    const res = await worker.fetch(
      new Request('http://localhost/api/issues/ready', { method: 'GET' }),
      env
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('No open issues available');
  });

  test('works with or without X-Workspace-ID header (no server-side filtering yet)', async () => {
    // With workspace header
    mockD1Response(openIssue(), 'first');
    const withHeader = await worker.fetch(
      new Request('http://localhost/api/issues/ready', {
        headers: { 'X-Workspace-ID': 'ws-abc' }
      }),
      env
    );
    expect(withHeader.status).toBe(200);

    // Without workspace header — same pool, same result
    jest.clearAllMocks();
    mockD1Response(openIssue(), 'first');
    const withoutHeader = await worker.fetch(
      new Request('http://localhost/api/issues/ready'),
      env
    );
    expect(withoutHeader.status).toBe(200);
  });

  test('does not return the /ready route as a GET /:id match (route ordering)', async () => {
    // If /ready were caught by GET /api/issues/:id, getIssueById would call
    // selectIssueById with id="ready" and return 404 with a different error message.
    // The correct handler returns 'No open issues available' on 404.
    mockD1Response(null, 'first');

    const res = await worker.fetch(
      new Request('http://localhost/api/issues/ready'),
      env
    );
    const data = await res.json();

    // 404 is fine (no issues), but the error must come from getReadyIssue,
    // not getIssueById — confirmed by the specific error message.
    expect(data.error).toBe('No open issues available');
  });
});

// ─── PUT /api/issues/:id/result ───────────────────────────────────────────────

describe('PUT /api/issues/:id/result', () => {
  beforeEach(() => jest.clearAllMocks());

  test('accepts new_status "review" and posts back successfully', async () => {
    // putResult calls prepare() twice: selectIssueById then storeIssueResult
    mockD1Sequence([
      { response: inProgressIssue(), method: 'first' },
      { response: { meta: { changes: 1 } }, method: 'run' }
    ]);

    const res = await worker.fetch(
      new Request('http://localhost/api/issues/issue-001/result', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: 'review' })
      }),
      env
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Result posted successfully');
  });

  test('accepts result_text and tokens_used alongside new_status', async () => {
    // This is the shape Claude sends via its curl command at the end of a task.
    mockD1Sequence([
      { response: inProgressIssue(), method: 'first' },
      { response: { meta: { changes: 1 } }, method: 'run' }
    ]);

    const res = await worker.fetch(
      new Request('http://localhost/api/issues/issue-001/result', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: 'review',
          result_text: 'Refactored the auth module. All tests pass.',
          tokens_used: 2048
        })
      }),
      env
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  test('accepts "blocked" as new_status', async () => {
    mockD1Sequence([
      { response: inProgressIssue(), method: 'first' },
      { response: { meta: { changes: 1 } }, method: 'run' }
    ]);

    const res = await worker.fetch(
      new Request('http://localhost/api/issues/issue-001/result', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: 'blocked',
          result_text: 'Cannot proceed — missing environment variable docs.'
        })
      }),
      env
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  test('rejects invalid new_status values', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/issues/issue-001/result', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: 'closed' })
      }),
      env
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  test('rejects if issue is not in_progress', async () => {
    mockD1Response(openIssue(), 'first'); // still 'open', not 'in_progress'

    const res = await worker.fetch(
      new Request('http://localhost/api/issues/issue-001/result', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: 'review' })
      }),
      env
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/in progress/i);
  });

  test('returns 404 when issue does not exist', async () => {
    mockD1Response(null, 'first');

    const res = await worker.fetch(
      new Request('http://localhost/api/issues/nonexistent/result', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: 'review' })
      }),
      env
    );

    expect(res.status).toBe(404);
  });
});

// ─── CORS — new headers included ─────────────────────────────────────────────

describe('CORS preflight includes runner headers', () => {
  test('OPTIONS /api/issues/ready allows X-Workspace-ID and X-Agent-ID', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/issues/ready', { method: 'OPTIONS' }),
      env
    );

    expect(res.status).toBe(204);
    const allowed = res.headers.get('Access-Control-Allow-Headers');
    expect(allowed).toContain('X-Workspace-ID');
    expect(allowed).toContain('X-Agent-ID');
  });
});
