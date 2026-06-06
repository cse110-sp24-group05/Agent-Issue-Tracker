// memory-d1.js
// A tiny in-memory Cloudflare D1 stand-in for end-to-end Worker tests.
// Produced by Claude Code, human reviwed.
//
// It wraps Node's built-in `node:sqlite` (DatabaseSync) behind the same
// surface db.js relies on: `prepare(sql).bind(...).first()|all()|run()`.
// That lets worker.fetch() exercise the *real* SQL in db.js against a real
// SQLite engine — never the remote D1 — so every test starts from a clean,
// throwaway database held only in memory.
//
// Why a hand-written schema instead of replaying migrations/*.sql:
//   0009_fix_agents_legacy_columns.sql selects legacy `name`/`status` columns
//   that exist only on the deployed remote DB, not on a fresh one, so a clean
//   replay throws "no such column: name". SCHEMA below is the end state those
//   migrations converge to (issues/history shapes from 0007, canonical agents
//   from 0009, the per-user display_no index from 0006).

// Resolve node:sqlite through Node's real require, not jest's resolver. jest's
// module resolver intermittently strips the `node:` prefix off prefix-only
// builtins like node:sqlite and then fails looking for a package named
// "sqlite" (the failure depends on its haste-map/cache order, so it surfaces
// only in some runs). createRequire bypasses jest-resolve entirely; node:module
// always resolves cleanly because its unprefixed name is a known builtin.
import { createRequire } from 'node:module';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

// Final schema: the cumulative end state of migrations 0001–0009.
const SCHEMA = `
CREATE TABLE users (
    id       TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email    TEXT NOT NULL UNIQUE
);

CREATE TABLE agents (
    id           TEXT PRIMARY KEY,
    agent_name   TEXT NOT NULL DEFAULT '',
    agent_status TEXT NOT NULL DEFAULT 'idle' CHECK (
        agent_status IN ('idle', 'running', 'offline')
    )
);

CREATE TABLE issues (
    id    TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    issue_description TEXT,
    issue_status TEXT NOT NULL CHECK (
        issue_status IN ('open', 'in_progress', 'blocked', 'review', 'closed')
    ),
    issue_priority TEXT NOT NULL CHECK (
        issue_priority IN ('low', 'medium', 'high', 'critical')
    ),

    assigned_to_user  INTEGER NOT NULL DEFAULT 0 CHECK (assigned_to_user IN (0, 1)),
    assigned_to_agent INTEGER NOT NULL DEFAULT 0 CHECK (assigned_to_agent IN (0, 1)),

    claim_expires_at INTEGER,
    retry_count INTEGER NOT NULL DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    claim_timeout_minutes INTEGER NOT NULL DEFAULT 30,
    agent_response TEXT,
    result_text TEXT,

    created_by_user TEXT,
    display_no INTEGER,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT,

    CHECK (assigned_to_user + assigned_to_agent <= 1),
    FOREIGN KEY (created_by_user) REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_issues_display_no_per_user
    ON issues(created_by_user, display_no);

CREATE TABLE issue_status_history (
    id               TEXT NOT NULL PRIMARY KEY,
    issue_id         TEXT NOT NULL,
    issue_status     TEXT NOT NULL CHECK (
        issue_status IN ('open', 'in_progress', 'blocked', 'review', 'closed')
    ),
    changed_at       TEXT NOT NULL,
    changed_by_user  INTEGER NOT NULL DEFAULT 0 CHECK (changed_by_user IN (0, 1)),
    changed_by_agent INTEGER NOT NULL DEFAULT 0 CHECK (changed_by_agent IN (0, 1)),

    FOREIGN KEY (issue_id) REFERENCES issues(id)
);

CREATE TRIGGER trg_issue_status_history
AFTER UPDATE OF issue_status ON issues
WHEN OLD.issue_status != NEW.issue_status
BEGIN
    INSERT INTO issue_status_history (id, issue_id, issue_status, changed_at, changed_by_user, changed_by_agent)
    VALUES (
        lower(hex(randomblob(16))),
        NEW.id, NEW.issue_status, NEW.updated_at,
        NEW.assigned_to_user, NEW.assigned_to_agent
    );
END;

CREATE TRIGGER trg_issue_status_history_insert
AFTER INSERT ON issues
BEGIN
    INSERT INTO issue_status_history (id, issue_id, issue_status, changed_at, changed_by_user, changed_by_agent)
    VALUES (
        lower(hex(randomblob(16))),
        NEW.id, NEW.issue_status, NEW.created_at,
        NEW.assigned_to_user, NEW.assigned_to_agent
    );
END;

CREATE TRIGGER trg_delete_issue_status_history
BEFORE DELETE ON issues
BEGIN
    DELETE FROM issue_status_history WHERE issue_id = OLD.id;
END;
`;

/**
 * One prepared statement, mimicking a D1PreparedStatement.
 * D1 is async, so first()/all()/run() return promises; bind() is chainable.
 * On a SQL error node:sqlite throws synchronously — wrapping the body in an
 * async method turns that into a rejected promise, matching how the handlers'
 * try/catch sees real D1 failures.
 */
class MemoryStatement {
  /** @param {import('node:sqlite').StatementSync} stmt */
  constructor(stmt) {
    this.stmt = stmt;
    this.params = [];
  }

  /**
   * @param {...unknown} params - Positional values for the `?` placeholders.
   * @returns {MemoryStatement} this, for chaining.
   */
  bind(...params) {
    this.params = params;
    return this;
  }

  /**
   * @param {string} [column] - If given, return just that column's value.
   * @returns {Promise<object|unknown|null>} First row (or column), or null.
   */
  async first(column) {
    const row = this.stmt.get(...this.params);
    if (row === undefined) { return null; }
    return column === undefined ? row : (row[column] ?? null);
  }

  /**
   * @returns {Promise<{ results: object[], success: true, meta: object }>}
   */
  async all() {
    const results = this.stmt.all(...this.params);
    return { results, success: true, meta: {} };
  }

  /**
   * @returns {Promise<{ success: true, meta: { changes: number, last_row_id: number } }>}
   */
  async run() {
    const info = this.stmt.run(...this.params);
    return {
      success: true,
      meta: {
        changes: Number(info.changes),
        last_row_id: Number(info.lastInsertRowid)
      }
    };
  }
}

/**
 * A D1Database stand-in backed by an in-memory SQLite connection.
 */
class MemoryD1 {
  /** @param {DatabaseSync} db */
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {string} sql - SQL with `?` placeholders.
   * @returns {MemoryStatement}
   */
  prepare(sql) {
    return new MemoryStatement(this.db.prepare(sql));
  }
}

/**
 * Create a fresh, isolated in-memory database with the full schema applied,
 * wrapped as a Worker `env` object. Call once per test for clean state.
 * @returns {{ env: { issues_db: MemoryD1 }, db: DatabaseSync, close: () => void }}
 *   env  — pass straight to worker.fetch(request, env);
 *   db   — the raw connection, for asserting on rows directly;
 *   close— release the connection (call in afterEach).
 */
export function createTestEnv() {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);
  return {
    env: { issues_db: new MemoryD1(db) },
    db,
    close: () => db.close()
  };
}
