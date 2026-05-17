// worker.js
// Includes: 
// -Main CRUD Functions
// -Workflow Logic
// -Create, read, update, and delete operations for Issues, Users, and Agents
// comment for testing the cicd pipeline, remove later
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

    // POST /api/issues
    if (url.pathname === '/api/issues' && method === 'POST') {
      return createIssue(request, env);
    }
    
    // DELETE /api/issues/:id
    //if (url.pathname.startsWith("/api/issues/") && method === "DELETE") {
    //  const id = url.pathname.split("/").pop();
    //  return deleteIssue(id, env);
    //}

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
  try{
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
    if (!id || !title || ! issue_status || ! issue_priority 
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
  }
  catch(error){
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
 *
 */
function getIssueById() {

}

/**
 *
 */
function updateIssue() {

}
/**
 *
 * @param id
 * @param env
 */
function deleteIssue(id, env) {

}
/**
 *
 */
function claimIssue(){

}
/**
 *
 */
function postResult(){

}
/**
 *
 */
function closeIssue(){
    
}
/**
 *
 */
function blockIssue(){

}
/**
 *
 */
function filterIssues(){

}
/**
 *
 */
function sortIssues(){
    
}
