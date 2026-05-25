/* Code for rendering and handling the sidebar */

/**
 *
 */
export class StatusIcon extends HTMLElement {



  /**
   *
   */
  constructor() {
    super();

  }

  /**
   *
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
      break;
    default:
      return;
    }
    console.log(status);
    this.innerHTML = `
        <img src="./assets/svg/${fileName}.svg" class="status-icon" data-filter=${fileName}>
      `;
  }

}

customElements.define('status-icon', StatusIcon);