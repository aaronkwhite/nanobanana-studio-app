// src/lib/types/index.ts

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type JobMode = 'text-to-image' | 'image-to-image';
export type OutputSize = '1K' | '2K' | '4K';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type Theme = 'light' | 'dark' | 'system';

export interface Job {
  id: string;
  status: JobStatus;
  mode: JobMode;
  prompt: string;
  output_size: OutputSize;
  temperature: number;
  aspect_ratio: AspectRatio;
  batch_job_name: string | null;
  batch_temp_file: string | null;
  total_items: number;
  completed_items: number;
  failed_items: number;
  created_at: string;
  updated_at: string;
}

export interface JobItem {
  id: string;
  job_id: string;
  input_prompt: string | null;
  input_image_path: string | null;
  output_image_path: string | null;
  status: JobStatus;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobWithItems {
  job: Job;
  items: JobItem[];
}

export interface ConfigStatus {
  has_key: boolean;
  masked: string | null;
}

export interface UploadedFile {
  id: string;
  path: string;
  name: string;
}

export interface CreateT2IJobRequest {
  prompts: string[];
  output_size: OutputSize;
  temperature: number;
  aspect_ratio: AspectRatio;
}

export interface CreateI2IJobRequest {
  prompt: string;
  image_paths: string[];
  output_size: OutputSize;
  temperature: number;
  aspect_ratio: AspectRatio;
}

export interface BatchStatus {
  state: string;
  total_requests: number;
  completed_requests: number;
  failed_requests: number;
}

export interface GenerationDefaults {
  output_size: OutputSize;
  aspect_ratio: AspectRatio;
  temperature: number;
}

export const OUTPUT_SIZES: Record<OutputSize, { label: string; price: number }> = {
  '1K': { label: '1K ($0.02)', price: 0.02 },
  '2K': { label: '2K ($0.07)', price: 0.07 },
  '4K': { label: '4K ($0.12)', price: 0.12 },
};

export const ASPECT_RATIOS: Record<AspectRatio, string> = {
  '1:1': 'Square',
  '16:9': 'Wide',
  '9:16': 'Portrait',
  '4:3': 'Landscape',
  '3:4': 'Tall',
};

export const TEMPERATURES = [0, 0.5, 1, 1.5, 2];

export function calculateCost(size: OutputSize, count: number): number {
  return OUTPUT_SIZES[size].price * count;
}
