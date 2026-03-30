// src/lib/stores/jobs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import type { Job } from '$lib/types';

const mockJob: Job = {
  id: 'test-1',
  status: 'pending',
  mode: 'text-to-image',
  prompt: 'test prompt',
  output_size: '1K',
  temperature: 1,
  aspect_ratio: '1:1',
  batch_job_name: null,
  total_items: 1,
  completed_items: 0,
  failed_items: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('jobs store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('loads jobs from backend', async () => {
    vi.mocked(invoke).mockResolvedValueOnce([mockJob]);
    const { jobs } = await import('./jobs');
    await jobs.loadJobs();
    expect(get(jobs)).toEqual([mockJob]);
    expect(invoke).toHaveBeenCalledWith('get_jobs', { status: undefined });
  });

  it('adds a job and starts polling', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    const { jobs } = await import('./jobs');
    jobs.addJob(mockJob);
    expect(get(jobs)).toContainEqual(mockJob);
  });

  it('derives active job count', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    const { jobs, activeJobsCount } = await import('./jobs');
    jobs.addJob(mockJob);
    expect(get(activeJobsCount)).toBe(1);
  });
});
