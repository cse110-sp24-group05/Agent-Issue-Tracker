// helpers.js
// Shared constants, validators, and response builders for the issues API.


export const VALID_STATUSES = ['open', 'in_progress', 'blocked', 'review', 'closed'];
export const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];


export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Workspace-ID, X-Agent-ID'
};


// Fields that PUT /api/issues/:id is allowed to modify.
export const ALLOWED_UPDATE_FIELDS = [
  'title',
  'issue_description',
  'issue_status',
  'issue_priority',
  'assigned_to_user',
  'assigned_to_agent',
  'claim_expires_at',
  'retry_count',
  'claim_timeout_minutes',
  'closed_at',
  'result_text',
  'tokens_used'
];


/**
 * Build a success-shaped JSON Response.
 * @param {object} body - Body to serialize.
 * @param {number} [status=200] - HTTP status code.
 * @returns {Response}
 */
export function ok(body, status = 200) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}


/**
 * Build a 400 Bad Request error response with the standard error envelope.
 * @param {string} error - Error message.
 * @returns {Response}
 */
export function badRequest(error) {
  return Response.json({ success: false, error }, { status: 400, headers: CORS_HEADERS });
}


/**
 * Build a 404 Not Found error response with the standard error envelope.
 * @param {string} [error='Issue not found'] - Error message.
 * @returns {Response}
 */
export function notFound(error = 'Issue not found') {
  return Response.json({ success: false, error }, { status: 404, headers: CORS_HEADERS });
}


/**
 * Build a 500 Internal Server Error response with the standard error envelope.
 * @param {string} error - Error message.
 * @returns {Response}
 */
export function serverError(error) {
  return Response.json({ success: false, error }, { status: 500, headers: CORS_HEADERS });
}


/**
 * Validate an issue_status value against the VALID_STATUSES enum.
 * @param {string} value - Status to validate.
 * @returns {string|null} Error message, or null if valid.
 */
export function validateStatus(value) {
  if (!VALID_STATUSES.includes(value)) {
    return `Invalid issue_status (must be one of: ${VALID_STATUSES.join(', ')})`;
  }
  return null;
}


/**
 * Validate an issue_priority value against the VALID_PRIORITIES enum.
 * @param {string} value - Priority to validate.
 * @returns {string|null} Error message, or null if valid.
 */
export function validatePriority(value) {
  if (!VALID_PRIORITIES.includes(value)) {
    return `Invalid issue_priority (must be one of: ${VALID_PRIORITIES.join(', ')})`;
  }
  return null;
}


/**
 * Enforce the user/agent assignment mutex: an issue cannot be assigned to
 * both a user and an agent at the same time.
 * @param {string|null|undefined} user - assigned_to_user value.
 * @param {string|null|undefined} agent - assigned_to_agent value.
 * @returns {string|null} Error message, or null if valid.
 */
export function validateAssignmentMutex(user, agent) {
  if (user && agent) {
    return 'Issue cannot be assigned to both a user and an agent';
  }
  return null;
}
