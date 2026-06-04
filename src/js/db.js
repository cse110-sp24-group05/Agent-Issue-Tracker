// db.js
// D1 prepared-statement wrappers for the issues table. Each function returns
// the raw D1 result (.first(), .all(), or .run() output). No HTTP concerns.


/**
 * Insert a new row into the issues table. The display_no is assigned
 * server-side as MAX(display_no)+1 scoped to the creating user — so each user's
 * issues are numbered from 1 independently — computed atomically and returned
 * via RETURNING.
 * @param {object} env - Worker env bindings.
 * @param {object} fields - Issue fields. Optional fields fall back to null.
 * @returns {Promise<object|null>} The inserted row's { display_no }.
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
    created_by_user,
    created_at,
    updated_at,
    closed_at
  } = fields;

  // Scalar subquery scopes MAX(display_no) to the inserting user so each user's
  // issues are numbered from 1 independently. COALESCE handles the empty case.
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
      created_by_user,
      created_at,
      updated_at,
      closed_at,
      display_no
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      (SELECT COALESCE(MAX(display_no), 0) + 1 FROM issues WHERE created_by_user = ?)
    )
    RETURNING display_no
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
      created_by_user || null,
      created_at,
      updated_at,
      closed_at || null,
      created_by_user || null // second bind for the subquery
    )
    .first();
}


/**
 * Fetch all issues.
 * @param {object} env - Worker env bindings.
 * @returns {Promise<object>} The D1 .all() result ({ results, ... }).
 */
//export function selectAllIssues(env) {
//  return env.issues_db
//   .prepare('SELECT * FROM issues')
//   .all();
//}

/**
 * Fetch all issues visible to a user: issues they created or are assigned to.
 * Requires migration 0003 (created_by_user column).
 * @param {object} env - Worker env bindings.
 * @param {string} userId - The logged-in user's id.
 * @returns {Promise<object>} The D1 .all() result ({ results, ... }).
 */
export function selectIssuesByUserId(env, userId) {
  return env.issues_db
    .prepare('SELECT * FROM issues WHERE assigned_to_user = ? OR created_by_user = ?')
    .bind(userId, userId)
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
 * Reset all in_progress issues whose claim window has expired back to open so
 * the server — not the client runner — owns claim-expiry logic. Safe to call
 * before any read that needs an accurate open-issues view.
 * @param {object} env - Worker env bindings.
 * @param {string} now - ISO timestamp written to updated_at on reset rows.
 * @returns {Promise<object>} The D1 .run() result.
 */
export function resetExpiredClaims(env, now) {
  return env.issues_db.prepare(`
    UPDATE issues
    SET
      issue_status      = 'open',
      assigned_to_agent = NULL,
      claim_expires_at  = NULL,
      updated_at        = ?
    WHERE issue_status    = 'in_progress'
      AND claim_expires_at IS NOT NULL
      AND claim_expires_at < ?
  `)
    .bind(now, Date.now())
    .run();
}


/**
 * Ensure an agent row exists before assigning issues (FK on assigned_to_agent).
 * Inserts with status idle when missing; no-op if the id already exists.
 * @param {object} env - Worker env bindings.
 * @param {string} id - Agent id.
 * @param {string} [agentName] - Display name; defaults to id.
 * @returns {Promise<object>} The D1 .run() result.
 */
export function ensureAgentRow(env, id, agentName = null) {
  return env.issues_db.prepare(`
    INSERT INTO agents (id, agent_name, agent_status)
    VALUES (?, ?, 'idle')
    ON CONFLICT(id) DO NOTHING
  `)
    .bind(id, agentName || id)
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
 * Return the single highest-priority open unclaimed issue belonging to a
 * specific user (by created_by_user), ordered by priority then creation time.
 * @param {object} env - Worker env bindings.
 * @param {string} userId - The user's DB id (e.g. "user-12345").
 * @returns {Promise<object|null>} The row, or null.
 */
export function selectReadyIssueByUserId(env, userId) {
  return env.issues_db
    .prepare(`
      SELECT * FROM issues
      WHERE issue_status = 'open'
        AND (assigned_to_agent IS NULL OR assigned_to_agent = '')
        AND created_by_user = ?
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
    .bind(userId)
    .first();
}


/**
 * Store the result of a completed agent run: transitions status, saves
 * result_text and tokens_used, and stamps updated_at.
 * result_text requires migration 0002. tokens_used is defined in 0001_schema.sql.
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

/**
 * Fetch a single user by id, or null if they don't exist.
 * @param {object} env - Worker env bindings.
 * @param {string} id - User id.
 * @returns {Promise<object|null>} The row, or null.
 */
export function selectUserById(env, id) {
  return env.issues_db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first();
}

/**
 * Looks up a user by username.
 * @param {object} env - Worker env bindings.
 * @param {string} username - the username to look up
 * @returns {object|null} the user row or null
 */
export async function selectUserByUsername(env, username) {
  return env.issues_db.prepare(
    'SELECT * FROM users WHERE username = ?'
  ).bind(username).first();
}

/**
 * Inserts a new user into the users table.
 * @param {object} env - Worker env bindings.
 * @param {string} id - the user id (UUID)
 * @param {string} username - the username
 * @param {string} email - the user's email address
 * @returns {object} the D1 .run() result
 */
export async function insertUser(env, id, username, email) {
  return env.issues_db.prepare(
    'INSERT INTO users (id, username, email) VALUES (?, ?, ?)'
  ).bind(id, username, email).run();
}