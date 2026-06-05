// Some tests written with Claude AI assistance — human reviewed and tested


// Tests for the Claude runner — workflow orchestration and helper functions.
// These are unit tests that mock the fetch API and Claude responses, so they
// don't hit real APIs and don't cost any tokens.

import { jest } from '@jest/globals';

// set a fake API key BEFORE importing the runner
// otherwise the runner sees no key and refuses to call Claude
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-not-real';

// mock global fetch so no real network calls happen
const mockFetch = jest.fn();
global.fetch = mockFetch;

// silence console output during tests so the log isn't noisy
// comment these out if you want to see runner output while debugging tests
const originalLog = console.log;
beforeAll(() => { console.log = jest.fn(); });
afterAll(() => { console.log = originalLog; });

// import the runner functions after setting up mocks
const { runRunner, isClaudeBlocked, smartTruncate } = await import('../src/runner/claude-runner.js');


/**
 * Build a mock fetch response object that matches the shape Node's fetch returns.
 * @param {object | Array} data - The JSON body the response should return.
 * @param {number} status - HTTP status code (default 200).
 * @returns {Promise<object>} - A fake Response object.
 */
function mockResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  });
}

/**
 * Build a successful Claude API response with given text and token usage.
 * @param {string} text - The text Claude should "return".
 * @param {number} inputTokens - Mock input token count.
 * @param {number} outputTokens - Mock output token count.
 * @returns {Promise<object>} - A fake Claude API response.
 */
function mockClaudeResponse(text, inputTokens = 100, outputTokens = 200) {
  return mockResponse({
    content: [{ type: 'text', text }],
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    stop_reason: 'end_turn',
  });
}




// This function decides if Claude's response means "I can't solve this."
// False positives are expensive (wasted tokens on issues marked as blocked
// when Claude actually solved them) so the tests cover edge cases.

describe('isClaudeBlocked', () => {
  // empty / whitespace inputs should always be treated as blocked
  test('returns true for empty string', () => {
    expect(isClaudeBlocked('')).toBe(true);
  });

  test('returns true for whitespace-only string', () => {
    expect(isClaudeBlocked('   \n\t   ')).toBe(true);
  });

  test('returns true for null', () => {
    expect(isClaudeBlocked(null)).toBe(true);
  });

  // explicit refusal phrases at the start should be blocked
  test('returns true when Claude says "I cannot solve"', () => {
    expect(isClaudeBlocked('I cannot solve this issue because the description is unclear.')).toBe(true);
  });

  test('returns true when Claude says "I am unable to"', () => {
    expect(isClaudeBlocked('I am unable to provide a solution without more details.')).toBe(true);
  });

  test('returns true when Claude says "need more context"', () => {
    expect(isClaudeBlocked('To answer this, I need more context about your project.')).toBe(true);
  });

  test('returns true when Claude says "insufficient information"', () => {
    expect(isClaudeBlocked('There is insufficient information to determine the cause.')).toBe(true);
  });

  // successful solutions should NOT be flagged as blocked
  test('returns false for clear solution starting with "Here\'s how"', () => {
    expect(isClaudeBlocked('Here\'s how to add input validation: 1. Open login.js, 2. Add a check.')).toBe(false);
  });

  test('returns false for code solution', () => {
    const solution = 'function validateLogin(username, password) { if (!username) return "required"; }';
    expect(isClaudeBlocked(solution)).toBe(false);
  });

  // edge case: refusal phrase appears AFTER 300 chars in a long successful response
  // the function should only check the first 300 chars, so this should not be blocked
  test('returns false when refusal phrase appears late in a successful response', () => {
    const longSolution = 'Here is the complete solution. '.repeat(20) // ~600 chars of solution first
      + 'Note: if you need more context about edge cases, the docs explain them.';
    expect(isClaudeBlocked(longSolution)).toBe(false);
  });
});




// This function cuts long text without breaking in the middle of code blocks.

describe('smartTruncate', () => {
  test('returns text unchanged when shorter than max', () => {
    const text = 'Short text';
    expect(smartTruncate(text, 100)).toBe(text);
  });

  test('returns text unchanged when exactly at max length', () => {
    const text = 'a'.repeat(50);
    expect(smartTruncate(text, 50)).toBe(text);
  });

  test('truncates at last newline when close to max', () => {
    const text = 'Line 1\nLine 2\nLine 3\nThis last line should be cut.';
    const result = smartTruncate(text, 25);
    // should cut at the newline before "Line 3" or similar
    expect(result).toContain('[...truncated]');
    expect(result.length).toBeLessThanOrEqual(text.length);
  });

  test('hard-truncates when no good newline available', () => {
    const text = 'a'.repeat(200);
    const result = smartTruncate(text, 100);
    expect(result).toContain('[truncated]');
  });

  test('handles empty string', () => {
    expect(smartTruncate('', 100)).toBe('');
  });
});




// These tests mock fetch and verify the runner makes the right API calls
// in the right order. Each scenario sets up fetch to return specific responses
// then checks what calls were made.

describe('runRunner workflow', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // Scenario 1: No issues in the database at all
  // The runner should fetch issues, see none, and exit cleanly.
  test('exits cleanly when there are no issues', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]));

    await runRunner();

    // only one fetch call expected — the initial GET /api/issues
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('/api/issues');
  });

  // Scenario 2: Issues exist but none assigned to an agent
  // The runner should not claim anything because no work is for it.
  test('exits cleanly when issues exist but none assigned to claude', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([
      {
        id: 'issue-1',
        title: 'Some issue',
        issue_description: 'Description',
        issue_status: 'open',
        issue_priority: 'high',
        assigned_to_agent: 0, // not assigned to an agent
        assigned_to_user: 0,
      },
    ]));

    await runRunner();

    // only the initial fetch — no claim or any other call
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // Scenario 3: Issue assigned to claude but description is empty
  // The quality check should catch it before calling Claude.
  // Expected: save agent_response with reason, then block.
  test('blocks issue immediately when description is empty (no Claude call)', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse([
        {
          id: 'issue-empty',
          title: 'Vague issue',
          issue_description: '', // empty — fails quality check
          issue_status: 'open',
          issue_priority: 'medium',
          assigned_to_agent: 1,
          assigned_to_user: 0,
          agent_response: null,
        },
      ]))
      .mockResolvedValueOnce(mockResponse({ success: true, message: 'Issue claimed' })) // claim
      .mockResolvedValueOnce(mockResponse({ success: true })) // save agent_response
      .mockResolvedValueOnce(mockResponse({ success: true, message: 'Blocked' })); // block

    await runRunner();

    // verify the block endpoint was called (not the result endpoint)
    const urls = mockFetch.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => u.endsWith('/block'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/result'))).toBe(false);

    // verify Claude was NOT called (no claude.com URL in calls)
    expect(urls.some((u) => u.includes('anthropic.com'))).toBe(false);
  });

  // Scenario 4: Issue assigned to claude, description too short
  test('blocks issue when description is too short', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse([
        {
          id: 'issue-short',
          title: 'fix it',
          issue_description: 'fix bug', // too short — under 15 chars
          issue_status: 'open',
          issue_priority: 'medium',
          assigned_to_agent: 1,
          assigned_to_user: 0,
          agent_response: null,
        },
      ]))
      .mockResolvedValueOnce(mockResponse({ success: true })) // claim
      .mockResolvedValueOnce(mockResponse({ success: true })) // save reason
      .mockResolvedValueOnce(mockResponse({ success: true })); // block

    await runRunner();

    const urls = mockFetch.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => u.endsWith('/block'))).toBe(true);
    // Claude should NOT have been called — quality check rejected it first
    expect(urls.some((u) => u.includes('anthropic.com'))).toBe(false);
  });

  // Scenario 5: Issue already has an agent_response (was processed before)
  // The runner should skip it to avoid duplicate work and wasted tokens.
  test('skips issue that already has an agent_response', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse([
        {
          id: 'issue-done',
          title: 'Already processed',
          issue_description: 'A reasonable description that passes quality checks',
          issue_status: 'open',
          issue_priority: 'low',
          assigned_to_agent: 1,
          assigned_to_user: 0,
          agent_response: 'Claude already gave a solution here.', // existing response
        },
      ]))
      .mockResolvedValueOnce(mockResponse({ success: true })); // claim

    await runRunner();

    // Claude should not have been called for an already-processed issue
    const urls = mockFetch.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => u.includes('anthropic.com'))).toBe(false);
  });

  // Scenario 6: Claude API returns 401 (bad key)
  // Expected: issue gets blocked, error message saved.
  test('blocks issue when Claude API returns 401', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse([
        {
          id: 'issue-401',
          title: 'Add input validation',
          issue_description: 'The login form needs validation for username and password fields.',
          issue_status: 'open',
          issue_priority: 'medium',
          assigned_to_agent: 1,
          assigned_to_user: 0,
          agent_response: null,
        },
      ]))
      .mockResolvedValueOnce(mockResponse({ success: true })) // claim
      .mockResolvedValueOnce(mockResponse({ error: { message: 'Invalid API key' } }, 401)) // claude rejects
      .mockResolvedValueOnce(mockResponse({ success: true })) // save error
      .mockResolvedValueOnce(mockResponse({ success: true })); // block

    await runRunner();

    const urls = mockFetch.mock.calls.map((c) => c[0]);
    // the block endpoint should be hit
    expect(urls.some((u) => u.endsWith('/block'))).toBe(true);
    // result endpoint should NOT be hit (it's an API failure, not a Claude refusal)
    expect(urls.some((u) => u.endsWith('/result'))).toBe(false);
  });

  // Scenario 7: Claude returns a successful solution
  // Expected: agent_response saved, status set to review.
  test('completes successfully when Claude provides a solution', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse([
        {
          id: 'issue-success',
          title: 'Add input validation',
          issue_description: 'The login form needs validation for username and password.',
          issue_status: 'open',
          issue_priority: 'high',
          assigned_to_agent: 1,
          assigned_to_user: 0,
          agent_response: null,
        },
      ]))
      .mockResolvedValueOnce(mockResponse({ success: true })) // claim
      .mockResolvedValueOnce(mockClaudeResponse('Here\'s how to add validation: Step 1...')) // Claude
      .mockResolvedValueOnce(mockResponse({ success: true })) // save tokens
      .mockResolvedValueOnce(mockResponse({ success: true })) // save agent_response
      .mockResolvedValueOnce(mockResponse({ success: true, message: 'Result posted' })); // result -> review

    await runRunner();

    const urls = mockFetch.mock.calls.map((c) => c[0]);
    // result endpoint should be hit (Claude succeeded)
    expect(urls.some((u) => u.endsWith('/result'))).toBe(true);
    // block endpoint should NOT be hit
    expect(urls.some((u) => u.endsWith('/block'))).toBe(false);
  });

  // Scenario 8: Claude responds with a refusal ("I cannot solve...")
  // Expected: issue blocked, response saved as block reason.
  test('blocks issue when Claude says it cannot solve', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse([
        {
          id: 'issue-refused',
          title: 'Fix the bug',
          issue_description: 'There is a bug somewhere in the app, please fix it.',
          issue_status: 'open',
          issue_priority: 'medium',
          assigned_to_agent: 1,
          assigned_to_user: 0,
          agent_response: null,
        },
      ]))
      .mockResolvedValueOnce(mockResponse({ success: true })) // claim
      .mockResolvedValueOnce(mockClaudeResponse(
        'I cannot solve this issue because the description does not specify which bug or which file.'
      ))
      .mockResolvedValueOnce(mockResponse({ success: true })) // save tokens
      .mockResolvedValueOnce(mockResponse({ success: true })) // save agent_response
      .mockResolvedValueOnce(mockResponse({ success: true })); // block

    await runRunner();

    const urls = mockFetch.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => u.endsWith('/block'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/result'))).toBe(false);
  });

  // Scenario 9: Claude returns an empty response (rare but possible)
  // Expected: treated as failure, issue blocked.
  test('handles empty Claude response by blocking the issue', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse([
        {
          id: 'issue-empty-response',
          title: 'Add a feature',
          issue_description: 'A reasonable description for the feature request.',
          issue_status: 'open',
          issue_priority: 'low',
          assigned_to_agent: 1,
          assigned_to_user: 0,
          agent_response: null,
        },
      ]))
      .mockResolvedValueOnce(mockResponse({ success: true })) // claim
      .mockResolvedValueOnce(mockResponse({
        content: [], // empty content array — askClaude will throw
        usage: { input_tokens: 50, output_tokens: 0 },
      }))
      .mockResolvedValueOnce(mockResponse({ success: true })) // save error message
      .mockResolvedValueOnce(mockResponse({ success: true })); // block

    await runRunner();

    const urls = mockFetch.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => u.endsWith('/block'))).toBe(true);
  });

  // Scenario 10: Priority sorting — runner picks the highest priority issue
  test('picks the highest-priority issue when multiple are available', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse([
        {
          id: 'low-priority',
          title: 'Low priority',
          issue_description: 'A reasonable low-priority description.',
          issue_status: 'open',
          issue_priority: 'low',
          assigned_to_agent: 1,
          assigned_to_user: 0,
          agent_response: null,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'critical-priority',
          title: 'Critical priority',
          issue_description: 'A reasonable critical-priority description.',
          issue_status: 'open',
          issue_priority: 'critical',
          assigned_to_agent: 1,
          assigned_to_user: 0,
          agent_response: null,
          created_at: '2026-01-02T00:00:00Z',
        },
      ]))
      .mockResolvedValueOnce(mockResponse({ success: true })) // claim
      .mockResolvedValueOnce(mockClaudeResponse('Here is the solution.'))
      .mockResolvedValueOnce(mockResponse({ success: true })) // save tokens
      .mockResolvedValueOnce(mockResponse({ success: true })) // save response
      .mockResolvedValueOnce(mockResponse({ success: true })); // result

    await runRunner();

    // the claim URL should contain 'critical-priority' (not 'low-priority')
    const claimCall = mockFetch.mock.calls.find((c) => c[0].endsWith('/claim'));
    expect(claimCall).toBeDefined();
    expect(claimCall[0]).toContain('critical-priority');
  });
});
