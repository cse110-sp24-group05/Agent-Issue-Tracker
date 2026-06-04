import { STA_LABEL } from '../ui.js';

import { StatusIcon } from './status-icon.js';

/**
 * Component that appears in the dashboard/activity pages when there's no issues
 * Prompts the user to create a new issue
 */
export class NoIssuesPrompt extends HTMLElement {
  
  
  /**
   * Creates a new no issues prompt
   */
  constructor() {
    super(); 
  }

  /**
   * Initialize HTML
   */
  connectedCallback() {
    this.innerHTML = `
            <tr><td colspan="7">
              <div class="empty-row">
                <div class="empty-state-title">No issues yet!</div>
                <div class="empty-state-desc">Create your first issue to get started</div>
                <button class="btn btn-primary" id="list-empty-new-btn">
                  + New Issue
                </button>
              </div>
            </td></tr>`;

  }
  

}

customElements.define('no-issues-prompt', NoIssuesPrompt);