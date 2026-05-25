import { activeStatusButton, clearDashboardIssueFilter, filterDashboardIssues, setActiveStatusButton } from '../dashboard-app.js';
import {
  priBadge,
  staBadge,
  staLabel,
  createdByIcon,
  fmtRelTime,
  esc,
  flashEntity,
} from '../ui.js';
import { StatusIcon } from './status-icon.js';

/**
 *
 */
export class DashboardStatusButton extends HTMLElement {
	
	
  /**
   *
   */
  constructor() {
    super(); 
    this.button = document.createElement('button');
    this.button.classList.add('pill');
    this.appendChild(this.button);
  }

  /**
   *
   */
  set data(data) {

    const statusIcon = new StatusIcon();
    statusIcon.status = data.status;
    this.button.appendChild(statusIcon);
    this.button.innerHTML += `
        <span class="pill-count" id="pc-open">${data.count}</span>
        <span class="pill-label">${data.status}</span>
    `;
    this.button.addEventListener('click', () => {
      if (activeStatusButton !== null) {
        activeStatusButton.classList.remove('active');
        clearDashboardIssueFilter();
        if (activeStatusButton === this.button) {
          setActiveStatusButton(null);
          return;
        }
      }
      setActiveStatusButton(this.button);
      this.button.classList.add('active');
      filterDashboardIssues('status', data.status);
    });
  }
  

}

customElements.define('dashboard-status-button', DashboardStatusButton);