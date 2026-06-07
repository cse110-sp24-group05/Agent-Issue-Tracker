import { getAgentEnvLine, logout, getSettings, saveSettings, getProfile, updateName } from '../data.js';
import { saveTheme, useDarkTheme, useLightTheme, useSystemTheme, getActiveTheme } from '../themes.js';


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
      <div class="modal-overlay hidden" id="modal-settings" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
        <div class="modal settings-modal">
          <div class="modal-header">
            <div class="modal-title-group">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <h2 class="modal-title" id="settings-modal-title">Account Configuration</h2>
            </div>
            <button class="modal-close" id="settings-close" aria-label="Close">&#10005;</button>
          </div>

          <div class="settings-body-layout single-column">
            <div class="settings-content">
              
              <div class="settings-section">
                <h3 class="settings-section-title">Developer Profile</h3>
                <p class="settings-section-desc">Manage your identity and CLI access credentials.</p>
                
                <div class="form-group">
                  <label class="form-label" for="setting-email">Account Email</label>
                  <input class="form-input text-muted" type="text" id="setting-email" disabled />
                </div>

                <div class="form-group">
                  <label class="form-label" for="setting-name">Display Name</label>
                  <input class="form-input" type="text" id="setting-name" placeholder="e.g. Patrick" />
                </div>
                
                <div class="form-group">
                  <label class="form-label">AIT CLI Authorization</label>
                  <button class="btn setting-button" type="button" id="settings-copy-user-id">
                    Copy User ID
                  </button>
                  <small class="setting-subtext" style="display:block; margin-top:8px;">Paste this into your local .env file.</small>
                </div>
              </div>

              <hr class="settings-divider" />

              <div class="settings-section">
                <h3 class="settings-section-title">System Preferences</h3>
                
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

            </div>
          </div>

          <div class="modal-footer settings-footer">
            <button class="btn btn-danger" type="button" id="settings-logout">Log Out</button>
            <button class="btn btn-primary" type="button" id="settings-save-changes">Save Changes</button>
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
    const nameInput = document.getElementById('setting-name');
    const emailInput = document.getElementById('setting-email');

    // Load the current name from data.js
    const currentSettings = getSettings();
    if (nameInput && currentSettings.ait_user) {
      nameInput.value = currentSettings.ait_user;
    }

    //  Load the email
    const profile = getProfile();
    if (emailInput && profile && profile.email) {
      emailInput.value = profile.email;
    }

    // Set the initial state of the Theme dropdown from themes.js
    if (themeToggle) {
      themeToggle.value = getActiveTheme(); 
    }

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

    // Close modal via Save button and write data
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        // Save the Name
        if (nameInput) {
          const newName = nameInput.value.trim();
          if (newName) {
            saveSettings({ ait_user: newName });
          }
        }

        // Save the Theme
        saveTheme();

        // Close the modal
        settingsModal.classList.add('hidden');

        // Do async name updating after hiding the model so
        if (profile.name !== nameInput.value && nameInput.value !== '') {
          console.log('Updating name...');
          await updateName(nameInput.value);
        }

      });
    }

    // Theme toggle 
    themeToggle.addEventListener('change', () => {
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

    // Copy user ID button
    copyIdBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const line = getAgentEnvLine();
      if (!line) { return; }
      try {
        await navigator.clipboard.writeText(line);
        copyIdBtn.textContent = 'Copied!';
        setTimeout(() => { copyIdBtn.textContent = 'Copy User ID'; }, 1500);
      } catch {
        copyIdBtn.textContent = 'Failed';
        setTimeout(() => { copyIdBtn.textContent = 'Copy User ID'; }, 1500);
      }
    });
  }
}


customElements.define('settings-modal', SettingsModal);