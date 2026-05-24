import {
  priBadge,
  staBadge,
  staLabel,
  createdByIcon,
  fmtRelTime,
  esc,
  flashEntity,
} from '../ui.js';
import { StatusIcon } from './status-icon.js';

/**
 * Component representing the Token Burn UI in the dashboard
 */
export class DashboardTokenBurn extends HTMLElement {
	
	
  /**
   * Constructor for this token burn component
   */
  constructor() {
    super(); 
  }

  /**
   * Supplies this token burn component with current token budget and usage data,
   * then loads the HTML based on that data
   */
  set data(data) {
    this.issueData = data;
    const pct = `${data.tokenCount * 100 / data.tokenMax}%`;
    this.innerHTML += `
      <div class='dash-section-head'>
          <h2 class='dash-section-title'>Token Burn</h2>
        </div>
        <div class='token-body'>

          

          <div class='token-section'>
            <div class='token-section-label'>Used This Sprint</div>
            <div class='token-total-num mono' id='token-total'>${data.tokenCount}</div>
            <div class='token-total-sub' id='token-total-sub'>of ${data.tokenMax} budget</div>
            <div class='sprint-track'>
              <div class='sprint-fill' id='sprint-fill'></div>
            </div>
            <div class='sprint-pct' id='sprint-pct'>${pct}</div>
          </div>

          

      </div>
    `;

    const fill = this.querySelector('.sprint-fill');
    console.log(fill);
    
    fill.style.setProperty('width', pct);
  }
  

}

customElements.define('dashboard-token-burn', DashboardTokenBurn);