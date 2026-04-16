use crate::db::get_db;
use crate::models::{CreateI2IJobRequest, CreateT2IJobRequest, Job, JobItem, JobWithItems};
use rusqlite::params;
use tauri::AppHandle;
use uuid::Uuid;

#[tauri::command]
pub fn get_jobs(app: AppHandle, status: Option<String>) -> Result<Vec<Job>, String> {
    let db = get_db(&app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let sql = match status.as_deref() {
        Some("active") => {
            "SELECT id, status, mode, prompt, output_size, temperature, aspect_ratio,
                    batch_job_name, batch_temp_file, total_items, completed_items, failed_items,
                    created_at, updated_at
             FROM jobs WHERE status IN ('pending', 'processing') ORDER BY created_at DESC"
        }
        None | Some("all") => {
            "SELECT id, status, mode, prompt, output_size, temperature, aspect_ratio,
                    batch_job_name, batch_temp_file, total_items, completed_items, failed_items,
                    created_at, updated_at
             FROM jobs ORDER BY created_at DESC"
        }
        Some(other) => {
            return Err(format!("Unknown status filter: '{}'. Use 'active' or 'all'.", other));
        }
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let jobs = stmt
        .query_map([], Job::from_row)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(jobs)
}

#[tauri::command]
pub fn get_job(app: AppHandle, id: String) -> Result<JobWithItems, String> {
    let db = get_db(&app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let job: Job = conn
        .query_row(
            "SELECT id, status, mode, prompt, output_size, temperature, aspect_ratio,
                    batch_job_name, batch_temp_file, total_items, completed_items, failed_items,
                    created_at, updated_at
             FROM jobs WHERE id = ?1",
            params![id],
            Job::from_row,
        )
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, job_id, input_prompt, input_image_path, output_image_path, status, error,
                    created_at, updated_at
             FROM job_items WHERE job_id = ?1 ORDER BY created_at",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![id], |row| {
            Ok(JobItem {
                id: row.get(0)?,
                job_id: row.get(1)?,
                input_prompt: row.get(2)?,
                input_image_path: row.get(3)?,
                output_image_path: row.get(4)?,
                status: row.get(5)?,
                error: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(JobWithItems { job, items })
}

#[tauri::command]
pub fn create_t2i_job(app: AppHandle, request: CreateT2IJobRequest) -> Result<JobWithItems, String> {
    let db = get_db(&app);
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;

    let job_id = Uuid::new_v4().to_string();
    let first_prompt = request.prompts.first().cloned().unwrap_or_default();
    let total_items = request.prompts.len() as i32;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO jobs (id, mode, prompt, output_size, temperature, aspect_ratio, total_items, status)
         VALUES (?1, 'text-to-image', ?2, ?3, ?4, ?5, ?6, 'pending')",
        params![
            job_id,
            first_prompt,
            request.output_size,
            request.temperature,
            request.aspect_ratio,
            total_items
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for prompt in &request.prompts {
        let item_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO job_items (id, job_id, input_prompt, status)
             VALUES (?1, ?2, ?3, 'pending')",
            params![item_id, job_id, prompt],
        )
        .map_err(|e| e.to_string())?;

        items.push(JobItem {
            id: item_id,
            job_id: job_id.clone(),
            input_prompt: Some(prompt.clone()),
            input_image_path: None,
            output_image_path: None,
            status: "pending".to_string(),
            error: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        });
    }

    tx.commit().map_err(|e| e.to_string())?;

    let job = Job {
        id: job_id,
        status: "pending".to_string(),
        mode: "text-to-image".to_string(),
        prompt: first_prompt,
        output_size: request.output_size,
        temperature: request.temperature,
        aspect_ratio: request.aspect_ratio,
        batch_job_name: None,
        batch_temp_file: None,
        total_items,
        completed_items: 0,
        failed_items: 0,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    Ok(JobWithItems { job, items })
}

#[tauri::command]
pub fn create_i2i_job(app: AppHandle, request: CreateI2IJobRequest) -> Result<JobWithItems, String> {
    // Validate image paths are within uploads directory
    let uploads_dir = crate::paths::get_uploads_dir(&app)?;
    for image_path in &request.image_paths {
        let canonical = std::path::Path::new(image_path)
            .canonicalize()
            .map_err(|_| format!("Image not found: {}", image_path))?;
        if !canonical.starts_with(&uploads_dir) {
            return Err("Image paths must be within the uploads directory".to_string());
        }
    }

    let db = get_db(&app);
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;

    let job_id = Uuid::new_v4().to_string();
    let total_items = request.image_paths.len() as i32;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO jobs (id, mode, prompt, output_size, temperature, aspect_ratio, total_items, status)
         VALUES (?1, 'image-to-image', ?2, ?3, ?4, ?5, ?6, 'pending')",
        params![
            job_id,
            request.prompt,
            request.output_size,
            request.temperature,
            request.aspect_ratio,
            total_items
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for image_path in &request.image_paths {
        let item_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO job_items (id, job_id, input_image_path, status)
             VALUES (?1, ?2, ?3, 'pending')",
            params![item_id, job_id, image_path],
        )
        .map_err(|e| e.to_string())?;

        items.push(JobItem {
            id: item_id,
            job_id: job_id.clone(),
            input_prompt: None,
            input_image_path: Some(image_path.clone()),
            output_image_path: None,
            status: "pending".to_string(),
            error: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        });
    }

    tx.commit().map_err(|e| e.to_string())?;

    let job = Job {
        id: job_id,
        status: "pending".to_string(),
        mode: "image-to-image".to_string(),
        prompt: request.prompt,
        output_size: request.output_size,
        temperature: request.temperature,
        aspect_ratio: request.aspect_ratio,
        batch_job_name: None,
        batch_temp_file: None,
        total_items,
        completed_items: 0,
        failed_items: 0,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    Ok(JobWithItems { job, items })
}

#[tauri::command]
pub async fn delete_job(app: AppHandle, id: String) -> Result<(), String> {
    let (status, batch_name): (String, Option<String>) = {
        let db = get_db(&app);
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT status, batch_job_name FROM jobs WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?
    };

    // Refuse to delete while download_results is mid-flight — letting it
    // proceed would leave orphan images on disk and race the row deletes.
    if status == "downloading" {
        return Err(
            "Cannot delete job while results are being downloaded. Try again in a moment."
                .to_string(),
        );
    }

    // Cancel batch if still active (pending/processing). Terminal states
    // (completed/failed/cancelled) don't need a cancel call.
    if (status == "pending" || status == "processing") && batch_name.is_some() {
        let _ = super::batch::cancel_batch(app.clone(), batch_name.unwrap()).await;
    }

    // Delete from DB atomically (job_items FK references jobs.id)
    let db = get_db(&app);
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM job_items WHERE job_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM jobs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}
