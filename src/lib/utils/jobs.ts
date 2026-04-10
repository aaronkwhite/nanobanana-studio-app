import type { ApiJob } from '$lib/types';

export function isActiveJob(job: ApiJob): boolean {
  return job.status === 'pending' || job.status === 'processing';
}
