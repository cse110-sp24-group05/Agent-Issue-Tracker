// Imports
import { ActivityIssue } from './components/activity-issue.js';
import { ActivityStatusButton } from './components/activity-status-button.js';
import { CreateIssueModal } from './components/create-issue-modal.js';
import { NoIssuesPrompt } from './components/no-issues-prompt.js';
import {
  initData,
  getIssues,
} from './data.js';


await initData();
const issuesList = await getIssues();
const issueObjects = [];
export let activeStatusButton = null;
/**
 * Sets which status button was clicke most recently
 * That way, clicking a status button can update the state
 * of the previous status button from active to inactive
 * @param {HTMLElement} button - The status button which was just clicked
 */
export function setActiveStatusButton(button) {
  activeStatusButton = button;
}
const API_BASE =
  localStorage.getItem('ait_api_base')
  || ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:8787'
    : 'https://agent-issue-tracker.stc021.workers.dev');

const feedParent = document.querySelector('.feed-list');
// const completionsParent = document.querySelector('.dash-completions-section');
const statusButtonsParent = document.querySelector('.sprint-pills');
const statusNames = ['Open', 'In Progress', 'Blocked', 'Pending Review', 'Closed'];
const statusNamesRaw = ['open', 'in-progress', 'blocked', 'pending-review', 'closed'];
/**
 * Initializes activity UI after loading the issues
 */
async function loadActivity() {
  // The issues are sorted by most recently updated
  // Note that the schema doesn't have an 'audit log' for issue changes,
  // so the activity activity feed can only show the most recent
  // update for each issue
  loadIssues();
  loadStatusButtons();
  // loadTokenBurn();
  
  /**
   * Load the create issue modal
   */
  const createIssueModal = new CreateIssueModal();
  document.body.appendChild(createIssueModal); 
}

/**
 * Loads activity issues, which populate the Activity Feed and Recent Completions
 * Also sets the data fields used for other parts of the activity 
 */
function loadIssues() {

  const dummyEntry = document.querySelector('.feed-entry');

  if (issuesList.length === 0) {
    const nip = new NoIssuesPrompt();
    dummyEntry.appendChild(nip);
  }
  else {
    dummyEntry.remove();
    issuesList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    issuesList.forEach(async (issueData) => {

      const historyRes = await fetch(`${API_BASE}/api/issues/${issueData.id}/history`);
      const historyData = await historyRes.json();
      const history = historyData.history || [];
      history.forEach((historyData) => {
        const tempData = {...issueData};
        tempData.status = historyData.issue_status;
        tempData.updated_at = historyData.changed_at;
        tempData.created_by = historyData.changed_by_user;
        console.log(tempData);
        const issue = new ActivityIssue();
        issue.data = tempData;
        issueObjects.push(issue);
      
        feedParent.appendChild(issue); 
      
      });
    
    });
  }
  
}

/**
 * Helper function which converts various status names into integer values
 * @param {string} status - Status string to be converted
 * @returns Index 0-4 for open, inprogress, blocked, pending, and closed statuses
 */
function getStatusIndex(status) {
  switch (status) {
  case 'open':
    return 0;
    break;
  case 'in_progress':
  case 'in-progress':
    return 1;
    break;
  case 'blocked':
    return 2;
    break;
  case 'pending-review':
  case 'pending':
  case 'review':
    return 3;
    break;
  case 'closed':
    return 4;
    break;
  default:
    return -1;
  }
}

/**
 * Loads the five status buttons at the top of the activity page
 */
function loadStatusButtons() {
  const statusArray = [0, 0, 0, 0, 0];
  issuesList.forEach((issueData) => {
    statusArray[getStatusIndex(issueData.status)]++;
  });
  let ind = 0;
  statusNames.forEach(() => {
    const sb = new ActivityStatusButton();
    sb.data = {
      status: statusNamesRaw[ind],
      count: statusArray[ind],
    };
    statusButtonsParent.appendChild(sb);
    ind++;
  });
}

/**
 * Hides issues on the activity that don't match a certain value
 * Currently, only one filter can be active at one time
 * @param {string} key - Look for this key in every issue
 * @param {string} valueToMatch - If the value at that key isn't equal to this value, hide the issue
 */
export function filterActivityIssues(key, valueToMatch) {
  issueObjects.forEach((issue) => {
    console.log(issue.issueData);
    if (issue.issueData[key] !== valueToMatch) {
      issue.style.display = 'none';
    }
    else {
      issue.style.display = 'flex';

    }
  });
}

/**
 * Clears the filter set by filteractivityIssues
 * causing all issues to become visible again
 */
export function clearActivityIssueFilter() {
  issueObjects.forEach((issue) => {
    issue.style.display = 'flex';
  });
}

await loadActivity();




  