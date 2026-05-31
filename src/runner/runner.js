#!/usr/bin/env node
/**
 * AIT Runner — Claude Code tool
 *
 * Designed to be called FROM WITHIN an active Claude Code session as a
 * bash command. Claude Code is already running — this script does not
 * spawn it. The flow is:
 *
 *  1. Read config (AIT_API_BASE, AIT_WORKSPACE_ID, AIT_AGENT_ID)
 *  2. GET  /api/issues/ready   — fetch highest-priority open unclaimed issue
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
 *   2. ~/.ait/.env   — recommended for global installs
 *   3. .env in the current working directory
 *
 * Global install (run `ait` from any repo):
 *   npm link          # dev — symlinks from this repo
 *   mkdir -p ~/.ait && cp .env.example ~/.ait/.env
 *   # edit ~/.ait/.env with AIT_WORKSPACE_ID, AIT_AGENT_ID, AIT_API_BASE
 *
 * Prerequisites:
 *   - AIT_WORKSPACE_ID in config (placeholder until user auth lands)
 *   - Migration 0002 applied: npx wrangler d1 migrations apply issues-db --remote
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { config as loadDotenv } from 'dotenv';

// --- Config loading ---------------------------------------------------
// Load global config first, then local — shell env vars always win
// because dotenv only sets a value when the key is not already in env.

const globalConfig = join(homedir(), '.ait', '.env');
const localConfig  = join(process.cwd(), '.env');

if (existsSync(globalConfig)) loadDotenv({ path: globalConfig });
if (existsSync(localConfig))  loadDotenv({ path: localConfig });

// --- Config -----------------------------------------------------------

const args = process.argv.slice(2);
const urlFlagIdx = args.indexOf('--url');
const BASE_URL =
  urlFlagIdx !== -1 && args[urlFlagIdx + 1]
    ? args[urlFlagIdx + 1]
    : process.env.AIT_API_BASE || 'https://agent-issue-tracker.stc021.workers.dev';

// PLACEHOLDER: workspace ID identifies the user's AIT account.
// No user auth yet. When auth lands this comes from a session token.
const WORKSPACE_ID = process.env.AIT_WORKSPACE_ID || 'ws-placeholder-001';

// PLACEHOLDER: agent identifier recorded in the claim.
const AGENT_ID = process.env.AIT_AGENT_ID || `ait-runner-${Date.now()}`;

const MIN_DELAY_MS = 300;

// --- Helpers ----------------------------------------------------------

/**
 * @param {string} label
 * @param {string} message
 */
function log(label, message) {
  const time = new Date().toISOString().slice(11, 19);
  console.log(`[${time}] [${label}] ${message}`);
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Print the claimed task to stdout so the surrounding Claude Code
 * session can read it, work on it, and run the result curl.
 *
 * The curl command is pre-filled with the base URL, issue ID, and
 * workspace ID. Claude only fills in its own result summary text.
 *
 * @param {object} issue - Issue row returned by the API
 */
function printTask(issue) {
  const description = issue.issue_description?.trim() || '(no description provided)';
  const resultUrl   = `${BASE_URL}/api/issues/${issue.id}/result`;

  console.log(`
╔══════════════════════════════════════════════════════╗
║               AIT — Task Assigned                    ║
╚══════════════════════════════════════════════════════╝

Issue ID:    ${issue.id}
Title:       ${issue.title}
Priority:    ${issue.issue_priority}
Status:      in_progress (just claimed)

Description:
${description}

──────────────────────────────────────────────────────
INSTRUCTIONS FOR CLAUDE
──────────────────────────────────────────────────────
Work on the issue above using your available tools.

When you have finished (or determined you are blocked),
run the following command to report your result to AIT.
Replace the placeholder with a brief summary of what
you did. Use "blocked" instead of "review" if you could
not complete the work.

curl -X PUT "${resultUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Workspace-ID: ${WORKSPACE_ID}" \\
  -d '{"new_status":"review","result_text":"<your summary here>"}'

Do not skip this — it is how AIT updates the dashboard.
──────────────────────────────────────────────────────
`);
}

// --- Main workflow ----------------------------------------------------

async function runAIT() {
  const isProduction = BASE_URL.includes('workers.dev');

  console.log('===========================================');
  console.log('  AIT Runner');
  console.log(`  API:       ${BASE_URL}`);
  console.log(`  Workspace: ${WORKSPACE_ID}`);
  console.log(`  Agent:     ${AGENT_ID}`);
  if (isProduction) console.log('  WARNING:   Targeting production Worker');
  console.log('===========================================\n');

  // STEP 1 — Fetch the next ready issue --------------------------------
  log('FETCH', 'GET /api/issues/ready ...');

  let issue;
  try {
    const res = await fetch(`${BASE_URL}/api/issues/ready`, {
      headers: {
        'X-Workspace-ID': WORKSPACE_ID,
        'X-Agent-ID': AGENT_ID,
      },
    });

    if (res.status === 404) {
      log('DONE', 'No open issues available. Nothing to do.');
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

  log('FETCH', `Found: "${issue.title}" (${issue.id}) — priority: ${issue.issue_priority}`);

  await sleep(MIN_DELAY_MS);

  // STEP 2 — Claim the issue ------------------------------------------
  log('CLAIM', `PUT /api/issues/${issue.id}/claim ...`);

  try {
    const res = await fetch(`${BASE_URL}/api/issues/${issue.id}/claim`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-ID': WORKSPACE_ID,
      },
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
  // does the work, and runs the curl command above when finished.
}

runAIT();
