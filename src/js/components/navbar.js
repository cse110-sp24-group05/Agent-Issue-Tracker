/* Code for rendering and handling the sidebar */

class Navbar extends HTMLElement {
	
	
	constructor() {
		super(); 
		
	}

	connectedCallback() {
		this.innerHTML = `
			<nav class="nav">
				<a class="nav-logo" href="index.html">A<span>I</span>T</a>
			</nav>
		`
	}

}

customElements.define("my-navbar", Navbar);