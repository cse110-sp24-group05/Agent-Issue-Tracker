# **ADR 1: Agent Work Discovery and Claiming**

**Status:** Accepted  
 **Date:** 2026-05-15  
 **Decision-makers:** Whole Team

## **Context and Problem Statement**

AIT must decide how external AI agents discover and start assigned work. The runner is a Node.js process (npm run ait-runner), not a browser environment, which rules out browser-only approaches like localStorage.

## **Considered Options**

### **Human manually starts Claude runner**

User runs npm run ait-runner locally. Simple, but manual.

### **Claude runner polls AIT API continuously**

Runner repeatedly checks /api/issues for open tasks. More automated, but wastes resources.

### **External agent integration triggers automatically**

GitHub Actions, webhooks, or Claude integrations start work automatically. Most seamless, but more complex.

## **Decision Outcome**

Chosen option: **"Human manually starts Claude runner"**, because it is the simplest to implement and gives developers direct control over when agents begin work, without adding polling overhead or complex webhook or trigger infrastructure.

## **Consequences**

### **Good**

* Minimal setup is needed with no extra infrastructure beyond running a single CLI command  
* The developer has full control over when agent sessions begin

### **Bad**

* It is not fully automated and a human must initiate every session  
* It does not scale well if agent workloads increase significantly

## **Pros and Cons of the Options**

### **Human manually starts Claude runner**

#### **Good**

* Simple to implement with a single npm script  
* No extra infrastructure or polling loop is required

#### **Bad**

* A human must be available to trigger the runner every time

### **Claude runner polls AIT API continuously**

#### **Good**

* More automated with no human trigger needed

#### **Bad**

* Wastes resources with constant polling even when no work exists  
* Harder to implement and debug

### **External agent integration triggers automatically**

#### **Good**

* Most seamless experience and fully hands-off

#### **Bad**

* Significantly more complex to set up  
* Introduces more points of failure across external services

# **ADR 2: Human Approval Boundary**

**Status:** Accepted  
 **Date:** 2026-05-15  
 **Decision-makers:** Whole Team

## **Context and Problem Statement**

AIT must decide what AI agents can do autonomously versus what requires human review before finalizing. Agents may produce incorrect or incomplete work, and the system needs a consistent policy for handling this.

## **Considered Options**

### **Human approval required for closure**

AI can submit results, but a human closes the issue. Safer, but slower.

### **AI can close issues automatically**

Agent finishes work and closes the issue itself. Fastest, but risky.

### **Approval depends on issue type or priority**

Low-risk issues can be closed automatically, while high-risk issues require human review. Flexible, but harder to manage.

## **Decision Outcome**

Chosen option: **"Approval depends on issue type or priority"**, because it gives flexibility while still keeping human oversight for higher-risk work. Low-risk issues can be closed automatically to reduce friction, while high-risk or complex issues retain a human checkpoint.

## **Consequences**

### **Good**

* Balances automation speed with safety so humans only review what matters  
* Reduces unnecessary review overhead for routine tasks

### **Bad**

* Requires defining and maintaining rules for what counts as high-risk  
* More complex to implement than a uniform policy

## **Pros and Cons of the Options**

### **Human approval required for closure**

#### **Good**

* Safest option and a human always reviews before closing

#### **Bad**

* Slower and adds a manual step to every issue

### **AI can close issues automatically**

#### **Good**

* Fastest option with no manual review step

#### **Bad**

* Incorrect or incomplete work could be silently closed

### **Approval depends on issue type or priority**

#### **Good**

* Flexible and applies the right level of oversight per situation  
* Efficient for low-risk work

#### **Bad**

* Harder to implement and maintain classification rules

# **ADR 3: Token and Cost Governance**

**Status:** Accepted  
 **Date:** 2026-05-15  
 **Decision-makers:** Whole Team

## **Context and Problem Statement**

AIT must decide how token budgets affect agent execution and reporting. As agents call LLM APIs, token usage directly impacts cost, and the team needs a clear policy for visibility and control.

## **Considered Options**

### **Track tokens only, no budget enforcement**

AIT records token usage after work finishes. Simple, but does not prevent overspending.

### **Warn when budget is exceeded or hits a limit**

AIT shows budget warnings but lets work continue. Flexible, but still allows extra cost.

### **Stop or require approval past budget**

Agent must stop or ask for approval when over budget. Strong control, but may interrupt work.

## **Decision Outcome**

Chosen option: **"Track tokens only, no budget enforcement"**, because it keeps implementation simple while still allowing visibility into token usage and overall costs. Enforcement logic can be added in a future iteration once baseline usage patterns are understood.

## **Consequences**

### **Good**

* Simple to implement and only requires recording token counts per run  
* Gives the team cost visibility without blocking agent work

### **Bad**

* Does not prevent runaway spending if an agent loops or fails  
* No automatic alerting and usage must be reviewed manually

## **Pros and Cons of the Options**

### **Track tokens only, no budget enforcement**

#### **Good**

* Minimal implementation effort is required  
* Non-blocking and agents always complete their work

#### **Bad**

* No protection against accidental overspending

### **Warn when budget is exceeded or hits a limit**

#### **Good**

* Provides alerts without interrupting agent work

#### **Bad**

* Still allows extra cost since the warning does not stop execution

### **Stop or require approval past budget**

#### **Good**

* Offers strong cost control with a hard ceiling on spending

#### **Bad**

* May interrupt an agent mid-task and leave issues in a partial state  
* More complex to implement correctly

# **ADR 4: Failure and Recovery Handling**

**Status:** Accepted  
 **Date:** 2026-05-15  
 **Decision-makers:** Whole Team

## **Context and Problem Statement**

AIT must decide what happens when an AI agent fails, produces incomplete work, or needs revision. Without a clear policy, failed issues may loop indefinitely or block other work.

## **Considered Options**

### **Send issue back to column 1**

Human requests changes and the agent keeps working. Good for iteration, but may loop repeatedly.

### **Mark issue as blocked for both human and agent**

Issue is paused with a reason attached. Clear visibility, but stops progress.

### **Escalate to human owner**

A person takes over the issue. Reliable fallback, but increases human workload.

## **Decision Outcome**

Chosen option: **"Mark issue as blocked for both human and agent"**, because it gives clear visibility into failures while preventing repeated failed attempts or looping behavior. Both humans and agents can see the blocked state, and a reason is attached explaining why progress stopped.

## **Consequences**

### **Good**

* Prevents infinite retry loops and the issue halts cleanly on failure  
* Transparent and the reason for blocking is visible to all stakeholders

### **Bad**

* Stops forward progress until a human manually unblocks the issue  
* Requires the team to monitor and triage blocked issues regularly

## **Pros and Cons of the Options**

### **Send issue back to column 1**

#### **Good**

* Keeps the issue active and the agent can retry

#### **Bad**

* Risk of infinite loops if the root cause is not addressed

### **Mark issue as blocked for both human and agent**

#### **Good**

* Blocked state is immediately clear and visible to everyone  
* Execution stops cleanly with no loops until manually unblocked

#### **Bad**

* Requires human intervention to resume progress

### **Escalate to human owner**

#### **Good**

* Reliable fallback where a person takes full ownership

#### **Bad**

* Increases human workload and undermines automation goals

# **ADR 5: Data Storage and API Architecture**

**Status:** Accepted  
 **Date:** 2026-05-15  
 **Decision-makers:** Whole Team

## **Context and Problem Statement**

AIT initially used a static issues.json file with data.js for storing and handling issue data, and localStorage was considered for client-side persistence. As the project expanded these approaches became unviable: localStorage is undefined in the Node.js runner process, and GitHub Pages is static-only and cannot host a backend. The team needed a scalable, spec-compliant storage and API solution.

## **Considered Options**

### **JSON file storage using issues.json and data.js**

Store issue, agent, and user data directly inside JSON files.

### **localStorage for client-side persistence**

Store issue data in the browser using localStorage.

### **Local SQLite with later migration to Cloudflare D1**

Develop locally with SQLite before migrating to the cloud.

### **Cloudflare Workers combined with Cloudflare D1**

Use Cloudflare Workers as the backend API layer with D1 as the database.

## **Decision Outcome**

Chosen option: **"Cloudflare Workers combined with Cloudflare D1"**, because Cloudflare fits the spec, supports a real backend and database, and was confirmed by the TA as the cleanest path. D1 is SQLite under the hood so the existing schema.sql ports directly with minimal changes. Skipping the local SQLite migration layer eliminates double work.

## **Consequences**

### **Good**

* Spec-compliant and Cloudflare is explicitly listed as an allowed deployment target  
* Existing schema.sql ports directly to D1 with minimal changes  
* workers.js replaces data.js as the API logic layer giving a cleaner separation of concerns  
* GitHub Actions can deploy automatically via wrangler deploy

### **Bad**

* Team must learn Cloudflare Workers and wrangler tooling  
* Local development requires wrangler dev rather than a simple file server

## **More Information**

As of the 05/15 meeting:

* schema.sql is now the source of truth and replaces schema.md  
* wrangler.toml has been added for environment configuration  
* workers.js replaces data.js



# **ADR 006: Consolidate non-code folders under /docs and enforce lowercase naming**

**Status:** Accepted
**Date:** 2026-05-19
**Decision-makers:** Patrick Chung

## Context and Problem Statement

Non-code folders (`Docs/`, `Meetings/`, `Research/`) were scattered at the repo root alongside code infrastructure, making the root noisy and inconsistent. Folder names used mixed case, which causes path resolution failures on Linux (CI/CD, Cloudflare) even when paths work locally on macOS.

## Decision Outcome

Consolidate all non-code planning and documentation folders under `/docs`. Rename all folders and files to lowercase with hyphens for multi-word names. Config files and conventionally uppercase files (`README.md`, `CHANGELOG.md`, `CLAUDE.md`, `LICENSE`) are not affected.

## Consequences

### Good

- Root is cleaner and the code/non-code split is immediately obvious
- Eliminates case-sensitivity bugs between local macOS development and Linux CI/CD
- Consistent with open-source conventions

### Bad

- Existing links or references to old paths need updating
- Contributors need to be informed of the new structure

## New structure

```
docs/
  meetings/
  research/
  decisions/
  api-contract.md
  architecture.md
  workflow.md
  schema.md
src/
migrations/
.github/
README.md
CHANGELOG.md
CLAUDE.md
wrangler.toml
package.json
```


# ADR 007: Workspace ID for User Isolation

**Status:** Accepted
**Date:** 2026-05-19
**Decision-makers:** Whole Team

## Context and Problem Statement

AIT is deployed on Cloudflare with a shared D1 database. Each user needs isolated data without a login flow.

## Considered Options

### Random UUID stored in localStorage
On first visit, generate a UUID and store it in localStorage. Send it as a header on every request. Worker scopes all queries by it.

### Full authentication (email/password or magic link)
User signs up, logs in, server issues a session token. Standard auth flow.

## Decision Outcome

Chosen option: **Random UUID stored in localStorage**, because it requires three lines of code, no auth provider, no session management, and no signup friction. The UUID is the user. Every D1 query filters by `workspace_id` so data is fully isolated.

## Consequences

### Good

- Trivial to implement
- No signup or login flow for the user
- Works immediately on first visit
- Agent workflow is identical — runner receives the workspace ID and sends it as a header

### Bad

- Identity is browser-bound — clearing localStorage loses access to the workspace
- No recovery flow if the ID is lost
- Not suitable if AIT ever needs real identity verification

# ADR 008: Schema and Database Modification

**Status:** Accepted
**Date:** 2026-05-28
**Decision-makers:** Whole Team

## Context and Problem Statement

We need a way to incorporate logs and a history of status changes and updates to an issue on AIT, including the timestamp they were updated/changed at. The problem is that as of right now, with our current schema and database setup, our json fields (notably things like issue_status) can only hold one value at a time, preventing our issues table from storing a full history of a given issue’s timeline.

### Additional Table in DB: `issue_status_history`
We added an additional table to the database called `issue_status_history`, and we also added 3 triggers that activate whenever an issue is updated in any way, newly created, or deleted entirely. The changes would all be reflected in the new issue_status_history table. It has fields: `id`, `issue_id`, `issue_status`, `changed_at`, `changed_by_user`, and `changed_by_agent`. The triggers live under the issues table.

## Decision Outcome:
The Schema has been modified, and these changes are reflected on our D1 Cloudflare database as well. 

## Consequences

### Good

- Minimal edits or changes needed to be made to the backend logic, as we only needed to add a new endpoint and function
- Now we have a full timeline of changes that occur for the issues, as well as a way to query these changes to be used for the audit logs.

### Bad

- Storage and performance take a small hit from adding an extra table (very minor)
