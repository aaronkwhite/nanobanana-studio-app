import type { Job } from '$lib/types';

export function isActiveJob(job: Job): boolean {
  return job.status === 'pending' || job.status === 'processing';
}
