// src-tauri/src/commands/settings.rs
use crate::db::get_db;
use rusqlite::params;
use std::collections::HashMap;
use tauri::{AppHandle, Manager};

const ALLOWED_SETTING_KEYS: &[&str] = &[
    "default_output_size",
    "default_aspect_ratio",
    "default_temperature",
    "results_dir",
    "uploads_dir",
];

#[tauri::command]
pub fn get_setting(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let db = get_db(&app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let value = conn
        .query_row(
            "SELECT value FROM config WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        )
        .ok();
    Ok(value)
}

#[tauri::command]
pub fn save_setting(app: AppHandle, key: String, value: String) -> Result<(), String> {
    if !ALLOWED_SETTING_KEYS.contains(&key.as_str()) {
        return Err(format!("Setting key '{}' is not allowed", key));
    }
    let db = get_db(&app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO config (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_all_settings(app: AppHandle) -> Result<HashMap<String, String>, String> {
    let db = get_db(&app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM config")
        .map_err(|e| e.to_string())?;
    let map = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(map)
}

#[tauri::command]
pub fn get_default_results_dir(app: AppHandle) -> Result<String, String> {
    let pictures = app.path().picture_dir().map_err(|e| e.to_string())?;
    let dir = pictures.join("Nana Studio");
    Ok(dir.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_allowed_setting_keys_contains_expected() {
        assert!(ALLOWED_SETTING_KEYS.contains(&"default_output_size"));
        assert!(ALLOWED_SETTING_KEYS.contains(&"default_aspect_ratio"));
        assert!(ALLOWED_SETTING_KEYS.contains(&"default_temperature"));
        assert!(ALLOWED_SETTING_KEYS.contains(&"results_dir"));
        assert!(ALLOWED_SETTING_KEYS.contains(&"uploads_dir"));
    }

    #[test]
    fn test_allowed_setting_keys_rejects_arbitrary() {
        assert!(!ALLOWED_SETTING_KEYS.contains(&"admin"));
        assert!(!ALLOWED_SETTING_KEYS.contains(&"password"));
        assert!(!ALLOWED_SETTING_KEYS.contains(&""));
    }
}
