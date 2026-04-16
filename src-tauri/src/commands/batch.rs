// src-tauri/src/commands/batch.rs
use base64::Engine;
use crate::db::get_db;
use crate::models::BatchStatus;
use crate::paths::{get_api_key, get_results_dir, mime_from_ext, validate_batch_name};
use reqwest::Client;
use rusqlite::params;
use serde_json::{json, Value};
use std::fs;
use tauri::{AppHandle, Manager};

const GEMINI_BASE: &str = "https://generativelanguage.googleapis.com";
const MODEL: &str = "gemini-3.1-pro-preview";

fn get_app_data_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path().app_data_dir().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn submit_batch(app: AppHandle, job_id: String) -> Result<(), String> {
    let api_key = get_api_key(&app)?;
    let app_data_dir = get_app_data_dir(&app)?;

    // Read job and items from DB (scoped to drop lock before await)
    let (mode, temperature, prompt, output_size, aspect_ratio, items) = {
        let db = get_db(&app);
        let conn = db.conn.lock().map_err(|e| e.to_string())?;

        // Consolidate 4 queries into 1
        let (mode, temperature, prompt, output_size, aspect_ratio): (String, f64, String, String, String) = conn
            .query_row(
                "SELECT mode, temperature, prompt, output_size, aspect_ratio FROM jobs WHERE id = ?1",
                params![job_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
            )
            .map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare("SELECT id, input_prompt, input_image_path FROM job_items WHERE job_id = ?1")
            .map_err(|e| e.to_string())?;

        let items: Vec<(String, Option<String>, Option<String>)> = stmt
            .query_map(params![job_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        (mode, temperature, prompt, output_size, aspect_ratio, items)
    }; // lock dropped here

    // Build JSONL
    let mut jsonl_lines = Vec::new();
    for (item_id, item_prompt, item_image_path) in &items {
        let prompt_text = if mode == "text-to-image" {
            let p = item_prompt.as_deref().unwrap_or(&prompt);
            format!("Generate a {} {} image of: {}", output_size, aspect_ratio, p)
        } else {
            format!(
                "Transform this image ({} {}) with: {}",
                output_size, aspect_ratio, prompt
            )
        };

        let mut parts: Vec<Value> = vec![json!({"text": prompt_text})];

        // For I2I, add image data
        if mode == "image-to-image" {
            if let Some(img_path) = item_image_path {
                let img_data = fs::read(img_path).map_err(|e| format!("Failed to read image: {}", e))?;
                let b64 = base64::engine::general_purpose::STANDARD.encode(&img_data);
                let ext = std::path::Path::new(img_path)
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("png");
                let mime = mime_from_ext(ext);
                parts.push(json!({
                    "inline_data": {
                        "mime_type": mime,
                        "data": b64
                    }
                }));
            }
        }

        let line = json!({
            "key": item_id,
            "request": {
                "contents": [{"parts": parts}],
                "generation_config": {
                    "temperature": temperature,
                    "responseModalities": ["TEXT", "IMAGE"]
                }
            }
        });
        jsonl_lines.push(serde_json::to_string(&line).map_err(|e| e.to_string())?);
    }

    let jsonl_content = jsonl_lines.join("\n");
    let temp_dir = app_data_dir.join("temp");
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    let jsonl_path = temp_dir.join(format!("batch-{}-{}.jsonl", mode, chrono::Utc::now().timestamp()));
    fs::write(&jsonl_path, &jsonl_content).map_err(|e| format!("Failed to write JSONL: {}", e))?;

    let client = app.state::<Client>();

    // Step 1: Initiate resumable upload
    let jsonl_bytes = jsonl_content.as_bytes();
    let init_resp = client
        .post(format!("{}/upload/v1beta/files", GEMINI_BASE))
        .header("x-goog-api-key", &api_key)
        .header("X-Goog-Upload-Protocol", "resumable")
        .header("X-Goog-Upload-Command", "start")
        .header("X-Goog-Upload-Header-Content-Length", jsonl_bytes.len().to_string())
        .header("X-Goog-Upload-Header-Content-Type", "application/jsonl")
        .header("Content-Type", "application/json")
        .json(&json!({"file": {"display_name": format!("batch-{}", job_id)}}))
        .send()
        .await
        .map_err(|e| format!("Upload init failed: {}", e))?;

    if !init_resp.status().is_success() {
        let status = init_resp.status();
        let body = init_resp.text().await.unwrap_or_default();
        return Err(format!("API request failed ({}): {}", status, body));
    }

    let upload_url = init_resp
        .headers()
        .get("x-goog-upload-url")
        .ok_or("No upload URL in response")?
        .to_str()
        .map_err(|e| e.to_string())?
        .to_string();

    // Step 2: Upload file content
    let upload_resp = client
        .put(&upload_url)
        .header("X-Goog-Upload-Command", "upload, finalize")
        .header("X-Goog-Upload-Offset", "0")
        .header("Content-Length", jsonl_bytes.len().to_string())
        .body(jsonl_content.clone())
        .send()
        .await
        .map_err(|e| format!("Upload failed: {}", e))?;

    if !upload_resp.status().is_success() {
        let status = upload_resp.status();
        let body = upload_resp.text().await.unwrap_or_default();
        return Err(format!("API request failed ({}): {}", status, body));
    }

    let upload_result: Value = upload_resp.json().await.map_err(|e| e.to_string())?;
    let file_name = upload_result["file"]["name"]
        .as_str()
        .ok_or("No file name in upload response")?
        .to_string();

    // Step 3: Submit batch
    let batch_resp = client
        .post(format!(
            "{}/v1beta/models/{}:batchGenerateContent",
            GEMINI_BASE, MODEL
        ))
        .header("x-goog-api-key", &api_key)
        .header("Content-Type", "application/json")
        .json(&json!({
            "batch": {
                "display_name": format!("nanobanana-{}", job_id),
                "input_config": {
                    "requests": {
                        "file_name": file_name
                    }
                }
            }
        }))
        .send()
        .await
        .map_err(|e| format!("Batch submit failed: {}", e))?;

    if !batch_resp.status().is_success() {
        let status = batch_resp.status();
        let body = batch_resp.text().await.unwrap_or_default();
        return Err(format!("API request failed ({}): {}", status, body));
    }

    let batch_result: Value = batch_resp.json().await.map_err(|e| e.to_string())?;
    let batch_name = batch_result["name"]
        .as_str()
        .ok_or("No batch name in response")?
        .to_string();

    // Update job with batch name (scoped to drop lock)
    {
        let db = get_db(&app);
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE jobs SET batch_job_name = ?1, batch_temp_file = ?2, status = 'processing', updated_at = ?3 WHERE id = ?4",
            params![
                batch_name,
                jsonl_path.to_string_lossy().to_string(),
                chrono::Utc::now().to_rfc3339(),
                job_id
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn poll_batch(app: AppHandle, batch_name: String) -> Result<BatchStatus, String> {
    // Validate batch_name to prevent SSRF
    validate_batch_name(&batch_name)?;

    let api_key = get_api_key(&app)?;
    let client = app.state::<Client>();

    let resp = client
        .get(format!("{}/v1beta/{}", GEMINI_BASE, batch_name))
        .header("x-goog-api-key", &api_key)
        .send()
        .await
        .map_err(|e| format!("Poll failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("API request failed ({}): {}", status, body));
    }

    let result: Value = resp.json().await.map_err(|e| e.to_string())?;

    let state = result["state"].as_str().unwrap_or("JOB_STATE_PENDING").to_string();
    let stats = &result["batchStats"];

    Ok(BatchStatus {
        state,
        total_requests: stats["totalRequestCount"].as_i64().unwrap_or(0) as i32,
        completed_requests: stats["successRequestCount"].as_i64().unwrap_or(0) as i32,
        failed_requests: stats["failedRequestCount"].as_i64().unwrap_or(0) as i32,
    })
}

#[tauri::command]
pub async fn download_results(
    app: AppHandle,
    batch_name: String,
    job_id: String,
) -> Result<(), String> {
    // Validate batch_name to prevent SSRF
    validate_batch_name(&batch_name)?;

    // CAS guard: claim the job by flipping processing -> downloading.
    // A concurrent download_results or a mid-flight delete_job will see
    // the non-'processing' state and bail, preventing orphan result files
    // and duplicate image writes. On startup we reset any stranded
    // 'downloading' rows back to 'processing' so a crash is recoverable.
    {
        let db = get_db(&app);
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let affected = conn
            .execute(
                "UPDATE jobs SET status = 'downloading', updated_at = ?1
                 WHERE id = ?2 AND status = 'processing'",
                params![chrono::Utc::now().to_rfc3339(), job_id],
            )
            .map_err(|e| e.to_string())?;
        if affected == 0 {
            return Err("Job is not in processing state (already downloaded, cancelled, or deleted)".to_string());
        }
    }

    let api_key = get_api_key(&app)?;
    let client = app.state::<Client>();

    // Get batch to find result file
    let resp = client
        .get(format!("{}/v1beta/{}", GEMINI_BASE, batch_name))
        .header("x-goog-api-key", &api_key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("API request failed ({}): {}", status, body));
    }

    let batch: Value = resp.json().await.map_err(|e| e.to_string())?;
    let result_file = batch["dest"]["fileName"]
        .as_str()
        .ok_or("No result file in batch response")?;

    // Download result JSONL
    let result_resp = client
        .get(format!(
            "{}/download/v1beta/{}:download?alt=media",
            GEMINI_BASE, result_file
        ))
        .header("x-goog-api-key", &api_key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !result_resp.status().is_success() {
        let status = result_resp.status();
        let body = result_resp.text().await.unwrap_or_default();
        return Err(format!("API request failed ({}): {}", status, body));
    }

    let result_text = result_resp.text().await.map_err(|e| e.to_string())?;
    let results_dir = get_results_dir(&app)?;
    let now = chrono::Utc::now().to_rfc3339();

    let mut completed = 0i32;
    let mut failed = 0i32;

    // Parse results and save images (all DB access scoped)
    for line in result_text.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let parsed: Value = serde_json::from_str(line).map_err(|e| e.to_string())?;

        let key = parsed["key"].as_str().unwrap_or("").to_string();

        if let Some(error) = parsed["error"].as_str() {
            let error = error.to_string();
            let db = get_db(&app);
            let conn = db.conn.lock().map_err(|e| e.to_string())?;
            conn.execute(
                "UPDATE job_items SET status = 'failed', error = ?1, updated_at = ?2 WHERE id = ?3",
                params![error, now, key],
            )
            .map_err(|e| e.to_string())?;
            failed += 1;
        } else if let Some(candidates) = parsed["response"]["candidates"].as_array() {
            let mut saved = false;
            for candidate in candidates {
                if let Some(parts) = candidate["content"]["parts"].as_array() {
                    for part in parts {
                        if let Some(inline_data) = part.get("inlineData") {
                            let mime = inline_data["mimeType"].as_str().unwrap_or("image/png");
                            let data = inline_data["data"].as_str().unwrap_or("");
                            let ext = match mime {
                                "image/jpeg" => "jpg",
                                "image/webp" => "webp",
                                "image/gif" => "gif",
                                _ => "png",
                            };

                            let file_id = uuid::Uuid::new_v4().to_string();
                            let file_path = results_dir.join(format!("{}.{}", file_id, ext));

                            let decoded = base64::engine::general_purpose::STANDARD
                                .decode(data)
                                .map_err(|e| format!("Base64 decode failed: {}", e))?;

                            fs::write(&file_path, &decoded)
                                .map_err(|e| format!("Failed to write image: {}", e))?;

                            {
                                let db = get_db(&app);
                                let conn = db.conn.lock().map_err(|e| e.to_string())?;
                                conn.execute(
                                    "UPDATE job_items SET status = 'completed', output_image_path = ?1, updated_at = ?2 WHERE id = ?3",
                                    params![file_path.to_string_lossy().to_string(), now, key],
                                )
                                .map_err(|e| e.to_string())?;
                            }

                            completed += 1;
                            saved = true;
                            break;
                        }
                    }
                    if saved {
                        break;
                    }
                }
            }
            if !saved {
                let db = get_db(&app);
                let conn = db.conn.lock().map_err(|e| e.to_string())?;
                conn.execute(
                    "UPDATE job_items SET status = 'failed', error = 'No image in response', updated_at = ?1 WHERE id = ?2",
                    params![now, key],
                )
                .map_err(|e| e.to_string())?;
                failed += 1;
            }
        }
    }

    // Update job status
    let final_status = if failed > 0 && completed == 0 {
        "failed"
    } else {
        "completed"
    };

    {
        let db = get_db(&app);
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE jobs SET status = ?1, completed_items = ?2, failed_items = ?3, updated_at = ?4 WHERE id = ?5",
            params![final_status, completed, failed, now, job_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Clean up temp JSONL file
    {
        let db = get_db(&app);
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let temp_file: Option<String> = conn.query_row(
            "SELECT batch_temp_file FROM jobs WHERE id = ?1",
            params![job_id],
            |row| row.get(0),
        ).ok().flatten();
        if let Some(path) = temp_file {
            let _ = fs::remove_file(&path);
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn cancel_batch(app: AppHandle, batch_name: String) -> Result<(), String> {
    // Validate batch_name
    validate_batch_name(&batch_name)?;

    let api_key = get_api_key(&app)?;
    let client = app.state::<Client>();

    let _resp = client
        .post(format!("{}/v1beta/{}:cancel", GEMINI_BASE, batch_name))
        .header("x-goog-api-key", &api_key)
        .send()
        .await
        .map_err(|e| format!("Cancel failed: {}", e))?;
    // Don't require success — batch may already be done

    // Update job status in DB
    {
        let db = get_db(&app);
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE jobs SET status = 'cancelled', updated_at = ?1 WHERE batch_job_name = ?2 AND status IN ('pending', 'processing')",
            params![chrono::Utc::now().to_rfc3339(), batch_name],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn validate_api_key(app: AppHandle, api_key: String) -> Result<bool, String> {
    let client = app.state::<Client>();

    let resp = client
        .get(format!(
            "{}/v1beta/models/{}",
            GEMINI_BASE, MODEL
        ))
        .header("x-goog-api-key", &api_key)
        .send()
        .await
        .map_err(|e| format!("Validation failed: {}", e))?;

    Ok(resp.status().is_success())
}
