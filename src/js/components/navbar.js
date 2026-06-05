import { saveTheme, useDarkTheme, useLightTheme } from '../themes.js';
import { SettingsModal } from './settings-modal.js';

/**
 * Top bar, includes tabs for different pages and for settings
 */
class Navbar extends HTMLElement {
  
  /**
   * Creates a new Navbar
   */
  constructor() {
    super(); 
  }

  /**
   * Initialize the navbar with tabs and the settings modal
   */
  connectedCallback() {
    const tabNames = ['index.html', 'activity.html'];
    const displayTabNames = ['Dashboard', 'Activity'];
    let tabsHTML = '';

    for (let i = 0; i < tabNames.length; i++) {
      let active = '';
      if (window.location.pathname.includes(tabNames[i])) {active = ' class=\'active\'';}
      tabsHTML += `<a href=${tabNames[i]}${active}>${displayTabNames[i]}</a>`;
    }

    this.innerHTML = `
      <nav class='nav'>
        <a class='nav-logo' href='index.html'>
          <img src="./assets/svg/ait-logo.svg">
        </a>
        <div class='nav-tabs'>
          ${tabsHTML}
        </div>
        <button class='nav-icon-btn' id='nav-settings-btn' aria-label='Open Settings'>
          <img src="./assets/svg/settings.svg">
        </button>
      </nav>
    `;
    

    // ─── SETTINGS MODAL WIRING ──────────────────────────────────────────
    // Wrap the logic in a function so we can wait for the DOM to load
    const wireUpSettingsModal = () => {
     
      const settingsBtn = this.querySelector('#nav-settings-btn');
      const settingsModalParent = new SettingsModal();
      this.appendChild(settingsModalParent);
      const settingsModal = document.getElementById('modal-settings');
      
      // Open modal button
      settingsBtn.addEventListener('click', () => {
        // Add the spin class
        settingsBtn.classList.add('is-spinning');
        
        // Remove it after 500ms
        setTimeout(() => {
          settingsBtn.classList.remove('is-spinning');
        }, 500);

        // Open the modal
        settingsModal.classList.remove('hidden');
      });

      if (settingsModal && settingsBtn) {
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
}

customElements.define('my-navbar', Navbar);