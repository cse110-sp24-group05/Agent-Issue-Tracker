/**
 * Top bar, includes tabs for different pages and agent env copy (settings).
 */
import { getAgentEnvLine } from '../data.js';

class Navbar extends HTMLElement {

  /**
   * Constructor for navbar, currently has no special behavior
   */
  constructor() {
    super();
    this._onDocClick = this._onDocClick.bind(this);
  }

  /**
   * Load this navbar, and initialize tabs based on the current page location.
   * The tab link for the current tab should be 'active'.
   */
  connectedCallback() {
    const tabNames = ['activity.html', 'index.html'];
    const displayTabNames = ['Activity', 'Dashboard'];
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
