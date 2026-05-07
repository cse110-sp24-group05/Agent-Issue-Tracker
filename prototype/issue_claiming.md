# M5 — Issue Claiming

Each issue has an `assignment_mode` set to `human_only`, `ai_only`, or `open_to_both`, plus fields for `status`, `claimed_by_type`, `claimed_by_id`, and `claimed_at`(a claimed time).

When an issue is created, it starts as **Open** and can only be claimed by an allowed worker type:

- If it is `human_only`, only a human user can claim it.
- If it is `ai_only`, only a coding agent(Codex, Gemini, Claude Code, etc) can claim it.
- If it is `open_to_both`, either can claim it.

Claiming changes the issue to **In Progress**, writes a lock so no second claimant can take it, and stores the claimant ID and timestamp for history.

If the issue is assigned/claimed to/by a **human**, the human claims it, the issue is locked to that user, and the status moves to **In Progress**. The human works on a GitHub branch, opens a PR, gets review, and after merge the issue is marked **Done**.

If the issue is assigned/claimed to/by **AI**, the agent claims it through AIT, the issue is locked to that agent, and AIT sends the task context to the AI coding agent The agent works on the code task, updates progress in AIT, opens or proposes a PR in GitHub, and a human reviews before merge and final issue closure.

So we can think that **assignment mode** as permission, **claiming** as a one time lock, so:

- AIT = task system for human/AI coordination
- GitHub = code system for branches, PRs, testing, and merge
- AI agent = a worker that reads tasks from AIT and produces code in GitHub
- Human = either the worker or the reviewer


***
***
***


## Workflow if Issue is Assigned to AI

**Open → Ready → Assigned to AI → In Progress → PR Open → Human Review → Merged → Done**

## Workflow if Issue is Assigned to a Human

**Open → Ready → Assigned to Human → In Progress → PR Open → Peer Review → Merged → Done**


### What happens in each step:

- **Open / Ready:** User creates issue in AIT with clear description, dependencies, and done criteria
- **Assigned to AI:** The agent becomes the "owner"
- **In Progress:** The agent claims the task and starts work
- **PR Open:** The agent creates a branch and opens a PR in GitHub
- **Human Review:** A person reviews the PR
- **Merged:** After approval, code is merged
- **Done:** AIT marks the issue complete and may unblock dependent issues