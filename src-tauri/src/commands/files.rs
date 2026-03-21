use crate::db::get_db;
use crate::models::UploadedFile;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "gif"];

fn get_uploads_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let db = get_db(app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let custom: Option<String> = conn
        .query_row(
            "SELECT value FROM config WHERE key = 'uploads_dir'",
            [],
            |row| row.get(0),
        )
        .ok();
    if let Some(dir) = custom {
        if !dir.is_empty() {
            let path = PathBuf::from(dir);
            std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
            return Ok(path);
        }
    }
    let default = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("uploads");
    std::fs::create_dir_all(&default).map_err(|e| e.to_string())?;
    Ok(default)
}

fn get_results_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let db = get_db(app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let custom: Option<String> = conn
        .query_row(
            "SELECT value FROM config WHERE key = 'results_dir'",
            [],
            |row| row.get(0),
        )
        .ok();
    if let Some(dir) = custom {
        if !dir.is_empty() {
            let path = PathBuf::from(dir);
            std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
            return Ok(path);
        }
    }
    let default = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("results");
    std::fs::create_dir_all(&default).map_err(|e| e.to_string())?;
    Ok(default)
}

#[tauri::command]
pub fn upload_images(app: AppHandle, files: Vec<String>) -> Result<Vec<UploadedFile>, String> {
    // Enforce max 20 files before processing
    if files.len() > 20 {
        return Err("Maximum 20 files allowed per batch".to_string());
    }

    let uploads_dir = get_uploads_dir(&app)?;

    let mut uploaded = Vec::new();

    for file_path in files {
        let path = PathBuf::from(&file_path);

        // Validate file exists
        if !path.exists() {
            return Err(format!("File not found: {}", file_path));
        }

        // Validate extension
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .unwrap_or_default();

        if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
            return Err(format!(
                "Invalid file type: {}. Allowed: JPEG, PNG, WebP, GIF",
                ext
            ));
        }

        // Validate file size
        let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
        if metadata.len() > MAX_FILE_SIZE {
            return Err(format!(
                "File too large: {}. Max size: 10MB",
                path.file_name().unwrap_or_default().to_string_lossy()
            ));
        }

        // Copy to uploads directory
        let id = Uuid::new_v4().to_string();
        let new_filename = format!("{}.{}", id, ext);
        let dest_path = uploads_dir.join(&new_filename);

        std::fs::copy(&path, &dest_path).map_err(|e| e.to_string())?;

        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| new_filename.clone());

        uploaded.push(UploadedFile {
            id,
            path: dest_path.to_string_lossy().to_string(),
            name,
        });
    }

    Ok(uploaded)
}

#[tauri::command]
pub fn get_image(app: AppHandle, path: String) -> Result<String, String> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(format!("Image not found: {}", path.display()));
    }

    // Validate path is within allowed directories (default + custom configured)
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let canonical = path.canonicalize().map_err(|e| e.to_string())?;
    let uploads_dir = get_uploads_dir(&app)?;
    let results_dir = get_results_dir(&app)?;
    let mut allowed = vec![
        app_data_dir.join("uploads"),
        app_data_dir.join("results"),
    ];
    if !allowed.contains(&uploads_dir) {
        allowed.push(uploads_dir);
    }
    if !allowed.contains(&results_dir) {
        allowed.push(results_dir);
    }
    if !allowed.iter().any(|d| {
        d.canonicalize()
            .map(|cd| canonical.starts_with(cd))
            .unwrap_or(false)
    }) {
        return Err("Access denied: path outside allowed directories".to_string());
    }

    // Read file and encode as base64
    let data = std::fs::read(&path).map_err(|e| e.to_string())?;
    let base64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &data);

    // Determine mime type
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "application/octet-stream",
    };

    Ok(format!("data:{};base64,{}", mime, base64))
}

#[tauri::command]
pub fn delete_upload(app: AppHandle, path: String) -> Result<(), String> {
    let uploads_dir = get_uploads_dir(&app)?;
    let default_uploads = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("uploads");

    let file_path = PathBuf::from(&path);

    // Security: canonicalize paths to prevent symlink bypass
    let canonical_path = file_path.canonicalize().map_err(|e| e.to_string())?;
    let mut allowed_dirs = vec![uploads_dir];
    if !allowed_dirs.contains(&default_uploads) {
        allowed_dirs.push(default_uploads);
    }
    let in_allowed = allowed_dirs.iter().any(|d| {
        d.canonicalize()
            .map(|cd| canonical_path.starts_with(cd))
            .unwrap_or(false)
    });
    if !in_allowed {
        return Err("Cannot delete files outside uploads directory".to_string());
    }

    if file_path.exists() {
        std::fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}
