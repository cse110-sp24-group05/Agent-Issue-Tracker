import { getAgentEnvLine, logout } from '../data.js';
import { saveTheme, useDarkTheme, useLightTheme, useSystemTheme } from '../themes.js';


/**
 * Renders the settings modal
 * This component should be contained inside the Navbar component,
 * since the navbar is how the settings are accessed
 */
export class SettingsModal extends HTMLElement {

  /**
   * Creates a new SettingsModal element
   */
  constructor() {
    super();
  }

  /**
   * Loads the HTML for this settings modal
   */
  connectedCallback() {
    this.innerHTML = `
      <div
      class="modal-overlay hidden"
      id="modal-settings"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div class="modal settings-modal">
        <div class="modal-header">
          <div class="modal-title-group">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <h2 class="modal-title" id="settings-modal-title">Settings</h2>
          </div>
          <button class="modal-close" id="settings-close" aria-label="Close">
            &#10005;
          </button>
        </div>

        <div class="settings-body-layout">
          <aside class="settings-sidebar">
            <button class="settings-tab active" data-target="tab-general">General</button>
            <button class="settings-tab" data-target="tab-tokens">Token Usage</button>
          </aside>

          <div class="settings-content">
            
            <div id="tab-general" class="settings-tab-content">
              <div class="settings-section">
                <h3 class="settings-section-title">General</h3>
                <p class="settings-section-desc">Manage your personal profile and system-wide preferences</p>
                
                <div class="form-group">
                  <label class="form-label" for="setting-name">Your Name</label>
                  <input class="form-input" type="text" id="setting-name" placeholder="e.g. Patrick" />
                  <button class="btn setting-button" type="button" id="settings-copy-user-id">
                    Copy User ID
                  </button>
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="setting-theme">Interface Theme</label>
                  <select class="form-select" id="setting-theme">
                    <option value="system">System Default</option>
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label" for="setting-comm">Agent Communication Style</label>
                  <select class="form-select" id="setting-comm">
                    <option value="professional">Professional & Concise</option>
                    <option value="casual">Casual & Friendly</option>
                    <option value="detailed">Highly Detailed</option>
                  </select>
                </div>
              </div>

              <hr class="settings-divider" />

              <div class="settings-section">
                <h3 class="settings-section-title">Data Management</h3>
                <p class="settings-section-desc">Clear all local data and reset the tracker to first-time setup</p>
                <button class="btn btn-danger" type="button" id="settings-reset-system">
                  Reset System
                </button>
              </div>
            </div>

            <div id="tab-tokens" class="settings-tab-content hidden">
              <div class="settings-section">
                <h3 class="settings-section-title">Token Usage</h3>
                <p class="settings-section-desc">Configure spending limits and monitor agent efficiency across sprints</p>
                
                <div class="token-progress-container">
                  <div class="token-progress-track">
                    <div class="token-progress-fill" style="width: 24%;"></div>
                  </div>
                  <p class="token-progress-text"><strong>Current usage:</strong> 24,450 tokens (24%)</p>
                </div>

                <div class="setting-row">
                  <div class="setting-info">
                    <h4 class="setting-label">Global Sprint Budget</h4>
                    <p class="setting-subtext">Maximum total tokens allowed across all agents per sprint.</p>
                  </div>
                  <div class="inline-input">
                    <input class="form-input num-input large" type="text" value="100,000" />
                    <span>tokens</span>
                  </div>
                </div>

                <div class="setting-row">
                  <div class="setting-info">
                    <h4 class="setting-label">Default Issue Budget</h4>
                    <p class="setting-subtext">Automatically assign this token limit to any new issue created without a specific budget.</p>
                  </div>
                  <div class="inline-input">
                    <input class="form-input num-input large" type="text" value="2,500" />
                    <span>tokens</span>
                  </div>
                </div>

                <div class="setting-row">
                  <div class="setting-info">
                    <h4 class="setting-label">Usage Alerts</h4>
                    <p class="setting-subtext">Send a Slack/System notification when the sprint budget reaches a certain threshold.</p>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" checked>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                
                <div class="setting-row sub-row">
                  <div class="inline-input">
                    <span class="text-muted">Notify at</span>
                    <input class="form-input num-input" type="number" value="80" />
                    <span class="text-muted">% of budget</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="modal-footer settings-footer">
          <button class="btn btn-danger" type="button" id="settings-logout">
            Log Out
          </button>
          <button class="btn btn-primary" type="button" id="settings-save-changes">
            Save Changes
          </button>
        </div>
      </div>
    </div>
    `;

    const settingsModal = document.getElementById('modal-settings');
    const closeBtn = document.getElementById('settings-close');
    const saveBtn = document.getElementById('settings-save-changes');
    const themeToggle = document.getElementById('setting-theme');
    const copyIdBtn = document.getElementById('settings-copy-user-id');
    const logoutBtn = document.getElementById('settings-logout');

    // Close modal via X button
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
      });
    }

    // Close modal via overlay click
    settingsModal.addEventListener('click', (event) => {
      if (event.target === settingsModal) {
        settingsModal.classList.add('hidden');
      }
    });

    // Close modal via Save button
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
        saveTheme();
      });
    }

    // Theme toggle 
    themeToggle.addEventListener('change', (e) => {
      switch (themeToggle.value) {
      case 'light':
        useLightTheme();
        break;

      case 'dark': 
        useDarkTheme();
        break;
            
      case 'system':
        useSystemTheme();
        break;
      }
    });

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        logout();
        location.replace('login.html');
      });
    }

    // Copy user ID
    copyIdBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const line = getAgentEnvLine();
      if (!line) { return; }
      try {
        await navigator.clipboard.writeText(line);
        copyIdBtn.textContent = 'Copied!';
        setTimeout(() => { copyIdBtn.textContent = 'Copy'; }, 1500);
      } catch {
        copyIdBtn.textContent = 'Failed';
        setTimeout(() => { copyIdBtn.textContent = 'Copy'; }, 1500);
      }
    });
  }
}


customElements.define('settings-modal', SettingsModal);