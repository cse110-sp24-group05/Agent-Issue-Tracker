/**
 * agent-sim.js — floating agent simulator panel.
 *
 * Injects a draggable panel into any page that imports this module.
 * All simulated API calls go through data.js.
 * Dispatches 'ait:data-changed' after every mutation so pages re-render.
 */

import {
  getIssues, claimIssue, postResult, closeIssue, createIssue,
  getApprovalMode, saveApprovalMode
} from './data.js';

// ── Constants ────────────────────────────────────────────────────
const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

const PRESET_ISSUES = [
  {
    title: 'Bug: getIssue() returns stale data when called immediately after updateIssue()',
    description: 'In the same event-loop tick, getIssue() can return a pre-mutation reference. All reads must call JSON.parse(localStorage.getItem()) directly to guarantee freshness after any write.',
    priority: 'P0'
  },
  {
    title: 'Perf: Audit log grows unbounded — add max-entries cap per issue',
    description: 'Long-running issues accumulate hundreds of audit entries. Cap at 50 per issue (FIFO) to keep localStorage manageable. Append a sentinel entry when entries are dropped.',
    priority: 'P2'
  },
  {
    title: 'Feature: Auto-escalate issue priority when SLA is breached',
    description: 'If an open issue has been unclaimed longer than its time_estimate (minutes), escalate priority by one level (P2→P1, P1→P0) and add an audit entry. P0 stays P0.',
    priority: 'P1'
  },
  {
    title: 'Refactor: Normalize agent name on write — trim and lowercase',
    description: 'Names like "Claude-Agent-1" and "claude-agent-1" are treated as different agents. Normalize in claimIssue() so the token burn breakdown groups them correctly.',
    priority: 'P2'
  },
  {
    title: 'Security: Expire ait_token from localStorage after 8h of inactivity',
    description: 'GitHub tokens stored in localStorage persist indefinitely. Track last-active timestamp and clear ait_token after 8 hours of inactivity. Prompt re-auth on next visit.',
    priority: 'P1'
  }
];

const PRESET_RESULTS = [
  'Root cause confirmed and patched. Defensive check added at the serialization boundary. Three regression tests written: normal completion, early abandonment, and re-claim after timeout. No side effects on adjacent code paths.',
  'Implemented with a sliding-window cap using splice() before each _save() call. A sentinel entry "audit log truncated (N entries dropped)" is appended when capacity is exceeded. localStorage footprint reduced by ~40% on long-running sprints.',
  'Fixed. The issue was a missing guard clause introduced in the last refactor. One-line change. All existing tests pass. Manual verification performed in devtools with network throttling applied.',
  'Normalization applied in claimIssue() and createIssue() via .trim().toLowerCase(). Backward-compatible: existing stored data is untouched. Agent breakdown chart now correctly merges all name variants.',
  'Root cause: stale closure captured a pre-mutation array reference. Refactored all affected read paths to use fresh JSON.parse() calls. Two new tests assert read-after-write consistency within the same synchronous block.'
];

// ── Utility helpers ──────────────────────────────────────────────
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

function ts() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
}

function notify() {
  document.dispatchEvent(new CustomEvent('ait:data-changed'));
}

function flash(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  el.classList.remove('sim-flash');
  void el.offsetWidth; // force reflow so animation restarts
  el.classList.add('sim-flash');
  setTimeout(() => el.classList.remove('sim-flash'), 1600);
}

// ── Queue helpers ────────────────────────────────────────────────
function getAgentName() {
  const el = document.getElementById('sim-agent-name');
  return (el ? el.value.trim() : '') || 'claude-agent-sim';
}

function getReadyQueue() {
  return getIssues()
    .filter(i => i.status === 'open' && !i.claimed_by)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
}

function getClaimedByAgent() {
  const name = getAgentName();
  return getIssues().find(i => i.status === 'in-progress' && i.claimed_by === name) || null;
}

// ── Panel HTML ───────────────────────────────────────────────────
// No style="" attributes — all visual state via classes.
const PANEL_HTML = `
  <div class="sim-titlebar" id="sim-titlebar">
    <div class="sim-titlebar-inner">
      <span class="sim-title-icon" aria-hidden="true">🤖</span>
      <div>
        <div class="sim-title-text">Agent Simulator</div>
        <div class="sim-subtitle">Simulate agent API calls</div>
      </div>
    </div>
    <button class="sim-close-btn" id="sim-close" aria-label="Close simulator">&#10005;</button>
  </div>

  <div class="sim-body">

    <div class="sim-section">
      <div class="sim-section-label">Agent identity</div>
      <input class="sim-name-input" type="text" id="sim-agent-name"
             value="claude-agent-sim" spellcheck="false" autocomplete="off">
    </div>

    <div class="sim-section">
      <div class="sim-section-label">Single actions</div>
      <div class="sim-actions">
        <button class="sim-btn" id="sim-read-queue">📋 Read Queue</button>
        <button class="sim-btn sim-btn-claim" id="sim-claim-next">⚡ Claim Next</button>
        <button class="sim-btn sim-btn-complete" id="sim-complete">✅ Complete Claimed</button>
        <button class="sim-btn" id="sim-create">🤖 Create Issue (Agent)</button>
      </div>
      <div class="sim-json-wrap hidden" id="sim-read-output">
        <pre class="sim-json-pre" id="sim-read-pre"></pre>
      </div>
    </div>

    <div class="sim-section">
      <div class="sim-row">
        <div class="sim-section-label">Auto-run loop</div>
        <label class="sim-toggle-wrap" aria-label="Toggle auto-run loop">
          <input type="checkbox" id="sim-auto-toggle">
          <span class="sim-toggle-track"></span>
        </label>
      </div>
      <div class="sim-speed-row">
        <div class="sim-speed-btns">
          <button class="sim-speed-btn" data-speed="5000">Slow 5s</button>
          <button class="sim-speed-btn active" data-speed="2000">Med 2s</button>
          <button class="sim-speed-btn" data-speed="500">Fast 0.5s</button>
        </div>
      </div>
      <div class="sim-status" id="sim-status"></div>
    </div>

    <div class="sim-section">
      <div class="sim-section-label">Approval mode</div>
      <div class="sim-mode-btns">
        <button class="sim-mode-btn" data-mode="auto-close">Auto-close</button>
        <button class="sim-mode-btn" data-mode="require-review">Require review</button>
      </div>
    </div>

    <div class="sim-section">
      <div class="sim-log-header">
        <div class="sim-section-label">Debug output</div>
        <button class="sim-clear-btn" id="sim-clear-log">Clear</button>
      </div>
      <div class="sim-log-wrap">
        <pre class="sim-log" id="sim-log"></pre>
      </div>
    </div>

  </div>`;

// ── Inject into DOM ──────────────────────────────────────────────
const panel = document.createElement('div');
panel.id        = 'agent-sim-panel';
panel.className = 'agent-sim-panel hidden';
panel.setAttribute('role', 'complementary');
panel.setAttribute('aria-label', 'Agent Simulator');
panel.innerHTML = PANEL_HTML;
document.body.appendChild(panel);

const toggleBtn = document.createElement('button');
toggleBtn.className = 'agent-sim-toggle';
toggleBtn.innerHTML = '🤖';
toggleBtn.setAttribute('aria-label', 'Toggle Agent Simulator');
toggleBtn.setAttribute('title', 'Agent Simulator');
document.body.appendChild(toggleBtn);

// ── Logging ──────────────────────────────────────────────────────
const logEl    = document.getElementById('sim-log');
const statusEl = document.getElementById('sim-status');

function simLog(msg) {
  logEl.textContent += `[${ts()}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
  console.log('[AgentSim]', msg);
}

function setStatus(msg, running = false) {
  statusEl.textContent = msg;
  statusEl.className   = 'sim-status' + (running ? ' running' : '');
}

// ── Panel open / close ───────────────────────────────────────────
toggleBtn.addEventListener('click', () => panel.classList.toggle('hidden'));
document.getElementById('sim-close').addEventListener('click', () => panel.classList.add('hidden'));

// ── Single action: Read Queue ────────────────────────────────────
document.getElementById('sim-read-queue').addEventListener('click', () => {
  const ready = getReadyQueue();
  const output = document.getElementById('sim-read-output');
  const pre    = document.getElementById('sim-read-pre');
  pre.textContent = JSON.stringify(
    ready.map(i => ({ id: i.id, priority: i.priority, title: i.title, token_budget: i.token_budget })),
    null, 2
  );
  output.classList.remove('hidden');
  simLog(`GET /api/issues/ready → ${ready.length} result${ready.length !== 1 ? 's' : ''}`);
});

// ── Single action: Claim Next ────────────────────────────────────
document.getElementById('sim-claim-next').addEventListener('click', () => {
  const queue = getReadyQueue();
  if (!queue.length) {
    simLog('GET /api/issues/ready → queue empty');
    setStatus('No open unclaimed issues.');
    return;
  }
  const issue = queue[0];
  const name  = getAgentName();
  claimIssue(issue.id, name);
  simLog(`POST /api/claim → { id: "${issue.id}", agent: "${name}" }`);
  notify();
  flash(issue.id);
  setStatus(`Claimed ${issue.id} (${issue.priority})`);
});

// ── Single action: Complete Claimed ─────────────────────────────
document.getElementById('sim-complete').addEventListener('click', () => {
  const issue = getClaimedByAgent();
  if (!issue) {
    simLog(`POST /api/complete → no issue claimed by "${getAgentName()}"`);
    setStatus('No issue claimed by this agent.');
    return;
  }
  const result    = pick(PRESET_RESULTS);
  const tokens    = rand(800, 2400);
  const timeSpent = rand(10, 45);
  const mode      = getApprovalMode();

  postResult(issue.id, result, tokens, timeSpent);
  simLog(`POST /api/complete → { id: "${issue.id}", tokens: ${tokens}, time: ${timeSpent}m }`);

  if (mode === 'auto-close') {
    closeIssue(issue.id);
    simLog(`POST /api/close → ${issue.id} closed`);
    setStatus(`Closed ${issue.id} · ${tokens} tok burned`);
  } else {
    setStatus(`${issue.id} submitted for review`);
  }

  notify();
  flash(issue.id);
});

// ── Single action: Create Issue (Agent) ──────────────────────────
document.getElementById('sim-create').addEventListener('click', () => {
  const preset = pick(PRESET_ISSUES);
  const name   = getAgentName();
  const issue  = createIssue({ ...preset, creator: name, created_by: name });
  simLog(`POST /api/issues/create → { id: "${issue.id}", priority: "${issue.priority}", title: "${issue.title.slice(0, 40)}…" }`);
  notify();
  setStatus(`Created ${issue.id}`);
});

// ── Auto-run state machine ───────────────────────────────────────
let autoTimer  = null;
let autoSpeed  = 2000;
let autoPhase  = 'seek';   // 'seek' | 'complete'
let autoTarget = null;     // issue id currently being worked

function runStep() {
  if (autoPhase === 'seek') {
    const queue = getReadyQueue();
    if (!queue.length) {
      simLog('Queue empty — agent idle. Auto-run stopped.');
      setStatus('Queue empty — agent idle');
      stopAuto();
      return;
    }
    const issue = queue[0];
    const name  = getAgentName();
    claimIssue(issue.id, name);
    simLog(`POST /api/claim → ${issue.id} locked by ${name}`);
    notify();
    flash(issue.id);
    setStatus(`Claimed ${issue.id} (${issue.priority}) — completing next tick…`, true);
    autoTarget = issue.id;
    autoPhase  = 'complete';

  } else if (autoPhase === 'complete') {
    const id = autoTarget;
    if (!id) { autoPhase = 'seek'; return; }

    const result    = pick(PRESET_RESULTS);
    const tokens    = rand(800, 2400);
    const timeSpent = rand(10, 45);
    const mode      = getApprovalMode();

    postResult(id, result, tokens, timeSpent);
    simLog(`POST /api/complete → ${id} · ${tokens} tok · ${timeSpent}m`);

    if (mode === 'auto-close') {
      closeIssue(id);
      simLog(`POST /api/close → ${id} closed`);
    } else {
      simLog(`${id} → pending-review (approval required)`);
    }

    notify();
    flash(id);
    setStatus('Scanning for next issue…', true);
    autoTarget = null;
    autoPhase  = 'seek';
  }
}

function startAuto() {
  autoPhase  = 'seek';
  autoTarget = null;
  simLog('─── auto-run started ───');
  setStatus('Running…', true);
  runStep();                                      // first step immediately
  autoTimer = setInterval(runStep, autoSpeed);
}

function stopAuto(updateToggle = true) {
  clearInterval(autoTimer);
  autoTimer = null;
  if (updateToggle) {
    const toggle = document.getElementById('sim-auto-toggle');
    if (toggle) toggle.checked = false;
  }
  simLog('─── auto-run stopped ───');
  if (/Running|Scanning|Claim/.test(statusEl.textContent)) setStatus('Stopped.');
}

document.getElementById('sim-auto-toggle').addEventListener('change', function () {
  this.checked ? startAuto() : stopAuto(false);
});

// Speed selector
panel.querySelectorAll('.sim-speed-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    panel.querySelectorAll('.sim-speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    autoSpeed = parseInt(btn.dataset.speed, 10);
    if (autoTimer !== null) {        // restart with new interval if running
      clearInterval(autoTimer);
      autoTimer = setInterval(runStep, autoSpeed);
    }
  });
});

// ── Approval mode ────────────────────────────────────────────────
const savedMode = getApprovalMode();
panel.querySelectorAll('.sim-mode-btn').forEach(btn => {
  btn.classList.toggle('active', btn.dataset.mode === savedMode);
  btn.addEventListener('click', () => {
    panel.querySelectorAll('.sim-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    saveApprovalMode(btn.dataset.mode);
  });
});

// ── Clear log ────────────────────────────────────────────────────
document.getElementById('sim-clear-log').addEventListener('click', () => {
  logEl.textContent = '';
});

// ── Drag to reposition ───────────────────────────────────────────
const titlebar = document.getElementById('sim-titlebar');
let isDragging = false, dragX0, dragY0, panelX0, panelY0;

titlebar.addEventListener('mousedown', e => {
  if (e.target.closest('#sim-close')) return;
  isDragging = true;
  dragX0     = e.clientX;
  dragY0     = e.clientY;
  const rect = panel.getBoundingClientRect();
  panelX0    = rect.left;
  panelY0    = rect.top;
  // Convert from bottom/right anchor to top/left so we can drag freely
  panel.style.right  = 'auto';
  panel.style.bottom = 'auto';
  panel.style.left   = rect.left + 'px';
  panel.style.top    = rect.top  + 'px';
  e.preventDefault();
});

document.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const left = Math.max(0, Math.min(window.innerWidth  - panel.offsetWidth,  panelX0 + e.clientX - dragX0));
  const top  = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, panelY0 + e.clientY - dragY0));
  panel.style.left = left + 'px';
  panel.style.top  = top  + 'px';
});

document.addEventListener('mouseup', () => { isDragging = false; });
