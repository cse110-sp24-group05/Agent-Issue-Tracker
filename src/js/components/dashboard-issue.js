import {
  priBadge,
  staBadge,
  staLabel,
  createdByIcon,
  fmtRelTime,
  esc,
  flashEntity,
} from "../ui.js";
import { StatusIcon } from "./status-icon.js";

export class DashboardIssue extends HTMLElement {
	
	
	constructor() {
		super(); 
		this.feedEntry = document.createElement("div");
    this.feedEntry.classList.add("feed-entry");
    this.appendChild(this.feedEntry);
	}

	set data(data) {

    console.log(this.feedEntry);
    const statusIcon = new StatusIcon();
    statusIcon.status = data.status;
    this.feedEntry.appendChild(statusIcon);
    this.feedEntry.innerHTML += `
        <div class="feed-body">
          <div class="feed-top">
            <a class="feed-issue-id" href="issue.html?id=${data.id}">${data.id}</a>
            <span class="feed-action">${data.title}</span>
          </div>
          <div class="feed-meta">by <strong>${data.created_by}</strong></div>
        </div>
        <span class="feed-time">${fmtRelTime(data.updated_at)}</span>
    `;
  }
  

}

customElements.define("dashboard-issue", DashboardIssue);