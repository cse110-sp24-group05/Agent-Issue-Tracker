// Imports
import { DashboardIssue } from "./components/dashboard-issue.js";
import {
    getIssues,
  } from "./test-data.js";
  
import {
  priBadge,
  staBadge,
  staLabel,
  createdByIcon,
  fmtRelTime,
  esc,
  flashEntity,
} from "./ui.js";

const issuesList = getIssues();

const feedParent = document.querySelector(".feed-list");
// The issues are sorted by most recently updated
// Note that the schema doesn't have an "audit log" for issue changes,
// so the dashboard activity feed can only show the most recent
// update for each issue
issuesList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
issuesList.forEach((issueData) => {
  const issue = new DashboardIssue();
  issue.data = issueData;
  feedParent.appendChild(issue)
  console.log(issueData.updated_at);
})




  