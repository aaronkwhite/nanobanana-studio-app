import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { submitJob, submitAndTrack } from './submit';
import { jobs } from '$lib/stores/jobs';
import { toasts } from '$lib/stores/toasts';
import type { Job, JobWithItems } from '$lib/types';

const baseJob: Job = {
  id: 'job-1',
  status: 'pending',
  mode: 'text-to-image',
  prompt: 'hello',
  output_size: '1K',
  temperature: 1,
  aspect_ratio: '16:9',
  batch_job_name: null,
  total_items: 1,
  completed_items: 0,
  failed_items: 0,
  created_at: '',
  updated_at: '',
};

const jobResult: JobWithItems = { job: baseJob, items: [] };

describe('submitJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    toasts.clear();
    // Clear any leftover jobs from earlier tests.
    // (the store is a module-level singleton across this file)
    for (const j of get(jobs)) {
      jobs.removeJob(j.id);
    }
    jobs.stopPolling();
  });

  it('routes text-to-image mode to create_t2i_job with prompts only', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(jobResult).mockResolvedValueOnce(undefined);
    await submitJob({
      mode: 'text-to-image',
      prompts: ['a', 'b'],
      i2iPrompt: '',
      i2iFiles: [],
      output_size: '2K',
      aspect_ratio: '16:9',
      temperature: 1.2,
    });
    expect(invoke).toHaveBeenNthCalledWith(1, 'create_t2i_job', {
      request: { prompts: ['a', 'b'], output_size: '2K', aspect_ratio: '16:9', temperature: 1.2 },
    });
    expect(invoke).toHaveBeenCalledWith('submit_batch', { jobId: 'job-1' });
  });

  it('routes image-to-image mode to create_i2i_job with mapped paths', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(jobResult).mockResolvedValueOnce(undefined);
    await submitJob({
      mode: 'image-to-image',
      prompts: [],
      i2iPrompt: 'make it blue',
      i2iFiles: [
        { id: 'a', path: '/u/a.png', name: 'a.png' },
        { id: 'b', path: '/u/b.png', name: 'b.png' },
      ],
      output_size: '1K',
      aspect_ratio: '1:1',
      temperature: 0.8,
    });
    expect(invoke).toHaveBeenNthCalledWith(1, 'create_i2i_job', {
      request: {
        prompt: 'make it blue',
        image_paths: ['/u/a.png', '/u/b.png'],
        output_size: '1K',
        aspect_ratio: '1:1',
        temperature: 0.8,
      },
    });
  });

  it('propagates createT2IJob failure so caller can toast it', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('validation failed'));
    await expect(
      submitJob({
        mode: 'text-to-image',
        prompts: [],
        i2iPrompt: '',
        i2iFiles: [],
        output_size: '1K',
        aspect_ratio: '16:9',
        temperature: 1,
      })
    ).rejects.toThrow('validation failed');
  });
});

describe('submitAndTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    toasts.clear();
    for (const j of get(jobs)) {
      jobs.removeJob(j.id);
    }
    jobs.stopPolling();
  });

  it('adds the job to the store and dispatches submit_batch', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);
    submitAndTrack(baseJob);
    expect(get(jobs)).toContainEqual(baseJob);
    expect(invoke).toHaveBeenCalledWith('submit_batch', { jobId: 'job-1' });
    jobs.stopPolling();
  });

  it('flips the job to failed and toasts on submit_batch failure', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('API key invalid'));
    submitAndTrack(baseJob);

    // Drain the pending microtask from the rejected invoke.
    await Promise.resolve();
    await Promise.resolve();

    const stored = get(jobs).find((j) => j.id === 'job-1');
    expect(stored?.status).toBe('failed');

    const toast = get(toasts)[0];
    expect(toast?.variant).toBe('error');
    expect(toast?.message).toBe('API key invalid');
    jobs.stopPolling();
  });
});
