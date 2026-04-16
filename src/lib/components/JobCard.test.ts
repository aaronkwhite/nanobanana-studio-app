// src/lib/components/JobCard.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import JobCardTestWrapper from './JobCardTestWrapper.svelte';
import { jobs } from '$lib/stores/jobs';
import { toasts } from '$lib/stores/toasts';

// onclick handlers in JobCard are sync and kick off async work that
// isn't awaited by fireEvent.click. Flush enough microtasks for the
// invoke promise + the catch handler to settle before we assert.
async function flushMicrotasks() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

const baseJob = {
  id: 'test-1',
  status: 'completed' as const,
  mode: 'text-to-image' as const,
  prompt: 'A beautiful sunset',
  output_size: '1K' as const,
  temperature: 1,
  aspect_ratio: '16:9' as const,
  batch_job_name: null,
  total_items: 2,
  completed_items: 2,
  failed_items: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const failedJob = { ...baseJob, status: 'failed' as const, completed_items: 0, failed_items: 2 };

function resetJobsStore() {
  jobs.stopPolling();
  for (const j of get(jobs)) jobs.removeJob(j.id);
}

describe('JobCard — render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetJobsStore();
    toasts.clear();
  });

  it('renders job prompt', () => {
    render(JobCardTestWrapper, { props: { job: baseJob } });
    expect(screen.getByText('A beautiful sunset')).toBeInTheDocument();
  });

  it('shows completed status with temperature', () => {
    render(JobCardTestWrapper, { props: { job: baseJob } });
    expect(screen.getByText('1K · 16:9 · 1 · 2 items')).toBeInTheDocument();
  });

  it('renders a retry button only when the job is failed', () => {
    const { rerender } = render(JobCardTestWrapper, { props: { job: baseJob } });
    expect(screen.queryByLabelText('Retry job')).toBeNull();

    rerender({ job: failedJob });
    expect(screen.getByLabelText('Retry job')).toBeInTheDocument();
  });

  it('shows "Generation failed" copy on failure', () => {
    render(JobCardTestWrapper, { props: { job: failedJob } });
    expect(screen.getByText('Generation failed')).toBeInTheDocument();
  });
});

describe('JobCard — retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetJobsStore();
    toasts.clear();
    jobs.addJob(failedJob);
    // Stop polling immediately — the addJob above scheduled it, but we
    // want deterministic timer control in these tests.
    jobs.stopPolling();
  });

  it('clicking retry dispatches submit_batch and flips status to processing', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);
    render(JobCardTestWrapper, { props: { job: failedJob } });

    await fireEvent.click(screen.getByLabelText('Retry job'));
    await flushMicrotasks();

    expect(invoke).toHaveBeenCalledWith('submit_batch', { jobId: 'test-1' });
    expect(get(jobs).find((j) => j.id === 'test-1')?.status).toBe('processing');
    jobs.stopPolling();
  });

  it('surfaces a toast when retry fails', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));
    render(JobCardTestWrapper, { props: { job: failedJob } });

    await fireEvent.click(screen.getByLabelText('Retry job'));
    await flushMicrotasks();

    // Assert before running timers so the toast auto-dismiss (5s) doesn't clear it.
    const t = get(toasts)[0];
    expect(t?.variant).toBe('error');
    expect(t?.message).toBe('boom');
    expect(get(jobs).find((j) => j.id === 'test-1')?.status).toBe('failed');
  });
});

describe('JobCard — delete confirm flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetJobsStore();
    toasts.clear();
    jobs.addJob(baseJob);
    jobs.stopPolling();
  });

  it('first click enters confirm state without calling delete_job', async () => {
    render(JobCardTestWrapper, { props: { job: baseJob } });

    await fireEvent.click(screen.getByLabelText('Delete job'));

    expect(invoke).not.toHaveBeenCalledWith('delete_job', expect.anything());
    expect(screen.getByText('Confirm?')).toBeInTheDocument();
  });

  it('second click within 3s calls delete_job and removes the job', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);
    render(JobCardTestWrapper, { props: { job: baseJob } });

    await fireEvent.click(screen.getByLabelText('Delete job'));
    await fireEvent.click(screen.getByLabelText('Delete job'));
    await flushMicrotasks();

    expect(invoke).toHaveBeenCalledWith('delete_job', { id: 'test-1' });
    expect(get(jobs).find((j) => j.id === 'test-1')).toBeUndefined();
  });

  it('surfaces a toast when delete_job fails', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('in use'));
    render(JobCardTestWrapper, { props: { job: baseJob } });

    await fireEvent.click(screen.getByLabelText('Delete job'));
    await fireEvent.click(screen.getByLabelText('Delete job'));
    await flushMicrotasks();

    const t = get(toasts)[0];
    expect(t?.variant).toBe('error');
    expect(t?.message).toBe('in use');
    expect(get(jobs).find((j) => j.id === 'test-1')).toBeDefined();
  });
});

describe('JobCard — copy prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetJobsStore();
    toasts.clear();
  });

  it('calls navigator.clipboard.writeText with the prompt', async () => {
    const writeText = vi.mocked(navigator.clipboard.writeText);
    writeText.mockResolvedValueOnce(undefined);
    render(JobCardTestWrapper, { props: { job: baseJob } });

    await fireEvent.click(screen.getByLabelText('Copy prompt'));
    await flushMicrotasks();

    expect(writeText).toHaveBeenCalledWith('A beautiful sunset');
  });
});
