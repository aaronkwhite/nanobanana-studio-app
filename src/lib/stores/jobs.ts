// src/lib/stores/jobs.ts
import { writable, derived } from 'svelte/store';
import type { ApiJob } from '$lib/types';
import * as cmd from '$lib/utils/commands';
import { isActiveJob } from '$lib/utils/jobs';

function createJobsStore() {
  const { subscribe, set, update } = writable<ApiJob[]>([]);
  let pollTimeout: ReturnType<typeof setTimeout> | null = null;
  let isPolling = false;

  async function pollActiveJobs() {
    let currentJobs: ApiJob[] = [];
    const unsub = subscribe((j) => (currentJobs = j));
    unsub();

    const activeJobs = currentJobs.filter(isActiveJob);

    if (activeJobs.length === 0) {
      isPolling = false;
      return;
    }

    for (const job of activeJobs) {
      try {
        const updated = await cmd.apiGetJob(job.id);
        update((jobs) => jobs.map((j) => (j.id === job.id ? updated.job : j)));
      } catch (err) {
        console.error(`Failed to poll job ${job.id}:`, err);
      }
    }

    let updatedJobs: ApiJob[] = [];
    const unsub2 = subscribe((j) => (updatedJobs = j));
    unsub2();
    const hasActiveJobs = updatedJobs.some(isActiveJob);

    if (hasActiveJobs) {
      pollTimeout = setTimeout(pollActiveJobs, 2000);
    } else {
      isPolling = false;
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
    loadJobs() {
      set([]);
    },
    addJob(job: ApiJob) {
      update((jobs) => [job, ...jobs]);
      startPolling();
    },
    updateJob(updated: ApiJob) {
      update((jobs) => jobs.map((j) => (j.id === updated.id ? updated : j)));
    },
    removeJob(id: string) {
      update((jobs) => jobs.filter((j) => j.id !== id));
    },
    setJobs(jobList: ApiJob[]) {
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
