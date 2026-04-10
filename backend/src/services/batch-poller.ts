// backend/src/services/batch-poller.ts
import { getPocketBase } from './pocketbase.ts';
import { getBatchStatus } from './kie.ts';
import { creditAccount } from './credits.ts';
import type { JobRecord } from '../types.ts';

const POLL_INTERVAL_MS = 10_000; // poll every 10 seconds

export function startBatchPoller(): void {
  setInterval(pollBatchJobs, POLL_INTERVAL_MS);
  console.log('Batch poller started');
}

async function pollBatchJobs(): Promise<void> {
  const pb = await getPocketBase();
  const pendingJobs = await pb.collection('jobs').getFullList<JobRecord>({
    filter: 'mode = "batch" && (status = "pending" || status = "processing")',
  });

  for (const job of pendingJobs) {
    if (!job.kie_job_id) continue;

    try {
      const kieStatus = await getBatchStatus(job.kie_job_id);

      if (kieStatus.status === 'complete' && kieStatus.results) {
        const items = await pb.collection('job_items').getFullList({
          filter: `job_id = "${job.id}"`,
        });

        for (let i = 0; i < items.length; i++) {
          const result = kieStatus.results[i];
          if (result) {
            await pb.collection('job_items').update(items[i].id, {
              status: result.error ? 'failed' : 'complete',
              output_url: result.output_url ?? '',
              error: result.error ?? '',
            });
          }
        }

        await pb.collection('jobs').update(job.id, { status: 'complete' });

      } else if (kieStatus.status === 'failed') {
        await pb.collection('jobs').update(job.id, { status: 'failed' });
        await creditAccount({
          userId: job.user_id,
          amount: job.credits_cost,
          type: 'refund',
          referenceId: job.id,
        });

      } else if (kieStatus.status === 'processing') {
        await pb.collection('jobs').update(job.id, { status: 'processing' });
      }
    } catch (err) {
      console.error(`Failed to poll batch job ${job.id}:`, err);
    }
  }
}
