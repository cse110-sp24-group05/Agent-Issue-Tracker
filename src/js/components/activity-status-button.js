import { STA_LABEL } from '../ui.js';

import { StatusIcon } from './status-icon.js';

/**
 * Renders a button for one of the 5 issue status values
 * On the activity page, this can filter for issues with that status
 */
export class ActivityStatusButton extends HTMLElement {
	
	
  /**
   * Creates a new empty button
   */
  constructor() {
    super(); 
    this.button = document.createElement('button');
    this.button.classList.add('pill');
    this.appendChild(this.button);
  }

  /**
   * Populates the button based on the status and issue count values in data
   */
  set data(data) {

    const statusIcon = new StatusIcon();
    statusIcon.status = data.status;
    this.button.appendChild(statusIcon);
    this.button.innerHTML += `
        <span class="pill-count" id="pc-open">${data.count}</span>
        <span class="pill-label">${STA_LABEL[data.status]}</span>
    `;
    this.button.addEventListener('click', () => {
      // if (activeStatusButton !== null) {
      //   activeStatusButton.classList.remove('active');
      //   clearActivityIssueFilter();
      //   if (activeStatusButton === this.button) {
      //     setActiveStatusButton(null);
      //     return;
      //   }
      // }
      // setActiveStatusButton(this.button);
      // this.button.classList.add('active');
      // filterActivityIssues('status', data.status);
      const newUrl = window.location.pathname.replace('activity.html', `index.html?status=${data.status}`);
      window.location.assign(newUrl);
    });
  }
  

}

customElements.define('activity-status-button', ActivityStatusButton);