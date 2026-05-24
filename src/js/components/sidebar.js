/* Code for rendering and handling the sidebar */

/**
 *
 */
class Sidebar extends HTMLElement {
	
	
  /**
   *
   */
  constructor() {
    super(); 
    this.toggled = true;
  }

  /**
   *
   */
  connectedCallback() {
    this.innerHTML = `
			<!-- ── Sidebar ──────────────────────────────────────────────────── -->
				<div class="sidebar">
					<button class="sidebar-toggle">
						<img src="./Assets/svg/sidebar-toggle.svg">
					</button>
					<div class="sidebar-tabs">
						<a class="sidebar-tab" href="index.html">
							Issues
						</a>
						<a class="sidebar-tab" href="dashboard.html">
							Dashboard
						</a>
					</div>
				</div>
		`;

    // initialize variables
    const sidebar = this.querySelector('.sidebar');
    const toggle = this.querySelector('.sidebar-toggle');
    const tabs = this.querySelector('.sidebar-tabs');
    const root = document.querySelector(':root');
    const rootStyle = getComputedStyle(root);
    const widthActive = rootStyle.getPropertyValue('--sidebar-width');
    const widthHidden = rootStyle.getPropertyValue('--sidebar-width-hidden');
    const tabButtons = tabs.querySelectorAll('.sidebar-tab');

    // sidebar toggle behavior: hide tabs, make sidebar narrower
    toggle.addEventListener('click', () => {
      if (this.toggled) {
        tabs.style.display = 'none';
        this.toggled = false;
        sidebar.style.setProperty('width', widthHidden);
      }
      else {
        tabs.style.display = 'flex';
        this.toggled = true;
        sidebar.style.setProperty('width', widthActive);
      }
    });

    tabButtons.forEach((button) => {
      if (window.location.pathname.includes(button.getAttribute('href'))) {
        button.classList.add('active');
      }
    });
		

  }

}

customElements.define('my-sidebar', Sidebar);