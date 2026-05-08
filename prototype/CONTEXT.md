# AIT — Project Context for Claude Code

## What we're building
Agent Issue Tracker (AIT) — a web app where human developers 
and AI agents are both first-class users. Humans use the UI. 
Agents use a JSON endpoint. Both see the same data.

## Hard constraints — never violate these
- Vanilla HTML, CSS, JavaScript only — zero frameworks
- No npm, no React, no Vue, no Tailwind, no jQuery
- No backend server of any kind
- Data stored in localStorage only
- Must deploy to GitHub Pages as static files
- Separate files for HTML, CSS, and JS — no inline styles or scripts

## File structure required
prototype/
├── index.html         (main entry, issue list view)
├── board.html         (kanban board view)
├── issue.html         (issue detail view)
├── settings.html      (first-time setup form)
├── css/
│   ├── main.css       (global styles, variables)
│   ├── list.css       (list view styles)
│   ├── board.css      (kanban board styles)
│   └── issue.css      (issue detail styles)
├── js/
│   ├── data.js        (ALL localStorage reads/writes — nothing else touches localStorage)
│   ├── github.js      (GitHub API calls — isolated module)
│   ├── ui.js          (DOM rendering functions)
│   └── app.js         (page-specific logic, imports other modules)
├── api/
│   └── issues.json    (hardcoded sample data — the agent endpoint)
└── CONTEXT.md         (this file)

## Data schema — use this exactly, never deviate
{
  "id": "issue-001",
  "title": "string",
  "description": "string",
  "status": "open | in-progress | pending-review | closed",
  "priority": "P0 | P1 | P2 | P3",
  "assignee": "string",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "token_budget": 2000,
  "tokens_used": 0,
  "time_estimate": 60,
  "time_spent": 0,
  "claimed_by": null,
  "claimed_at": null,
  "completed_at": null,
  "result": null,
  "audit_log": [
    { "action": "string", "by": "string", "at": "ISO timestamp" }
  ]
}

## What this prototype is NOT
- Not wired to GitHub API (hardcoded data only)
- Not calling any LLM API
- Not sending Slack messages
- Not a finished product — just a clickable skeleton
- No form validation needed
- No error handling needed
- localStorage writes are fine but not required for prototype

## Users
- Human developer: uses the UI (list, board, issue detail)
- AI agent: reads api/issues.json — clean JSON, no auth
- Team lead: sees the dashboard summary on the list view

## Settings stored in localStorage
- user_name
- github_repo (owner/repo)
- github_token
- slack_webhook (optional)
- llm_api_key (optional)