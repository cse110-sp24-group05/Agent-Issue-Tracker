import { saveTheme, useDarkTheme, useLightTheme } from '../themes.js';

/**
 * Top bar, includes tabs for different pages and agent env copy (settings).
 */
import { getAgentEnvLine } from '../data.js';

class Navbar extends HTMLElement {
  

  /**
   *
   */
  constructor() {
    super();
    this._onDocClick = this._onDocClick.bind(this);
  }

  /**
   *
   * Load this navbar, and initialize tabs based on the current page location.
   * The tab link for the current tab should be 'active'.
   */
  connectedCallback() {
    const tabNames = ['index.html', 'activity.html'];
    const displayTabNames = ['Dashboard', 'Activity'];
    let tabsHTML = '';

    for (let i = 0; i < tabNames.length; i++) {
      let active = '';
      if (window.location.pathname.includes(tabNames[i])) { active = ' class=\'active\''; }
      tabsHTML += `<a href=${tabNames[i]}${active}>${displayTabNames[i]}</a>`;
    }

    const envLine = getAgentEnvLine() || 'AIT_USER_ID=';

    this.innerHTML = `
      <nav class='nav'>
        <a class='nav-logo' href='index.html'>A<span>I</span>T</a>
        <div class='nav-tabs'>
          ${tabsHTML}
        </div>
        <button class='nav-icon-btn' id='nav-settings-btn' aria-label='Open Settings'>
          <img src="./assets/svg/settings.svg">
        </button>
        <div class="nav-actions">
          <button type="button" class="nav-icon-btn" id="nav-settings-btn" aria-label="Copy agent config" aria-expanded="false">
            <img src="./assets/svg/settings.svg" alt="">
          </button>
          <div class="nav-env-popover hidden" id="nav-env-popover" role="dialog" aria-label="Agent config">
            <code class="nav-env-line" id="nav-env-line"></code>
            <button type="button" class="nav-env-copy" id="nav-env-copy">Copy</button>
          </div>
        </div>
      </nav>
    `;

    // ─── SETTINGS MODAL WIRING ──────────────────────────────────────────
    // Wrap the logic in a function so we can wait for the DOM to load
    const wireUpSettingsModal = () => {
      const settingsBtn = this.querySelector('#nav-settings-btn');
      const settingsModal = document.getElementById('modal-settings');
      const closeBtn = document.getElementById('settings-close');
      const saveBtn = document.getElementById('settings-save-changes');
      const themeToggle = document.getElementById('setting-theme');

      if (settingsModal && settingsBtn) {
        
        // Open modal
        settingsBtn.addEventListener('click', () => {
          settingsModal.classList.remove('hidden');
        });

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
        console.log(themeToggle);
        themeToggle.addEventListener('change', (e) => {
          switch (themeToggle.value) {
          case 'light':
            useLightTheme();
            break;

          case 'dark': 
            useDarkTheme();
            break;
            
          case 'system':
            const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
            if (prefersDarkMode) {useDarkTheme();}
            else {useLightTheme();}
            break;
          }
        });

        // ─── NEW TAB SWITCHING LOGIC ───
        const tabs = settingsModal.querySelectorAll('.settings-tab');
        const tabContents = settingsModal.querySelectorAll('.settings-tab-content');

        tabs.forEach(tab => {
          tab.addEventListener('click', (event) => {
            // 1. Remove 'active' from all sidebar tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // 2. Add 'active' to the specific tab that was clicked
            const clickedTab = event.target;
            clickedTab.classList.add('active');
            
            // 3. Find out which content ID this tab corresponds to
            const targetId = clickedTab.getAttribute('data-target');
            
            // 4. Loop through all content sections, show the match, hide the rest
            tabContents.forEach(content => {
              if (content.id === targetId) {
                content.classList.remove('hidden');
              } else {
                content.classList.add('hidden');
              }
            });
          });
        });

        // ─── SHOW/HIDE PASSWORD LOGIC ───
        const tokenInput = document.getElementById('setting-git-token');
        const toggleBtn = document.getElementById('toggle-git-token');

        if (tokenInput && toggleBtn) {
          toggleBtn.addEventListener('click', () => {
            // Check current input type
            const isPassword = tokenInput.getAttribute('type') === 'password';
            
            // Toggle the type
            tokenInput.setAttribute('type', isPassword ? 'text' : 'password');
            
            // Toggle the text
            const textSpan = toggleBtn.querySelector('span');
            if (textSpan) {
              textSpan.textContent = isPassword ? 'Hide' : 'View';
            }
            
            // Toggle the SVG icon (Eye vs Eye-off)
            const svgIcon = toggleBtn.querySelector('svg');
            if (isPassword) {
              // Slashed eye icon
              svgIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
            } else {
              // Standard eye icon
              svgIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
            }
          });
        }
      }
    };

    // only run the wiring function after the html is fully parsed
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', wireUpSettingsModal);
    } else {
      wireUpSettingsModal();
    }
  }
		`;

    this.querySelector('#nav-env-line').textContent = envLine;

    const settingsBtn = this.querySelector('#nav-settings-btn');
    const popover = this.querySelector('#nav-env-popover');
    const copyBtn = this.querySelector('#nav-env-copy');

    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = popover.classList.toggle('hidden');
      settingsBtn.setAttribute('aria-expanded', String(!isHidden));
      if (isHidden) {
        document.removeEventListener('click', this._onDocClick);
      } else {
        document.addEventListener('click', this._onDocClick);
      }
    });

    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const line = getAgentEnvLine();
      if (!line) { return; }
      try {
        await navigator.clipboard.writeText(line);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      } catch {
        copyBtn.textContent = 'Failed';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      }
    });
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._onDocClick);
  }

  /** @param {MouseEvent} e */
  _onDocClick(e) {
    if (this.contains(/** @type {Node} */ (e.target))) { return; }
    const popover = this.querySelector('#nav-env-popover');
    const settingsBtn = this.querySelector('#nav-settings-btn');
    popover?.classList.add('hidden');
    settingsBtn?.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', this._onDocClick);
  }
}

customElements.define('my-navbar', Navbar);
