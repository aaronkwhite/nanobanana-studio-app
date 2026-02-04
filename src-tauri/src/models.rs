use serde::{Deserialize, Serialize};

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
