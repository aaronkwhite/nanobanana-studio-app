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

const ALLOWED_SETTING_KEYS: &[&str] = &[
    "default_output_size",
    "default_aspect_ratio",
    "default_temperature",
    "results_dir",
    "uploads_dir",
];

#[tauri::command]
pub fn get_setting(app: AppHandle, key: String) -> Result<Option<String>, String> {
    if !ALLOWED_SETTING_KEYS.contains(&key.as_str()) {
        return Err(format!("Setting key '{}' is not allowed", key));
    }
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
        .filter(|(k, _): &(String, String)| ALLOWED_SETTING_KEYS.contains(&k.as_str()))
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
    fn test_allowed_setting_keys_rejects_api_key() {
        assert!(!ALLOWED_SETTING_KEYS.contains(&"gemini_api_key"));
    }

    #[test]
    fn test_allowed_setting_keys_rejects_arbitrary() {
        assert!(!ALLOWED_SETTING_KEYS.contains(&"admin"));
        assert!(!ALLOWED_SETTING_KEYS.contains(&"password"));
        assert!(!ALLOWED_SETTING_KEYS.contains(&""));
        assert!(!ALLOWED_SETTING_KEYS.contains(&"DROP TABLE config"));
    }

    #[test]
    fn test_get_all_settings_filter_excludes_api_key() {
        let rows = vec![
            ("gemini_api_key".to_string(), "secret".to_string()),
            ("default_output_size".to_string(), "2K".to_string()),
            ("unknown".to_string(), "x".to_string()),
        ];
        let filtered: HashMap<String, String> = rows
            .into_iter()
            .filter(|(k, _)| ALLOWED_SETTING_KEYS.contains(&k.as_str()))
            .collect();
        assert!(!filtered.contains_key("gemini_api_key"));
        assert!(!filtered.contains_key("unknown"));
        assert_eq!(filtered.get("default_output_size"), Some(&"2K".to_string()));
    }

    #[test]
    fn test_api_key_masking_long_key() {
        let key = "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz";
        let masked = if key.len() > 8 {
            format!("{}...{}", &key[..2], &key[key.len() - 3..])
        } else {
            "****".to_string()
        };
        assert_eq!(masked, "AI...xYz");
    }

    #[test]
    fn test_api_key_masking_short_key() {
        let key = "short";
        let masked = if key.len() > 8 {
            format!("{}...{}", &key[..2], &key[key.len() - 3..])
        } else {
            "****".to_string()
        };
        assert_eq!(masked, "****");
    }
}
