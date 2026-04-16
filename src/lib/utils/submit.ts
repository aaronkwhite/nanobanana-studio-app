// src/lib/utils/submit.ts
import { createT2IJob, createI2IJob } from '$lib/utils/commands';
import { jobs } from '$lib/stores/jobs';
import { toastError } from '$lib/stores/toasts';
import { invoke } from '@tauri-apps/api/core';
import type { Job, JobMode, OutputSize, AspectRatio, UploadedFile } from '$lib/types';

export interface SubmitParams {
  mode: JobMode;
  prompts: string[];
  i2iPrompt: string;
  i2iFiles: UploadedFile[];
  output_size: OutputSize;
  aspect_ratio: AspectRatio;
  temperature: number;
}

/**
 * Create a job row, add it to the jobs store, and kick off the batch
 * submission to Gemini. The batch submission is fire-and-forget — a
 * failure here flips the job status to 'failed' and surfaces a toast,
 * but does not throw, so the caller's UI state (clearing prompts /
 * files) can proceed.
 */
export async function submitJob(params: SubmitParams): Promise<void> {
  const result =
    params.mode === 'text-to-image'
      ? await createT2IJob({
          prompts: params.prompts,
          output_size: params.output_size,
          temperature: params.temperature,
          aspect_ratio: params.aspect_ratio,
        })
      : await createI2IJob({
          prompt: params.i2iPrompt,
          image_paths: params.i2iFiles.map((f) => f.path),
          output_size: params.output_size,
          temperature: params.temperature,
          aspect_ratio: params.aspect_ratio,
        });

  submitAndTrack(result.job);
}

/**
 * Internal — adds a newly-created job to the store and dispatches its
 * batch. Separated so tests can cover the failure path independently.
 */
export function submitAndTrack(job: Job): void {
  jobs.addJob(job);
  invoke('submit_batch', { jobId: job.id }).catch((err) => {
    console.error('Failed to submit batch:', err);
    toastError(err, 'Failed to submit batch');
    jobs.updateJob({ ...job, status: 'failed' });
  });
}
