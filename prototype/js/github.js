function getRepo() {
  return localStorage.getItem('ait_repo') || 'owner/repo';
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function createGithubIssue(issue) {
  await delay(200);
  const ghNumber = Math.floor(Math.random() * 900) + 100;
  console.log(`[GitHub] POST /repos/${getRepo()}/issues`);
  console.log(`[GitHub] Created issue #${ghNumber}: "${issue.title}"`);
  console.log(`[GitHub] URL: https://github.com/${getRepo()}/issues/${ghNumber}`);
  return { number: ghNumber, url: `https://github.com/${getRepo()}/issues/${ghNumber}` };
}

export async function closeGithubIssue(issue) {
  await delay(200);
  const num = issue.github_number || '???';
  console.log(`[GitHub] PATCH /repos/${getRepo()}/issues/${num}`);
  console.log(`[GitHub] Closed issue #${num}: "${issue.title}"`);
  return { status: 'closed' };
}

export async function claimGithubIssue(issue, claimedBy) {
  await delay(200);
  const num = issue.github_number || '???';
  console.log(`[GitHub] PATCH /repos/${getRepo()}/issues/${num}`);
  console.log(`[GitHub] Added label "in-progress", assigned to ${claimedBy}`);
  return { status: 'updated' };
}
