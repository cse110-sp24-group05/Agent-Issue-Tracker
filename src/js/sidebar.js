/* Code for rendering and handling the sidebar */

class Sidebar extends HTMLElement {
	
	
	constructor() {
		super(); 
		this.toggled = true;
	}

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
						<a class="sidebar-tab active" href="dashboard.html">
							Dashboard
						</a>
						<a class="sidebar-tab" href="agents.html">
							Agents
						</a>
						<a class="sidebar-tab" href="reports.html">
							Reports
						</a>
					</div>
				</div>
		`
		const sidebar = this.querySelector('.sidebar');
		const toggle = this.querySelector('.sidebar-toggle');
		const tabs = this.querySelector('.sidebar-tabs');
		toggle.addEventListener('click', () => {
			if (this.toggled) {
				tabs.style.display = 'none';
				this.toggled = false;
				document.documentElement.style.setProperty("--sidebar-width", "4%");
			}
			else {
				tabs.style.display = 'flex';
				this.toggled = true;
				document.documentElement.style.setProperty("--sidebar-width", "12%");
			}
		})
	}

}

customElements.define("my-sidebar", Sidebar);