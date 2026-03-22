use crate::db::get_db;
use crate::models::ConfigStatus;
use rusqlite::params;
use std::collections::HashMap;
use tauri::{AppHandle, Manager};

const API_KEY_KEY: &str = "gemini_api_key";

#[tauri::command]
pub fn get_config(app: AppHandle) -> Result<ConfigStatus, String> {
    let db = get_db(&app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let result: Result<String, _> = conn.query_row(
        "SELECT value FROM config WHERE key = ?1",
        params![API_KEY_KEY],
        |row| row.get(0),
    );

    match result {
        Ok(key) if !key.is_empty() => {
            // Mask the key: show first 2 chars and last 3 chars
            let masked = if key.len() > 8 {
                format!("{}...{}", &key[..2], &key[key.len() - 3..])
            } else {
                "****".to_string()
            };
            Ok(ConfigStatus {
                has_key: true,
                masked: Some(masked),
            })
        }
        _ => Ok(ConfigStatus {
            has_key: false,
            masked: None,
        }),
    }
}

#[tauri::command]
pub fn save_config(app: AppHandle, api_key: String) -> Result<(), String> {
    let db = get_db(&app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO config (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![API_KEY_KEY, api_key],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_config(app: AppHandle) -> Result<(), String> {
    let db = get_db(&app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM config WHERE key = ?1", params![API_KEY_KEY])
        .map_err(|e| e.to_string())?;

    Ok(())
}

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

#[allow(dead_code)]
pub fn get_api_key(app: &AppHandle) -> Result<String, String> {
    let db = get_db(app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT value FROM config WHERE key = ?1",
        params![API_KEY_KEY],
        |row| row.get(0),
    )
    .map_err(|_| "API key not configured".to_string())
}
