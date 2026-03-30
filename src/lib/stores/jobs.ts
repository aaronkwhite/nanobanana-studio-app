// src/lib/stores/jobs.ts
import { writable, derived } from 'svelte/store';
import type { Job, JobWithItems, BatchStatus, GeminiBatchState } from '$lib/types';
import * as cmd from '$lib/utils/commands';
import { isActiveJob } from '$lib/utils/jobs';

function createJobsStore() {
  const { subscribe, set, update } = writable<Job[]>([]);
  let pollTimeout: ReturnType<typeof setTimeout> | null = null;
  let isPolling = false;

  async function pollActiveJobs() {
    let currentJobs: Job[] = [];
    const unsub = subscribe((j) => (currentJobs = j));
    unsub();

    const activeJobs = currentJobs.filter(isActiveJob);

    if (activeJobs.length === 0) {
      isPolling = false;
      return;
    }

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
      }
    }

    // Schedule next poll if there are still active jobs
    let updatedJobs: Job[] = [];
    const unsub2 = subscribe((j) => (updatedJobs = j));
    unsub2();
    const hasActiveJobs = updatedJobs.some(isActiveJob);

    if (hasActiveJobs) {
      pollTimeout = setTimeout(pollActiveJobs, 2000);
    } else {
      isPolling = false;
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
    setJobs(jobList: Job[]) {
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
