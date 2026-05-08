export async function notify(event, issue) {
  const webhook = localStorage.getItem('ait_slack');
  const messages = {
    created:  `🆕 Issue created: *${issue.title}* [${issue.priority}] by ${issue.created_by}`,
    claimed:  `🤖 Agent claimed: *${issue.title}* → ${issue.claimed_by}`,
    complete: `✅ Issue complete: *${issue.title}* — ${issue.tokens_used} tokens used`,
    blocked:  `🚫 Issue blocked: *${issue.title}* — ${issue.blocked_reason}`,
    closed:   `🎉 Issue closed: *${issue.title}* — approved and merged`
  };
  const msg = messages[event] || `[AIT] ${event}: ${issue.title}`;
  if (webhook) {
    console.log(`[Slack] Sending to webhook ${webhook.substring(0, 40)}...`);
  } else {
    console.log(`[Slack] (no webhook configured — would send to #ait-updates)`);
  }
  console.log(`[Slack] Message: ${msg}`);
  showToast(msg);
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; top:16px; right:16px;
    background:#1a1a2e; color:#fff;
    padding:12px 16px; border-radius:8px;
    font-size:13px; z-index:9999;
    border-left:3px solid #16A34A;
    max-width:320px; line-height:1.4;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
