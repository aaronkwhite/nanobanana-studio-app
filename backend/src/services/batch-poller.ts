// backend/src/services/batch-poller.ts
import { getPocketBase } from './pocketbase.ts';
import { getBatchStatus } from './kie.ts';
import { creditAccount } from './credits.ts';
import type { JobRecord, JobItemRecord } from '../types.ts';

const POLL_INTERVAL_MS = 10_000; // poll every 10 seconds

export function startBatchPoller(): void {
  void pollBatchJobs(); // run immediately on start, don't await (non-blocking)
  setInterval(pollBatchJobs, POLL_INTERVAL_MS);
  console.log('Batch poller started');
}

async function pollBatchJobs(): Promise<void> {
  let pb: Awaited<ReturnType<typeof getPocketBase>>;
  let pendingJobs: JobRecord[];
  try {
    pb = await getPocketBase();
    pendingJobs = await pb.collection('jobs').getFullList<JobRecord>({
      filter: 'mode = "batch" && (status = "pending" || status = "processing")',
    });
  } catch (err) {
    console.error('Batch poller failed to fetch pending jobs:', err);
    return;
  }

  for (const job of pendingJobs) {
    if (!job.kie_job_id) continue;

    try {
      const kieStatus = await getBatchStatus(job.kie_job_id);

      if (kieStatus.status === 'complete' && kieStatus.results) {
        const items = await pb.collection('job_items').getFullList<JobItemRecord>({
          filter: `job_id = "${job.id}"`,
        });

        const resultByPrompt = new Map(kieStatus.results.map(r => [r.prompt, r]));
        for (const item of items) {
          const result = resultByPrompt.get(item.prompt);
          if (result) {
            await pb.collection('job_items').update(item.id, {
              status: result.error ? 'failed' : 'complete',
              output_url: result.output_url ?? '',
              error: result.error ?? '',
            });
          } else {
            // KIE returned no result for this item — mark as failed
            await pb.collection('job_items').update(item.id, {
              status: 'failed',
              error: 'No result returned by KIE for this item',
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
