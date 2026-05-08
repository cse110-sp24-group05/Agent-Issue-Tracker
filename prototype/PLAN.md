# AIT Prototype Plan

## Goal
A clickable HTML/CSS/JS prototype with no backend and no 
real data. Shows all major screens and interactions. 
Team can open it in a browser and react to it.

## Screens to build

### 1. settings.html
- Form: name, GitHub repo, PAT token, Slack webhook, LLM key
- Save button writes to localStorage
- Redirects to index.html on save
- If localStorage already has settings, skip to index.html

### 2. index.html — List view (main screen)
- Top nav: AIT logo, "List" and "Board" tabs, Settings icon
- Summary bar: total open / in-progress / pending review / closed
- Issue list: each row shows ID, title, priority badge, 
  status badge, assignee, token budget
- Filter bar: filter by status, assignee, priority
- "New Issue" button — opens a modal form
- Click any issue row → goes to issue.html?id=issue-001
- New issue modal fields: title, description, priority, 
  assignee, token budget, time estimate

### 3. board.html — Kanban view
- Three columns: To Do / In Progress / Done
- Each card shows: title, priority badge, assignee, token budget
- Drag and drop between columns updates status
- "New Issue" button same as list view
- Click any card → goes to issue.html

### 4. issue.html — Issue detail
- Full issue fields displayed: all schema fields
- Status badge (color coded)
- "Claim" button — appears only if status is open
  clicking sets claimed_by, claimed_at, status to in-progress
- "Post Result" button — appears only if status is in-progress
  clicking opens a textarea to write result + tokens used
  submitting sets result, tokens_used, status to pending-review
- "Approve & Close" button — appears only if pending-review
  clicking sets completed_at, status to closed
- Audit log section at bottom — timeline of all changes
- "Edit" button — inline edit of title, description, priority

### 5. api/issues.json
- Hardcoded array of 5-6 sample issues
- Mix of statuses: some open, one in-progress, one pending-review
- Realistic titles relevant to a software project
- This is the agent endpoint — clean, no extra fields

## Design direction
- Clean, minimal, professional — think Linear not JIRA
- Dark sidebar or top nav
- Color coded priority badges: P0 red, P1 orange, P2 blue, P3 gray
- Color coded status badges: open green, in-progress yellow, 
  pending-review purple, closed gray
- Monospace font for IDs and JSON views
- Responsive but desktop-first

## What NOT to build
- No real GitHub API calls
- No LLM calls
- No Slack integration
- No user authentication
- No multi-user sync
- No unit tests
- No error states
- No loading spinners
- No mobile-specific layouts