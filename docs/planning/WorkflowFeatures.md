**Workflow \+ Features**

**Human Workflow**:

1. Workspace (Team Site)  
- The application provides a team workspace that serves as the central hub for all project activity.  
- Within this workspace, users can: View all tasks/issues, track project progress, organize work through lists and boards  
2. Task Management (Core Interaction)  
- Users can create and manage tasks (issues) with the following capabilities:  
  - Creating a Task  
    - Enter title  
    - Add description/details  
    - Set: Priority (low / medium / high), Due date  
    - Assign to a team member  
    - Add comments  
- Updating a Task  
  - Edit task details at any time  
  - Add comments for progress updates  
  - Reassign task if needed  
3. Assignment & Personal Views  
- Users can organize their work using filters such as: “Assigned to me”, “Due this week”, Sort by: Priority or Due date  
4. Board View (Kanban Workflow)  
- Tasks are visualized in a board with three states: To Do, In Progress, Done  
- Users can: Drag and drop tasks between columns, visually track progress across the project, state transitions by moving a task between columns automatically to update its status  
5. Task-State Synchronization  
- The board view and task details are always consistent  
- Any status change updates the task immediately and is reflected across all views (list, filters, board)

**AI agent workflow:**

1. Workspace (clean JSON endpoint, connected to the same database as the human UI side, but as a separate API)  
- Provides the AI agent with the context that the UI provides to the human workflow side (updates dynamically from them sharing the same source)  
- the agent can then read, and look for tasks   
2. Managing Tasks  
- Upon reading the context, the agent can do the following:  
  - detect task statuses (i.e. blocked, taken, or completed),   
  - Filters and prioritizes tasks based on due date and tags/labels 

(Optional/Probably Not Necessary): It can also make suggestions for task re-prioritization; Additionally, automatically assign corresponding labels for tasks/issues 

3. Task Assignment and Claiming Work  
- Can claim available tasks (not blocked or taken) and do work  
- Claims tasks based on a priority system, (i.e. due date, availability status, tags/labels, etc.)  
  - Dynamically updates task details and status, as well as progress  
    - Marks task as taken, (i.e. Assignee: AgentID); prevents others from taking the same task  
4. Task Monitoring   
- We can have a structure like a task graph where nodes can represent tasks, edges can be dependencies, and each node (task) can have states/statuses like ToDo (open/available to claim), InProgress, Failed, Done   
- Newly claimed tasks are pushed into a queue, task graph is built/updated  
- Agent picks ready tasks and executes  
  - (dependencies need to be satisfied before some corresponding task can be completed); creates more structure and prevents skipping prerequisites some tasks may have  
  - The structure is state-machine-esque in the sense that each task flows like a series of states: Claim Task → InProgress → Done (if task Failed, then follow the policies for retrying or terminate and mark the task as Incomplete, set an error flag)  
- Agent dynamically updates a node’s status upon completion of a task it has claimed (whether it was successful or not)  
- Event Listeners \- monitor for events like task completion, errors, etc.  
- Upon completion of a task, dynamically updates audit logs with timestamp and agent ID, etc.  
5. Synchronization  
- Reads logs and JSON environment to get most up-to-date context  
- This would reflect all changes made by both the human side and AI agent side  
- Frequency: TBD (i.e. after completion of a task)

**MVP features backlog:** is a prioritized list of the most essential features you need to build first to validate your idea quickly with real users

1. CRUD Issues  
- You must can create, read, update and delete issues \- fundamental features for an issue tracker  
2. 2 views of tracking:   
- The Human side:  
+  a standard board/simple list of issues  
+ Create: title, description  
+ Update: status, updates immediately  
+ Assign: who work on it, who fix it  
+ Search, filter  
+ easy to use, approach for new users  
- The Agent side:   
+ clean JSON at a known and fixed URL.   
+ Don’t need to scrape the UI.  
+ Matches EXACTLY the UI data  
3. Issue claiming:  
- Two cannot work on the same issues: prevent conflict  
- Lock from double-claiming  
- Only one succeeds, if two works on the same issues  
- Claim timestamps, IDs  
4. Token \+ time tracking:  
- Time: how long it takes for each issue  
- Update actual tokens consumed  
- Budget vs. actual  
5. Audit log:   
- Who, what, when changed  
- Every changes update immediately  
- Maybe notify the manager?

**create a backlog file on github**

**MVP features backlog:**

* Issue CRUD — the foundation of any issue tracker. Create, read, update, delete issues with fields: title, description, status, priority, assignee, due date, timestamps. Without this nothing else functions. Every major tracker (JIRA, Linear, GitHub Issues) is CRUD at its core — the domain layer on top is what differentiates them.  
* Dual view (human \+ agent) — the core architectural decision that makes AIT different from existing tools. The human side is a standard list \+ kanban board, fast and low-friction. The agent side is a clean JSON endpoint at a fixed URL that mirrors the exact same data — no UI scraping, no markdown parsing, no ambiguity. This directly addresses the gap in GitHub Issues and JIRA where agents have to interpret HTML and guess at structure.  
* Issue claiming — prevents two agents (or a human and agent) from working the same issue simultaneously, a real concurrency problem in multi-agent workflows. A claim locks the issue to one claimant via timestamp \+ ID. Only the first claim succeeds. This is how tools like Beads handle agent coordination and it's a pattern emerging across agent-native systems.  
* Token \+ time tracking — the feature that has no equivalent in any existing tracker. Each issue carries a token budget. When an agent closes an issue it logs actual tokens consumed. The sprint dashboard shows budget vs. actual across all issues. As LLM API costs become a real line item for engineering teams, this kind of visibility is increasingly necessary — Gartner projects 40% of enterprise software will embed AI agents by end of 2026\.  
* Audit log — every state change on every issue is recorded: who changed it, what changed, when. Essential for agent accountability since agents can act confidently and incorrectly. In human workflows this is standard (JIRA has full history); in agent workflows it becomes critical because there is no human memory of what the agent did or why.

Stretch (Week 9\)

* GitHub Issues sync — mirrors AIT actions to GitHub via REST API fetch calls. AIT creates an issue → GitHub issue appears. Agent closes in AIT → GitHub closes. No backend needed, just fetch with a stored PAT. Makes AIT a layer on top of GitHub rather than a replacement, which is a stronger product story.  
* LLM-assisted issue creation — user pastes rough text (a Slack message, a standup note, a sentence). One API call to Claude or OpenAI structures it into a full issue with title, description, and suggested priority. Directly demonstrates the AI-native design philosophy of AIT.  
* Slack activity feed — Incoming Webhook posts to a team channel on create, claim, and close events. One fetch call, no OAuth, no backend. Slack's own agent platform (Agentforce) shows the direction the industry is heading — passive agent activity feeds in communication tools are becoming standard.

