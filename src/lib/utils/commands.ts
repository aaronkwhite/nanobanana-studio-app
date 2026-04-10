// src/lib/utils/commands.ts
import { invoke } from '@tauri-apps/api/core';
import type {
  Job,
  JobWithItems,
  ConfigStatus,
  CreateT2IJobRequest,
  CreateI2IJobRequest,
  UploadedFile,
  BatchStatus,
  AuthState,
  ApiGenerateRequest,
  ApiJobWithItems,
  CreditBalance,
  CheckoutSession,
  CreditPackId,
} from '$lib/types';

// --- Jobs ---

export async function getJobs(status?: 'active' | 'all'): Promise<Job[]> {
  return invoke<Job[]>('get_jobs', { status });
}

export async function getJob(id: string): Promise<JobWithItems> {
  return invoke<JobWithItems>('get_job', { id });
}

export async function createT2IJob(request: CreateT2IJobRequest): Promise<JobWithItems> {
  return invoke<JobWithItems>('create_t2i_job', { request });
}

export async function createI2IJob(request: CreateI2IJobRequest): Promise<JobWithItems> {
  return invoke<JobWithItems>('create_i2i_job', { request });
}

export async function deleteJob(id: string): Promise<void> {
  return invoke<void>('delete_job', { id });
}

// --- Batch ---

export async function pollBatch(batchName: string): Promise<BatchStatus> {
  return invoke<BatchStatus>('poll_batch', { batchName });
}

export async function downloadResults(batchName: string, jobId: string): Promise<void> {
  return invoke<void>('download_results', { batchName, jobId });
}

export async function retryJob(jobId: string): Promise<void> {
  return invoke<void>('submit_batch', { jobId });
}

// --- Config ---

export async function getConfig(): Promise<ConfigStatus> {
  return invoke<ConfigStatus>('get_config');
}

export async function saveConfig(apiKey: string): Promise<void> {
  return invoke<void>('save_config', { apiKey });
}

export async function deleteConfig(): Promise<void> {
  return invoke<void>('delete_config');
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  return invoke<boolean>('validate_api_key', { apiKey });
}

// --- Files ---

export async function uploadImages(files: string[]): Promise<UploadedFile[]> {
  return invoke<UploadedFile[]>('upload_images', { files });
}

export async function getImage(path: string): Promise<string> {
  return invoke<string>('get_image', { path });
}

export async function deleteUpload(path: string): Promise<void> {
  return invoke<void>('delete_upload', { path });
}

// --- Settings ---

export async function getSetting(key: string): Promise<string | null> {
  return invoke<string | null>('get_setting', { key });
}

export async function saveSetting(key: string, value: string): Promise<void> {
  return invoke<void>('save_setting', { key, value });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  return invoke<Record<string, string>>('get_all_settings');
}

export async function getDefaultResultsDir(): Promise<string> {
  return invoke<string>('get_default_results_dir');
}

// --- Auth ---

export async function login(email: string, password: string): Promise<AuthState> {
  return invoke<AuthState>('login', { request: { email, password } });
}

export async function logout(): Promise<void> {
  return invoke<void>('logout');
}

export async function getAuthState(): Promise<AuthState | null> {
  return invoke<AuthState | null>('get_auth_state');
}

// --- API (Hono backend) ---

export async function apiGenerate(request: ApiGenerateRequest): Promise<ApiJobWithItems> {
  if (request.mode === 'batch') {
    return invoke<ApiJobWithItems>('api_generate_batch', { request });
  }
  return invoke<ApiJobWithItems>('api_generate', { request });
}

export async function apiGetJob(id: string): Promise<ApiJobWithItems> {
  return invoke<ApiJobWithItems>('api_get_job', { id });
}

export async function apiGetBalance(): Promise<CreditBalance> {
  return invoke<CreditBalance>('api_get_balance');
}

export async function apiPurchaseCredits(pack: CreditPackId): Promise<CheckoutSession> {
  return invoke<CheckoutSession>('api_purchase_credits', { request: { pack } });
}
