#!/usr/bin/env node
/**
 * AIT Runner — Claude Code tool
 *
 * Designed to be called FROM WITHIN an active Claude Code session as a
 * bash command. Claude Code is already running — this script does not
 * spawn it. The flow is:
 *
 *  1. Read config (AIT_API_BASE, AIT_USER_ID, AIT_AGENT_ID)
 *  2. GET  /api/issues/ready   — fetch highest-priority open unclaimed issue
 *     belonging to the authenticated user (sent as X-User-ID header)
 *  3. PUT  /api/issues/:id/claim — lock it (status → in_progress)
 *  4. Print the task to stdout — Claude reads this and works on it
 *  5. Exit — Claude continues, finishes the work, then runs the
 *     printed curl command to POST the result back to the Worker
 *
 * Usage (inside a Claude Code session):
 *   ait                                      # global install
 *   npm run ait                              # from this repo
 *   ait --url http://localhost:8787          # point at local Worker
 *
 * Config is loaded from (highest priority first):
 *   1. Shell env vars already set (export AIT_* in ~/.zshrc)
 *   2. .env in the current working directory (your project repo)
 *   3. ~/.ait/.env   — optional global fallback
 *
 * Global install:
 *   npm install -g git+https://github.com/cse110-sp24-group05/Agent-Issue-Tracker.git
 *
 * Per-project config (recommended):
 *   cp config/ait.env.example .env   # in your project root; .env is gitignored
 *   # Edit .env: paste AIT_USER_ID=… from the web app settings menu
 *
 * To find your AIT_USER_ID:
 *   Sign in → click the settings icon (top right) → Copy
 *
 * Prerequisites:
 *   - AIT_USER_ID set to your user-XXXXX id from the AIT login
 *   - Migration 0003 applied: npx wrangler d1 migrations apply issues-db --remote
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { config as loadDotenv } from 'dotenv';

// --- Config loading ---------------------------------------------------
// Shell env vars always win (dotenv never overwrites existing process.env).
// Project .env wins over ~/.ait/.env for keys present in both.

const globalConfig = join(homedir(), '.ait', '.env');
const localConfig  = join(process.cwd(), '.env');

if (existsSync(localConfig)) {
  loadDotenv({ path: localConfig });
}

if (existsSync(globalConfig)) {
  loadDotenv({ path: globalConfig });
}

// --- Config -----------------------------------------------------------

const args = process.argv.slice(2);
const urlFlagIdx = args.indexOf('--url');
const BASE_URL =
  urlFlagIdx !== -1 && args[urlFlagIdx + 1]
    ? args[urlFlagIdx + 1]
    : process.env.AIT_API_BASE || 'https://agent-issue-tracker.stc021.workers.dev';

// AIT_USER_ID: scopes the runner to your issues (e.g. user-04821).
// Copy from the web app: settings icon (top right) → Copy → paste into project .env
const USER_ID = process.env.AIT_USER_ID || '';

// Agent identifier sent in the claim request (which agent picked this up). The
// API registers unknown ids in the agents table; assigned_to_agent is now a
// boolean flag on the issue, not a FK to this id.
const AGENT_ID = process.env.AIT_AGENT_ID || 'ait-agent-cc';

const MIN_DELAY_MS = 300;

// --- Helpers ----------------------------------------------------------

/**
 * Simple logger with timestamps and labels.
 * @param {string} label
 * @param {string} message
 */
function log(label, message) {
  const time = new Date().toISOString().slice(11, 19);
  console.log(`[${time}] [${label}] ${message}`);
}

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Print the claimed task to stdout so Claude Code can read it, work on it,
 * and report the result.
 *
 * All values Claude Code might ever need (user ID, base URL, issue ID, headers)
 * are printed explicitly here — Claude has no access to localStorage, .env, or
 * this source file.
 *
 * ID disambiguation:
 *   issue.id  = the AIT tracker ID (e.g. "issue-007"). Used ONLY in the AIT
 *               API curl commands below. It is NOT a file, a function name,
 *               a git hash, or any identifier inside the repository you are
 *               working on. Do not search the codebase for this string.
 *
 * @param {object} issue - Issue row returned by the API
 */
function printTask(issue) {
  const description = issue.issue_description?.trim() || '(no description provided)';
  const issueUrl    = `${BASE_URL}/api/issues/${issue.id}`;
  const resultUrl   = `${BASE_URL}/api/issues/${issue.id}/result`;

  // Build the header lines for curl commands so Claude has them pre-filled.
  const curlUserHeader  = USER_ID  ? `    -H "X-User-ID: ${USER_ID}" \\` : '';
  const curlAgentHeader = `    -H "X-Agent-ID: ${AGENT_ID}" \\`;

  // Build the header block for the info section.
  const infoUserId = USER_ID || '(not set — global pool mode)';

  console.log(`
╔══════════════════════════════════════════════════════╗
║               AIT — Task Assigned                    ║
╚══════════════════════════════════════════════════════╝

AIT Issue ID : ${issue.id}
Title        : ${issue.title}
Priority     : ${issue.issue_priority}
Status       : in_progress (just claimed by this runner)
AIT User ID  : ${infoUserId}
AIT Agent ID : ${AGENT_ID}
AIT API Base : ${BASE_URL}

Description:
${description}

──────────────────────────────────────────────────────
INSTRUCTIONS FOR CLAUDE CODE
──────────────────────────────────────────────────────
Work on the task described above using your available
tools (file edits, bash commands, etc.).

▸ ID DISAMBIGUATION (read carefully)
  The AIT Issue ID "${issue.id}" is a tracker label
  used ONLY in the curl commands below.
  It is NOT a filename, function, variable, git hash,
  or any symbol inside the repository you are editing.
  Do not search the codebase for "${issue.id}".

▸ IF YOU NEED TO RE-READ THE ISSUE VIA API
  Single-issue lookup — no user_id query param needed:

  curl "${issueUrl}" \\
${curlUserHeader ? curlUserHeader + '\n' : ''}${curlAgentHeader}

▸ WHEN FINISHED (or blocked), run EXACTLY this curl
  to report your result to AIT. Fill in your summary
  and the actual token count. Use "blocked" instead of
  "review" only if you could not complete the work:

  curl -X PUT "${resultUrl}" \\
    -H "Content-Type: application/json" \\
${curlUserHeader ? curlUserHeader + '\n' : ''}${curlAgentHeader}
    -d '{"new_status":"review","result_text":"<your summary here>","tokens_used":<number>}'

  Do NOT skip this step — it is the only way AIT
  marks the issue as reviewed and updates the dashboard.
──────────────────────────────────────────────────────
`);
}

// --- Pre-flight: reclaim expired claims -------------------------------

/**
 * Silently resets any in_progress issues whose claim window has expired
 * back to open, so the next run can pick them up.
 *
 * Blocked issues are intentionally left alone — they require a human to
 * unblock via the dashboard before the agent retries.
 *
 * Produces no output on success; logs a single warning only if an API
 * call unexpectedly fails.
 */
async function reclaimExpiredClaims() {
  try {
    const query = USER_ID ? `?user_id=${encodeURIComponent(USER_ID)}` : '';
    const headers = { 'Content-Type': 'application/json' };
    if (USER_ID) { headers['X-User-ID'] = USER_ID; }

    const res = await fetch(`${BASE_URL}/api/issues${query}`, { headers });
    if (!res.ok) { return; }

    const issues = await res.json();
    if (!Array.isArray(issues)) { return; }

    const now     = Date.now();
    const expired = issues.filter(i =>
      i.issue_status === 'in_progress' &&
      i.claim_expires_at !== null &&
      i.claim_expires_at < now
    );

    for (const issue of expired) {
      // Fully reset the claim back to an open, unassigned state (mirrors the
      // server-side resetExpiredClaims): clear status, both assignment flags,
      // and the expiry timestamp. updated_at is stamped by the API.
      const resetRes = await fetch(`${BASE_URL}/api/issues/${encodeURIComponent(issue.id)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          issue_status: 'open',
          assigned_to_agent: 0,
          assigned_to_user: 0,
          claim_expires_at: null
        })
      });
      if (!resetRes.ok) {
        log('WARN', `Could not reset expired claim on ${issue.id} (${resetRes.status})`);
      }
    }
  } catch {
    // Never let a reclaim failure block the main workflow
  }
}

// --- Main workflow ----------------------------------------------------

async function runAIT() {
  await reclaimExpiredClaims();

  const isProduction = BASE_URL.includes('workers.dev');

  console.log('===========================================');
  console.log('  AIT Runner');
  console.log(`  API:      ${BASE_URL}`);
  console.log(`  User ID:  ${USER_ID || '(none — falling back to global pool)'}`);
  console.log(`  Agent ID: ${AGENT_ID}`);
  if (isProduction) {
    console.log('  WARNING:  Targeting production Worker');
  }
  if (!USER_ID) {
    console.log('  WARNING:  AIT_USER_ID not set. Add it to .env in this repo');
    console.log('            (or ~/.ait/.env). See config/ait.env.example.');
  }
  console.log('===========================================\n');

  // STEP 1 — Fetch the next ready issue --------------------------------
  log('FETCH', 'GET /api/issues/ready ...');

  let issue;
  try {
    const headers = {
      'X-Agent-ID': AGENT_ID,
    };
    if (USER_ID) {
      headers['X-User-ID'] = USER_ID;
    }

    const res = await fetch(`${BASE_URL}/api/issues/ready`, { headers });

    if (res.status === 404) {
      log('DONE', 'No open issues available for this user. Nothing to do.');
      return;
    }

    if (!res.ok) {
      log('ERROR', `API returned ${res.status}: ${await res.text()}`);
      return;
    }

    const body = await res.json();
    issue = body.issue ?? body;
  } catch (err) {
    log('ERROR', `Could not reach API: ${err.message}`);
    log('HINT',  'Is the Worker running? Try: npm run dev:api');
    return;
  }

  log('FETCH', `Found: "${issue.title}" (AIT Issue ID: ${issue.id}) — priority: ${issue.issue_priority}`);

  // Guard: only claim issues that are open-to-all (assigned_to_agent=0, assigned_to_user=0)
  // or explicitly designated for an agent (assigned_to_agent=1). Human-only issues
  // (assigned_to_user=1) must never be touched by the runner.
  if (issue.assigned_to_user) {
    log('SKIP', 'Issue is reserved for a human (assigned_to_user=1). Nothing to do.');
    return;
  }

  await sleep(MIN_DELAY_MS);

  // STEP 2 — Claim the issue ------------------------------------------
  log('CLAIM', `PUT /api/issues/${issue.id}/claim ...`);

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (USER_ID) {
      headers['X-User-ID'] = USER_ID;
    }

    const res = await fetch(`${BASE_URL}/api/issues/${issue.id}/claim`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ agent_id: AGENT_ID }),
    });

    const data = await res.json();

    if (!res.ok) {
      log('ERROR', `Claim failed (${res.status}): ${data.error || res.statusText}`);
      if (res.status === 400) {
        log('HINT', 'Issue may already be claimed. Run ait again to pick the next one.');
      }
      return;
    }

    log('CLAIM', 'Claimed. Status → in_progress');
  } catch (err) {
    log('ERROR', `Claim request failed: ${err.message}`);
    return;
  }

  // STEP 3 — Print task for Claude to read and act on -----------------
  printTask(issue);

  // Runner exits here. Claude (already running) reads the printed task,
  // does the work, then runs the curl command printed above.
}

runAIT();
