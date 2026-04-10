use serde::{Deserialize, Serialize};
use rusqlite;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: String,
    pub status: String,
    pub mode: String,
    pub prompt: String,
    pub output_size: String,
    pub temperature: f64,
    pub aspect_ratio: String,
    pub batch_job_name: Option<String>,
    pub batch_temp_file: Option<String>,
    pub total_items: i32,
    pub completed_items: i32,
    pub failed_items: i32,
    pub created_at: String,
    pub updated_at: String,
}

impl Job {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Job> {
        Ok(Job {
            id: row.get(0)?,
            status: row.get(1)?,
            mode: row.get(2)?,
            prompt: row.get(3)?,
            output_size: row.get(4)?,
            temperature: row.get(5)?,
            aspect_ratio: row.get(6)?,
            batch_job_name: row.get(7)?,
            batch_temp_file: row.get(8)?,
            total_items: row.get(9)?,
            completed_items: row.get(10)?,
            failed_items: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobItem {
    pub id: String,
    pub job_id: String,
    pub input_prompt: Option<String>,
    pub input_image_path: Option<String>,
    pub output_image_path: Option<String>,
    pub status: String,
    pub error: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobWithItems {
    pub job: Job,
    pub items: Vec<JobItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateT2IJobRequest {
    pub prompts: Vec<String>,
    pub output_size: String,
    pub temperature: f64,
    pub aspect_ratio: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateI2IJobRequest {
    pub prompt: String,
    pub image_paths: Vec<String>,
    pub output_size: String,
    pub temperature: f64,
    pub aspect_ratio: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigStatus {
    pub has_key: bool,
    pub masked: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadedFile {
    pub id: String,
    pub path: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchStatus {
    pub state: String,
    pub total_requests: i32,
    pub completed_requests: i32,
    pub failed_requests: i32,
}

// Auth
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthState {
    pub token: String,
    pub user_id: String,
}

// API generation request (sent to Hono backend)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiGenerateRequest {
    pub model: String,
    pub resolution: String,
    pub prompts: Vec<String>,
    pub aspect_ratio: Option<String>,
    pub mode: String,
}

// API job response (from Hono backend)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiJob {
    pub id: String,
    pub status: String,
    pub mode: String,
    pub model: String,
    pub credits_cost: i32,
    pub created: String,
    pub updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiJobItem {
    pub id: String,
    pub job_id: String,
    pub status: String,
    pub prompt: String,
    pub resolution: String,
    pub output_url: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiJobWithItems {
    pub job: ApiJob,
    pub items: Vec<ApiJobItem>,
}

// Credit balance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreditBalance {
    pub balance: i32,
}

// Stripe checkout session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiPurchaseRequest {
    pub pack: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutSession {
    pub url: String,
}
