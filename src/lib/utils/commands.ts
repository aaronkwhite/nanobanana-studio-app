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
