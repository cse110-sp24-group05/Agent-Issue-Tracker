// db.js
// D1 prepared-statement wrappers for the issues table. Each function returns
// the raw D1 result (.first(), .all(), or .run() output). No HTTP concerns.


/**
 * Insert a new row into the issues table.
 * @param {object} env - Worker env bindings.
 * @param {object} fields - Issue fields. Optional fields fall back to null.
 * @returns {Promise<object>} The D1 .run() result.
 */
export function insertIssue(env, fields) {
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
  } = fields;

  return env.issues_db.prepare(`
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
    .bind(
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
}


/**
 * Fetch all issues.
 * @param {object} env - Worker env bindings.
 * @returns {Promise<object>} The D1 .all() result ({ results, ... }).
 */
export function selectAllIssues(env) {
  return env.issues_db
    .prepare('SELECT * FROM issues')
    .all();
}


/**
 * Fetch a single issue by id, or null if it doesn't exist.
 * @param {object} env - Worker env bindings.
 * @param {string} id - Issue id.
 * @returns {Promise<object|null>} The row, or null.
 */
export function selectIssueById(env, id) {
  return env.issues_db
    .prepare('SELECT * FROM issues WHERE id = ?')
    .bind(id)
    .first();
}


/**
 * Apply a dynamic UPDATE to the issues table for the supplied fields,
 * also stamping updated_at.
 * @param {object} env - Worker env bindings.
 * @param {string} id - Issue id.
 * @param {object} fields - Map of column → value to write.
 * @param {string} updatedAt - ISO timestamp for updated_at.
 * @returns {Promise<object>} The D1 .run() result.
 */
export function updateIssueFields(env, id, fields, updatedAt) {
  const setClauses = Object.keys(fields).map(key => `${key} = ?`);
  setClauses.push('updated_at = ?');
  const values = [
    ...Object.keys(fields).map(key => fields[key] ?? null),
    updatedAt,
    id
  ];

  return env.issues_db
    .prepare(`UPDATE issues SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();
}


/**
 * Delete an issue by id.
 * @param {object} env - Worker env bindings.
 * @param {string} id - Issue id.
 * @returns {Promise<object>} The D1 .run() result (check meta.changes).
 */
export function deleteIssueById(env, id) {
  return env.issues_db
    .prepare('DELETE FROM issues WHERE id = ?')
    .bind(id)
    .run();
}


/**
 * Mark an issue as claimed by an agent: sets assigned_to_agent,
 * claim_expires_at, status → in_progress, and updated_at.
 * @param {object} env - Worker env bindings.
 * @param {string} id - Issue id.
 * @param {string} agentId - Claiming agent id.
 * @param {number} expiration - Unix ms timestamp for claim expiration.
 * @param {string} updatedAt - ISO timestamp for updated_at.
 * @returns {Promise<object>} The D1 .run() result.
 */
export function claimIssueRow(env, id, agentId, expiration, updatedAt) {
  return env.issues_db.prepare(`
    UPDATE issues
    SET
      assigned_to_agent = ?,
      claim_expires_at = ?,
      issue_status = ?,
      updated_at = ?
    WHERE id = ?
  `)
    .bind(
      agentId,
      expiration,
      'in_progress',
      updatedAt,
      id
    )
    .run();
}


/**
 * Transition an issue to a new status and stamp updated_at.
 * @param {object} env - Worker env bindings.
 * @param {string} id - Issue id.
 * @param {string} newStatus - Target status.
 * @param {string} updatedAt - ISO timestamp for updated_at.
 * @returns {Promise<object>} The D1 .run() result.
 */
export function updateIssueStatus(env, id, newStatus, updatedAt) {
  return env.issues_db.prepare(`
    UPDATE issues
    SET
      issue_status = ?,
      updated_at = ?
    WHERE id = ?
  `)
    .bind(
      newStatus,
      updatedAt,
      id
    )
    .run();
}


/**
 * Return the single highest-priority open unclaimed issue, ordered by
 * priority rank then creation time. Returns null when none exist.
 * @param {object} env - Worker env bindings.
 * @returns {Promise<object|null>} The row, or null.
 */
export function selectReadyIssue(env) {
  return env.issues_db
    .prepare(`
      SELECT * FROM issues
      WHERE issue_status = 'open'
        AND (assigned_to_agent IS NULL OR assigned_to_agent = '')
      ORDER BY
        CASE issue_priority
          WHEN 'critical' THEN 0
          WHEN 'high'     THEN 1
          WHEN 'medium'   THEN 2
          WHEN 'low'      THEN 3
          ELSE 99
        END ASC,
        created_at ASC
      LIMIT 1
    `)
    .first();
}


/**
 * Store the result of a completed agent run: transitions status, saves
 * result_text and tokens_used, and stamps updated_at.
 * Requires migration 0002 (result_text and tokens_used columns).
 * @param {object} env - Worker env bindings.
 * @param {string} id - Issue id.
 * @param {string} newStatus - Target status ('review' or 'blocked').
 * @param {string|null} resultText - Summary text from the agent.
 * @param {number|null} tokensUsed - Token count reported by the agent.
 * @param {string} updatedAt - ISO timestamp for updated_at.
 * @returns {Promise<object>} The D1 .run() result.
 */
export function storeIssueResult(env, id, newStatus, resultText, tokensUsed, updatedAt) {
  return env.issues_db.prepare(`
    UPDATE issues
    SET
      issue_status = ?,
      result_text  = ?,
      tokens_used  = ?,
      updated_at   = ?
    WHERE id = ?
  `)
    .bind(newStatus, resultText ?? null, tokensUsed ?? null, updatedAt, id)
    .run();
}


/**
 * Mark an issue as closed: sets status, closed_at, and updated_at.
 * @param {object} env - Worker env bindings.
 * @param {string} id - Issue id.
 * @param {string} now - ISO timestamp used for closed_at and updated_at.
 * @returns {Promise<object>} The D1 .run() result (check meta.changes).
 */
export function closeIssueRow(env, id, now) {
  return env.issues_db.prepare(`
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
}

/**
 * select issue history by issue id, ordered from latest to oldest.
 * @param {object} env - Worker env bindings.
 * @param {string} id - Issue id.
 * @returns {Promise<Array>} Array of history records, ordered from latest to oldest.
 */
export function selectIssueHistory(env, id) {
  return env.issues_db
    .prepare(`
      SELECT * FROM issue_status_history
      WHERE issue_id = ?
      ORDER BY changed_at DESC
    `)
    .bind(id)
    .all()
    .then(r => r.results);
}