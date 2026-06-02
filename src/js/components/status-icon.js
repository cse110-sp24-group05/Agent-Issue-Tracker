/* Code for rendering and handling the sidebar */

import { getActiveTheme } from '../themes.js';

/**
 *
 */
export class StatusIcon extends HTMLElement {



  /**
   * Creates a new StatusIcon element
   */
  constructor() {
    super();

  }

  /**
   * Set the status belonging to this StatusIcon
   * These can be open, in-progress, blocked, pending, or closed
   */
  set status(status) {
    let fileName;
    switch (status) {
    case 'open':
      fileName = 'todo';
      break;
    case 'in_progress':
    case 'in-progress':
      fileName = 'in-progress';
      break;
    case 'blocked':
      fileName = 'blocked';
      break;
    case 'pending-review':
    case 'pending':
    case 'review':
      fileName = 'pending';
      break;
    case 'closed':
      fileName = 'closed';
      const activeTheme = getActiveTheme();
      if (activeTheme === activeTheme.LIGHT) {
        this.style.setProperty('filter', 'var(--filter-issue-closed)');
      }
      else if (activeTheme === activeTheme.DARK) {
        this.style.setProperty('filter', 'var(--filter-issue-closed-dark)');
      }
      break;
    default:
      return;
    }
    this.innerHTML = `
        <img src="./assets/svg/${fileName}.svg" class="status-icon" data-filter=${fileName}>
      `;
  }

}

customElements.define('status-icon', StatusIcon);