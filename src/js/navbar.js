/* Code for rendering and handling the sidebar */

class Navbar extends HTMLElement {
	
	
	constructor() {
		super(); 
		
	}

	connectedCallback() {
		this.innerHTML = `
			<!-- ── Nav ──────────────────────────────────────────────────── -->
      <nav class="nav">
				<a class="nav-logo" href="index.html">A<span>I</span>T</a>
				<div class="nav-actions">
					<a class="nav-icon-btn" href="profile.html" title="Profile" aria-label="Profile">
						<img src="Assets/svg/profile.svg" alt="Profile" width="20" height="20">
					</a>
					<a class="nav-icon-btn" href="settings.html" title="Setiings" aria-label="Settings">
						<img src="Assets/svg/settings.svg" alt="Settings" width="25" height="25">
					</a>
				</div>
			</nav>

		`
	}

}

customElements.define("my-navbar", Navbar);