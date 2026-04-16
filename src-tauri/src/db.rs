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

        // Enable WAL mode for better concurrent access
        conn.execute_batch("PRAGMA journal_mode = WAL;")?;

        // Initialize schema
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

pub fn get_db(app: &AppHandle) -> &Database {
    app.state::<Database>().inner()
}

#[cfg(test)]
mod tests {
    use rusqlite::{params, Connection};

    fn seed_job(conn: &Connection, id: &str, status: &str) {
        conn.execute(
            "INSERT INTO jobs (id, status, mode, prompt) VALUES (?1, ?2, 'text-to-image', 'p')",
            params![id, status],
        )
        .unwrap();
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
