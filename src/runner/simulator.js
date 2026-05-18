/**
 * Agent Simulator
 * It pretends to be an AI agent to test the full AIT workflow without making real LLM API calls. It does this:
 *
 *  1. Fetches all open issues from the API
 *  2. Picks highest priority issue first
 *  3. Claims it
 *  4. Simulates doing work (waits few seconds)
 *  5. Posts a fake result back to the API
 */


// figure out which API URL to use.
// default, the live Cloudflare Worker.
const args = process.argv.slice(2); // get command line arguments (skip "node" and filename)
const urlFlagIndex = args.indexOf('--url'); // look for --url flag
const BASE_URL =
  urlFlagIndex !== -1 && args[urlFlagIndex + 1]
    ? args[urlFlagIndex + 1]
    : 'https://agent-issue-tracker.stc021.workers.dev';
 
// this is who the simulator pretends to be.
// this ID must already exist in the "agents" table in our database.
const AGENT_ID = 'agent-simulator-01';
 
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
  low: 3, // least urgent
};


// prints a message with the current time and a label.
/**
 *
 * @param label
 * @param message
 */
function log(label, message) {
  const time = new Date().toISOString().slice(11, 19);
  console.log(`[${time}] [${label}] ${message}`);
}
 
// pauses the script for a given number of milliseconds.
/**
 *
 * @param ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
 
// return a random item from an array.
/**
 *
 * @param arr
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
 


 
/**
 *
 */
async function runSimulator() {
  // Print a header so you know what's running
  console.log('===========================================');
  console.log('  AIT Agent Simulator');
  console.log(`  API: ${BASE_URL}`);
  console.log(`  Agent: ${AGENT_ID}`);
  console.log('===========================================\n');
 

  // STEP 1: Ask the API for all open issues: calls GET /api/issues (built by Team 1)
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
      (PRIORITY_RANK[a.issue_priority] ?? 99) -
      (PRIORITY_RANK[b.issue_priority] ?? 99)
  );
 
  // get the first highest priority after sorting
  const target = openIssues[0];
  log(
    'PICK',
    `Selected: "${target.title}" (${target.id}) — priority: ${target.issue_priority}`
  );
 
  // STEP 3: Claim the issue
  // this calls POST /api/claim (our claim.js handler)
  log('CLAIM', `Claiming ${target.id} as ${AGENT_ID}...`);
 
  try {
    // send a POST request with our agent ID and the issue we want to claim
    const claimResponse = await fetch(`${BASE_URL}/api/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issue_id: target.id,
        agent_id: AGENT_ID,
      }),
    });
    // parse the response
    const claimData = await claimResponse.json();

    // If the claim was rejected, figure out why and tell the user
    if (!claimResponse.ok) {
      log('ERROR', `Claim failed: ${claimData.error || claimResponse.statusText}`);

      // 404 means the route doesn't exist yet — Team 1 hasn't wired it in
      if (claimResponse.status === 404) {
        log('HINT', 'The /api/claim route is not wired into worker.js yet.');
        log('HINT', 'Send INTEGRATION.md to Team 1 so they can add it.');
      }

      // 409 means someone else already claimed this issue
      if (claimResponse.status === 409) {
        log('HINT', 'This issue is already claimed by someone else.');
      }
 
      return;
    }
 
    // Claim succeeded — print the details
    log('CLAIM', `Claimed successfully! Status is now: ${claimData.issue_status}`);
    log('CLAIM', `Claim expires at: ${new Date(claimData.claim_expires_at).toISOString()}`);
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



  // STEP 5: Post the result back to the API
  // This calls POST /api/complete
  // What happens next depends on priority
  // - high/critical -> goes to 'review' (human need to review and approve)
  // - low/medium -> auto closes
  log('COMPLETE', `Posting result for ${target.id}...`);
 
  try {
    // send a POST request with the result and token usage
    const completeResponse = await fetch(`${BASE_URL}/api/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issue_id: target.id,
        agent_id: AGENT_ID,
        result: fakeResult,
        tokens_used: fakeTokens,
      }),
    });
 
    // parse the response
    const completeData = await completeResponse.json();
 
    // if it failed, shows the reason
    if (!completeResponse.ok) {
      log('ERROR', `Complete failed: ${completeData.error || completeResponse.statusText}`);
 
      // 404 means the route doesn't exist yet
      if (completeResponse.status === 404) {
        log('HINT', 'The /api/complete route is not wired into worker.js yet.');
        log('HINT', 'Send INTEGRATION.md to Team 1 so they can add it.');
      }
 
      // 403 means we tried to complete an issue we didn't claim
      if (completeResponse.status === 403) {
        log('HINT', 'You can only complete an issue you claimed.');
      }
 
      return;
    }
 
    // Success
    log('COMPLETE', `New status: ${completeData.issue_status}`);
    log('COMPLETE', `Requires human approval: ${completeData.requires_approval}`);
    log('COMPLETE', completeData.message);
  

  } catch (error) {
    log('ERROR', `Complete request failed: ${error.message}`);
    return;
  }
  
  console.log('\n===========================================');
  log('DONE', 'Simulation complete!');
  console.log('===========================================');
}


// Start simulator
runSimulator();