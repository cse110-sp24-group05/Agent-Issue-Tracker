// Tests for routing and handler logic via fetching through worker
// These tests are for validating handler logic (status guards, response shapes, and routing)
// Some tests written with assistance from Claude, some are manually written
// Human reviewed and tested

import { jest } from '@jest/globals';
import worker from '../src/js/worker.js';

// Mock the environment variables
const env = {
  issues_db: {
    prepare: jest.fn()
  }
};

/**
 * For Tests Involving Simple Single-Call handlers
 * i.e. getAllIssues, getIssueById, deleteIssue, and closeIssue. 
 * This helper function mocks the D1 database response for a given query. It allows you to specify
 * the response data and the method (first, all, run) that should return that data. It also sets up
 * the necessary chaining for D1 queries (bind, first, all, run) and ensures that the prepare method
 * returns the mocked chain. 
 * @param {any} response - The response data to return for the specified method.
 * @param {string} method - The D1 method to mock (default is 'first').
 * @returns {object} The mocked chain of D1 methods.
 */
function mockD1Response(response, method = 'first') {
  const chain = {
    bind: jest.fn().mockReturnThis(),
    first: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
  };

  chain[method].mockResolvedValue(response);

  env.issues_db.prepare.mockReturnValue(chain);

  return chain;
}

/**
 * For testing functions that involve multiple sequential Database calls 
 * (multi-call handlers), i.e. claimIssue, blockIssue, updateIssue, putResult.
 * This function sets up sequential D1 mock responses for handlers that call 
 * the database more than once. Each entry in calls maps to a prepare() 
 * in the exact order that the handler does the calls to db
 * @param {Array<response: any, method: 'first'|'all'|'run'} calls - Ordered
 * list of mock DB responses. The last entry is reused if handler makes more 
 * calls than amount of entries provided.
 * @returns {void}
 */
function mockD1Sequence(calls) {
  let callIndex = 0;
  env.issues_db.prepare.mockImplementation(() => {
    const {response, method} = calls[callIndex] ?? calls[calls.length - 1];
    callIndex++;
    const chain = {
      bind: jest.fn().mockReturnThis(),
      first: jest.fn(),
      all: jest.fn(),
      run: jest.fn()
    };
    chain[method].mockResolvedValue(response);
    return chain;
  });
}

// Tests for the Issues API
describe('Issues API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('responds to CORS preflight for API routes', async () => {
    const response = await worker.fetch(
      new Request('http://localhost/api/issues', { method: 'OPTIONS' }),
      env
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  // Tests for GET 

  // GET ALL ISSUES
  describe('GET /api/issues', () => {
    // success case: returns issues for a given user_id
    test('returns issues for the logged-in user (assigned or created)', async () => {
      mockD1Sequence([
        {
          response: { id: 'user-00001', username: 'steven', email: 'steven@ucsd.edu' },
          method: 'first'
        },
        {
          response: {
            results: [
              {
                id: '1',
                title: 'Test Issue',
                issue_status: 'open',
                issue_priority: 'high',
                retry_count: 0,
                claim_timeout_minutes: 30,
                assigned_to_user: 1,
                created_by_user: null
              },
              {
                id: '2',
                title: 'Fix Bug',
                issue_status: 'in_progress',
                issue_priority: 'low',
                retry_count: 1,
                claim_timeout_minutes: 30,
                assigned_to_user: 0,
                created_by_user: 'user-00001'
              }
            ]
          },
          method: 'all'
        }
      ]);

      const res = await worker.fetch(
        new Request('http://localhost/api/issues?user_id=user-00001', { method: 'GET' }),
        env
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(data.length).toBe(2);
      expect(data[0].issue_status).toBe('open');
      expect(data[0].assigned_to_user).toBe(1);
      expect(data[1].issue_status).toBe('in_progress');
      expect(data[1].created_by_user).toBe('user-00001');
    });

    // failure case: missing user_id
    test('returns 400 when user_id query param is missing', async () => {
      const res = await worker.fetch(
        new Request('http://localhost/api/issues', { method: 'GET' }),
        env
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // failure case: user not found
    test('returns 404 when user does not exist', async () => {
      mockD1Response(null, 'first');

      const res = await worker.fetch(
        new Request('http://localhost/api/issues?user_id=user-99999', { method: 'GET' }),
        env
      );
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // GET BY ID
  describe('GET /api/issues/:id', () => {
    //success case for GET BY ID
    test('returns issue with full schema fields', async () => {
      mockD1Response({
        id: '2',
        title: 'Another Issue',
        issue_status: 'open',
        issue_priority: 'low',
        assigned_to_user: 0,
        assigned_to_agent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },'first');

      const response = await worker.fetch(new Request('http://localhost/api/issues/2', { method: 'GET' }), env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(data.success).toBe(true);
      expect(data.issue.id).toBe('2');
    });

    //failure case for GET BY ID
    test('returns 404 when issue does not exist', async () => {
      mockD1Response(null);

      const response = await worker.fetch(new Request('http://localhost/api/issues/999', { method: 'GET' }), env);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // test GET /api/issues/:id/history
  describe('GET /api/issues/:id/history', () => {
    // success case
    test('returns history records for an existing issue', async () => {
      mockD1Sequence([
        {
          response: { id: '1', issue_status: 'open' },
          method: 'first'
        },
        {
          response: {
            results: [
              { id: 'abc', issue_id: '1', issue_status: 'in_progress', changed_at: new Date().toISOString(), changed_by_user: null, changed_by_agent: 'agent-1' },
              { id: 'xyz', issue_id: '1', issue_status: 'open',        changed_at: new Date().toISOString(), changed_by_user: null, changed_by_agent: null }
            ]
          },
          method: 'all'
        }
      ]);

      const response = await worker.fetch(
        new Request('http://localhost/api/issues/1/history', { method: 'GET' }),
        env
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.issue_id).toBe('1');
      expect(data.history).toHaveLength(2);
      expect(data.history[0].issue_status).toBe('in_progress'); // most recent first
    });


    // empty (no) history case
    test('returns empty history array when issue has no history', async () => {
      mockD1Sequence([
        { response: { id: '1', issue_status: 'open' }, method: 'first' },
        { response: { results: [] },                   method: 'all'   }
      ]);

      const response = await worker.fetch(
        new Request('http://localhost/api/issues/1/history', { method: 'GET' }),
        env
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toHaveLength(0);
    });

    // failure case (issue not found)
    test('issue does not exist, return 404', async () => {
      mockD1Response(null, 'first');

      const response = await worker.fetch(
        new Request('http://localhost/api/issues/999/history', { method: 'GET' }),
        env
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });


  // Tests for POST

  // Test for POST /api/issues
  describe('POST /api/issues', () => {
    // success case for POST /api/issues
    test('creates a new issue and returns it', async () => {
      // insertIssue assigns display_no via INSERT...RETURNING, read with .first()
      mockD1Response({ display_no: 1 }, 'first');
      const request = new Request('http://localhost/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'client-supplied-id',
          title: 'POST Try Issue',
          issue_status: 'open',
          issue_priority: 'high',
          retry_count: 0,
          claim_timeout_minutes: 30,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(data.success).toBe(true);
      // The server assigns the id (a UUID) and ignores any client-supplied id.
      expect(data.issue).toHaveProperty('id');
      expect(typeof data.issue.id).toBe('string');
      expect(data.issue.id.length).toBeGreaterThan(0);
      expect(data.issue.id).not.toBe('client-supplied-id');
      // The server assigns a persistent, sequential display_no.
      expect(data.issue.display_no).toBe(1);
      expect(data.issue).toHaveProperty('title');
      expect(data.issue.title).toBe('POST Try Issue');
      expect(data.issue).toHaveProperty('issue_status');
      expect(data.issue.issue_status).toBe('open');
      expect(data.issue).toHaveProperty('issue_priority');
      expect(data.issue.issue_priority).toBe('high');
      expect(data.issue).toHaveProperty('retry_count');
      expect(data.issue.retry_count).toBe(0);
      expect(data.issue).toHaveProperty('claim_timeout_minutes');
      expect(data.issue.claim_timeout_minutes).toBe(30);

    });

    // failure case for POST /api/issues
    test('returns 400 for invalid request body', async () => {
      
      const request = new Request('http://localhost/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Invalid Issue'
        }),
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  // test PUT /api/issues/:id/claim (claimIssue)
  describe('PUT /api/issues/:id/claim', () => {
    // success case for PUT /api/issues/:id/claim (claimIssue)
    test('claims an issue successfully', async () => {
      mockD1Sequence([
        { response: { id: '5', title: 'Claimable Issue', issue_status: 'open', 
          issue_priority: 'medium', retry_count: 0, claim_timeout_minutes: 30, 
          assigned_to_user: 0, assigned_to_agent: 0, created_at: new Date().toISOString(),
          updated_at: new Date().toISOString() }, method: 'first' }, // selectIssueById (first call)
        { response: { meta: { changes: 1 } }, method: 'run' },      // ensureAgentRow
        { response: { meta: { changes: 1 } }, method: 'run' },      // claimIssueRow
        { response: { id: '5', title: 'Claimable Issue', issue_status: 'in_progress',
          issue_priority: 'medium', retry_count: 0, claim_timeout_minutes: 30,
          assigned_to_user: 0, assigned_to_agent: 1, created_at: new Date().toISOString(),
          updated_at: new Date().toISOString() }, method: 'first' } // selectIssueById (re-fetch)
      ]);


      const request = new Request('http://localhost/api/issues/5/claim', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: 'agent-123'
        })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.issue).toHaveProperty('id', '5');
      expect(data.issue.title).toBe('Claimable Issue');

      expect(data.issue.issue_status).toBe('in_progress');
      expect(data.issue.assigned_to_agent).toBe(1);
    });

    // failure case 1 for claimIssue (issue not claimable)
    test('returns 400 when issue is not open/claimable', async () => {
      mockD1Response(
        { 
          id: '5', 
          issue_status: 'in_progress' 
        },'first');
      const request = new Request('http://localhost/api/issues/5/claim', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: 'agent-123' })
      });
      
      const response = await worker.fetch(request, env);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('in_progress');
    });

    // failure case: agents cannot claim a human-only issue (assigned_to_user = 1)
    test('returns 400 when an agent tries to claim a human-only issue', async () => {
      mockD1Response(
        { id: '6', issue_status: 'open', assigned_to_user: 1, assigned_to_agent: 0, claim_expires_at: null },
        'first'
      );
      const request = new Request('http://localhost/api/issues/6/claim', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: 'agent-123' })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('human');
    });

    // failure case 2 (issue not found)
    test('Issue not found or does not exist, return a 404 error', async () => {
      mockD1Response(null, 'first');
      const request = new Request('http://localhost/api/issues/101/claim', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ agent_id: 'agent-123'})
      });
      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(404); 
      expect(data.success).toBe(false);
    });
  });

  // Test PUT /api/issues/:id (updateIssue)
  describe('PUT /api/issues/:id', () => {

    // success case: uses mockD1Sequence since there are 3 DB calls
    test('updates allowed fields and returns the updated issue', async () => {
      const existing = {
        id: '1', title: 'Old Title', issue_status: 'open', issue_priority: 'low',
        assigned_to_user: 0, assigned_to_agent: 0,
        retry_count: 0, claim_timeout_minutes: 30,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      };
      const updated = { ...existing, title: 'New Title', issue_priority: 'high' };

      mockD1Sequence([
        { response: existing,                    method: 'first' }, // selectIssueById
        { response: { meta: { changes: 1 } },    method: 'run'   }, // updateIssueFields
        { response: updated,                     method: 'first' }  // selectIssueById re-fetch
      ]);

      const request = new Request('http://localhost/api/issues/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Title', issue_priority: 'high' })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.issue.title).toBe('New Title');
      expect(data.issue.issue_priority).toBe('high');
    });


    // failure case 1: issue not found, exits after first DB call
    test('returns 404 when issue does not exist', async () => {
      mockD1Response(null, 'first');

      const request = new Request('http://localhost/api/issues/999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Title' })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });


    // failure case 2: no updatable fields, exits after first DB call
    test('returns 400 when body contains no updatable fields', async () => {
      mockD1Response(
        { id: '1', issue_status: 'open', assigned_to_user: 0, assigned_to_agent: 0 },
        'first'
      );

      const request = new Request('http://localhost/api/issues/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '1', created_at: '2024-01-01' }) // immutable fields only
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('No updatable fields');
    });


    // failure case 3: invalid issue_status, exits after first DB call
    test('returns 400 for an invalid issue_status value', async () => {
      mockD1Response(
        { id: '1', issue_status: 'open', assigned_to_user: 0, assigned_to_agent: 0 },
        'first'
      );

      const request = new Request('http://localhost/api/issues/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_status: 'pending' })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid issue_status');
    });


    // failure case 4: assignment mutex, user already assigned, but incoming 
    // agent to be assigned to the same issue, cannot assign to both at once so
    // exit with error 400
    test('returns 400 when update would assign both a user and an agent', async () => {
      mockD1Response(
        { id: '1', issue_status: 'open', assigned_to_user: 1, assigned_to_agent: 0 },
        'first'
      );

      const request = new Request('http://localhost/api/issues/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_agent: 1 }) // conflicts with existing user
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('cannot be assigned to both');
    });
  });


  // Test DELETE /api/issues/:id (deleteIssue)
  describe('DELETE /api/issues/:id', () => {
    // success case
    test('issue successfully deleted', async () => {
      mockD1Response({meta: {changes: 1}}, 'run');

      const request = new Request('http://localhost/api/issues/10', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
      });
      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Issue deleted successfully');
    });

    // failure case
    test('issue to be deleted does not exist, returns 404', async () => {
      mockD1Response({meta: {changes: 0}}, 'run');

      const request = new Request('http://localhost/api/issues/999', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
      });
      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // Test PUT /api/issues/:id/close (closeIssue)
  describe('PUT /api/issues/:id/close', () => {
    // success case
    test('issue successfully closed', async() => {
      mockD1Response({meta: {changes: 1}}, 'run');

      const request = new Request('http://localhost/api/issues/2/close', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
      });
      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    // failure case (issue does not exist)
    test('unable to successfully close issue, issue does not exist', async() => {
      mockD1Response({meta: {changes: 0}}, 'run');

      const request = new Request('http://localhost/api/issues/50/close', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
      });
      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // Test PUT /api/issues/:id/result_text (putResult)
  describe('PUT /api/issues/:id/result_text', () => {
    // success case (involves multiple DB calls so we use mockD1Sequence)
    // we first suppose that the DB has an in_progress issue
    test('sucessful', async() => {
      mockD1Sequence([
        {response: {id: '80', issue_status: 'in_progress',}, method: 'first'}, // selectIssueById 
        {response: {meta: {changes: 1}}, method: 'run'} // updateIssueStatus
      ]);

      const request = new Request('http://localhost/api/issues/80/result_text', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({new_status: 'review'})
      });
      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });


    // failure case 1: (invalid new_status)
    test('invalid new_status, returns 400', async() => {
      const request = new Request('http://localhost/api/issues/80/result_text', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({new_status: 'closed'})
      });
      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // failure case 2: (issue not found, i.e. does not exist)
    test('issue does not exist, return 404', async () => {
      mockD1Response(null, 'first');

      const request = new Request('http://localhost/api/issues/999/result_text', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: 'review' })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    // failure case 3: (issue not currently in_progress)
    test('fails prereq: issue is not already in_progress, return 400', async () => {
      mockD1Response({ id: '80', issue_status: 'open' }, 'first');

      const request = new Request('http://localhost/api/issues/80/result_text', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: 'review' })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('in progress');
    });

  });

  // Test PUT /api/issues/:id/block (blockIssue)
  describe('PUT /api/issues/:id/block', () => {
    // success case:
    test('issue blocked successfully', async () => {
      mockD1Sequence([
        { response: { id: '1', issue_status: 'open' },    method: 'first' }, // selectIssueById
        { response: { meta: { changes: 1 } },              method: 'run'   }, // updateIssueStatus
        { response: { id: '1', issue_status: 'blocked' }, method: 'first' }  // selectIssueById re-fetch
      ]);

      const request = new Request('http://localhost/api/issues/1/block', {
        method: 'PUT'
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.issue.issue_status).toBe('blocked');
    });

    // Note: for failure cases, we exit after the first DB call 
    // no need to use mockD1Sequence, can just use mockD1Response

    // failure case 1: issue not found
    test('issue does not exist, return 404', async () => {
      mockD1Response(null, 'first');

      const response = await worker.fetch(
        new Request('http://localhost/api/issues/999/block', { method: 'PUT' }),
        env
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    // failure case 2: issue is already blocked, cannot block again
    test('returns 400 when issue is already blocked', async () => {
      mockD1Response({ id: '1', issue_status: 'blocked' }, 'first');

      const response = await worker.fetch(
        new Request('http://localhost/api/issues/1/block', { method: 'PUT' }),
        env
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already blocked');
    });

    // failure case 3: cannot block an issue that was already closed
    test('returns 400 when issue is already closed', async () => {
      mockD1Response({ id: '1', issue_status: 'closed' }, 'first');

      const response = await worker.fetch(
        new Request('http://localhost/api/issues/1/block', { method: 'PUT' }),
        env
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already closed');
    });
  });

  // Test PUT /api/users/:id (updateUser)
  describe('PUT /api/users/:id', () => {
    // success case: involves 2 DB calls (selectUserById, then updateUsername)
    test('updates the username and returns the new profile', async () => {
      mockD1Sequence([
        { response: { id: 'user-00001', username: 'old-name', email: 'steven@ucsd.edu' }, method: 'first' }, // selectUserById
        { response: { meta: { changes: 1 } }, method: 'run' } // updateUsername
      ]);

      const request = new Request('http://localhost/api/users/user-00001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'new-name' })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(data.success).toBe(true);
      expect(data.profile.id).toBe('user-00001');
      expect(data.profile.name).toBe('new-name');
      // email is immutable here and echoed back from the existing row
      expect(data.profile.email).toBe('steven@ucsd.edu');
    });

    // failure case 1: missing name
    test('returns 400 when name is missing', async () => {
      const request = new Request('http://localhost/api/users/user-00001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // failure case 2: blank name (only whitespace)
    test('returns 400 when name is only whitespace', async () => {
      const request = new Request('http://localhost/api/users/user-00001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '   ' })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('empty');
    });

    // failure case 3: user does not exist
    test('returns 404 when the user does not exist', async () => {
      mockD1Response(null, 'first'); // selectUserById finds nothing

      const request = new Request('http://localhost/api/users/user-99999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ghost' })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });
});
