# AIT Feature Backlog

_Agreed upon by full team — Sprint 2 Week 6_
_Any changes require team discussion before updating_

---

## MVP — Week 7–8

**M1 — Issue CRUD** `P0`
Full create, read, update, delete on issues. Fields: title, description, status, priority, assignee, timestamps, token budget, time estimate. All storage goes through data.js only, all functions async.

**M2 — List view** `P0`
Main issue list. Filter by status, priority, assignee. Search by title. Each row shows priority badge, status, assignee, token budget, and who created it (human, AI-assisted, or agent). Empty state for first-time users.

**M3 — Kanban board** `P0`
Drag-and-drop across To Do / In Progress / Done. Blocked issues stay in column with a red indicator. Toggled from the list view — no separate page, always in sync.

**M4 — Agent JSON endpoint** `P0`
Clean JSON at a fixed URL. Returns open unclaimed issues only, structured for agents to read without any parsing. Read-only for MVP. Documented in api-contract.md.

**M5 — Issue claiming** `P1`
One claimant per issue, first claim wins. Logs claimant and timestamp. Claims expire after 30 minutes — issue returns to open automatically, retry count increments. After 3 failed claims the issue auto-blocks with a note for human review.

**M6 — Dashboard** `P1`
What a dev looks at while agents are running. Sprint health pills, live activity feed (refreshes every 3s, collapses duplicate status changes), token burn vs budget, breakdown by agent.

**M7 — Token + time tracking** `P1`
Token budget set per issue. Agents log actual tokens and time on completion. Dashboard shows budget vs actual. Two approval modes: Review (human approves before close) or Auto-close (closes on result post).

**M8 — Audit log** `P1`
Every state change logged — who, what, when. System writes entries for automatic events like claim expiry. Shown as a timeline on issue detail, and feeds the dashboard activity feed.

---

## How AIT initiates agents

It doesn't. A developer manually runs the runner script or tells Claude Code to check AIT. AIT is passive — it holds the queue, agents consume it on demand.

---

## Stretch — Week 9 only if MVP is solid

**S1 — LLM issue creation**
Paste rough text, get a structured issue back via Claude/OpenAI. Human confirms before it saves. Needs TA approval.

**S2 — Slack activity feed**
Incoming Webhook posts to a team channel on create, claim, and close. One fetch call, no OAuth needed.

**S3 — Runner script**
`npm run ait-runner` — polls the agent endpoint, claims the next issue, passes it to Claude, posts the result and token count back. Loops until the queue is empty.

**S4 — Personal task view**
Filtered view showing only issues assigned to the current user.

---

## Out of scope

- Any backend server
- OAuth of any kind
- Real-time multi-user sync
- GitHub API or GitHub Issues sync
- Agents autonomously executing code or opening PRs
