use rusqlite::{Connection, Result as SqliteResult};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> SqliteResult<Self> {
        std::fs::create_dir_all(&app_data_dir).ok();
        let db_path = app_data_dir.join("nanobanana.db");
        let conn = Connection::open(&db_path)?;

        conn.execute_batch("PRAGMA journal_mode = WAL;")?;
        run_migrations(&conn)?;

        // Crash recovery: if the app was killed mid-download, the job is
        // stranded in 'downloading'. Reset so the next poll tick can
        // re-enter download_results via its CAS guard.
        conn.execute(
            "UPDATE jobs SET status = 'processing' WHERE status = 'downloading'",
            [],
        )?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}

/// Schema version ladder. Bump when adding a new migration.
const LATEST_VERSION: i64 = 1;

/// Runs any pending migrations, gated on PRAGMA user_version.
///
/// Existing installs pre-dating the ladder already have v1 tables; the
/// IF NOT EXISTS guards inside migration 1 make replaying it safe, and
/// the user_version bump records them as at version 1 going forward.
pub fn run_migrations(conn: &Connection) -> SqliteResult<()> {
    let current: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    if current < 1 {
        migrate_v1(conn)?;
        conn.execute_batch("PRAGMA user_version = 1")?;
    }

    // Future migrations: gate on `current < N`, bump user_version at the end.
    // Keep each migration idempotent so a partially-applied upgrade can retry.

    debug_assert_eq!(LATEST_VERSION, 1, "update the ladder when adding migrations");
    Ok(())
}

fn migrate_v1(conn: &Connection) -> SqliteResult<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL DEFAULT 'pending',
            mode TEXT NOT NULL DEFAULT 'text-to-image',
            prompt TEXT NOT NULL,
            output_size TEXT NOT NULL DEFAULT '1K',
            temperature REAL NOT NULL DEFAULT 1,
            aspect_ratio TEXT NOT NULL DEFAULT '1:1',
            batch_job_name TEXT,
            batch_temp_file TEXT,
            total_items INTEGER NOT NULL DEFAULT 0,
            completed_items INTEGER NOT NULL DEFAULT 0,
            failed_items INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS job_items (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            input_prompt TEXT,
            input_image_path TEXT,
            output_image_path TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            error TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_job_items_job_id ON job_items(job_id);
        CREATE INDEX IF NOT EXISTS idx_job_items_status ON job_items(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        "#,
    )?;
    Ok(())
}

pub fn get_db(app: &AppHandle) -> &Database {
    app.state::<Database>().inner()
}

#[cfg(test)]
mod tests {
    use super::run_migrations;
    use rusqlite::{params, Connection};

    #[test]
    fn migrations_fresh_db_goes_to_latest() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        let v: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0)).unwrap();
        assert_eq!(v, 1);

        // All v1 tables exist and are writable.
        conn.execute("INSERT INTO jobs (id, prompt) VALUES ('j1', 'p')", [])
            .unwrap();
        conn.execute(
            "INSERT INTO job_items (id, job_id) VALUES ('i1', 'j1')",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO config (key, value) VALUES ('k', 'v')", [])
            .unwrap();
    }

    #[test]
    fn migrations_are_idempotent() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        // Running again must not error or reset user_version.
        run_migrations(&conn).unwrap();
        let v: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0)).unwrap();
        assert_eq!(v, 1);
    }

    #[test]
    fn migrations_preserve_existing_data() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        conn.execute(
            "INSERT INTO jobs (id, prompt) VALUES ('j1', 'keep me')",
            [],
        )
        .unwrap();

        // Simulate a reboot — re-run migrations on a DB with pre-existing rows.
        run_migrations(&conn).unwrap();

        let prompt: String = conn
            .query_row("SELECT prompt FROM jobs WHERE id = 'j1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(prompt, "keep me");
    }

    #[test]
    fn migrations_upgrade_legacy_unversioned_db() {
        // Simulate an install that pre-dates the ladder: the v1 schema
        // exists but user_version is still 0 (because the old init used
        // bare CREATE TABLE IF NOT EXISTS without PRAGMA user_version).
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE jobs (
                id TEXT PRIMARY KEY, status TEXT, mode TEXT, prompt TEXT,
                output_size TEXT, temperature REAL, aspect_ratio TEXT,
                batch_job_name TEXT, batch_temp_file TEXT,
                total_items INTEGER, completed_items INTEGER, failed_items INTEGER,
                created_at TEXT, updated_at TEXT
            );
            CREATE TABLE job_items (
                id TEXT PRIMARY KEY, job_id TEXT, input_prompt TEXT,
                input_image_path TEXT, output_image_path TEXT, status TEXT,
                error TEXT, created_at TEXT, updated_at TEXT
            );
            CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            "#,
        )
        .unwrap();
        conn.execute("INSERT INTO jobs (id, prompt) VALUES ('legacy', 'old')", [])
            .unwrap();

        let before: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0)).unwrap();
        assert_eq!(before, 0);

        run_migrations(&conn).unwrap();

        let after: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0)).unwrap();
        assert_eq!(after, 1);

        // Pre-existing data survives the migration replay.
        let prompt: String = conn
            .query_row("SELECT prompt FROM jobs WHERE id = 'legacy'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(prompt, "old");
    }

    fn seed_job(conn: &Connection, id: &str, status: &str) {
        conn.execute(
            "INSERT INTO jobs (id, status, mode, prompt) VALUES (?1, ?2, 'text-to-image', 'p')",
            params![id, status],
        )
        .unwrap();
    }

    fn seed_item(conn: &Connection, id: &str, job_id: &str, status: &str) {
        conn.execute(
            "INSERT INTO job_items (id, job_id, status) VALUES (?1, ?2, ?3)",
            params![id, job_id, status],
        )
        .unwrap();
    }

    fn setup_with_items() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        super::run_migrations(&conn).unwrap();
        conn
    }

    #[test]
    fn retry_filter_selects_only_pending_after_reset() {
        let conn = setup_with_items();
        seed_job(&conn, "job1", "failed");
        seed_item(&conn, "i_done", "job1", "completed");
        seed_item(&conn, "i_bad", "job1", "failed");
        seed_item(&conn, "i_new", "job1", "pending");

        // Reset failed -> pending (what submit_batch does on retry)
        let now = "2026-04-16T00:00:00Z";
        conn.execute(
            "UPDATE job_items SET status = 'pending', error = NULL, updated_at = ?1
             WHERE job_id = ?2 AND status = 'failed'",
            params![now, "job1"],
        )
        .unwrap();

        // The retry submit query should match only non-completed items.
        let mut stmt = conn
            .prepare(
                "SELECT id FROM job_items WHERE job_id = ?1 AND status = 'pending' ORDER BY id",
            )
            .unwrap();
        let ids: Vec<String> = stmt
            .query_map(params!["job1"], |row| row.get::<_, String>(0))
            .unwrap()
            .map(Result::unwrap)
            .collect();

        assert_eq!(ids, vec!["i_bad".to_string(), "i_new".to_string()]);
    }

    #[test]
    fn count_aggregate_reflects_full_job_not_just_retry_batch() {
        let conn = setup_with_items();
        seed_job(&conn, "job1", "downloading");
        seed_item(&conn, "i_done_prev", "job1", "completed");
        seed_item(&conn, "i_done_now", "job1", "completed");
        seed_item(&conn, "i_bad_now", "job1", "failed");

        let (completed, failed): (i32, i32) = conn
            .query_row(
                "SELECT
                   COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
                   COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0)
                 FROM job_items WHERE job_id = ?1",
                params!["job1"],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        assert_eq!(completed, 2, "prior completions must survive aggregation");
        assert_eq!(failed, 1);
    }

    #[test]
    fn retry_with_no_pending_items_returns_empty_set() {
        let conn = setup_with_items();
        seed_job(&conn, "job1", "completed");
        seed_item(&conn, "i_done", "job1", "completed");

        let mut stmt = conn
            .prepare("SELECT id FROM job_items WHERE job_id = ?1 AND status = 'pending'")
            .unwrap();
        let count = stmt
            .query_map(params!["job1"], |row| row.get::<_, String>(0))
            .unwrap()
            .count();

        assert_eq!(count, 0, "submit_batch should bail with 'Nothing to submit'");
    }

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE jobs (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'pending',
                mode TEXT NOT NULL DEFAULT 'text-to-image',
                prompt TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            "#,
        )
        .unwrap();
        conn
    }

    #[test]
    fn cas_claim_affects_only_processing_rows() {
        let conn = setup();
        seed_job(&conn, "pending-1", "pending");
        seed_job(&conn, "processing-1", "processing");
        seed_job(&conn, "downloading-1", "downloading");

        let affected = conn
            .execute(
                "UPDATE jobs SET status = 'downloading' WHERE id = ?1 AND status = 'processing'",
                params!["processing-1"],
            )
            .unwrap();
        assert_eq!(affected, 1);

        let after: String = conn
            .query_row("SELECT status FROM jobs WHERE id = ?1", params!["processing-1"], |r| r.get(0))
            .unwrap();
        assert_eq!(after, "downloading");
    }

    #[test]
    fn cas_claim_rejects_already_downloading() {
        let conn = setup();
        seed_job(&conn, "job-1", "downloading");

        let affected = conn
            .execute(
                "UPDATE jobs SET status = 'downloading' WHERE id = ?1 AND status = 'processing'",
                params!["job-1"],
            )
            .unwrap();
        assert_eq!(affected, 0);
    }

    #[test]
    fn cas_claim_rejects_deleted_job() {
        let conn = setup();
        // no seed
        let affected = conn
            .execute(
                "UPDATE jobs SET status = 'downloading' WHERE id = ?1 AND status = 'processing'",
                params!["missing"],
            )
            .unwrap();
        assert_eq!(affected, 0);
    }

    #[test]
    fn crash_recovery_resets_downloading_to_processing() {
        let conn = setup();
        seed_job(&conn, "stranded", "downloading");
        seed_job(&conn, "done", "completed");
        seed_job(&conn, "active", "processing");

        let affected = conn
            .execute(
                "UPDATE jobs SET status = 'processing' WHERE status = 'downloading'",
                [],
            )
            .unwrap();
        assert_eq!(affected, 1);

        let stranded: String = conn
            .query_row("SELECT status FROM jobs WHERE id = ?1", params!["stranded"], |r| r.get(0))
            .unwrap();
        assert_eq!(stranded, "processing");

        let done: String = conn
            .query_row("SELECT status FROM jobs WHERE id = ?1", params!["done"], |r| r.get(0))
            .unwrap();
        assert_eq!(done, "completed");
    }
}
