use crate::db::get_db;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn get_uploads_dir(app: &AppHandle) -> Result<PathBuf, String> {
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

pub fn get_results_dir(app: &AppHandle) -> Result<PathBuf, String> {
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
        .picture_dir()
        .map_err(|e| e.to_string())?
        .join("Nana Studio");
    std::fs::create_dir_all(&default).map_err(|e| e.to_string())?;
    Ok(default)
}

pub fn get_api_key(app: &AppHandle) -> Result<String, String> {
    let db = get_db(app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT value FROM config WHERE key = 'gemini_api_key'",
        [],
        |row| row.get::<_, String>(0),
    )
    .map_err(|_| "API key not configured".to_string())
}

/// MIME type from file extension. Default is `image/png` to match Gemini API expectations.
pub fn mime_from_ext(ext: &str) -> &'static str {
    match ext {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "image/png",
    }
}

pub fn validate_batch_name(name: &str) -> Result<(), String> {
    if !name.starts_with("batches/") || name.contains("..") || name.contains("://") {
        return Err("Invalid batch name format".to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mime_from_ext_jpg() {
        assert_eq!(mime_from_ext("jpg"), "image/jpeg");
    }

    #[test]
    fn test_mime_from_ext_jpeg() {
        assert_eq!(mime_from_ext("jpeg"), "image/jpeg");
    }

    #[test]
    fn test_mime_from_ext_png() {
        assert_eq!(mime_from_ext("png"), "image/png");
    }

    #[test]
    fn test_mime_from_ext_webp() {
        assert_eq!(mime_from_ext("webp"), "image/webp");
    }

    #[test]
    fn test_mime_from_ext_gif() {
        assert_eq!(mime_from_ext("gif"), "image/gif");
    }

    #[test]
    fn test_mime_from_ext_unknown_defaults_to_png() {
        assert_eq!(mime_from_ext("bmp"), "image/png");
        assert_eq!(mime_from_ext("tiff"), "image/png");
        assert_eq!(mime_from_ext(""), "image/png");
    }

    #[test]
    fn test_validate_batch_name_valid() {
        assert!(validate_batch_name("batches/abc123").is_ok());
        assert!(validate_batch_name("batches/my-batch-2024").is_ok());
    }

    #[test]
    fn test_validate_batch_name_rejects_missing_prefix() {
        assert!(validate_batch_name("abc123").is_err());
        assert!(validate_batch_name("").is_err());
        assert!(validate_batch_name("batch/abc").is_err());
    }

    #[test]
    fn test_validate_batch_name_rejects_path_traversal() {
        assert!(validate_batch_name("batches/../etc/passwd").is_err());
        assert!(validate_batch_name("batches/..").is_err());
    }

    #[test]
    fn test_validate_batch_name_rejects_url_injection() {
        assert!(validate_batch_name("batches/https://evil.com").is_err());
        assert!(validate_batch_name("batches/ftp://evil.com").is_err());
    }
}
