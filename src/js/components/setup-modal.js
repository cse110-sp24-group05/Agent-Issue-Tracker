/* Code for rendering and handling the sidebar */

/**
 *
 */
class SetupModal extends HTMLElement {


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
    const aitUser = localStorage.getItem("ait_user");
    console.log(aitUser);
    if (aitUser == null) {
      this.init();
    }





  }

  init() {
    this.innerHTML = `
			<!-- ── Setup ──────────────────────────────────────────────────── -->
				<div class="settings-container">
          <div class="setup-card card">
            <div class="setup-header">
              <span class="nav-logo">A<span>I</span>T</span>
              <p class="text-muted text-sm">Agent Issue Tracker — first-time setup</p>
            </div>

            <form id="setup-form" class="setup-form" novalidate>
              <div class="form-group">
                <label class="form-label" for="ait-name">
                  Your name <span class="field-hint">required</span>
                </label>
                <input class="form-input" type="text" name="name" id="ait-name" placeholder="e.g. Patrick" autocomplete="name" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="ait-email">
                  Email address <span class="field-hint">required</span>
                </label>
                <input class="form-input" type="email" name="email" id="ait-repo" placeholder="email address" autocomplete="off" required>
              </div>
              
              

              <button type="submit" class="btn btn-primary setup-submit">
                Save and continue
              </button>
            </form>
          </div>
        </div>
		`;
    const submitButton = this.querySelector('.setup-submit');
    console.log(submitButton);
    submitButton.addEventListener('click', (event) => {
      const form = this.querySelector('.setup-form');
      event.preventDefault();
      console.log("reached?");
      const formData = new FormData(form);
      console.log(form); 
      console.log(formData);
      this.user = {};
      for (const [key, value] of formData.entries()) {  
        user[key] = value;
      }  
      this.storeUser(user);
      location.reload();
    })
  }

  storeUser(user) {
    console.log(JSON.stringify(user));
    localStorage.setItem("ait_user", JSON.stringify(user));
  }
}

export function getUser() {
  return localStorage.getItem("ait_user");
}


customElements.define('setup-modal', SetupModal);