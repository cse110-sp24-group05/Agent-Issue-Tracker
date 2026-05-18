/**
 * handleClaim processes a POST /api/claim request.
 * agent or human claims an issue, setting its status to 'in_progress'
 * and locking it from double-claiming until the claim expires
 * @param request
 * @param env
 */
export async function handleClaim(request, env) {
  try {
    // STEP 1: the caller sends JSON like: { "issue_id": "issue-002", "agent_id": "agent-simulator-01" }
    const { issue_id, agent_id, user_id } = await request.json();

    // STEP 2: validate inputs because need an issue_id to know WHAT to claim
    if (!issue_id) {
      return Response.json(
        { success: false, error: 'Missing required field: issue_id' },
        { status: 400 }
      );
    }

    // we need to know WHO is claiming: agent or a human, not both, not neither
    if (!agent_id && !user_id) {
      return Response.json(
        { success: false, error: 'Must provide either agent_id or user_id' },
        { status: 400 }
      );
    }
    if (agent_id && user_id) {
      return Response.json(
        { success: false, error: 'Cannot claim as both agent and user' },
        { status: 400 }
      );
    }

    // STEP 3: find the issue in the database, query D1 for the issue with this id
    const issue = await env.issues_db
      .prepare('SELECT * FROM issues WHERE id = ?')
      .bind(issue_id)
      .first();

    // return 404 if no issue if matched
    if (!issue) {
      return Response.json(
        { success: false, error: 'Issue not found', issue_id },
        { status: 404 }
      );
    }

    // STEP 4: check if someone else already claimed it
    const now = Date.now(); // get the current time as a unix timestamp in milliseconds
    
    // check if "already claimed":
    const alreadyClaimed =
      (issue.assigned_to_agent || issue.assigned_to_user) && // it has an agent or user assigned
      issue.claim_expires_at && issue.claim_expires_at > now; // the claim hasn't expired yet (claim_expires_at is in the future)

    // if claimed, return 409 so the caller knows someone else has it
    if (alreadyClaimed) {
      return Response.json(
        {
          success: false,
          error: 'Issue already claimed',
          issue_id,
          assigned_to_agent: issue.assigned_to_agent, 
          assigned_to_user: issue.assigned_to_user,
          claim_expires_at: issue.claim_expires_at, 
        },
        { status: 409 }
      );
    }

    // WE NEED TO DECIDE THIS: current default is 30 min !!!!!!!!!
    // STEP 5: Claim the issue
    const timeout = issue.claim_timeout_minutes || 30;
    const expires = now + timeout * 60 * 1000;
    const updatedAt = new Date().toISOString();

    // update the issue, write the claim to the database
    // - set who claimed it (agent or user)
    // - set when the claim expires
    // - change status from 'open' to 'in_progress'
    // - update the timestamp
    await env.issues_db
      .prepare(
        `UPDATE issues 
         SET assigned_to_agent = ?, 
             assigned_to_user = ?, 
             claim_expires_at = ?, 
             issue_status = 'in_progress', 
             updated_at = ? 
         WHERE id = ?`
      )
      .bind(
        agent_id || null,
        user_id || null,
        expires,
        updatedAt,
        issue_id
      )
      .run();

    // STEP 6: return success
    return Response.json(
      {
        success: true,
        issue_id,
        issue_status: 'in_progress',
        assigned_to_agent: agent_id || null,
        assigned_to_user: user_id || null,
        claim_expires_at: expires,
        message: 'Issue claimed successfully.',
      },
      { status: 200 }
    );


    
  } catch (error) { // if anything unexpected breaks, return 500 with error message
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}