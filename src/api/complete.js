/**
 * handleComplete processes a POST /api/complete request
 * The agent or human posts results back to a claimed issue
 * @param request
 * @param env
 */
export async function handleComplete(request, env) {
  try {
    // STEP 1: Read the request body
    // The caller sends JSON like:
    // {
    //   "issue_id": "issue-002",
    //   "agent_id": "agent-simulator-01",
    //   "result": "Refactored the module. All tests pass.",
    //   "tokens_used": 1234
    // }
    const { issue_id, agent_id, user_id, result, tokens_used } =
      await request.json();

    
    // STEP 2: need to know which issue is being completed
    if (!issue_id) {
      return Response.json(
        { success: false, error: 'Missing required field: issue_id' },
        { status: 400 }
      );
    }

    // know who is completing it
    if (!agent_id && !user_id) {
      return Response.json(
        { success: false, error: 'Must provide either agent_id or user_id' },
        { status: 400 }
      );
    }

    // Must include a result summary: what did you do?
    if (!result) {
      return Response.json(
        { success: false, error: 'Missing required field: result' },
        { status: 400 }
      );
    }

    // STEP 3: find the issue in the database
    const issue = await env.issues_db
      .prepare('SELECT * FROM issues WHERE id = ?')
      .bind(issue_id)
      .first();

    if (!issue) {
      return Response.json(
        { success: false, error: 'Issue not found', issue_id },
        { status: 404 }
      );
    }

    // STEP 4: verify the caller is the one who claimed this issue
    // prevents another agent from closing someone else's work
    if (agent_id && issue.assigned_to_agent !== agent_id) {
      return Response.json(
        {
          success: false,
          error: 'Only the assigned agent can complete this issue',
          issue_id,
          assigned_to_agent: issue.assigned_to_agent,
        },
        { status: 403 }
      );
    }

    if (user_id && issue.assigned_to_user !== user_id) {
      return Response.json(
        {
          success: false,
          error: 'Only the assigned user can complete this issue',
          issue_id,
          assigned_to_user: issue.assigned_to_user,
        },
        { status: 403 }
      );
    }

    // STEP 5: decide what happens next based on priority
    // High-risk issues (high/critical) need a human to review before closing
    // Low-risk issues (low/medium) can close automatically
    const needsReview = issue.issue_priority === 'high' || issue.issue_priority === 'critical';
    const newStatus = needsReview ? 'review' : 'closed';
    const now = new Date().toISOString();
    const closedAt = needsReview ? null : now;

    // STEP 6: update the issue in the database
    await env.issues_db
      .prepare(
        `UPDATE issues 
         SET issue_status = ?, 
             updated_at = ?, 
             closed_at = ? 
         WHERE id = ?`
      )
      .bind(newStatus, now, closedAt, issue_id)
      .run();

    // STEP 7: return success
    return Response.json(
      {
        success: true,
        issue_id,
        issue_status: newStatus,
        requires_approval: needsReview,
        tokens_used: tokens_used || 0,
        closed_at: closedAt,
        message: needsReview
          ? 'Result posted. Human approval required to close.'
          : 'Issue auto-closed.',
      },
      { status: 200 }
    );
  
  
  
  } catch (error) {
    return Response.json( // if anything unexpected breaks, return 500 with error message
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}