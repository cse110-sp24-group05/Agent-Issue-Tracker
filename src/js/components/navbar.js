/**
 * Top bar, includes tabs for different pages and for settings
 */
class Navbar extends HTMLElement {
	
	
  /**
   * Constructor for navbar, currently has no special behavior
   */
  constructor() {
    super(); 
  }

  /**
   * Load this navbar, and initialize tabs based on the current page location
   * The tab link for the current tab should be 'active'
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
				<a class='nav-logo' href='index.html'>A<span>I</span>T</a>
        <div class='nav-tabs'>
          ${tabsHTML}
        </div>
        <button class='nav-icon-btn'>
          <img src="./assets/svg/settings.svg">
        </button>
      </nav>
		`;
  }

  
    
  

}

customElements.define('my-navbar', Navbar);