// src/lib/stores/jobs.ts
import { writable, derived, get } from 'svelte/store';
import { dev } from '$app/environment';
import type { Job, JobWithItems, BatchStatus, GeminiBatchState } from '$lib/types';
import * as cmd from '$lib/utils/commands';
import { isActiveJob } from '$lib/utils/jobs';

const BASE_POLL_MS = 2000;
const MAX_POLL_MS = 30_000;

function createJobsStore() {
  const store = writable<Job[]>([]);
  const { subscribe, set, update } = store;
  let pollTimeout: ReturnType<typeof setTimeout> | null = null;
  let isPolling = false;
  let consecutiveFailures = 0;

  function nextPollDelay(): number {
    if (consecutiveFailures === 0) return BASE_POLL_MS;
    // 2s, 4s, 8s, 16s, 30s, 30s ...
    return Math.min(BASE_POLL_MS * 2 ** consecutiveFailures, MAX_POLL_MS);
  }

  async function pollActiveJobs() {
    const activeJobs = get(store).filter(isActiveJob);

    if (activeJobs.length === 0) {
      isPolling = false;
      consecutiveFailures = 0;
      return;
    }

    let anyFailed = false;

    for (const job of activeJobs) {
      try {
        if (job.batch_job_name) {
          const batch: BatchStatus = await cmd.pollBatch(job.batch_job_name);
          const newStatus = mapBatchState(batch.state);

          if (newStatus === 'completed' && job.batch_job_name) {
            try {
              await cmd.downloadResults(job.batch_job_name, job.id);
              const updated = await cmd.getJob(job.id);
              update((jobs) => jobs.map((j) => (j.id === job.id ? updated.job : j)));
            } catch (err) {
              console.error(`Failed to download results for ${job.id}:`, err);
              update((jobs) =>
                jobs.map((j) =>
                  j.id === job.id ? { ...j, status: 'failed' as const } : j
                )
              );
            }
          } else {
            // For non-completed states, update normally
            update((jobs) =>
              jobs.map((j) =>
                j.id === job.id
                  ? {
                      ...j,
                      status: newStatus,
                      completed_items: batch.completed_requests,
                      failed_items: batch.failed_requests,
                    }
                  : j
              )
            );
          }
        } else {
          const updated: JobWithItems = await cmd.getJob(job.id);
          update((jobs) => jobs.map((j) => (j.id === job.id ? updated.job : j)));
        }
      } catch (err) {
        console.error(`Failed to poll job ${job.id}:`, err);
        anyFailed = true;
      }
    }

    if (anyFailed) {
      consecutiveFailures += 1;
    } else {
      consecutiveFailures = 0;
    }

    const hasActiveJobs = get(store).some(isActiveJob);
    if (hasActiveJobs) {
      pollTimeout = setTimeout(pollActiveJobs, nextPollDelay());
    } else {
      isPolling = false;
      consecutiveFailures = 0;
    }
  }

  function mapBatchState(state: GeminiBatchState): Job['status'] {
    switch (state) {
      case 'JOB_STATE_SUCCEEDED':
        return 'completed';
      case 'JOB_STATE_FAILED':
      case 'JOB_STATE_EXPIRED':
        return 'failed';
      case 'JOB_STATE_CANCELLED':
        return 'cancelled';
      case 'JOB_STATE_RUNNING':
        return 'processing';
      default:
        return 'pending';
    }
  }

  function startPolling() {
    if (isPolling) return;
    isPolling = true;
    pollTimeout = setTimeout(pollActiveJobs, 2000);
  }

  function stopPolling() {
    if (pollTimeout) {
      clearTimeout(pollTimeout);
      pollTimeout = null;
    }
    isPolling = false;
  }

  return {
    subscribe,
    async loadJobs(status?: 'active' | 'all') {
      const jobs = await cmd.getJobs(status);
      set(jobs);
      const hasActive = jobs.some((j) => j.status === 'pending' || j.status === 'processing');
      if (hasActive) startPolling();
    },
    addJob(job: Job) {
      update((jobs) => [job, ...jobs]);
      startPolling();
    },
    updateJob(updated: Job) {
      update((jobs) => jobs.map((j) => (j.id === updated.id ? updated : j)));
    },
    removeJob(id: string) {
      update((jobs) => jobs.filter((j) => j.id !== id));
    },
    loadMocks(jobList: Job[]) {
      if (!dev) return;
      set(jobList);
    },
    startPolling,
    stopPolling,
  };
}

export const jobs = createJobsStore();

export const activeJobsCount = derived(jobs, ($jobs) =>
  $jobs.filter(isActiveJob).length
);
