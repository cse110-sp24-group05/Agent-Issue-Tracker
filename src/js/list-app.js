// ── 1. IMPORTS ─────────────────────────────────────────
// bring in functions from data.js and ui.js
import {
    getIssues,
    createIssue,
    updateIssue,
    getSettings,
  } from "../../prototype/js/data.js";
  
  import {
    priBadge,
    staBadge,
    staLabel,
    createdByIcon,
    fmtRelTime,
    esc,
    flashEntity,
  } from "./ui.js";
  
  // ── 2. STATE ───────────────────────────────────────────
  // remembers if user prefers list or board view
  const VIEW_KEY = "ait_view_pref";
  let currentView = localStorage.getItem(VIEW_KEY) === "board" ? "board" : "list";
  
  // reads ?status= from URL (used when clicking dashboard pills)
  const initStatusFilter =
    new URLSearchParams(window.location.search).get("status") || "";
  
  // redirect to settings if no user set up yet
  if (!getSettings().ait_user) location.replace("settings.html");
  
  // ── 3. SUMMARY BAR ─────────────────────────────────────
  // updates the numbers on Open, In Progress, etc cards
  function updateSummary() {
      const all = getIssues();
        const c = { open: 0, 'in-progress': 0, 'pending-review': 0, blocked: 0, closed: 0 };
        all.forEach(i => { if (i.status in c) c[i.status]++; });
        document.getElementById('sum-open').textContent     = c['open'];
        document.getElementById('sum-progress').textContent = c['in-progress'];
        document.getElementById('sum-review').textContent   = c['pending-review'];
        document.getElementById('sum-blocked').textContent  = c['blocked'];
        document.getElementById('sum-closed').textContent   = c['closed'];
  
        // Highlight active pill matching filter-status
        const cur = document.getElementById('filter-status').value;
        document.querySelectorAll('.summary-bar .stat-card').forEach(el => {
          el.classList.toggle('active', el.dataset.filter === cur);
        });
  }
  
  // ── 4. LIST RENDER ─────────────────────────────────────
  // builds the table rows from issue data
  function renderList(issues) {
        const tbody = document.querySelector('.issue-table tbody');
        if (!issues.length) {
        const allIssues = getIssues();
        if (allIssues.length === 0) {
          // no issues at all
          tbody.innerHTML = `
            <tr><td colspan="7">
              <div class="empty-row">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">No issues yet!</div>
                <div class="empty-state-desc">Create your first issue to get started</div>
                <button class="btn btn-primary" id="list-empty-new-btn">
                  + New Issue
                </button>
              </div>
            </td></tr>`;
            document.getElementById('list-empty-new-btn')
              ?.addEventListener('click', () => {
                document.getElementById('btn-new-issue').click();
              });
          } else {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No issues match the current filters.</td></tr>';
          }
          return;
        }
        tbody.innerHTML = issues.map(i => `
          <tr data-issue-row data-id="${esc(i.id)}"
              data-status="${i.status}" data-priority="${i.priority}"
              data-assignee="${esc(i.assignee)}">
            <td><a class="issue-id mono" href="issue.html?id=${esc(i.id)}">${esc(i.id.replace('issue-', ''))}</a></td>
            <td><span class="badge ${priBadge(i.priority)}">${i.priority}</span></td>
            <td>
              <span class="created-by-icon" title="created by ${esc(i.created_by || 'unknown')}">${createdByIcon(i.created_by)}</span>
              <a class="issue-title-link" href="issue.html?id=${esc(i.id)}" title="${esc(i.title)}">${esc(i.title)}</a>
            </td>
            <td><span class="badge ${staBadge(i.status)}">${staLabel(i.status)}</span></td>
            <td class="${i.assignee === 'unassigned' ? 'text-muted' : ''}">${esc(i.assignee)}</td>
            <td class="align-center mono text-muted">${i.tokens_used.toLocaleString()} / ${i.token_budget.toLocaleString()}</td>
            <td class="align-center text-muted">${fmtRelTime(i.updated_at)}</td>
          </tr>`).join('');
  
        tbody.querySelectorAll('[data-issue-row]').forEach(row => {
          row.addEventListener('click', e => {
            if (e.target.closest('a')) return; // let inner links handle their own nav
            location.href = 'issue.html?id=' + row.dataset.id;
          });
        });
      }
  
  // ── 5. BOARD RENDER ────────────────────────────────────
  // builds the kanban cards and handles drag and drop
      const ZONE_ID = {
      'open':           'col-open',
      'in-progress':    'col-progress',
      'pending-review': 'col-review',
      'closed':         'col-closed',
      'blocked':        'col-blocked'
      };
      const COUNT_ID = { 'col-open': 'count-open', 'col-progress': 'count-progress', 'col-review': 'count-review', 'col-blocked': 'count-blocked', 'col-closed': 'count-closed'};
  
      let dragging = null;
  
      function makeCard(issue) {
        const div = document.createElement('div');
        div.className = 'board-card card';
        if (issue.status === 'blocked') div.classList.add('board-card-blocked');
        div.draggable = true;
        div.dataset.id = issue.id;
        div.dataset.priority = issue.priority;
        div.dataset.status = issue.status;
        div.innerHTML = `
          <div class="board-card-title">
            <span class="created-by-icon" title="created by ${esc(issue.created_by || 'unknown')}">${createdByIcon(issue.created_by)}</span>
            ${esc(issue.title)}
          </div>
          <div class="board-card-meta">
            <span class="badge ${priBadge(issue.priority)}">${issue.priority}</span>
            <span class="board-card-assignee${issue.assignee === 'unassigned' ? ' text-muted' : ''}">
              ${esc(issue.assignee)}
            </span>
            <span class="board-card-budget mono">${issue.token_budget.toLocaleString()} tok</span>
          </div>`;
  
        div.addEventListener('dragstart', e => {
          dragging = div;
          div.classList.add('dragging');
          e.dataTransfer.setData('text/plain', div.dataset.id);
          e.dataTransfer.effectAllowed = 'move';
        });
        div.addEventListener('dragend', () => { div.classList.remove('dragging'); dragging = null; });
        div.addEventListener('click', () => { location.href = 'issue.html?id=' + div.dataset.id; });
        return div;
      }
  
      function updateBoardCounts() {
        Object.entries(COUNT_ID).forEach(([zoneId, countId]) => {
          const el = document.getElementById(countId);
          if (el) el.textContent = document.getElementById(zoneId).querySelectorAll('.board-card').length;
        });
      }
  
      function renderBoard(issues) {
        ['col-open', 'col-progress', 'col-review', 'col-blocked', 'col-closed'].forEach(id => {
          document.getElementById(id).innerHTML = '';
        });
        // Blocked issues show in their pre-blocked column visually — but they have status=blocked.
        // Per spec: blocked stays in its current column with red left border. Since we don't track
        // a previous status, route blocked issues into "To Do".
        issues.forEach(issue => {
          let zoneId = ZONE_ID[issue.status];
          if (zoneId) {
              const col = document.getElementById(zoneId);
              if (col) col.appendChild(makeCard(issue));
          }
        });
        updateBoardCounts();
        // Empty state for new users or no issues at all
        // check if ALl columns are empty 
        const allEmpty = ['col-open', 'col-progress', 'col-review', 'col-blocked', 'col-closed']
          .every(id => document.getElementById(id).querySelectorAll('.board-card').length === 0);
        
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
          if (!col || col.querySelectorAll('.board-card').length > 0) return;

          if (colId === 'col-review' && allEmpty) {
            // only show CTA button when ALL columns are empty
            col.innerHTML = `
              <div class="board-empty-state board-empty-cta">
                <div class="empty-state-icon">📋</div>
                <p class="empty-state-title">No issues yet!</p>
                <p class="empty-state-desc">Create your first issue to get started</p>
                <button class="btn btn-primary btn-sm" id="empty-new-issue-btn">
                  + New Issue
                </button>
              </div>`;
            document.getElementById('empty-new-issue-btn')
              ?.addEventListener('click', () => {
                document.getElementById('btn-new-issue').click();
              });
          } else {
            // regular empty state — just a message, no button
            col.innerHTML = `
              <div class="board-empty-state">
                <p>${message}</p>
              </div>`;
          }
        });
      }
  
      document.querySelectorAll('.board-cards').forEach(zone => {
        zone.addEventListener('dragover', e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', e => {
          if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', e => {
          e.preventDefault();
          zone.classList.remove('drag-over');
          if (!dragging || dragging.parentElement === zone) return;
          const newStatus = zone.dataset.status;
          const id        = dragging.dataset.id;
          updateIssue(id, { status: newStatus, updatedBy: getSettings().ait_user || 'unknown' });
          dragging.dataset.status = newStatus;
          zone.appendChild(dragging);
          updateBoardCounts();
          applyFilters();
          // Flash the moved card/row in a color that matches the new status
          // so it's obvious where it landed in both views.
          const kind =
            newStatus === 'in-progress'    ? 'claim'    :
            newStatus === 'pending-review' ? 'complete' :
            newStatus === 'closed'         ? 'close'    :
            newStatus === 'blocked'        ? 'block'    : 'update';
          requestAnimationFrame(() => flashEntity(id, kind));
        });
      });
  
  // ── 6. FILTERS + VIEW TOGGLE + MODAL ───────────────────
  // wires up all the buttons and interactions
  function getFiltered() {
    const status   = document.getElementById('filter-status').value;
    const priority = document.getElementById('filter-priority').value;
    const assignee = document.getElementById('filter-assignee').value.trim().toLowerCase();
    const search   = document.getElementById('filter-search').value.toLowerCase();
    return getIssues().filter(i =>
      (!status   || i.status === status) &&
      (!priority || i.priority === priority) &&
      (!assignee || (i.assignee || '').toLowerCase().includes(assignee)) &&
      (!search   || i.title.toLowerCase().includes(search))
    );
  }
  
  function applyFilters() {
    const filtered = getFiltered();
    renderList(filtered);
    renderBoard(filtered);
    updateSummary();
  }
  
  // ── View toggle ──────────────────────────────────────────────────
  function setView(view) {
    currentView = view === 'board' ? 'board' : 'list';
    localStorage.setItem(VIEW_KEY, currentView);
    document.getElementById('list-view').classList.toggle('hidden', currentView !== 'list');
    document.getElementById('board-view').classList.toggle('hidden', currentView !== 'board');
    document.getElementById('view-toggle-list').classList.toggle('active', currentView === 'list');
    document.getElementById('view-toggle-board').classList.toggle('active', currentView === 'board');
  }
  
  document.getElementById('view-toggle-list').addEventListener('click', () => setView('list'));
  document.getElementById('view-toggle-board').addEventListener('click', () => setView('board'));
  
  // ── Summary pill clicks ──────────────────────────────────────────
  document.querySelectorAll('.summary-bar .stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const f   = card.dataset.filter;
      const cur = document.getElementById('filter-status').value;
      document.getElementById('filter-status').value = cur === f ? '' : f;
      applyFilters();
    });
  });
  
  // ── Filter wiring ────────────────────────────────────────────────
  ['filter-status', 'filter-priority'].forEach(id => {
    document.getElementById(id).addEventListener('change', applyFilters);
  });
  document.getElementById('filter-assignee').addEventListener('input', applyFilters);
  document.getElementById('filter-search').addEventListener('input', applyFilters);
  
  // ── Init ─────────────────────────────────────────────────────────
  if (initStatusFilter) {
    document.getElementById('filter-status').value = initStatusFilter;
  }
  setView(currentView);
  applyFilters();
  
  // ── Agent sim re-render hook ─────────────────────────────────────
  document.addEventListener('ait:data-changed', applyFilters);
  
  // ── Modal ────────────────────────────────────────────────────────
  const overlay = document.getElementById('modal-new-issue');
  const SCREENS = ['choice', 'manual', 'ai-input', 'ai-loading', 'ai-preview'];
  const TITLES = {
    choice: 'New Issue',
    manual: 'New Issue',
    'ai-input': '✨ Create with AI',
    'ai-loading': '✨ Create with AI',
    'ai-preview': '✨ AI Review',
  };
  
  function showScreen(name) {
    SCREENS.forEach(s => {
      const el = document.getElementById('screen-' + s);
      if (el) el.classList.toggle('hidden', s !== name);
    });
    document.getElementById('modal-title').textContent = TITLES[name] || 'New Issue';
  }
  
  function openModal() {
    overlay.classList.remove('hidden');
    showScreen('choice');
  }
  
  function closeModal() {
    overlay.classList.add('hidden');
    showScreen('choice');
    document.getElementById('form-new-manual').reset();
    document.getElementById('ai-desc-input').value = '';
  }
  
  document.getElementById('btn-new-issue').addEventListener('click', openModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeModal();
  });
  
  // screen navigation
  document.getElementById('choice-manual').addEventListener('click', () => {
    showScreen('manual');
    document.getElementById('new-title').focus();
  });
  document.getElementById('choice-ai').addEventListener('click', () => {
    showScreen('ai-input');
    document.getElementById('ai-desc-input').focus();
  });
  document.getElementById('manual-cancel').addEventListener('click', closeModal);
  document.getElementById('ai-input-back').addEventListener('click', () => showScreen('choice'));
  document.getElementById('ai-back-btn').addEventListener('click', () => showScreen('ai-input'));
  
  // manual form submit
  document.getElementById('form-new-manual').addEventListener('submit', e => {
    e.preventDefault();
    const issue = createIssue({
      title:          document.getElementById('new-title').value.trim(),
      description:    document.getElementById('new-description').value.trim(),
      priority:       document.getElementById('new-priority').value,
      assignee:       document.getElementById('new-assignee').value.trim() || 'unassigned',
      token_budget:   parseInt(document.getElementById('new-budget').value, 10) || 2000,
      time_estimate:  parseInt(document.getElementById('new-estimate').value, 10) || 60,
      creator:        getSettings().ait_user || 'unknown',
      created_by:     'human-manual',
    });
    applyFilters();
    closeModal();
    requestAnimationFrame(() => flashEntity(issue.id, 'create'));
  });
