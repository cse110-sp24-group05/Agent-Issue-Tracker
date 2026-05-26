// Created with Chatgpt assistance — human reviewed and tested
// handlers.js
// Request handlers for the issues API: 5 CRUD operations and 3 workflow
// transitions. HTTP routing lives in worker.js; SQL lives in db.js;
// shared validators and response builders live in helpers.js.


import {
  ALLOWED_UPDATE_FIELDS,
  CORS_HEADERS,
  ok,
  badRequest,
  notFound,
  serverError,
  validateStatus,
  validatePriority,
  validateAssignmentMutex
} from './helpers.js';

import {
  insertIssue,
  selectAllIssues,
  selectIssueById,
  updateIssueFields,
  deleteIssueById,
  claimIssueRow,
  updateIssueStatus,
  closeIssueRow
} from './db.js';


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
export async function createIssue(request, env) {
  try {
    const issueData = await request.json();

    const {
      id,
      title,
      issue_status,
      issue_priority,
      assigned_to_user,
      assigned_to_agent,
      retry_count,
      claim_timeout_minutes,
      created_at,
      updated_at
    } = issueData;


    // Validate required fields
    if (!id || !title || !issue_status || !issue_priority
      || retry_count === undefined || claim_timeout_minutes === undefined
      || !created_at || !updated_at) {
      return badRequest('Missing required fields');
    }


    // Validate enum values
    const statusError = validateStatus(issue_status);
    if (statusError) {
      return badRequest(statusError);
    }

    const priorityError = validatePriority(issue_priority);
    if (priorityError) {
      return badRequest(priorityError);
    }


    // Validate assignment logic, cannot be assigned to both a user and an agent at the same time
    const mutexError = validateAssignmentMutex(assigned_to_user, assigned_to_agent);
    if (mutexError) {
      return badRequest(mutexError);
    }


    await insertIssue(env, issueData);

    return ok(
      {
        success: true,
        message: 'Issue created successfully',
        issue: issueData
      },
      201
    );
  } catch (error) {
    return serverError(error.message);
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
export async function getAllIssues(env) {
  try {
    const { results } = await selectAllIssues(env);
    return Response.json(results, { headers: CORS_HEADERS });
  } catch (error) {
    return serverError(error.message);
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
export async function getIssueById(id, env) {
  try {
    const issue = await selectIssueById(env, id);

    if (!issue) {
      return notFound();
    }

    return ok({ success: true, issue });
  } catch (error) {
    return serverError(error.message);
  }
}


/**
 * updateIssue updates one or more editable fields on an existing issue.
 * Only fields present in the request body are modified; unspecified fields
 * are left as-is. The updated_at timestamp is always refreshed. The id,
 * created_at fields are immutable and ignored if present in the body.
 *
 * Validates enum values for issue_status and issue_priority when supplied,
 * and enforces the user/agent assignment mutex against the merged state
 * (incoming values combined with existing row).
 *
 * @param {string} id - The unique identifier of the issue to update.
 * @param {Request} request - The incoming request containing fields to update.
 * @param {object} env - Environment bindings containing the database connection.
 * @returns {Response} A JSON response containing the updated issue or an error message.
 */
export async function updateIssue(id, request, env) {
  try {
    const updates = await request.json();

    const existing = await selectIssueById(env, id);
    if (!existing) {
      return notFound();
    }

    // Collect provided updatable fields
    const fields = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (Object.hasOwn(updates, key)) {
        fields[key] = updates[key];
      }
    }

    if (Object.keys(fields).length === 0) {
      return badRequest('No updatable fields provided');
    }

    // Validate enum values when supplied
    if (fields.issue_status !== undefined) {
      const statusError = validateStatus(fields.issue_status);
      if (statusError) {
        return badRequest(statusError);
      }
    }

    if (fields.issue_priority !== undefined) {
      const priorityError = validatePriority(fields.issue_priority);
      if (priorityError) {
        return badRequest(priorityError);
      }
    }

    // Validate user/agent assignment mutex against the merged state.
    // Use === undefined (not ??) so callers can intentionally clear an
    // assignment by sending null.
    const mergedUser = fields.assigned_to_user === undefined
      ? existing.assigned_to_user
      : fields.assigned_to_user;
    const mergedAgent = fields.assigned_to_agent === undefined
      ? existing.assigned_to_agent
      : fields.assigned_to_agent;
    const mutexError = validateAssignmentMutex(mergedUser, mergedAgent);
    if (mutexError) {
      return badRequest(mutexError);
    }

    await updateIssueFields(env, id, fields, new Date().toISOString());

    const updated = await selectIssueById(env, id);

    return ok({
      success: true,
      message: 'Issue updated successfully',
      issue: updated
    });
  } catch (error) {
    return serverError(error.message);
  }
}


/**
 * deleteIssue will delete an issue given a specified id.
 * It will query the database for the corresponding issue, format the results into a JSON response,
 * and handle any potential errors that may occur during the process.
 * The response indicates whether the deletion succeeded or failed.
 * @param {string} id - A unique identifier for an issue.
 * @param {object} env - The environment object containing bindings and configurations, including the database connection.
 * @returns {Response} - A JSON response indicating success or failure.
 */
export async function deleteIssue(id, env) {
  try {
    const result = await deleteIssueById(env, id);

    if (result.meta.changes === 0) {
      return notFound();
    }

    return ok({ success: true, message: 'Issue deleted successfully' });
  } catch (error) {
    return serverError(error.message);
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
 * @param {Request} request - validates agent_id
 * @param {object} env - Environment bindings containing the database connection.
 * @returns {Response} A JSON response indicating success or failure.
 */
export async function claimIssue(request, env) {
  try {

    const url = new URL(request.url);
    const id = url.pathname.split('/')[3];

    const { agent_id } = await request.json();

    if (!agent_id) {
      return badRequest('Missing agent_id');
    }

    const issue = await selectIssueById(env, id);

    if (!issue) {
      return notFound();
    }

    if (issue.issue_status !== 'open') {
      return badRequest(`Issue cannot be claimed (current status: ${issue.issue_status})`);
    }

    const expiration = Date.now() + 15 * 60 * 1000;

    await claimIssueRow(env, id, agent_id, expiration, new Date().toISOString());

    const updatedIssue = await selectIssueById(env, id);
    console.log('Updated Issue after claim:', updatedIssue.agent_id);

    return ok({ success: true, message: 'Issue claimed successfully', issue: updatedIssue });
  } catch (error) {
    return serverError(error.message);
  }
}


/**
 * putResult processes the outcome of a claimed issue and transitions
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
export async function putResult(id, request, env) {
  try {
    const { new_status } = await request.json();

    // Allowed statuses after processing
    const validStatuses = ['blocked', 'review'];

    if (!validStatuses.includes(new_status)) {
      return badRequest('Invalid result status');
    }

    const issue = await selectIssueById(env, id);

    if (!issue) {
      return notFound();
    }

    if (issue.issue_status !== 'in_progress') {
      return badRequest('Issue must be in progress before posting results.');
    }

    await updateIssueStatus(env, id, new_status, new Date().toISOString());

    return ok({ success: true, message: 'Result posted successfully' });
  } catch (error) {
    return serverError(error.message);
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
export async function closeIssue(id, env) {
  try {
    const now = new Date().toISOString();

    const result = await closeIssueRow(env, id, now);

    if (result.meta.changes === 0) {
      return notFound();
    }

    return ok({ success: true, message: 'Issue closed successfully' });
  } catch (error) {
    return serverError(error.message);
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
export async function blockIssue(id, env) {
  try {

    const issue = await selectIssueById(env, id);
    if (!issue) {
      return notFound();
    }

    const currentStatus = issue.issue_status;
    if(currentStatus === 'blocked'){
      return badRequest('Issue already blocked');
    }

    if(currentStatus === 'closed'){
      return badRequest('Issue already closed');
    }

    const now = new Date().toISOString();

    await updateIssueStatus(env, id,'blocked', now);

    const updated = await selectIssueById(env, id);

    return ok({
      success: true,
      message: 'Issue updated successfully',
      issue: updated
    });
  } catch (error) {
    return serverError(error.message);
  }
}


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