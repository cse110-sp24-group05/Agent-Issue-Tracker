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
          
        </div>
      </td></tr>`;

    // there's a weird bug with the button in the Kanban board having no click event
    // making the button from scratch with JS fixes this issue
    const button = document.createElement('button');
    button.id = 'list-empty-new-btn';
    button.classList.add('btn');
    button.classList.add('btn-primary');
    button.textContent = '+ New Issue';
    button.addEventListener('click', () => {
      const modal = document.getElementById('modal-new-issue');
      modal.classList.remove('hidden');
    });
    const emptyRow = this.querySelector('.empty-row');
    emptyRow.appendChild(button);
    console.log(button);

  }
  

}

customElements.define('no-issues-prompt', NoIssuesPrompt);