import {
  initData,
  getIssues,
  updateIssue,
  getSettings,
} from './data.js';

import {
  priBadge,
  staBadge,
  staLabel,
  fmtRelTime,
  esc,
  flashEntity,
} from './ui.js';

import { tokenLevel, filterIssues, countByStatus } from './issue-helpers.js';
import { NoIssuesPrompt } from './components/no-issues-prompt.js';
import { UI_PRIORITY_TO_API } from './api-map.js';
import { CreateIssueModal } from './components/create-issue-modal.js';

// Remembers if user prefers list or board view
const VIEW_KEY = 'ait_view_pref';
let currentView = localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'list';

// Reads ?status= from URL (used when clicking activity pills)
const initStatusFilter =
  new URLSearchParams(window.location.search).get('status') || '';

try {
  await initData();
} catch (err) {
  console.error('[data.js] Failed to load issues:', err.message);
}

/**
 * Load the create issue modal
 */
const createIssueModal = new CreateIssueModal();
document.body.appendChild(createIssueModal);

/**
 * Updates the summary bar counts for each issue status column
 */
function updateSummary() {
  const counts = countByStatus(getIssues());

  document.getElementById('sum-open').textContent = counts['open'];
  document.getElementById('sum-progress').textContent = counts['in-progress'];
  document.getElementById('sum-review').textContent = counts['pending-review'];
  document.getElementById('sum-blocked').textContent = counts['blocked'];
  document.getElementById('sum-closed').textContent = counts['closed'];

  // Highlight active pill matching filter-status
  const cur = document.getElementById('filter-status').value;
  document.querySelectorAll('.summary-bar .stat-card').forEach((el) => {
    el.classList.toggle('active', el.dataset.filter === cur);
  });
}
/**
 * Gets issues filtered by status, priority, assignee, and search
 * @returns {Array} - Filtered list of issue objects
 */
function getFiltered() {
  const status = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;
  const assignee = document.getElementById('filter-assignee').value;
  const search = document.getElementById('filter-search').value.toLowerCase();
  return filterIssues(getIssues(), status, priority, assignee, search);
}

/**
 * Renders the list view table rows from issues data
 * @param {Array} issues - List of issue objects to display
 */
function renderList(issues) {
  const tbody = document.querySelector('.issue-table tbody');
  if (!issues.length) {
    const allIssues = getIssues();
    if (allIssues.length === 0) {
      // no issues at all
      const nip = new NoIssuesPrompt();
      tbody.appendChild(nip);
      const colgroup = document.querySelector('.issue-table colgroup');
      colgroup.remove();
      const thead = document.querySelector('.issue-table thead');
      thead.remove();
    } else {
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty-row">No issues match the current filters.</td></tr>';
    }
    return;
  }
  tbody.innerHTML = issues
    .map(
      (i) => `
          <tr data-issue-row data-id="${esc(i.id)}"
              data-status="${i.status}" data-priority="${i.priority}"
              data-assignee="${esc(i.assignee)}">
            <td><a class="issue-id mono" href="issue.html?id=${esc(i.id)}">${esc((i.display_id || '').replace('issue-', ''))}</a></td>
            <td><span class="badge ${priBadge(i.priority)}">${i.priority} - ${UI_PRIORITY_TO_API[i.priority]}</span></td>
            <td>
              <a class="issue-title-link" href="issue.html?id=${esc(i.id)}" title="${esc(i.title)}">${esc(i.title)}</a>
            </td>
            <td><span class="badge ${staBadge(i.status)}">${staLabel(i.status)}</span></td>
            <td class="${i.assignee_kind === 'open-to-all' ? 'text-muted' : ''}">${esc(i.assignee)}</td>
            <!-- <td class="token-cell">
            <div class="token-wrap">
              <div class="token-text mono text-muted">${i.tokens_used.toLocaleString()} / ${i.token_budget.toLocaleString()}</div>
              <div class="token-bar">
                <div class="token-fill ${tokenLevel(i.tokens_used, i.token_budget)}"
                    style="width: ${Math.max(0, Math.round((1 - i.tokens_used / i.token_budget) * 100))}%"></div>
              </div>
              </div>
            </td> -->
            <td class="align-right text-muted">${fmtRelTime(i.updated_at)}</td>
            
          </tr>`,
    )
    .join('');

  tbody.querySelectorAll('[data-issue-row]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        return;
      } // let inner links handle their own nav
      location.href = 'issue.html?id=' + row.dataset.id;
    });
  });
}

// Builds the kanban cards and handles drag and drop
const ZONE_ID = {
  open: 'col-open',
  'in-progress': 'col-progress',
  'pending-review': 'col-review',
  closed: 'col-closed',
  blocked: 'col-blocked',
};
const COUNT_ID = {
  'col-open': 'count-open',
  'col-progress': 'count-progress',
  'col-review': 'count-review',
  'col-blocked': 'count-blocked',
  'col-closed': 'count-closed',
};

let dragging = null;

/**
 * Creates a draggable Kanban board card element for an issue
 * @param {object} issue - The issue object to create a card
 * @returns
 */
function makeCard(issue) {
  const div = document.createElement('div');
  div.className = 'board-card card';
  if (issue.status === 'blocked') {
    div.classList.add('board-card-blocked');
  }
  div.draggable = true;
  div.dataset.id = issue.id;
  div.dataset.priority = issue.priority;
  div.dataset.status = issue.status;
  div.innerHTML = `
          <div class="board-card-title">
            ${esc(issue.title)}
          </div>
          <div class="board-card-meta">
            <span class="badge ${priBadge(issue.priority)}">${issue.priority}</span>
            <span class="board-card-assignee${issue.assignee_kind === 'open-to-all' ? ' text-muted' : ''}">
              ${esc(issue.assignee)}
            </span>
            <span class="board-card-budget mono">${issue.token_budget.toLocaleString()} tok</span>
          </div>`;

  div.addEventListener('dragstart', (e) => {
    dragging = div;
    div.classList.add('dragging');
    e.dataTransfer.setData('text/plain', div.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
  });
  div.addEventListener('dragend', () => {
    div.classList.remove('dragging');
    dragging = null;
  });
  div.addEventListener('click', () => {
    location.href = 'issue.html?id=' + div.dataset.id;
  });
  return div;
}

/**
 * Updates the issue count displayed on each Kanban board column
 */
function updateBoardCounts() {
  Object.entries(COUNT_ID).forEach(([zoneId, countId]) => {
    const el = document.getElementById(countId);
    if (el) {
      el.textContent = document
        .getElementById(zoneId)
        .querySelectorAll('.board-card').length;
    }
  });
}

/**
 * Renders the Kanban board view with issues sorted into their status columns
 * @param {Array} issues - List of issue objects
 */
function renderBoard(issues) {
  [
    'col-open',
    'col-progress',
    'col-review',
    'col-blocked',
    'col-closed',
  ].forEach((id) => {
    document.getElementById(id).innerHTML = '';
  });
  // Blocked issues show in their pre-blocked column visually — but they have status=blocked.
  // Per spec: blocked stays in its current column with red left border. Since we don't track
  // a previous status, route blocked issues into "To Do".
  issues.forEach((issue) => {
    const zoneId = ZONE_ID[issue.status];
    if (zoneId) {
      const col = document.getElementById(zoneId);
      if (col) {
        col.appendChild(makeCard(issue));
      }
    }
  });
  updateBoardCounts();
  // Empty state for new users or no issues at all
  // check if ALl columns are empty
  const allEmpty = getIssues().length === 0;

  // empty state message
  const emptyMessage = {
    'col-open': 'No open issues yet',
    'col-progress': 'No issues in progress',
    'col-review': 'No issues pending review',
    'col-blocked': 'No blocked issues yet',
    'col-closed': 'No closed issues yet',
  };

  Object.entries(emptyMessage).forEach(([colId, message]) => {
    const col = document.getElementById(colId);
    if (!col || col.querySelectorAll('.board-card').length > 0) {
      return;
    }

    if (colId === 'col-blocked' && allEmpty) {
      // only show CTA button when ALL columns are empty
      const nip = new NoIssuesPrompt();
      col.appendChild(nip);
      
    } else {
      // regular empty state — just a message, no button
      col.innerHTML = `
              <div class="board-empty-state">
                <p>${message}</p>
              </div>`;
    }
  });
}

document.querySelectorAll('.board-cards').forEach((zone) => {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', (e) => {
    if (!zone.contains(e.relatedTarget)) {
      zone.classList.remove('drag-over');
    }
  });
  zone.addEventListener('drop', async (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (!dragging || dragging.parentElement === zone) {
      return;
    }
    const newStatus = zone.dataset.status;
    const id = dragging.dataset.id;
    try {
      await updateIssue(id, {
        status: newStatus,
        updatedBy: getSettings().ait_user || 'unknown',
      });
    } catch (err) {
      console.error('[data.js] updateIssue failed:', err.message);
      return;
    }
    dragging.dataset.status = newStatus;
    zone.appendChild(dragging);
    updateBoardCounts();
    applyFilters();
    const kind =
      newStatus === 'in-progress'
        ? 'claim'
        : newStatus === 'pending-review'
          ? 'complete'
          : newStatus === 'closed'
            ? 'close'
            : newStatus === 'blocked'
              ? 'block'
              : 'update';
    requestAnimationFrame(() => flashEntity(id, kind));
  });
});

/**
 * Applies current filters and re-renders both list and board views
 */
function applyFilters() {
  const filtered = getFiltered();
  renderList(filtered);
  renderBoard(filtered);
  updateSummary();
}

/**
 * Switches between list and board view and saves the preference on localStorage
 * @param {string} view - the view preference, either 'list' or 'board'
 */
function setView(view) {
  currentView = view === 'board' ? 'board' : 'list';
  localStorage.setItem(VIEW_KEY, currentView);
  document
    .getElementById('list-view')
    .classList.toggle('hidden', currentView !== 'list');
  document
    .getElementById('board-view')
    .classList.toggle('hidden', currentView !== 'board');
  document
    .getElementById('view-toggle-list')
    .classList.toggle('active', currentView === 'list');
  document
    .getElementById('view-toggle-board')
    .classList.toggle('active', currentView === 'board');
}

document
  .getElementById('view-toggle-list')
  .addEventListener('click', () => setView('list'));
document
  .getElementById('view-toggle-board')
  .addEventListener('click', () => setView('board'));

// ── Summary pill clicks ──────────────────────────────────────────
document.querySelectorAll('.summary-bar .stat-card').forEach((card) => {
  card.addEventListener('click', () => {
    const f = card.dataset.filter;
    const cur = document.getElementById('filter-status').value;
    document.getElementById('filter-status').value = cur === f ? '' : f;
    applyFilters();
  });
});

// ── Filter wiring ────────────────────────────────────────────────
['filter-status', 'filter-priority'].forEach((id) => {
  document.getElementById(id).addEventListener('change', applyFilters);
});
document
  .getElementById('filter-assignee')
  .addEventListener('input', applyFilters);
document
  .getElementById('filter-search')
  .addEventListener('input', applyFilters);

// ── Init ─────────────────────────────────────────────────────────
if (initStatusFilter) {
  document.getElementById('filter-status').value = initStatusFilter;
}
setView(currentView);
applyFilters();

document.getElementById('btn-new-issue').addEventListener('click', () => {
  const modal = document.getElementById('modal-new-issue');
  modal.classList.remove('hidden');
});

// ── Agent sim re-render hook ─────────────────────────────────────
document.addEventListener('ait:data-changed', applyFilters);

