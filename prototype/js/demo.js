/**
 * demo.js — automated presentation demo + global keyboard shortcuts.
 *
 * Keyboard shortcuts (skip when focus is in an input):
 *   D  → toggle demo mode
 *   A  → toggle agent simulator panel
 *   R  → reset database to fresh seed data
 *   C  → print console summary of current state
 *   ESC→ dismiss banner / stop demo
 *
 * Demo state persists across the index→dashboard navigation via sessionStorage.
 */

import {
  createIssue, claimIssue, postResult, closeIssue,
  getIssues, saveApprovalMode,
} from './data.js';
import { flashEntity } from './ui.js';

const DEMO_STEP  = 'ait_demo_step';
const DEMO_ISSUE = 'ait_demo_issue';
const STEPS      = 8;

let running = false;
let aborted = false;

// ── Inject 🎬 Demo button into nav-actions ────────────────────────
const navActions = document.querySelector('.nav-actions');
if (navActions) {
  const btn = document.createElement('button');
  btn.id        = 'demo-nav-btn';
  btn.className = 'nav-demo-btn';
  btn.textContent = '🎬 Demo';
  btn.title     = 'Run full demo mode  (D)';
  navActions.insertBefore(btn, navActions.firstChild);
  btn.addEventListener('click', toggleDemo);
}

// ── Keyboard shortcut hint (bottom-left corner) ───────────────────
const hint = document.createElement('div');
hint.className = 'demo-key-hint';
hint.setAttribute('aria-hidden', 'true');
hint.innerHTML =
  '<kbd>D</kbd>&thinsp;demo &ensp;' +
  '<kbd>A</kbd>&thinsp;agent &ensp;' +
  '<kbd>R</kbd>&thinsp;reset &ensp;' +
  '<kbd>C</kbd>&thinsp;console';
document.body.appendChild(hint);

// ── Demo banner ────────────────────────────────────────────────────
const banner = document.createElement('div');
banner.id        = 'demo-banner';
banner.className = 'demo-banner hidden';
banner.setAttribute('role', 'status');
banner.setAttribute('aria-live', 'polite');
banner.innerHTML = `
  <div class="demo-banner-inner">
    <span class="demo-step-num"  id="demo-step-num">Step 1/${STEPS}</span>
    <span class="demo-narration" id="demo-narration"></span>
    <span class="demo-spinner hidden" id="demo-spinner" aria-label="Working"></span>
    <span class="demo-esc-hint">ESC to dismiss</span>
  </div>
  <div class="demo-track"><div class="demo-fill" id="demo-fill"></div></div>`;
document.body.appendChild(banner);

// ── Banner helpers ─────────────────────────────────────────────────
function showStep(n, text, working = false) {
  banner.classList.remove('hidden', 'demo-complete');
  document.body.classList.add('demo-active');

  document.getElementById('demo-step-num').textContent = `Step ${n}/${STEPS}`;

  const narr = document.getElementById('demo-narration');
  narr.classList.remove('demo-fade-in');
  void narr.offsetWidth; // force reflow to restart animation
  narr.textContent = text;
  narr.classList.add('demo-fade-in');

  document.getElementById('demo-spinner').classList.toggle('hidden', !working);
  document.getElementById('demo-fill').style.width = ((n / STEPS) * 100) + '%';
}

function finishBanner(text) {
  banner.classList.add('demo-complete');
  document.getElementById('demo-step-num').textContent  = '✓ Done';
  document.getElementById('demo-narration').textContent = text;
  document.getElementById('demo-spinner').classList.add('hidden');
  document.getElementById('demo-fill').style.width = '100%';
}

function hideBanner() {
  banner.classList.add('hidden');
  document.body.classList.remove('demo-active');
}

// ── Demo toast (purple, distinct from slack green toasts) ─────────
function demoToast(msg) {
  const el = document.createElement('div');
  el.className   = 'demo-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ── Misc helpers ───────────────────────────────────────────────────
function changed() { document.dispatchEvent(new CustomEvent('ait:data-changed')); }

function flash(id, kind = 'update') {
  flashEntity(id, kind);
}

// Abort-aware wait: polls every 80 ms so ESC stops the demo quickly.
function wait(ms) {
  return new Promise(resolve => {
    let elapsed = 0;
    const TICK = 80;
    function tick() {
      if (aborted) { resolve(); return; }
      elapsed += TICK;
      if (elapsed >= ms) { resolve(); return; }
      setTimeout(tick, TICK);
    }
    setTimeout(tick, TICK);
  });
}

// ── Demo cadence ───────────────────────────────────────────────────
// Tuned slow on purpose so an audience can read each step's narration,
// see the colored flash on the affected row/card, and follow what the
// agent is doing. If you tighten these, also tighten the flash
// animation duration (~2.2s) in main.css to match.
const PAUSE_READ_NARRATION = 1200; // pause AFTER showing a narration before firing the action
const PAUSE_AFTER_ACTION   = 4000; // pause AFTER an action so the colored flash is visible
const PAUSE_AGENT_WORKING  = 6000; // longer pause for the "agent working" step
const PAUSE_BEFORE_NAV     = 3000; // give the audience a beat before page change

// ── Main demo sequence (runs on index.html) ────────────────────────
async function runDemo() {
  running = true;
  aborted = false;
  sessionStorage.removeItem(DEMO_STEP);
  sessionStorage.removeItem(DEMO_ISSUE);

  // ── Step 1: AI-assisted issue creation ──────────────────────────
  showStep(1, 'Developer creates an issue with AI assist...');
  await wait(PAUSE_READ_NARRATION);
  if (aborted) return cleanup();

  const issue = createIssue({
    title:         'Refactor: Normalize auth module token handling',
    description:   'Auth tokens are stored inconsistently across three code paths. Normalize to a single canonical handler with expiry checks and audit logging.\n\nAcceptance criteria:\n- [ ] Single token handler\n- [ ] Expiry validated on every read\n- [ ] Audit log on every access',
    priority:      'P1',
    assignee:      'unassigned',
    token_budget:  2500,
    time_estimate: 45,
    creator:       'dev-demo',
    created_by:    'llm-assist',
  });
  changed();
  // green flash = something new appeared
  setTimeout(() => flash(issue.id, 'create'), 80);

  await wait(PAUSE_AFTER_ACTION);
  if (aborted) return cleanup();

  // ── Step 2: GitHub mirror ───────────────────────────────────────
  showStep(2, 'Issue mirrors to GitHub automatically...');
  const fresh = getIssues().find(i => i.id === issue.id);
  const ghNum = fresh?.github_number ?? Math.floor(Math.random() * 900) + 100;
  demoToast(`✅ GitHub issue #${ghNum} created`);

  await wait(PAUSE_AFTER_ACTION);
  if (aborted) return cleanup();

  // ── Step 3: Agent reads queue ────────────────────────────────────
  showStep(3, 'Developer tells Claude Code to check AIT...');
  const simPanel = document.getElementById('agent-sim-panel');
  if (simPanel) {
    simPanel.classList.remove('hidden');
    document.getElementById('sim-read-queue')?.click();
  }

  await wait(PAUSE_AFTER_ACTION);
  if (aborted) return cleanup();

  // ── Step 4: Agent claims ─────────────────────────────────────────
  showStep(4, 'Agent claims the issue...');
  const agentName = 'claude-agent-demo';
  const nameEl = document.getElementById('sim-agent-name');
  if (nameEl) nameEl.value = agentName;

  await wait(PAUSE_READ_NARRATION);
  if (aborted) return cleanup();

  claimIssue(issue.id, agentName);
  changed();
  // amber flash = claimed / now in-progress
  setTimeout(() => flash(issue.id, 'claim'), 80);

  await wait(PAUSE_AFTER_ACTION);
  if (aborted) return cleanup();

  // ── Step 5: Agent working ────────────────────────────────────────
  showStep(5, 'Agent working... (in Cursor/Claude Code)', true);
  demoToast('🔄 claude-agent-demo is processing the issue...');

  await wait(PAUSE_AGENT_WORKING);
  if (aborted) return cleanup();

  // ── Step 6: Post result ──────────────────────────────────────────
  showStep(6, 'Agent posts result back to AIT...');
  saveApprovalMode('require-review'); // keep in pending-review so step 8 can close it

  await wait(PAUSE_READ_NARRATION);
  if (aborted) return cleanup();

  postResult(
    issue.id,
    'Auth token normalization complete. Consolidated three separate handlers into a single canonical getAuthToken() function with built-in expiry validation. Audit log entries added on every access. All existing tests pass; two new regression tests written.',
    1847,
    23,
  );
  changed();
  // purple flash = pending review
  setTimeout(() => flash(issue.id, 'complete'), 80);

  await wait(PAUSE_AFTER_ACTION);
  if (aborted) return cleanup();

  // ── Step 7: Navigate to dashboard ───────────────────────────────
  showStep(7, 'Developer reviews result on dashboard...');
  sessionStorage.setItem(DEMO_STEP,  '8');
  sessionStorage.setItem(DEMO_ISSUE, issue.id);

  await wait(PAUSE_BEFORE_NAV);
  if (aborted) {
    sessionStorage.removeItem(DEMO_STEP);
    sessionStorage.removeItem(DEMO_ISSUE);
    return cleanup();
  }

  window.location.href = 'dashboard.html';
}

// ── Resume on dashboard (step 8) ──────────────────────────────────
async function resumeStep8() {
  const issueId = sessionStorage.getItem(DEMO_ISSUE);
  sessionStorage.removeItem(DEMO_STEP);
  sessionStorage.removeItem(DEMO_ISSUE);

  running = true;
  aborted = false;

  await wait(1200); // let dashboard render first
  if (aborted) return cleanup();

  // Briefly show step 7 to orient the audience ("we just arrived here")
  showStep(7, 'Developer reviews result on dashboard...');
  highlightFeedEntry(issueId);

  await wait(PAUSE_AFTER_ACTION);
  if (aborted) return cleanup();

  // ── Step 8: Approve and close ────────────────────────────────────
  showStep(8, 'Developer approves. Issue closed.');
  await wait(PAUSE_READ_NARRATION);
  if (aborted) return cleanup();

  if (issueId) {
    closeIssue(issueId);
    changed();
    // dark-green flash = closed
    setTimeout(() => flash(issueId, 'close'), 80);
  }
  demoToast('🎉 Issue closed — approved and merged');

  await wait(PAUSE_AFTER_ACTION);
  if (aborted) return cleanup();

  finishBanner('Full workflow complete ✓');
  running = false;
}

function highlightFeedEntry(issueId) {
  if (!issueId) return;
  document.querySelectorAll('.feed-entry').forEach(entry => {
    const link = entry.querySelector('.feed-issue-id');
    if (link?.textContent.trim() === issueId) {
      entry.classList.add('demo-feed-highlight');
      entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => entry.classList.remove('demo-feed-highlight'), 3500);
    }
  });
}

// ── Toggle / stop ──────────────────────────────────────────────────
function toggleDemo() {
  if (running) { stopDemo(); return; }

  const onIndex = /index\.html$|\/prototype\/?$/.test(location.pathname);
  if (!onIndex) {
    demoToast('Navigate to the issues list to start the demo.');
    return;
  }
  runDemo();
}

function stopDemo() {
  aborted = true;
  running = false;
  hideBanner();
  sessionStorage.removeItem(DEMO_STEP);
  sessionStorage.removeItem(DEMO_ISSUE);
}

function cleanup() {
  running = false;
  hideBanner();
}

// ── Auto-resume on dashboard if demo was in progress ──────────────
if (sessionStorage.getItem(DEMO_STEP) === '8') {
  resumeStep8();
}

// ── Keyboard shortcuts ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select')) return;

  switch (e.key.toLowerCase()) {
    case 'd':
      e.preventDefault();
      toggleDemo();
      break;

    case 'a':
      e.preventDefault();
      document.getElementById('agent-sim-panel')?.classList.toggle('hidden');
      break;

    case 'r':
      if (confirm('Reset database to fresh seed data?')) {
        localStorage.removeItem('ait_issues');
        sessionStorage.removeItem(DEMO_STEP);
        sessionStorage.removeItem(DEMO_ISSUE);
        location.reload();
      }
      break;

    case 'c':
      e.preventDefault();
      logSummary();
      break;

    case 'escape':
      if (running) stopDemo();
      else hideBanner();
      break;
  }
});

// ── Console summary (C key) ────────────────────────────────────────
function logSummary() {
  const issues = getIssues();
  const counts = {};
  let tokens = 0;
  issues.forEach(i => {
    counts[i.status] = (counts[i.status] || 0) + 1;
    tokens += i.tokens_used || 0;
  });
  console.group('[AIT] Current State Summary');
  console.log(`${issues.length} issues total · ${tokens.toLocaleString()} tokens used`);
  console.table(counts);
  console.table(issues.map(i => ({
    id:       i.id,
    title:    i.title.slice(0, 45),
    status:   i.status,
    priority: i.priority,
    assignee: i.assignee,
    tokens:   i.tokens_used,
  })));
  console.groupEnd();
}
