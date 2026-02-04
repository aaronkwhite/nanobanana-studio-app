use crate::models::UploadedFile;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "gif"];

#[tauri::command]
pub fn upload_images(app: AppHandle, files: Vec<String>) -> Result<Vec<UploadedFile>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let uploads_dir = app_data_dir.join("uploads");
    std::fs::create_dir_all(&uploads_dir).map_err(|e| e.to_string())?;

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

    // Enforce max 20 files
    if uploaded.len() > 20 {
        return Err("Maximum 20 files allowed per batch".to_string());
    }

    Ok(uploaded)
}

#[tauri::command]
pub fn get_image(_app: AppHandle, path: String) -> Result<String, String> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(format!("Image not found: {}", path.display()));
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
    let uploads_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("uploads");

    let file_path = PathBuf::from(&path);

    // Security: only allow deleting files in uploads directory
    if !file_path.starts_with(&uploads_dir) {
        return Err("Cannot delete files outside uploads directory".to_string());
    }

    if file_path.exists() {
        std::fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}
