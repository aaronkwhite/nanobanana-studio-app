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

export type GeminiBatchState =
  | 'JOB_STATE_PENDING'
  | 'JOB_STATE_RUNNING'
  | 'JOB_STATE_SUCCEEDED'
  | 'JOB_STATE_FAILED'
  | 'JOB_STATE_CANCELLED'
  | 'JOB_STATE_EXPIRED';

export interface BatchStatus {
  state: GeminiBatchState;
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

// Auth
export interface AuthState {
  token: string;
  user_id: string;
}

// API types (from Hono backend)
export type ApiJobStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type ProcessingMode = 'realtime' | 'batch';
export type KieModel = 'nano-banana-pro' | '4o-image' | 'flux-kontext';

export interface ApiJob {
  id: string;
  status: ApiJobStatus;
  mode: ProcessingMode;
  model: KieModel;
  credits_cost: number;
  created: string;
  updated: string;
}

export interface ApiJobItem {
  id: string;
  job_id: string;
  status: ApiJobStatus;
  prompt: string;
  resolution: OutputSize;
  output_url: string | null;
  error: string | null;
}

export interface ApiJobWithItems {
  job: ApiJob;
  items: ApiJobItem[];
}

export interface ApiGenerateRequest {
  model: KieModel;
  resolution: OutputSize;
  prompts: string[];
  aspect_ratio?: AspectRatio;
  mode: ProcessingMode;
}

export interface CreditBalance {
  balance: number;
}

export interface CheckoutSession {
  url: string;
}

// Model display info
export const KIE_MODELS: Record<KieModel, { label: string; description: string }> = {
  'nano-banana-pro': { label: 'Nano Banana Pro', description: 'Gemini 3.0 Pro — default' },
  '4o-image':        { label: '4o Image', description: 'GPT-4o image generation' },
  'flux-kontext':    { label: 'Flux.1 Kontext', description: 'Flux image generation' },
};

// Credit costs per model per resolution (for UI estimate only — backend is authoritative)
export const CREDIT_COSTS_UI: Record<KieModel, Record<OutputSize, number>> = {
  'nano-banana-pro': { '1K': 1, '2K': 2, '4K': 3 },
  '4o-image':        { '1K': 2, '2K': 3, '4K': 4 },
  'flux-kontext':    { '1K': 2, '2K': 3, '4K': 4 },
};

export const BATCH_DISCOUNT_UI = 0.8;

export function estimateCreditCost(
  model: KieModel,
  resolution: OutputSize,
  mode: ProcessingMode,
  count: number
): number {
  const unit = CREDIT_COSTS_UI[model][resolution];
  const discount = mode === 'batch' ? BATCH_DISCOUNT_UI : 1;
  return Math.ceil(unit * discount * count);
}

export const CREDIT_PACKS_UI = {
  starter:  { credits: 100,  price: '$4.99',  label: 'Starter' },
  standard: { credits: 500,  price: '$19.99', label: 'Standard' },
  pro:      { credits: 1200, price: '$39.99', label: 'Pro' },
} as const;

export type CreditPackId = keyof typeof CREDIT_PACKS_UI;
