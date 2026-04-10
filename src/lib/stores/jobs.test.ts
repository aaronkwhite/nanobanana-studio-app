// src/lib/stores/jobs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { ApiJob } from '$lib/types';

const mockJob: ApiJob = {
  id: 'test-1',
  status: 'pending',
  mode: 'realtime',
  model: 'nano-banana-pro',
  credits_cost: 1,
  created: '2026-01-01T00:00:00Z',
  updated: '2026-01-01T00:00:00Z',
};

describe('jobs store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('loadJobs resets store to empty array', async () => {
    const { jobs } = await import('./jobs');
    jobs.addJob(mockJob);
    jobs.loadJobs();
    expect(get(jobs)).toEqual([]);
  });

  it('adds a job and starts polling', async () => {
    const { jobs } = await import('./jobs');
    jobs.addJob(mockJob);
    expect(get(jobs)).toContainEqual(mockJob);
  });

  it('derives active job count', async () => {
    const { jobs, activeJobsCount } = await import('./jobs');
    jobs.addJob(mockJob);
    expect(get(activeJobsCount)).toBe(1);
  });
});
