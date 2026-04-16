import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

function mockEnv(opts: { browser: boolean; dev: boolean }) {
  vi.doMock('$app/environment', () => opts);
}

async function freshJobsStore() {
  vi.resetModules();
  const mod = await import('./jobs');
  return mod;
}

describe('jobs store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock('$app/environment');
  });

  it('loadJobs populates from backend', async () => {
    mockEnv({ browser: true, dev: false });
    const { jobs } = await freshJobsStore();
    vi.mocked(invoke).mockResolvedValueOnce([mockJob]);
    await jobs.loadJobs();
    expect(get(jobs)).toEqual([mockJob]);
    expect(invoke).toHaveBeenCalledWith('get_jobs', { status: undefined });
    jobs.stopPolling();
  });

  it('addJob inserts at the head and starts polling', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    mockEnv({ browser: true, dev: false });
    const { jobs } = await freshJobsStore();
    jobs.addJob(mockJob);
    expect(get(jobs)).toContainEqual(mockJob);
    jobs.stopPolling();
  });

  it('activeJobsCount derives from pending/processing', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    mockEnv({ browser: true, dev: false });
    const { jobs, activeJobsCount } = await freshJobsStore();
    jobs.addJob(mockJob);
    expect(get(activeJobsCount)).toBe(1);
    jobs.stopPolling();
  });

  it('removeJob removes by id', async () => {
    mockEnv({ browser: true, dev: false });
    const { jobs } = await freshJobsStore();
    jobs.addJob(mockJob);
    jobs.removeJob(mockJob.id);
    expect(get(jobs)).toHaveLength(0);
    jobs.stopPolling();
  });

  it('updateJob replaces by id', async () => {
    mockEnv({ browser: true, dev: false });
    const { jobs } = await freshJobsStore();
    jobs.addJob(mockJob);
    jobs.updateJob({ ...mockJob, status: 'completed' });
    expect(get(jobs)[0].status).toBe('completed');
    jobs.stopPolling();
  });

  it('loadMocks populates only in dev', async () => {
    mockEnv({ browser: true, dev: false });
    const { jobs: prodJobs } = await freshJobsStore();
    prodJobs.loadMocks([mockJob]);
    expect(get(prodJobs)).toHaveLength(0);

    mockEnv({ browser: true, dev: true });
    const { jobs: devJobs } = await freshJobsStore();
    devJobs.loadMocks([mockJob]);
    expect(get(devJobs)).toEqual([mockJob]);
    devJobs.stopPolling();
  });
});
