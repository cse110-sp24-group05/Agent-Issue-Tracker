// worker.js
// Includes:
// - Main CRUD Functions
// - Workflow Logic
// - Create, read, update, and delete operations for Issues, Users, and Agents


export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;


    console.log('PATH:', url.pathname);
    console.log('METHOD:', request.method);


    // GET /api/issues
    if (url.pathname === '/api/issues' && method === 'GET') {
      return getAllIssues(env);
    }


    // GET /api/issues/:id
    if (url.pathname.startsWith('/api/issues/') && method === 'GET') {
      const id = url.pathname.split('/').pop();
      return getIssueById(id, env);
    }


    // POST /api/issues
    if (url.pathname === '/api/issues' && method === 'POST') {
      return createIssue(request, env);
    }


    // POST /api/issues/:id/claim
    const isClaim = url.pathname.startsWith('/api/issues/') && url.pathname.endsWith('/claim');
    if (isClaim && method === 'POST') {
      const id = url.pathname.split('/')[3];
      return claimIssue(id, request, env);
    }


    // POST /api/issues/:id/result
    const isResult = url.pathname.startsWith('/api/issues/') && url.pathname.endsWith('/result');
    if (isResult && method === 'POST') {
      const id = url.pathname.split('/')[3];
      return postResult(id, request, env);
    }


    // POST /api/issues/:id/close
    const isClose = url.pathname.startsWith('/api/issues/') && url.pathname.endsWith('/close');
    if (isClose && method === 'POST') {
      const id = url.pathname.split('/')[3];
      return closeIssue(id, env);
    }


    // // PUT (UPDATE) /api/issues/:id
    // if(url.pathname.startsWith("/api/issues/") && method == "PUT") {
    //   const id = url.pathname.split("/").pop();
    //   return updateIssue(id, request, env);
    // }


    // DELETE /api/issues/:id
    if (url.pathname.startsWith('/api/issues/') && method === 'DELETE') {
      const id = url.pathname.split('/').pop();
      return deleteIssue(id, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};


/**
 * This function will handle the creation of a new issue. It will parse the
 * incoming request to extract the issue details, validate the data,
 * and then insert the new issue into the database. If the issue is created
 * successfully, it will return a response containing the created issue.
 * If there is an error during the process, it will return an appropriate error
 * message.
 * @param {Request} request - The incoming request containing the issue details in the body.
 * @param {object} env - The environment object containing bindings and configurations.
 * @returns {Response} - A response object containing the created issue or an error message.
 */
async function createIssue(request, env) {
  try {
    // Parse the incoming request to extract issue details
    const issueData = await request.json();


    // Extract relevant fields from the issueData
    const {
      id,
      title,
      issue_description,
      issue_status,
      issue_priority,
      assigned_to_user,
      assigned_to_agent,
      claim_expires_at,
      retry_count,
      claim_timeout_minutes,
      created_at,
      updated_at,
      closed_at
    } = issueData;


    // Validate required fields
    if (!id || !title || !issue_status || !issue_priority
      || retry_count === undefined || claim_timeout_minutes === undefined
      || !created_at || !updated_at) {
      return Response.json(
        {
          success: false,
          error: 'Missing required fields'
        },
        {
          status: 400
        }
      );
    }


    // Validate assignment logic, cannot be assigned to both a user and an agent at the same time
    if (assigned_to_user && assigned_to_agent) {
      return Response.json(
        {
          success: false,
          error: 'Issue cannot be assigned to both a user and an agent'
        },
        {
          status: 400
        }
      );
    }


    // Insert the new issue into the database
    await env.issues_db.prepare(`
      INSERT INTO issues (
        id,
        title,
        issue_description,
        issue_status,
        issue_priority,
        assigned_to_user,
        assigned_to_agent,
        claim_expires_at,
        retry_count,
        claim_timeout_minutes,
        created_at,
        updated_at,
        closed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind( // fill in the values for the placeholders
        id,
        title,
        issue_description || null,
        issue_status,
        issue_priority,
        assigned_to_user || null,
        assigned_to_agent || null,
        claim_expires_at || null,
        retry_count,
        claim_timeout_minutes,
        created_at,
        updated_at,
        closed_at || null
      )
      .run();

    // Return a response containing the created issue
    return Response.json(
      {
        success: true,
        message: 'Issue created successfully',
        issue: issueData
      },
      {
        status: 201
      }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}


/**
 * getAllIssues will retrieve all issues from the database and return them in a structured format.
 * It will query the database for all issues, format the results into a JSON response,
 * and handle any potential errors that may occur during the retrieval process.
 * The response will include an array of issues, each containing relevant details such as title,
 * description, status, priority, and assignment information.
 * @param {object} env - The environment object containing bindings and configurations, including the database connection.
 * @returns {Response} - A JSON response containing the list of all issues or an error message if the retrieval fails.
 */
async function getAllIssues(env) {
  try {
    const { results } = await env.issues_db
      .prepare('SELECT * FROM issues')
      .all();


    return Response.json(results);
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}




/**
 * getIssueById will retrieve an issue from the database given a specified id.
 * It will query the database for the corresponding issue, format the results into a JSON response,
 * and handle any potential errors that may occur during the retrieval process.
 * The response will include an entry containing relevant details such as title, description,
 * status, priority, and assignment information.
 * @param {string} id - A unique identifier for an issue.
 * @param {object} env - The environment object containing bindings and configurations, including the database connection.
 * @returns {Response} - A JSON response containing the issue with the specified id or an error message if the retrieval fails.
 */
async function getIssueById(id, env) {
  try {
    const issue = await env.issues_db
      .prepare('SELECT * FROM issues WHERE id = ?')
      .bind(id)
      .first();


    if (!issue) {
      return Response.json(
        {
          success: false,
          error: 'Issue not found'
        },
        {
          status: 404
        }
      );
    }


    return Response.json({
      success: true,
      issue
    });


  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}


/*
// TODO
async function updateIssue() {


}
*/


/**
 * deleteIssue will delete an issue given a specified id.
 * It will query the database for the corresponding issue, format the results into a JSON response,
 * and handle any potential errors that may occur during the process.
 * The response indicates whether the deletion succeeded or failed.
 * @param {string} id - A unique identifier for an issue.
 * @param {object} env - The environment object containing bindings and configurations, including the database connection.
 * @returns {Response} - A JSON response indicating success or failure.
 */
async function deleteIssue(id, env) {
  try {
    const result = await env.issues_db
      .prepare('DELETE FROM issues WHERE id = ?')
      .bind(id)
      .run();


    // No rows deleted
    if (result.meta.changes === 0) {
      return Response.json(
        {
          success: false,
          error: 'Issue not found'
        },
        {
          status: 404
        }
      );
    }


    // Successful deletion
    return Response.json({
      success: true,
      message: 'Issue deleted successfully'
    });


  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}


/**
 * claimIssue assigns an issue to an agent and transitions the issue
 * from an "open" state into the "in_progress" state.
 * PREREQUISITE: issue_status must be open first in order to claim
 * The function checks if the issue exists, and whether the issue is claimable or open.
 * When an issue is claimed, an agent is assigned to it, and the status and timestamps
 * are updated, along with a claim expiration unix timestamp.
 *
 * @param {string} id - The unique identifier of the issue.
 * @param {Request} request - validates agent_id
 * @param {object} env - Environment bindings containing the database connection.
 * @returns {Response} A JSON response indicating success or failure.
 */
async function claimIssue(id, request, env) {
  try {
    const { agent_id } = await request.json();


    if (!agent_id) {
      return Response.json(
        { success: false, error: 'Missing agent_id' },
        { status: 400 }
      );
    }


    const issue = await env.issues_db
      .prepare('SELECT issue_status FROM issues WHERE id = ?')
      .bind(id)
      .first();


    if (!issue) {
      return Response.json(
        { success: false, error: 'Issue not found' },
        { status: 404 }
      );
    }


    if (issue.issue_status !== 'open') {
      return Response.json(
        {
          success: false, error: `Issue cannot be claimed (current status: ${issue.issue_status})`
        },
        {
          status: 400
        }
      );
    }


    const expiration = Date.now() + 15 * 60 * 1000;


    await env.issues_db.prepare(`
      UPDATE issues
      SET
        assigned_to_agent = ?,
        claim_expires_at = ?,
        issue_status = ?,
        updated_at = ?
      WHERE id = ?
    `)
      .bind(
        agent_id,
        expiration,
        'in_progress',
        new Date().toISOString(),
        id
      )
      .run();


    return Response.json({
      success: true,
      message: 'Issue claimed successfully'
    });


  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}


/**
 * postResult processes the outcome of a claimed issue and transitions
 * the issue into a new status such as "review", or "blocked".
 * PREREQUISITE: in_progress status, then afterwards becomes blocked or review
 * The function checks whether the issue exists and if the issue's status is
 * valid for status transition purposes.
 * The function updates the issue status and the timestamp
 *
 * @param {string} id - The unique identifier of the issue.
 * @param {Request} request - The incoming request containing the desired result state.
 * @param {object} env - Environment bindings containing the database connection.
 * @returns {Response} A JSON response indicating success or failure.
 */
async function postResult(id, request, env) {
  try {
    const { new_status } = await request.json();


    // Allowed statuses after processing
    const validStatuses = [
      'blocked',
      'review',
    ];


    if (!validStatuses.includes(new_status)) {
      return Response.json(
        {
          success: false,
          error: 'Invalid result status'
        },
        {
          status: 400
        }
      );
    }


    // Check issue exists
    const issue = await env.issues_db
      .prepare(`
        SELECT *
        FROM issues
        WHERE id = ?
      `)
      .bind(id)
      .first();


    if (!issue) {
      return Response.json(
        {
          success: false,
          error: 'Issue not found'
        },
        {
          status: 404
        }
      );
    }


    // Filter for only issues that are currently in progress
    if (issue.issue_status !== 'in_progress') {
      return Response.json(
        {
          success: false,
          error: 'Issue must be in progress before posting results.'
        },
        {
          status: 400
        }
      );
    }


    const updatedAt = new Date().toISOString();


    await env.issues_db.prepare(`
      UPDATE issues
      SET
        issue_status = ?,
        updated_at = ?
      WHERE id = ?
    `)
      .bind(
        new_status,
        updatedAt,
        id
      )
      .run();


    return Response.json({
      success: true,
      message: 'Result posted successfully'
    });


  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}


/**
 * closeIssue finalizes a resolved issue and transitions it into
 * the closed state.
 *
 * The function checks whether the issue exists, and whether we can transition to
 * the issue status "closed".
 *
 * The function updates the issue status, the closed_at and updated_at timestamps.
 *
 * @param {string} id - The unique identifier of the issue.
 * @param {object} env - Environment bindings containing the database connection.
 * @returns {Response} A JSON response indicating success or failure.
 */
async function closeIssue(id, env) {
  try {
    const now = new Date().toISOString();


    const result = await env.issues_db.prepare(`
      UPDATE issues
      SET
        issue_status = ?,
        closed_at = ?,
        updated_at = ?
      WHERE id = ?
    `)
      .bind(
        'closed',
        now,
        now,
        id
      )
      .run();


    if (result.meta.changes === 0) {
      return Response.json(
        { success: false, error: 'Issue not found' },
        { status: 404 }
      );
    }


    return Response.json({
      success: true,
      message: 'Issue closed successfully'
    });


  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}


// TODO: implement blockIssue, filterIssues, sortIssues


/**
 * blockIssue transitions an issue into a blocked state when processing
 * cannot continue due to some unresolved problem or prereq.
 *
 * The function first checks whether the issue in question exists and
 * whether the current workflow state allows the state transition of blocking.
 * The function updates the issue status to blocked, and also updates timestamp.
 *
 * @param {string} id - The unique identifier of the issue.
 * @param {object} env - Environment bindings containing the database connection.
 * @returns {Response} A JSON response indicating success or failure.
 */
// async function blockIssue(id, env) {}


/**
 * filterIssues returns a filtered subset of issues based on provided criteria.
 *
 * @param {object} filters - Key/value pairs to filter issues by (e.g. status, priority).
 * @param {object} env - Environment bindings containing the database connection.
 * @returns {Response} A JSON response containing the filtered issues or an error message.
 */
// async function filterIssues(filters, env) {}


/**
 * sortIssues returns all issues sorted by a specified field.
 *
 * @param {string} field - The field to sort by (e.g. created_at, issue_priority).
 * @param {string} direction - Sort direction, either "asc" or "desc".
 * @param {object} env - Environment bindings containing the database connection.
 * @returns {Response} A JSON response containing the sorted issues or an error message.
 */
// async function sortIssues(field, direction, env) {}
