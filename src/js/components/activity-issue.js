import {
  fmtRelTime,
} from '../ui.js';
import { StatusIcon } from './status-icon.js';

/**
 * Represents one issue on the Activity page
 * These can appear in the live activity feed or in recent completions
 */
export class ActivityIssue extends HTMLElement {

  /**
   * Creates an empty issue object
   */
  constructor() {
    super(); 
    this.feedEntry = document.createElement('div');
    this.feedEntry.classList.add('feed-entry');
    this.appendChild(this.feedEntry);
  }

  /**
   * Populates the issue object with issue data
   */
  set data(data) {
    this.issueData = data;
    const statusIcon = new StatusIcon();
    statusIcon.status = data.status;
    this.feedEntry.appendChild(statusIcon);
    this.feedEntry.innerHTML += `
        <div class="feed-body">
          <div class="feed-top">
            <a class="feed-issue-id" href="issue.html?id=${data.id}">${data.display_id || data.id}</a>
            <span class="feed-action">${data.title}</span>
          </div>
          <div class="feed-meta">by <strong>${data.created_by}</strong></div>
        </div>
        <span class="feed-time">${fmtRelTime(data.updated_at)}</span>
    `;
  }
  

}

customElements.define('activity-issue', ActivityIssue);