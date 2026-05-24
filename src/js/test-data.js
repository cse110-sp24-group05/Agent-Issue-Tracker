/**
 *
 */
function _read() {
  return JSON.parse(testJson);
}

/**
 * Returns all issues from localStorage.
 * @returns {object[]}
 */
export function getIssues() {
  return _read();
}


const testJson = `[
  {
    "id": "issue-001",
    "title": "Fix: auth token expiry not refreshing on mobile",
    "description": "On iOS Safari and Chrome Android the JWT refresh call silently fails after the access token expires, forcing the user to log in again. Desktop browsers refresh correctly. Suspected root cause: refresh request is dropped when the page is backgrounded and the service worker is suspended. Needs a foreground retry on resume.",
    "status": "open",
    "priority": "P0",
    "assignee": "unassigned",
    "created_at": "2026-05-07T08:30:00Z",
    "updated_at": "2026-05-07T08:30:00Z",
    "token_budget": 3000,
    "tokens_used": 0,
    "time_estimate": 90,
    "time_spent": 0,
    "claimed_by": null,
    "claimed_at": null,
    "completed_at": null,
    "blocked_reason": null,
    "result": null,
    "created_by": "human-manual",
    "audit_log": [
      { "action": "created", "by": "patrick", "at": "2026-05-07T08:30:00Z" }
    ]
  },
  {
    "id": "issue-002",
    "title": "Feature: add keyboard shortcuts to issue list",
    "description": "Power users want to navigate the issue list without touching the mouse. Proposed bindings: j/k to move focus between rows, Enter to open the focused issue, c to claim, a to approve, ? to show a shortcut overlay. Shortcuts must not fire while typing into a form field.",
    "status": "open",
    "priority": "P1",
    "assignee": "unassigned",
    "created_at": "2026-05-06T14:10:00Z",
    "updated_at": "2026-05-06T14:10:00Z",
    "token_budget": 2500,
    "tokens_used": 0,
    "time_estimate": 90,
    "time_spent": 0,
    "claimed_by": null,
    "claimed_at": null,
    "completed_at": null,
    "blocked_reason": null,
    "result": null,
    "created_by": "llm-assist",
    "audit_log": [
      { "action": "created", "by": "llm-assist", "at": "2026-05-06T14:10:00Z" }
    ]
  },
  {
    "id": "issue-003",
    "title": "Refactor: consolidate all localStorage access into data.js",
    "description": "Several pages still read or write localStorage directly instead of going through data.js. This breaks the single-source-of-truth contract and makes it impossible to swap the storage layer later. Audit every file, route every read/write through data.js, and add a lint rule that fails on direct localStorage references outside data.js.",
    "status": "open",
    "priority": "P2",
    "assignee": "unassigned",
    "created_at": "2026-05-06T11:00:00Z",
    "updated_at": "2026-05-06T11:00:00Z",
    "token_budget": 2000,
    "tokens_used": 0,
    "time_estimate": 60,
    "time_spent": 0,
    "claimed_by": null,
    "claimed_at": null,
    "completed_at": null,
    "blocked_reason": null,
    "result": null,
    "created_by": "claude-agent-1",
    "audit_log": [
      { "action": "created", "by": "claude-agent-1", "at": "2026-05-06T11:00:00Z" }
    ]
  },
  {
    "id": "issue-004",
    "title": "Docs: update CLAUDE.md with new file ownership",
    "description": "CLAUDE.md still lists the old per-page ownership table from the early prototype. Update it to reflect the current module boundaries (data.js owns storage, ui.js owns rendering helpers, agent-sim.js owns the simulator) so future contributors and agents know what to touch and what not to touch.",
    "status": "open",
    "priority": "P2",
    "assignee": "sarah",
    "created_at": "2026-05-05T15:00:00Z",
    "updated_at": "2026-05-05T15:30:00Z",
    "token_budget": 1500,
    "tokens_used": 0,
    "time_estimate": 45,
    "time_spent": 0,
    "claimed_by": null,
    "claimed_at": null,
    "completed_at": null,
    "blocked_reason": null,
    "result": null,
    "created_by": "human-manual",
    "audit_log": [
      { "action": "created", "by": "patrick", "at": "2026-05-05T15:00:00Z" },
      { "action": "assignee changed to sarah", "by": "patrick", "at": "2026-05-05T15:30:00Z" }
    ]
  },
  {
    "id": "issue-005",
    "title": "Fix: kanban drag and drop not persisting status change",
    "description": "Dragging a card from To Do to In Progress visually updates the column but the issue's status reverts on page reload. The drop handler is updating in-memory state without calling updateIssue(), so localStorage is never written. Move the persistence call into the drop handler and add a regression test.",
    "status": "in-progress",
    "priority": "P0",
    "assignee": "claude-agent-1",
    "created_at": "2026-05-06T09:00:00Z",
    "updated_at": "2026-05-07T10:00:00Z",
    "token_budget": 2000,
    "tokens_used": 720,
    "time_estimate": 60,
    "time_spent": 25,
    "claimed_by": "claude-agent-1",
    "claimed_at": "2026-05-07T10:00:00Z",
    "completed_at": null,
    "blocked_reason": null,
    "result": null,
    "created_by": "human-manual",
    "audit_log": [
      { "action": "created", "by": "patrick", "at": "2026-05-06T09:00:00Z" },
      { "action": "claimed", "by": "claude-agent-1", "at": "2026-05-07T10:00:00Z" }
    ]
  },
  {
    "id": "issue-006",
    "title": "Feature: implement token burn progress bar on dashboard",
    "description": "The dashboard shows total tokens used as a number but no visual progress against the sprint budget. Add a horizontal progress bar with three states: under 70% green, 70–90% yellow, over 90% red. Bar is reactive to budget changes and re-renders when issues update.",
    "status": "pending-review",
    "priority": "P1",
    "assignee": "claude-agent-2",
    "created_at": "2026-05-05T13:00:00Z",
    "updated_at": "2026-05-07T16:45:00Z",
    "token_budget": 2500,
    "tokens_used": 1840,
    "time_estimate": 75,
    "time_spent": 70,
    "claimed_by": "claude-agent-2",
    "claimed_at": "2026-05-06T10:00:00Z",
    "completed_at": null,
    "blocked_reason": null,
    "result": "Implemented in dashboard.html with a .sprint-track / .sprint-fill pair driven by the existing renderTokenBurn() function. Added warn/danger modifier classes that flip at 70% and 90%. Verified the bar updates in real time when the sprint budget input changes and when the agent simulator burns tokens. No new dependencies. Screenshot attached in PR.",
    "created_by": "human-manual",
    "audit_log": [
      { "action": "created", "by": "patrick", "at": "2026-05-05T13:00:00Z" },
      { "action": "claimed", "by": "claude-agent-2", "at": "2026-05-06T10:00:00Z" },
      { "action": "submitted for review", "by": "claude-agent-2", "at": "2026-05-07T16:45:00Z" }
    ]
  },
  {
    "id": "issue-007",
    "title": "Bug: token budget not persisting after page reload",
    "description": "Editing the sprint token budget on the dashboard updates the displayed value but the change is lost when the page is reloaded. Root cause: the input's change handler only updated in-memory state. Fix saves to localStorage via data.js saveSprintBudget() on blur and reloads correctly on every page.",
    "status": "closed",
    "priority": "P1",
    "assignee": "claude-agent-1",
    "created_at": "2026-05-04T10:00:00Z",
    "updated_at": "2026-05-05T17:30:00Z",
    "token_budget": 1500,
    "tokens_used": 980,
    "time_estimate": 45,
    "time_spent": 40,
    "claimed_by": "claude-agent-1",
    "claimed_at": "2026-05-04T11:00:00Z",
    "completed_at": "2026-05-05T17:30:00Z",
    "blocked_reason": null,
    "result": "Wired the sprint budget input on dashboard.html to saveSprintBudget() in data.js on blur and on Enter. getSprintBudget() now seeds the input on initial render. Verified across reload, cross-tab, and the agent simulator's auto-loop — the value survives all three. Tokens used: 980 of 1,500 budgeted.",
    "created_by": "human-manual",
    "audit_log": [
      { "action": "claimed", "by": "claude-agent-1", "at": "2026-05-04T11:00:00Z" },
      { "action": "submitted for review", "by": "claude-agent-1", "at": "2026-05-05T15:30:00Z" },
      { "action": "approved and closed", "by": "patrick", "at": "2026-05-05T17:30:00Z" }
    ]
  },
  {
    "id": "issue-008",
    "title": "Feature: add sprint summary export to markdown",
    "description": "Team lead wants a one-click export of the current sprint's closed issues, token burn, and per-agent breakdown as a markdown file suitable for pasting into a retro doc. Layout decision is still open: should the export reflect the dashboard layout or be its own canonical format?",
    "status": "blocked",
    "priority": "P2",
    "assignee": "unassigned",
    "created_at": "2026-05-05T09:00:00Z",
    "updated_at": "2026-05-06T12:00:00Z",
    "token_budget": 2000,
    "tokens_used": 0,
    "time_estimate": 60,
    "time_spent": 0,
    "claimed_by": null,
    "claimed_at": null,
    "completed_at": null,
    "blocked_reason": "waiting for dashboard layout decision",
    "result": null,
    "created_by": "human-manual",
    "audit_log": [
      { "action": "created", "by": "patrick", "at": "2026-05-05T09:00:00Z" },
      { "action": "blocked: waiting for dashboard layout decision", "by": "patrick", "at": "2026-05-06T12:00:00Z" }
    ]
  }
]
`;