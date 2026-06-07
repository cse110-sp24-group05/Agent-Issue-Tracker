/**
 *
 * Created and debuged with Claude AI assistance — human reviewed and tested
 *
 *
 * AIT Runner (src/runner/claude-runner.js)
 *
 * The real agent runner that connects Claude to AIT.
 * Unlike the simulator (which fakes work), this sends issues to Claude
 * and posts real results back to AIT.
 *
 * AIT is a tracker — it never executes code or accesses repositories.
 * The runner sends the issue description to Claude as a prompt using
 * the user's own API key, then posts the status back. The user takes
 * Claude's response and applies it to their code locally.
 *
 * Claude settings (model, prompt, temperature) are in claude-config.js.
 *
 * Usage:
 *   npm run ait-runner                                          # real Claude call, stops at review. For final demo
 *   npm run ait-runner -- --mock                                # fake result, stops at review. not using API key
 *   npm run ait-runner -- --url http://localhost:8787           # use local dev server + Claude API
 *   npm run ait-runner -- --mock --url http://localhost:8787    # No Claude API call + local dev server
 *   npm run ait-runner -- --auto-close                          # auto-close after review (testing only)
 */

import config from './claude-config.js';


// parse command line flags
const args = process.argv.slice(2);
const urlFlagIndex = args.indexOf('--url');
const BASE_URL =
    urlFlagIndex !== -1 && args[urlFlagIndex + 1]
      ? args[urlFlagIndex + 1]
      : process.env.AIT_API_BASE || 'https://agent-issue-tracker.stc021.workers.dev';

// --mock flag: skip real Claude API call and use a fake result
const MOCK_MODE = args.includes('--mock');

// --auto-close flag: skip the human review step and auto-close after review
// default is to leave issue in 'review' for human approval (matches ADR 2: Human Approval Boundary)
const AUTO_CLOSE = args.includes('--auto-close');

// the agent identity — must exist in the agents table in D1
const AGENT_ID = 'agent-claude';

// read API key from environment variable (never stored in database)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// rate limit: minimum delay between API calls (milliseconds)
const MIN_DELAY_MS = 500;

// network timeout: how long to wait for any single API call before giving up
// prevents the runner from hanging forever if Claude or AIT is unresponsive
const REQUEST_TIMEOUT_MS = 30000;

// cost warning threshold: warn user if a single run exceeds this dollar amount
// helps catch runaway costs early
const COST_WARNING_THRESHOLD = 0.50;

// minimum description length for quality check (chars)
// 15 is a balance: catches "fix bug" but allows "Fix the login page"
const MIN_DESCRIPTION_LENGTH = 15;

// fake results for mock mode
const FAKE_RESULTS = [
  'Refactored the module into smaller functions. All tests pass.',
  'Fixed the bug by adding input validation. Added 3 unit tests.',
  'Updated documentation and added JSDoc comments to all exports.',
  'Implemented the feature as described. Ready for review.',
  'Resolved the issue by patching the edge case. No regressions found.',
];

// priority ranking for sorting (lower = more urgent)
const PRIORITY_RANK = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};




// helper functions
/**
 * Prints a timestamped log message
 * @param {string} label - Short tag like 'FETCH' or 'CLAUDE'
 * @param {string} message - What happened
 */
function log(label, message) {
  const time = new Date().toISOString().slice(11, 19);
  console.log(`[${time}] [${label}] ${message}`);
}

/**
 * Pauses execution for a given number of milliseconds
 * @param {number} ms - How long to wait
 * @returns {Promise} - Resolves when done
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns a random item from an array
 * @param {Array} arr - The array to pick from
 * @returns {*} - One random element
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Fetch with a hard timeout. Prevents hanging when Claude or AIT is slow.
 * Without this, a slow network could leave the runner stuck for minutes
 * with an issue stuck in 'in_progress' state.
 *
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options (method, headers, body)
 * @param {number} timeoutMs - How long to wait before giving up
 * @returns {Promise<Response>} - The fetch response
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (error) {
    // give a clearer error message when the abort fires
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Truncate text at the last natural break (newline) before maxChars.
 * Prevents cutting in the middle of a code block or sentence.
 *
 * @param {string} text - Text to truncate
 * @param {number} maxChars - Maximum length
 * @returns {string} - Truncated text
 */
function smartTruncate(text, maxChars) {
  if (text.length <= maxChars) {return text;}
  const slice = text.substring(0, maxChars);
  const lastNewline = slice.lastIndexOf('\n');
  // if there's a newline in the last 25% of the slice, cut there
  // otherwise just hard-cut and add ellipsis
  if (lastNewline > maxChars * 0.75) {
    return slice.substring(0, lastNewline) + '\n[...truncated]';
  }
  return slice + '...[truncated]';
}

/**
 * Check if a string indicates Claude couldn't solve the issue.
 * Stricter than just substring matching — looks for explicit refusal
 * phrases at the start of the response, where Claude typically signals
 * upfront that it can't help.
 *
 * @param {string} text - Claude's response
 * @returns {boolean} - true if Claude indicated it can't solve
 */
function isClaudeBlocked(text) {
  if (!text || text.trim().length === 0) {
    return true; // empty response is treated as blocked
  }

  // explicit refusal phrases — Claude usually states these upfront
  const explicitRefusals = [
    'i cannot solve',
    'i can\'t solve',
    'i am unable to',
    'i\'m unable to',
    'unable to provide',
    'not enough information',
    'insufficient information',
    'insufficient detail',
    'missing information',
    'cannot determine',
    'need more context',
    'need more information',
    'requires more detail',
  ];

  // only check the first 300 chars — Claude states upfront if it can't help
  // (avoids false positives from successful responses that mention these phrases mid-solution)
  const opening = text.substring(0, 300).toLowerCase();

  return explicitRefusals.some((phrase) => opening.includes(phrase));
}




// Claude API call
/**
 * Sends an issue to Claude and gets a response.
 * Uses settings from claude-config.js (model, temperature, prompt).
 * Uses the user's own API key — AIT never stores it.
 *
 * @param {string} title - The issue title
 * @param {string} description - The issue description
 * @param {string|null} projectContext - Summary of other issues
 * @returns {Promise<object>} - { result, inputTokens, outputTokens, totalTokens, estimatedCost }
 * @throws {Error} - if the API call fails or response is malformed
 */
async function askClaude(title, description, projectContext) {
  // build the prompt using the config template
  const prompt = config.buildPrompt(title, description, projectContext);

  log('CLAUDE', 'Sending issue to Claude API...');
  log('CLAUDE', `Model: ${config.model} | Max tokens: ${config.maxTokens} | Temp: ${config.temperature}`);

  // wrap in fetchWithTimeout so a hung connection doesn't lock the runner forever
  const response = await fetchWithTimeout(
    config.apiUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': config.apiVersion,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    },
    REQUEST_TIMEOUT_MS
  );

  // handle non-2xx responses with specific error messages
  // each common status code gets a tailored hint so the user knows what to fix
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // response body wasn't JSON — use the status text
      errorMessage = response.statusText || errorMessage;
    }

    // build a user-friendly error with hints
    const hints = {
      401: 'Invalid API key. Check ANTHROPIC_API_KEY in your .env file.',
      403: 'API key does not have permission. Check your Anthropic account.',
      429: 'Rate limit exceeded. Wait a minute and try again.',
      500: 'Claude API server error. Try again in a moment.',
      503: 'Claude API is temporarily unavailable. Try again later.',
      529: 'Claude API is overloaded. Try again in a few minutes.',
    };
    const hint = hints[response.status] || '';
    throw new Error(`Claude API error (${response.status}): ${errorMessage}${hint ? ' — ' + hint : ''}`);
  }

  // parse response — wrap in try/catch in case the response isn't valid JSON
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Claude API returned invalid JSON');
  }

  // validate response structure before trying to use it
  // protects against API changes or malformed responses
  if (!data.content || !Array.isArray(data.content)) {
    throw new Error('Claude API response has no content array');
  }

  // extract the response text from text blocks only
  const result = data.content
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');

  // catch case where there were content blocks but none were text
  if (!result || result.trim().length === 0) {
    throw new Error('Claude returned an empty response (no text content)');
  }

  // extract token usage — usage object might be missing on some error responses
  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = config.estimateCost(inputTokens, outputTokens);

  // check if Claude hit the max_tokens limit — response would be truncated
  // worth warning the user since the answer may be incomplete
  const stopReason = data.stop_reason;
  if (stopReason === 'max_tokens') {
    log('WARN', `Claude response was truncated at max_tokens (${config.maxTokens}). Consider increasing maxTokens in claude-config.js.`);
  }

  return { result, inputTokens, outputTokens, totalTokens, estimatedCost };
}




// AIT API HELPERS
/**
 * Mark an issue as blocked. Uses the dedicated block endpoint.
 * Wraps the API call so errors don't crash the workflow.
 *
 * @param {string} issueId - Issue to block
 * @returns {Promise<boolean>} - true on success, false on failure
 */
async function blockIssue(issueId) {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/issues/${issueId}/block`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      log('ERROR', `Block failed: ${data.error || response.statusText}`);
      return false;
    }
    return true;
  } catch (error) {
    log('ERROR', `Block request failed: ${error.message}`);
    return false;
  }
}

/**
 * Save Claude's response (or block reason) to the issue's agent_response column.
 * Keeps the user's original issue_description untouched.
 *
 * @param {string} issueId - Issue to update
 * @param {string} response - The agent's response text
 * @returns {Promise<boolean>} - true on success, false on failure
 */
async function saveAgentResponse(issueId, response) {
  try {
    const apiResponse = await fetchWithTimeout(`${BASE_URL}/api/issues/${issueId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_response: response }),
    });
    if (!apiResponse.ok) {
      log('WARN', 'Could not save agent response.');
      return false;
    }
    return true;
  } catch (error) {
    log('WARN', `Could not save agent response: ${error.message}`);
    return false;
  }
}




// main run flow
/**
 * Runs the full agent cycle: fetch -> pick -> claim -> Claude -> result -> close
 */
async function runRunner() {
  // print header
  console.log('===========================================');
  console.log('  AIT Runner');
  console.log(`  API: ${BASE_URL}`);
  console.log(`  Agent: ${AGENT_ID}`);
  console.log(`  Mode: ${MOCK_MODE ? 'MOCK (no Claude API call)' : 'LIVE (calling Claude API)'}`);
  if (!MOCK_MODE) {
    console.log(`  Model: ${config.model}`);
  }
  if (AUTO_CLOSE) {
    console.log('Close: ENABLED (will auto-close after review, for testing only)');
  } else {
    console.log('Close: DISABLED (issue stays in review for human approval)');
  }
  console.log('===========================================\n');

  // warn if pointing at production
  if (BASE_URL.includes('workers.dev')) {
    console.log('WARNING: Running against production API.\n');
  }

  // if live mode, make sure the API key is set
  if (!MOCK_MODE && !ANTHROPIC_API_KEY) {
    log('ERROR', 'ANTHROPIC_API_KEY is not set.');
    log('HINT', 'Option 1: Add ANTHROPIC_API_KEY=sk-ant-... to your .env file');
    log('HINT', 'Option 2: Run with --mock flag to skip Claude');
    return;
  }


  // STEP 1: Fetch all issues
  log('FETCH', 'Getting issues from API...');

  let allIssues;
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/issues`);

    if (!response.ok) {
      log('ERROR', `API returned status ${response.status}`);
      return;
    }

    const data = await response.json();
    allIssues = Array.isArray(data) ? data : data.issues;

    // defensive check — make sure we got an array
    if (!Array.isArray(allIssues)) {
      log('ERROR', 'API did not return an array of issues.');
      return;
    }
  } catch (error) {
    log('ERROR', `Could not reach API: ${error.message}`);
    log('HINT', 'Is the worker running? Try: npx wrangler dev --remote');
    return;
  }

  // filter to only open issues assigned to an agent (assigned_to_agent is a
  // boolean now); an agent is able to claim an issue if it's not assigned to a user
  const openIssues = allIssues.filter(
    (i) => i.issue_status === 'open' && i.assigned_to_user === 0
  );

  if (openIssues.length === 0) {
    log('DONE', `No open issues assigned to ${AGENT_ID}. Nothing to do.`);
    log('HINT', 'Assign an open issue to this agent through the UI to give it work.');
    return;
  }

  log('FETCH', `Found ${openIssues.length} issue(s) assigned to ${AGENT_ID} out of ${allIssues.length} total`);


  // STEP 2: Pick highest priority issue
  // tiebreaker: when priorities are equal, pick the oldest (FIFO fairness)
  openIssues.sort((a, b) => {
    const priorityDiff = (PRIORITY_RANK[a.issue_priority] ?? 99) - (PRIORITY_RANK[b.issue_priority] ?? 99);
    if (priorityDiff !== 0) {return priorityDiff;}
    // same priority — older issue wins
    return (a.created_at || '').localeCompare(b.created_at || '');
  });

  const target = openIssues[0];
  log('PICK', `Selected: "${target.title}" (${target.id}) — priority: ${target.issue_priority}`);

  await sleep(MIN_DELAY_MS);


  // STEP 3: Claim the issue
  log('CLAIM', `Claiming ${target.id} as ${AGENT_ID}...`);

  try {
    const claimResponse = await fetchWithTimeout(`${BASE_URL}/api/issues/${target.id}/claim`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: AGENT_ID }),
    });

    const claimData = await claimResponse.json().catch(() => ({}));

    if (!claimResponse.ok) {
      log('ERROR', `Claim failed: ${claimData.error || claimResponse.statusText}`);
      if (claimResponse.status === 404) {
        log('HINT', 'Issue not found or claim route not deployed yet.');
      }
      if (claimResponse.status === 400) {
        log('HINT', `Bad request: ${claimData.error || 'Issue may not be in open status anymore.'}`);
      }
      return;
    }

    log('CLAIM', `Claimed! ${claimData.message || 'Issue claimed.'}`);
  } catch (error) {
    log('ERROR', `Claim request failed: ${error.message}`);
    return;
  }

  // From this point on, the issue is in 'in_progress' state.
  // Any failure must either complete the workflow (review/blocked) or
  // leave the issue blocked. We never leave it stuck in_progress on purpose.
  await sleep(MIN_DELAY_MS);


  // STEP 3.5: Check if the description is clear enough to work on (free, no API call)
  const desc = target.issue_description || '';

  // edge case: skip if this issue already has an agent_response from a previous run
  // re-running would overwrite the previous result and waste tokens
  if (target.agent_response && target.agent_response.trim().length > 0) {
    log('QUALITY', 'Issue already has an agent response from a previous run. Skipping to avoid duplicate work.');
    log('HINT', 'A human should review the existing response and either close or unblock the issue.');
    return;
  }

  let blockReason = null;
  const trimmedDesc = desc.trim();

  if (trimmedDesc.length === 0) {
    blockReason = 'Issue has no description. Please add details about what needs to be done.';
  } else if (trimmedDesc.length < MIN_DESCRIPTION_LENGTH) {
    blockReason = `Description is too short (${trimmedDesc.length} chars, need at least ${MIN_DESCRIPTION_LENGTH}). Please provide more detail.`;
  } else if (trimmedDesc === target.title) {
    blockReason = 'Description is identical to the title. Please add more context.';
  }

  if (blockReason) {
    log('QUALITY', `Issue failed quality check: ${blockReason}`);

    await saveAgentResponse(target.id, blockReason);
    await blockIssue(target.id);
    log('BLOCK', 'Issue blocked due to quality check. User should create a new issue with a better description.');
    return;
  }


  // STEP 4: Do the work (Claude or mock)
  let result;
  let totalTokens;
  let estimatedCost = 0;

  if (MOCK_MODE) {
    // mock mode: fake the work
    log('WORK', 'MOCK MODE — skipping Claude API call...');
    await sleep(2000);
    result = pickRandom(FAKE_RESULTS);
    totalTokens = Math.floor(Math.random() * 5000) + 500;
  } else {
    // live mode: send the issue to Claude with project context
    try {
      // build project context from other issues
      const contextSummary = allIssues
        .filter((i) => i.id !== target.id)
        .slice(0, 10)
        .map((i) => `- [${i.issue_status}] ${i.title} (${i.issue_priority})`)
        .join('\n');

      const claudeResponse = await askClaude(
        target.title,
        target.issue_description || '',
        contextSummary || null
      );

      result = claudeResponse.result;
      totalTokens = claudeResponse.totalTokens;
      estimatedCost = claudeResponse.estimatedCost;

      log('CLAUDE', `Input: ${claudeResponse.inputTokens} tokens | Output: ${claudeResponse.outputTokens} tokens`);
      log('CLAUDE', `Total: ${totalTokens} tokens | Cost: ~$${estimatedCost.toFixed(4)}`);

      // warn on expensive runs so the user notices runaway costs
      if (estimatedCost > COST_WARNING_THRESHOLD) {
        log('WARN', `This run cost $${estimatedCost.toFixed(4)} — higher than the $${COST_WARNING_THRESHOLD} threshold.`);
      }
    } catch (error) {
      // if Claude fails (timeout, bad key, rate limit, malformed response, etc.) don't leave it stuck in_progress
      log('ERROR', `Claude API failed: ${error.message}`);

      log('BLOCK', `Marking ${target.id} as blocked due to agent failure...`);

      await saveAgentResponse(target.id, `Agent failed: ${error.message}`);
      await blockIssue(target.id);
      log('BLOCK', 'Issue marked as blocked. A human needs to investigate.');
      return;
    }
  }

  // detect if Claude indicated it couldn't solve the issue
  // (only runs in live mode — mock results are always treated as solutions)
  const isBlocked = !MOCK_MODE && isClaudeBlocked(result);

  // show a preview of Claude's response
  const preview = result.length > 500 ? result.substring(0, 500) + '...[see UI for full response]' : result;
  log('WORK', `Result preview:\n${preview}`);

  await sleep(MIN_DELAY_MS);


  // STEP 5: Save token usage to the issue
  // this lets the frontend dashboard show how many tokens each issue used
  log('TOKENS', `Saving token usage (${totalTokens}) to ${target.id}...`);

  try {
    const tokenResponse = await fetchWithTimeout(`${BASE_URL}/api/issues/${target.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens_used: totalTokens }),
    });
    if (tokenResponse.ok) {
      log('TOKENS', 'Token usage saved.');
    } else {
      // graceful degradation: column may not exist yet in some environments
      log('WARN', 'Could not save token usage — tokens_used column may not exist yet.');
    }
  } catch (error) {
    log('WARN', `Could not save token usage: ${error.message}`);
  }

  await sleep(MIN_DELAY_MS);


  // STEP 6: Post the result status
  if (isBlocked) {
    // Claude couldn't solve it — save reason and block
    log('BLOCK', `Claude couldn't solve this issue. Blocking ${target.id}...`);

    await saveAgentResponse(target.id, result);

    const blocked = await blockIssue(target.id);
    if (blocked) {
      log('BLOCK', 'Issue blocked with response saved. A human needs to review.');
    }
  } else {
    // Claude solved it — save response and send to review
    log('RESULT', `Posting result for ${target.id}...`);

    await saveAgentResponse(target.id, result);

    try {
      const resultResponse = await fetchWithTimeout(`${BASE_URL}/api/issues/${target.id}/result_text`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: 'review' }),
      });
      const resultData = await resultResponse.json().catch(() => ({}));
      if (!resultResponse.ok) {
        log('ERROR', `Result failed: ${resultData.error || resultResponse.statusText}`);
        // even if result post fails, the description was saved — log and exit cleanly
        return;
      }
      log('RESULT', `${resultData.message || 'Result posted.'} — issue is now in review.`);
    } catch (error) {
      log('ERROR', `Result request failed: ${error.message}`);
      return;
    }
  }


  // STEP 7: Close the issue (only if it went to review AND --auto-close was passed)
  // in a real workflow a human would review first, so this step is optional
  if (!isBlocked && AUTO_CLOSE) {
    await sleep(MIN_DELAY_MS);
    log('CLOSE', `Closing ${target.id}...`);

    try {
      const closeResponse = await fetchWithTimeout(`${BASE_URL}/api/issues/${target.id}/close`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      const closeData = await closeResponse.json().catch(() => ({}));
      if (!closeResponse.ok) {
        log('ERROR', `Close failed: ${closeData.error || closeResponse.statusText}`);
        return;
      }
      log('CLOSE', `${closeData.message || 'Issue closed.'}`);
    } catch (error) {
      log('ERROR', `Close request failed: ${error.message}`);
      return;
    }
  } else if (!AUTO_CLOSE && !isBlocked) {
    log('REVIEW', 'Issue is in review. A human needs to approve and close it.');
  }


  console.log('\n===========================================');
  log('DONE', `Runner complete! Mode: ${MOCK_MODE ? 'MOCK' : 'LIVE'}`);
  if (!MOCK_MODE) {
    log('COST', `Total tokens: ${totalTokens} | Estimated cost: ~$${estimatedCost.toFixed(4)}`);
  }
  console.log('===========================================');
}


// only auto-run when called as a CLI script, not when imported for tests
const isMainModule = import.meta.url.endsWith(process.argv[1])
  || import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  runRunner().catch((error) => {
    log('FATAL', `Unhandled error: ${error.message}`);
    log('FATAL', 'The issue may be stuck in_progress. Check the database and reset manually if needed.');
    process.exit(1);
  });
}

// export functions so tests can import them
export { runRunner, isClaudeBlocked, smartTruncate };
