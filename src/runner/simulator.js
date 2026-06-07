/**
 * 
 * Created and debuged with Claude AI assistance — human reviewed and tested
 * 
 * 
 * Agent Simulator
 * It pretends to be an AI agent to test the full AIT workflow without making real LLM API calls. It does this:
 *
 *  1. Fetches all open issues from the API
 *  2. Picks highest priority issue first
 *  3. Claims it
 *  4. Simulates doing work (waits few seconds)
 *  5. Posts a result back to the API
 *  6. Closes the issue (if it went to review)
 */


// figure out which API URL to use.
// default, the live Cloudflare Worker.
const args = process.argv.slice(2); // get command line arguments (skip "node" and filename)
const urlFlagIndex = args.indexOf('--url'); // look for --url flag
const BASE_URL =
  urlFlagIndex !== -1 && args[urlFlagIndex + 1]
    ? args[urlFlagIndex + 1]
    : process.env.AIT_API_BASE || 'https://agent-issue-tracker.stc021.workers.dev';


const AGENT_ID = 'agent-simulator';

// minimum seconds between API calls to avoid overloading the API
const MIN_DELAY_BETWEEN_CALLS_MS = 500;

// Warn if pointing at production
const isProduction = BASE_URL.includes('workers.dev');
if (isProduction) {
  console.log('WARNING: Running against production API.\n');
}

// 3 seconds (enough for testing) to pretend to work
const SIMULATED_WORK_TIME = 3000;

// a list of fake results the simulator randomly picks from.
// !!!!!In a real system, Claude would return actual work here!!!!!!
const FAKE_RESULTS = [
  'Refactored the module into smaller functions. All tests pass.',
  'Fixed the bug by adding input validation. Added 3 unit tests.',
  'Updated documentation and added JSDoc comments to all exports.',
  'Implemented the feature as described. Ready for review.',
  'Resolved the issue by patching the edge case. No regressions found.',
];

// maps out priority names to numbers so we can sort them.
const PRIORITY_RANK = {
  critical: 0, // most urgent
  high: 1,
  medium: 2,
  low: 3, // least
};


/**
 * Print a message with the current time and a label.
 * @param {string} label - Short tag like "FETCH" or "CLAIM"
 * @param {string} message - What happened
 */
function log(label, message) {
  const time = new Date().toISOString().slice(11, 19);
  console.log(`[${time}] [${label}] ${message}`);
}

/**
 * Pause the script for a given number of milliseconds.
 * @param {number} ms - How long to wait in milliseconds
 * @returns {Promise<void>} Resolves when the wait is over
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Return a random item from an array.
 * @param {Array} arr - The array to pick from
 * @returns {*} One random element
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}


/**
 * Runs the full agent cycle: fetch -> pick -> claim -> work -> result -> close
 */
async function runSimulator() {
  // Print a header so we know what's running
  console.log('===========================================');
  console.log('  AIT Agent Simulator');
  console.log(`  API: ${BASE_URL}`);
  console.log(`  Agent: ${AGENT_ID}`);
  console.log('===========================================\n');


  // STEP 1: Ask the API for all open issues: calls GET /api/issues
  log('FETCH', 'Getting open issues from API...');

  let issues;
  try {
    // make the HTTP request to our API
    const response = await fetch(`${BASE_URL}/api/issues?issue_status=open`);

    // if the server returned an error (like 500), stop here
    if (!response.ok) {
      log('ERROR', `API returned status ${response.status}`);
      return;
    }

    // parse the JSON response
    const data = await response.json();

    // returns a plain array like [issue1, issue2, ...]
    issues = Array.isArray(data) ? data : data.issues;


  } catch (error) {
    // if the API is completely unreachable (server down, wrong URL, etc.)
    log('ERROR', `Could not reach API: ${error.message}`);
    log('HINT', 'Is the worker running? Try: npx wrangler dev');
    return;
  }

  // Even though we asked for ?issue_status=open, the filter might not be implemented yet,so we filter again
  const openIssues = issues.filter((i) => i.issue_status === 'open');

  // if there are no open issues, there is nothing for the simulator to do
  if (openIssues.length === 0) {
    log('DONE', 'No open issues found. Nothing to do.');
    return;
  }

  log('FETCH', `Found ${openIssues.length} open issue(s)`);


  // STEP 2: Pick which issue to work on
  openIssues.sort(
    (a, b) =>
      (PRIORITY_RANK[a.issue_priority] ?? 99) - (PRIORITY_RANK[b.issue_priority] ?? 99)
  );

  // get the first highest priority after sorting
  const target = openIssues[0];
  log(
    'PICK',
    `Selected: "${target.title}" (${target.id}) — priority: ${target.issue_priority}`
  );

  // rate limit: wait before next API call
  await sleep(MIN_DELAY_BETWEEN_CALLS_MS);

  // STEP 3: Claim the issue
  // calls PUT /api/issues/:id/claim
  // the issue ID goes in the URL, not the request body
  log('CLAIM', `Claiming ${target.id} as ${AGENT_ID}...`);

  try {
    // send a PUT request with our agent ID
    const claimResponse = await fetch(`${BASE_URL}/api/issues/${target.id}/claim`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: AGENT_ID,
      }),
    });
    // parse the response
    const claimData = await claimResponse.json();

    // If the claim was rejected, figure out why and tell the user
    if (!claimResponse.ok) {
      log('ERROR', `Claim failed: ${claimData.error || claimResponse.statusText}`);

      // 404 means the route doesn't exist yet or issue not found
      if (claimResponse.status === 404) {
        log('HINT', 'Issue not found or /api/issues/:id/claim route not deployed yet.');
      }

      // 400 means the issue can't be claimed (not open, missing agent_id, etc.)
      if (claimResponse.status === 400) {
        log('HINT', `Bad request: ${claimData.error}`);
      }

      return;
    }

    // Claim succeeded
    log('CLAIM', `Claimed successfully! ${claimData.message}`);
  } catch (error) {
    log('ERROR', `Claim request failed: ${error.message}`);
    return;
  }

  // !!!!!!STEP 4: pretend to do work now, real agent would send the issue to Claude here!!!
  log('WORK', `Simulating work for ${SIMULATED_WORK_TIME / 1000} seconds...`);
  await sleep(SIMULATED_WORK_TIME);

  // pick a random fake result and a random token count
  const fakeResult = pickRandom(FAKE_RESULTS);
  const fakeTokens = Math.floor(Math.random() * 5000) + 500; // random number between 500-5500

  log('WORK', `Done! Result: "${fakeResult}"`);
  log('WORK', `Tokens used: ${fakeTokens}`);

  // rate limit: wait before next API call
  await sleep(MIN_DELAY_BETWEEN_CALLS_MS);

  // STEP 5: Post the result back to the API
  // calls PUT /api/issues/:id/result_text
  // sends { new_status } — the agent decides if work is done ("review") or stuck ("blocked")
  // we always send "review" since our fake work always "succeeds"
  log('RESULT', `Posting result for ${target.id}...`);

  try {
    // send a PUT request with the new status
    const resultResponse = await fetch(`${BASE_URL}/api/issues/${target.id}/result_text`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_status: 'review',
      }),
    });

    // parse the response
    const resultData = await resultResponse.json();

    // if it failed, shows the reason
    if (!resultResponse.ok) {
      log('ERROR', `Result failed: ${resultData.error || resultResponse.statusText}`);

      // 404 means the route doesn't exist yet or issue not found
      if (resultResponse.status === 404) {
        log('HINT', 'Issue not found or /api/issues/:id/result_text route not deployed yet.');
      }

      // 400 means the issue isn't in the right status
      if (resultResponse.status === 400) {
        log('HINT', `Bad request: ${resultData.error}`);
      }

      return;
    }

    // Success
    log('RESULT', `${resultData.message} — issue is now in review.`);


  } catch (error) {
    log('ERROR', `Result request failed: ${error.message}`);
    return;
  }

  // rate limit: wait before next API call
  await sleep(MIN_DELAY_BETWEEN_CALLS_MS);

  // STEP 6: Close the issue
  // calls PUT /api/issues/:id/close
  // in a real workflow, a human would review first, but for testing we close it right away
  log('CLOSE', `Closing ${target.id}...`);

  try {
    const closeResponse = await fetch(`${BASE_URL}/api/issues/${target.id}/close`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });

    const closeData = await closeResponse.json();

    if (!closeResponse.ok) {
      log('ERROR', `Close failed: ${closeData.error || closeResponse.statusText}`);
      return;
    }

    log('CLOSE', `${closeData.message}`);

  } catch (error) {
    log('ERROR', `Close request failed: ${error.message}`);
    return;
  }

  console.log('\n===========================================');
  log('DONE', 'Simulation complete!');
  console.log('===========================================');
}


// Start simulator
runSimulator();