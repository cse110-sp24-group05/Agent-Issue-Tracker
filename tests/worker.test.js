//test worker.js

import { jest } from '@jest/globals';
import worker from '../src/js/worker.js';

// Mock the environment variables
const env = {
  issues_db: {
    prepare: jest.fn()
  }
};

/**
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

// Tests for the Issues API
describe('Issues API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Tests for GET 

  // GET ALL ISSUES
  describe('GET /api/issues', () => {
    test('returns all issues (schema-valid shape)', async () => {
      mockD1Response(
        {
          results: [
            {
              id: '1',
              title: 'Test Issue',
              issue_status: 'open',
              issue_priority: 'high',
              retry_count: 0,
              claim_timeout_minutes: 30
            },
            {
              id: '2',
              title: 'Fix Bug',
              issue_status: 'in_progress',
              issue_priority: 'low',
              retry_count: 1,
              claim_timeout_minutes: 30
            }
          ]
        },
        'all'
      );

      const res = await worker.fetch(new Request('http://localhost/api/issues', { method: 'GET' }), env);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.length).toBe(2);
      expect(data[0]).toHaveProperty('issue_status');
      expect(data[0]).toHaveProperty('issue_priority');
      expect(data[0].issue_status).toBe('open');
      expect(data[0].issue_priority).toBe('high');
      expect(data[1]).toHaveProperty('issue_status');
      expect(data[1]).toHaveProperty('issue_priority');
      expect(data[1].issue_status).toBe('in_progress');
      expect(data[1].issue_priority).toBe('low');
    });
  });

  // GET BY ID
  describe('GET /api/issues/:id', () => {
    test('returns issue with full schema fields', async () => {
      mockD1Response({
        id: '2',
        title: 'Another Issue',
        issue_status: 'open',
        issue_priority: 'low',
        assigned_to_user: null,
        assigned_to_agent: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const res = await worker.fetch(new Request('http://localhost/api/issues/2', { method: 'GET' }), env);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.issue.id).toBe('2');
    });

    test('returns 404 when issue does not exist', async () => {
      mockD1Response(null);

      const res = await worker.fetch(new Request('http://localhost/api/issues/999', { method: 'GET' }), env);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });
});
