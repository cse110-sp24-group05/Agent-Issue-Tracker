**Meeting Minutes \- TA meetup**  
**Date: 05/15**  
**Time: 3:00pm**  
**Location:zoom**

**Agenda**

* **Team direction**

**Notes/Changes:**

Patrick flagged two architecture ideas that don't work as-is:

* localStorage won't work because the CLI runner (npm run ait-runner) is a Node process, not a browser bc localStorage is undefined there.  
* localhost doesn't fit the spec, which requires server-side tech to run on Cloudflare or GitHub Pages.  
* GitHub Pages is static-only, so it can't host a backend or database.

A database isn't strictly required, but we want one to track users and agents.

### **Decisions**

1. We're going with Cloudflare. Fits the spec, supports a real backend, and Helena confirmed it's the cleanest path.  
2. We're using Cloudflare D1 for SQL. D1 is Cloudflare's built-in SQL database (SQLite under the hood). Pranav's existing SQL schema work ports directly; same syntax, minimal changes.  
3. Skip the local SQLite migration step. Originally Pranav was going to build a local SQL layer first and migrate to Cloudflare later. Cutting that.  it's double work. Go straight to D1 CloudFlare.  
4. Keep the website. We discussed dropping it and going CLI-only with the GitHub API, as a back up but the website is core to the concept.

**Other teams:**

### Team 1  Data & Workflow Core (Pranav)

* Convert schema.md → schema.sql for D1.  
* data.js CRUD functions now call the Cloudflare API instead of localStorage.  
* Define API contract with Team 3\.  
* UI helpers (ui.js) :  no change.

### Team 2 Frontend & UX (Nick)

* Keep building as planned. No changes to wireframes, Kanban, pages.  
* When wiring real data (Week 8), call the Cloudflare API via fetch('/api/...').  
* Wait for api-contract.md from Team 3 before integration.

### Team 3  Agent Workflow & DevOps (Jayden)

* API endpoints (/api/issues, /api/claim, /api/complete) become Cloudflare Workers.  
* Workers query D1 via env.DB.prepare(...). Coordinate schema with team 1\.  
* GitHub Actions deploys via wrangler deploy.  
* Update ADR

**Overall**

* **Helena has office hours on Mondays 4:30 \- 5:30**   
* **We’ll be going to Powell’s office hours Wednesday, 2-4 next week (time tbd). Not all are required but this is for our one time meeting requirement w prof as well.**   
* **She mentioned based on the current scope of our project, it needs more work, so be prepared to have a heavy load this upcoming weeks.**  
* **There are open issues on github that are already in progress or done, make sure you assign them to the member that worked on that, and Close\! U can also divide to sub issues.**