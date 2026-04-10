// src-tauri/src/commands/auth.rs
use serde_json::Value;
use tauri::{AppHandle, State};
use tauri_plugin_store::StoreExt;
use crate::models::{AuthState, LoginRequest};

const STORE_PATH: &str = "auth.json";
const TOKEN_KEY: &str = "token";
const USER_ID_KEY: &str = "user_id";

fn get_pocketbase_url() -> String {
    std::env::var("POCKETBASE_URL").unwrap_or_else(|_| "http://localhost:8090".to_string())
}

#[tauri::command]
pub async fn login(app: AppHandle, client: State<'_, reqwest::Client>, request: LoginRequest) -> Result<AuthState, String> {
    let url = format!(
        "{}/api/collections/users/auth-with-password",
        get_pocketbase_url()
    );

    let res = client
        .post(&url)
        .json(&serde_json::json!({
            "identity": request.email,
            "password": request.password,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let body: serde_json::Value = res.json().await.unwrap_or_default();
        let msg = body["message"].as_str().unwrap_or("Login failed");
        return Err(msg.to_string());
    }

    let body: Value = res.json().await.map_err(|e| e.to_string())?;
    let token = body["token"].as_str().ok_or("No token in response")?.to_string();
    let user_id = body["record"]["id"].as_str().ok_or("No user id in response")?.to_string();

    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store.set(TOKEN_KEY, Value::String(token.clone()));
    store.set(USER_ID_KEY, Value::String(user_id.clone()));
    store.save().map_err(|e| e.to_string())?;

    Ok(AuthState { token, user_id })
}

#[tauri::command]
pub async fn logout(app: AppHandle) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let had_token = store.delete(TOKEN_KEY);
    let had_user = store.delete(USER_ID_KEY);
    if had_token || had_user {
        store.save().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_auth_state(app: AppHandle) -> Result<Option<AuthState>, String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let token = store.get(TOKEN_KEY).and_then(|v| v.as_str().map(|s| s.to_string()));
    let user_id = store.get(USER_ID_KEY).and_then(|v| v.as_str().map(|s| s.to_string()));

    match (token, user_id) {
        (Some(token), Some(user_id)) => Ok(Some(AuthState { token, user_id })),
        _ => Ok(None),
    }
}
