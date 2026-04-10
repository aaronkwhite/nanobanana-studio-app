// src-tauri/src/commands/api.rs
use tauri::{AppHandle, State};
use tauri_plugin_store::StoreExt;
use crate::models::{
    ApiGenerateRequest, ApiJobWithItems, CreditBalance, ApiPurchaseRequest, CheckoutSession,
};

const STORE_PATH: &str = "auth.json";

fn get_backend_url() -> String {
    std::env::var("BACKEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string())
}

async fn get_token(app: &AppHandle) -> Result<String, String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store
        .get("token")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| "Not authenticated".to_string())
}

#[tauri::command]
pub async fn api_generate(
    app: AppHandle,
    client: State<'_, reqwest::Client>,
    request: ApiGenerateRequest,
) -> Result<ApiJobWithItems, String> {
    let token = get_token(&app).await?;
    let url = format!("{}/api/generate", get_backend_url());

    let res = client
        .post(&url)
        .bearer_auth(&token)
        .json(&request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let body: serde_json::Value = res.json().await.unwrap_or_default();
        let msg = body["error"].as_str().unwrap_or("Generate failed");
        return Err(msg.to_string());
    }

    res.json::<ApiJobWithItems>().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn api_generate_batch(
    app: AppHandle,
    client: State<'_, reqwest::Client>,
    request: ApiGenerateRequest,
) -> Result<ApiJobWithItems, String> {
    let token = get_token(&app).await?;
    let url = format!("{}/api/generate/batch", get_backend_url());

    let res = client
        .post(&url)
        .bearer_auth(&token)
        .json(&request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let body: serde_json::Value = res.json().await.unwrap_or_default();
        let msg = body["error"].as_str().unwrap_or("Batch generate failed");
        return Err(msg.to_string());
    }

    res.json::<ApiJobWithItems>().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn api_get_job(
    app: AppHandle,
    client: State<'_, reqwest::Client>,
    id: String,
) -> Result<ApiJobWithItems, String> {
    let token = get_token(&app).await?;
    let url = format!("{}/api/jobs/{}", get_backend_url(), id);

    let res = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Job not found: {}", id));
    }

    res.json::<ApiJobWithItems>().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn api_get_balance(
    app: AppHandle,
    client: State<'_, reqwest::Client>,
) -> Result<CreditBalance, String> {
    let token = get_token(&app).await?;
    let url = format!("{}/api/credits/balance", get_backend_url());

    let res = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let body: serde_json::Value = res.json().await.unwrap_or_default();
        let msg = body["error"].as_str().unwrap_or("Failed to get balance");
        return Err(msg.to_string());
    }

    res.json::<CreditBalance>().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn api_purchase_credits(
    app: AppHandle,
    client: State<'_, reqwest::Client>,
    request: ApiPurchaseRequest,
) -> Result<CheckoutSession, String> {
    let token = get_token(&app).await?;
    let url = format!("{}/api/credits/purchase", get_backend_url());

    let res = client
        .post(&url)
        .bearer_auth(&token)
        .json(&request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let body: serde_json::Value = res.json().await.unwrap_or_default();
        let msg = body["error"].as_str().unwrap_or("Purchase failed");
        return Err(msg.to_string());
    }

    res.json::<CheckoutSession>().await.map_err(|e| e.to_string())
}
