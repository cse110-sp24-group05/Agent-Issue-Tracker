import { createIssue, getSettings } from '../data.js';

/**
 * Popup that appears prompting the user to create a new issue
 * Clicking a button that says "+New Issue" should typically open this modal
 */
export class CreateIssueModal extends HTMLElement {

  /**
   * Create the CreateIssueModal, which should be hidden by default
   */
  constructor() {
    super(); 
  }

  /**
   * Initialize the navbar with tabs and the settings modal
   */
  connectedCallback() {
    this.innerHTML = `
    <div
      class="modal-overlay hidden"
      id="modal-new-issue"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-title">Create New Issue</h2>
          <button class="modal-close" id="modal-close" aria-label="Close">
            &#10005;
          </button>
        </div>

        <form class="modal-body" id="form-new-manual">
          <div class="form-group">
            <label class="form-label" for="new-title">Title<span class="required">*</span></label>
            <input
              class="form-input"
              type="text"
              id="new-title"
              placeholder="Short description of the issue"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-description">Description</label>
            <textarea
              class="form-textarea"
              id="new-description"
              placeholder="What needs to be done and why?"
              rows="3"
            ></textarea>
          </div>
          <div class="modal-row">
            <div class="form-group">
              <label class="form-label" for="new-priority">Priority</label>
              <select class="form-select" id="new-priority">
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2" selected>P2</option>
                <option value="P3">P3</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="new-assignee">Assignee</label>
              <select class="form-select" id="new-assignee">
                <option value="human-only">Human-only</option>
                <option value="open-to-all" selected>Open-to-all</option>
                <option value="ai-only">AI-only</option>
              </select>
            </div>
            <!-- <div class="form-group">
              <label class="form-label" for="new-budget ">Token Budget</label>
              <input
                class="form-input"
                type="number"
                id="new-budget"
                placeholder="2000"
                min="0"
                max="100000"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="new-estimate">Time Estimate aaaa(min)</label>
              <input
                class="form-input"
                type="number"
                id="new-estimate"
                placeholder="60"
                min="0"
              />
            </div> -->
          </div>
        </form>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" id="manual-cancel">
            Cancel
          </button>
          <button class="btn btn-primary" type="submit" form="form-new-manual">
            Create Issue
          </button>
        </div>
      </div>
    </div>
    `;
    // ── Modal ────────────────────────────────────────────────────────
    const overlay = document.getElementById('modal-new-issue');

    /**
     * Opens the new issue modal and focuses the title input
     */
    function openModal() {
      overlay.classList.remove('hidden');
      document.getElementById('new-title').focus();
    }

    /**
     * Closes the new issue modal and resets the form
     */
    function closeModal() {
      overlay.classList.add('hidden');
      document.getElementById('form-new-manual').reset();
    }

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('manual-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        closeModal();
      }
    });

    // manual form submit
    document
      .getElementById('form-new-manual')
      .addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const issue = await createIssue({
            title: document.getElementById('new-title').value.trim(),
            description: document.getElementById('new-description').value.trim(),
            priority: document.getElementById('new-priority').value,
            assignee:
          document.getElementById('new-assignee').value || 'open-to-all',
            token_budget:
          parseInt(document.getElementById('new-budget').value, 10) || 2000,
            time_estimate:
          parseInt(document.getElementById('new-estimate').value, 10) || 60,
            creator: getSettings().ait_user || 'unknown',
            created_by: 'human-manual',
          });
          closeModal();
        } catch (err) {
          console.error('[data.js] createIssue failed:', err.message);
          alert(`Could not create issue: ${err.message}`);
        }
      });

  }
}


customElements.define('create-issue-modal', CreateIssueModal);