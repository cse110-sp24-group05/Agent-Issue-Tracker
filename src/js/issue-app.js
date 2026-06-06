import { StatusIcon } from './components/status-icon.js';
import {
  initData,
  getIssue,
  claimIssue,
  postResult,
  closeIssue,
  updateIssue,
  getSettings,
  patchIssueLocal,
} from './data.js';
import {
  esc,
  staBadge,
  staLabel,
  createdByIcon,
  fmtRelTime,
  fmtDateTime,
} from './ui.js';

const API_BASE =
  localStorage.getItem('ait_api_base') ||
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:8787'
    : 'https://agent-issue-tracker.stc021.workers.dev');

try {
  await initData();
} catch (err) {
  console.error('[data.js] Failed to load issues:', err.message);
}

// Get the CSS class corresponding to the color for the audit log based on issue status
/**
 *
 * @param status
 */
function statusDotClass(status) {
  const map = {
    open: 'audit-dot-open',
    in_progress: 'audit-dot-in-progress',
    review: 'audit-dot-review',
    blocked: 'audit-dot-blocked',
    closed: 'audit-dot-closed',
  };
  return map[status] || 'audit-dot-closed';
}

// ── Setup ──────────────────────────────────────────────────
const id =
  new URLSearchParams(window.location.search).get('id') || 'issue-001';
const currentUser = getSettings().ait_user || 'you';

// ── Render ─────────────────────────────────────────────────
/**
 *
 */
async function render() {
  const issue = getIssue(id);
  if (!issue) {
    document.querySelector('.container').innerHTML =
      `<p class="not-found-msg">${esc(id)} was not found.</p>`;
    return;
  }

  const label = issue.display_id || issue.id;
  document.title = 'AIT — ' + label;
  document.querySelector('.issue-header .issue-id').textContent = label;

  // Title (skip if in edit mode)
  const titleText = document.getElementById('issue-title');
  const titleInput = document.getElementById('issue-title-input');
  if (titleInput.classList.contains('hidden')) {
    titleText.textContent = issue.title;
    titleInput.value = issue.title;
  }

  // Description (skip if in edit mode)
  const descText = document.getElementById('issue-desc');
  const descInput = document.getElementById('issue-desc-input');
  if (descInput.classList.contains('hidden')) {
    descText.textContent = issue.description;
    descInput.value = issue.description;
  }
  // Description is only editable when the issue is open
  const descEditable = issue.status === 'open';
  descText.title = descEditable ? 'Click to edit' : '';
  descText.classList.toggle('readonly', !descEditable);
  if (!issue.description) {
    descText.setAttribute('data-empty', '');
  } else {
    descText.removeAttribute('data-empty');
  }
  const descEditHint = document.getElementById('desc-edit-hint');
  if (descEditHint) {
    descEditHint.classList.toggle('hidden', !descEditable);
    descEditHint.addEventListener('click', () => {
      if (getIssue(id)?.status !== 'open') {return;}
      descText.classList.add('hidden');
      descInput.classList.remove('hidden');
      descInput.focus();
    });
  }

  // Status badge
  const badge = document.getElementById('status-badge');
  badge.className = 'badge ' + staBadge(issue.status);
  badge.textContent = staLabel(issue.status);

  // Priority
  document.getElementById('priority-select').value = issue.priority;

  // Assignee
  document.getElementById('assignee-select').value = issue.assignee_kind;

  // Token bar
  // const pct =
  //   issue.token_budget > 0
  //     ? Math.min(100, (issue.tokens_used / issue.token_budget) * 100)
  //     : 0;
  // const fill = document.getElementById('token-bar-fill');
  // fill.style.width = pct + '%';
  // fill.classList.toggle(
  //   'token-bar-over',
  //   issue.tokens_used > issue.token_budget,
  // );
  // document.getElementById('tokens-used-val').textContent =
  //   issue.tokens_used;
  // document.getElementById('token-budget-val').textContent =
  //   issue.token_budget;

  // // Time
  // document.getElementById('time-estimate-val').textContent =
  //   issue.time_estimate + ' min';
  // document.getElementById('time-spent-val').textContent =
  //   issue.time_spent + ' min';

  // Claim info
  const claimInfo = document.getElementById('claim-info');
  if (issue.claimed_by) {
    claimInfo.classList.remove('hidden');
    document.getElementById('claimed-by-val').textContent =
      issue.claimed_by;
    document.getElementById('claimed-at-val').textContent = fmtRelTime(
      issue.claimed_at,
    );
  } else {
    claimInfo.classList.add('hidden');
  }

  // Dates — relative
  document.getElementById('created-at-val').textContent = fmtRelTime(
    issue.created_at,
  );
  document.getElementById('updated-at-val').textContent = fmtRelTime(
    issue.updated_at,
  );

  // Created by
  // document.getElementById('created-by-icon').textContent = createdByIcon(
  //   issue.created_by,
  // );
  document.getElementById('created-by-label').textContent =
    issue.created_by || 'unknown';

  // Result section
  const resultSection = document.getElementById('result-section');
  if (
    issue.result_text &&
    (issue.status === 'pending-review' || issue.status === 'closed')
  ) {
    resultSection.classList.remove('hidden');
    document.getElementById('result-text').textContent = issue.result_text;
  } else {
    resultSection.classList.add('hidden');
  }

  // Banners (blocked / closed)
  const banner = document.getElementById('state-banner');
  const bIcon = document.getElementById('state-banner-icon');
  const bTitle = document.getElementById('state-banner-title');
  const bSub = document.getElementById('state-banner-sub');
  banner.classList.remove('banner-blocked', 'banner-closed');
  if (issue.status === 'blocked') {
    banner.classList.remove('hidden');
    banner.classList.add('banner-blocked');
    //bIcon.textContent = '🚫';
    bTitle.textContent = 'Blocked';
    const statusIcon = new StatusIcon();
    statusIcon.status = 'blocked';
    bIcon.appendChild(statusIcon);
    bSub.textContent = issue.blocked_reason || 'No reason given';
  } else if (issue.status === 'closed') {
    banner.classList.remove('hidden');
    banner.classList.add('banner-closed');
    //bIcon.textContent = '✅';
    bTitle.textContent = 'Closed';
    const statusIcon = new StatusIcon();
    statusIcon.status = 'closed';
    bIcon.appendChild(statusIcon);
    statusIcon.querySelector('img').classList.add('large');
    bSub.textContent = issue.completed_at
      ? `Completed ${fmtRelTime(issue.completed_at)}`
      : 'This issue is closed.';
  } else {
    banner.classList.add('hidden');
  }

  // Action buttons — rendered before the async history fetch so that a
  // network failure never leaves the buttons in a stale/wrong state.
  const primary = document.getElementById('action-btn');
  const secondary = document.getElementById('action-secondary-btn');
  secondary.classList.add('hidden');
  primary.classList.remove('hidden');
  primary.disabled = false;

  switch (issue.status) {
  case 'open':
    primary.textContent = 'Claim Issue';
    primary.className = 'btn btn-primary action-btn';
    break;
  case 'in-progress':
    primary.textContent = 'Post Result';
    primary.className = 'btn btn-primary action-btn';
    break;
  case 'pending-review':
    primary.textContent = 'Approve & Close';
    primary.className = 'btn btn-primary btn-success action-btn';
    secondary.classList.remove('hidden');
    secondary.textContent = 'Send Back';
    secondary.className = 'btn btn-secondary action-btn';
    break;
  case 'blocked':
    primary.textContent = 'Unblock';
    primary.className = 'btn btn-primary action-btn';
    break;
  case 'closed':
    primary.textContent = 'Reopen';
    primary.className = 'btn btn-secondary action-btn';
    break;
  default:
    primary.textContent = 'Closed';
    primary.disabled = true;
  }

  // Fetch status history from API and render each entry as a timeline row
  try {
    const historyRes = await fetch(
      `${API_BASE}/api/issues/${id}/history`,
    );
    const historyData = await historyRes.json();
    const history = historyData.history || [];

    document.getElementById('audit-log').innerHTML = history
      .slice()
      .map(
        (entry) => `
        <div class="audit-entry">
          <div class="audit-dot ${statusDotClass(entry.issue_status)}"></div>
          <div class="audit-body">
            <span class="audit-action">${esc(entry.issue_status.replace('_', ' '))}</span>
            <span class="audit-meta">
              by ${esc(entry.changed_by_user || entry.changed_by_agent || 'agent')}
              &middot; ${fmtDateTime(entry.changed_at)}
            </span>
          </div>
        </div>
        `,
      )
      .join('');
  } catch (err) {
    console.warn('[issue] Failed to load history:', err.message);
  }
}

// ── Inline edit: title ─────────────────────────────────────
const titleText = document.getElementById('issue-title');
const titleInput = document.getElementById('issue-title-input');
titleText.addEventListener('click', () => {
  titleText.classList.add('hidden');
  titleInput.classList.remove('hidden');
  titleInput.focus();
  titleInput.select();
});
titleInput.addEventListener('blur', async () => {
  const val = titleInput.value.trim();
  if (val) {await updateIssue(id, { title: val, updatedBy: currentUser });}
  titleInput.classList.add('hidden');
  titleText.classList.remove('hidden');
  render();
});
titleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    titleInput.blur();
  }
  if (e.key === 'Escape') {
    titleInput.value = getIssue(id)?.title || '';
    titleInput.blur();
  }
});

// ── Inline edit: description ───────────────────────────────
const descText = document.getElementById('issue-desc');
const descInput = document.getElementById('issue-desc-input');
descText.addEventListener('click', () => {
  if (getIssue(id)?.status !== 'open') {return;}
  descText.classList.add('hidden');
  descInput.classList.remove('hidden');
  descInput.focus();
});
descInput.addEventListener('blur', async () => {
  const val = descInput.value.trim();
  if (val)
  {await updateIssue(id, { description: val, updatedBy: currentUser });}
  descInput.classList.add('hidden');
  descText.classList.remove('hidden');
  render();
});
descInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    descInput.value = getIssue(id)?.description || '';
    descInput.blur();
  }
});

// ── Assignee select ────────────────────────────────────────
document
  .getElementById('assignee-select')
  .addEventListener('change', async (e) => {
    await updateIssue(id, { assignee: e.target.value });
    render();
  });

// ── Priority select ────────────────────────────────────────
document
  .getElementById('priority-select')
  .addEventListener('change', async (e) => {
    await updateIssue(id, {
      priority: e.target.value,
      updatedBy: currentUser,
    });
    render();
  });

// ── Action button ──────────────────────────────────────────
document
  .getElementById('action-btn')
  .addEventListener('click', async () => {
    const issue = getIssue(id);
    if (issue.status === 'open') {
      await claimIssue(id);
      render();
    } else if (issue.status === 'in-progress') {
      document.getElementById('modal-result').classList.remove('hidden');
      document.getElementById('result-textarea').focus();
    } else if (issue.status === 'pending-review') {
      await closeIssue(id);
      render();
    } else if (issue.status === 'blocked') {
      await updateIssue(id, { status: 'open', updatedBy: currentUser });
      render();
    } else if (issue.status === 'closed') {
      await updateIssue(id, { status: 'open', updatedBy: currentUser });
      render();
    }
  });

// Send-back: from pending-review → open so an agent can pick it up again.
document
  .getElementById('action-secondary-btn')
  .addEventListener('click', async () => {
    const issue = getIssue(id);
    if (issue.status === 'pending-review') {
      await updateIssue(id, {
        status: 'open',
        updatedBy: currentUser,
      });
      render();
    }
  });

// ── Post Result modal ──────────────────────────────────────
const resultOverlay = document.getElementById('modal-result');
const resultForm = document.getElementById('form-result');

/**
 * Close the result modal without posting anything to API
 * This lets the user come back and post a result later
 */
function closeResultModal() {
  resultOverlay.classList.add('hidden');
  resultForm.reset();
}

document
  .getElementById('result-modal-close')
  .addEventListener('click', closeResultModal);
document
  .getElementById('result-cancel')
  .addEventListener('click', closeResultModal);
resultOverlay.addEventListener('click', (e) => {
  if (e.target === resultOverlay) {closeResultModal();}
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !resultOverlay.classList.contains('hidden'))
  {closeResultModal();}
});

resultForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const result = document.getElementById('result-textarea').value.trim();
  // const tokens =
  //   parseInt(document.getElementById('result-tokens').value, 10) || 0;
  const timeSpent = getIssue(id)?.time_spent || 0;
  await postResult(id, result, 0, timeSpent);
  closeResultModal();
  render();
});

// ── Initial render ─────────────────────────────────────────
render();