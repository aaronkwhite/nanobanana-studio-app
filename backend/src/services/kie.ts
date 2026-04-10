// backend/src/services/kie.ts
import { env } from '../env.ts';
import type { GenerateRequest } from '../types.ts';

// KIE API response types — update to match actual API docs
interface KieRealtimeResponse {
  job_id: string;
  status: string;
  output_urls?: string[];
  error?: string;
}

interface KieBatchResponse {
  batch_id: string;
  status: string;
}

interface KieBatchStatusResponse {
  batch_id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  results?: Array<{ prompt: string; output_url: string; error?: string }>;
}

// Map our model names to KIE model IDs — update when you have real API docs
const KIE_MODEL_IDS: Record<string, string> = {
  'nano-banana-pro': 'nano-banana-pro',  // update with actual KIE model ID
  '4o-image': '4o-image',               // update with actual KIE model ID
  'flux-kontext': 'flux-kontext',       // update with actual KIE model ID
};

async function kiePost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${env.kieBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.kieApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIE API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

async function kieGet<T>(path: string): Promise<T> {
  const res = await fetch(`${env.kieBaseUrl}${path}`, {
    headers: { 'Authorization': `Bearer ${env.kieApiKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIE API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// Submit a single real-time generation. Returns KIE job ID.
export async function submitRealtime(request: GenerateRequest): Promise<string> {
  const response = await kiePost<KieRealtimeResponse>('/generate', {
    model: KIE_MODEL_IDS[request.model],
    resolution: request.resolution,
    prompts: request.prompts,
    aspect_ratio: request.aspect_ratio ?? '1:1',
  });
  return response.job_id;
}

// Submit a batch generation job. Returns KIE batch ID.
export async function submitBatch(request: GenerateRequest): Promise<string> {
  const response = await kiePost<KieBatchResponse>('/generate/batch', {
    model: KIE_MODEL_IDS[request.model],
    resolution: request.resolution,
    prompts: request.prompts,
    aspect_ratio: request.aspect_ratio ?? '1:1',
  });
  return response.batch_id;
}

// Poll a batch job status. Called by background poller.
export async function getBatchStatus(batchId: string): Promise<KieBatchStatusResponse> {
  return kieGet<KieBatchStatusResponse>(`/generate/batch/${batchId}`);
}
