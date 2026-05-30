// Imports
import { ActivityIssue } from './components/activity-issue.js';
import { ActivityStatusButton } from './components/activity-status-button.js';
import { ActivityTokenBurn } from './components/activity-token-burn.js';
import {
  initData,
  getIssues,
} from './data.js';



await initData();
const issuesList = await getIssues();
const issueObjects = [];
let tokenCount = 0;
let tokenMax = 0;
export let activeStatusButton = null;
/**
 * Sets which status button was clicke most recently
 * That way, clicking a status button can update the state
 * of the previous status button from active to inactive
 * @param button The status button which was just clicked
 */
export function setActiveStatusButton(button) {
  activeStatusButton = button;
}

const feedParent = document.querySelector('.feed-list');
const completionsParent = document.querySelector('.dash-completions-section');
const tokenBurnParent = document.getElementById('token-burn');
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
  loadTokenBurn();
  
}

/**
 * Loads activity issues, which populate the Activity Feed and Recent Completions
 * Also sets the data fields used for other parts of the activity 
 */
function loadIssues() {
  tokenCount = 0;
  tokenMax = 0;
  console.log(issuesList[0]);
  issuesList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  issuesList.forEach((issueData) => {
    const issue = new ActivityIssue();
    issue.data = issueData;
    issueObjects.push(issue);
    tokenCount += issueData.tokens_used;
    tokenMax += issueData.token_budget;
    if (issueData.status === 'closed') {
      completionsParent.appendChild(issue);
    }
    else {
      feedParent.appendChild(issue); 
    }
  });
}

/**
 * Helper function which converts various status names into integer values
 * @param status Status string to be converted
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
 * Loads the token burn graphic on the right side of the activity page
 */
function loadTokenBurn() {
  const tb = new ActivityTokenBurn();
  tb.data = {
    tokenCount: tokenCount,
    tokenMax: tokenMax,
  };
  tokenBurnParent.appendChild(tb);
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
 * @param key Look for this key in every issue
 * @param valueToMatch If the value at that key isn't equal to this value, hide the issue
 */
export function filterActivityIssues(key, valueToMatch) {
  issueObjects.forEach((issue) => {
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




  