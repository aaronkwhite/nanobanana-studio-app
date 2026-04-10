// backend/src/routes/jobs.ts
import { Hono } from 'hono';
import { ClientResponseError } from 'pocketbase';
import { authMiddleware } from '../middleware/auth.ts';
import { getPocketBase } from '../services/pocketbase.ts';

const jobs = new Hono<{ Variables: { userId: string } }>();
jobs.use('*', authMiddleware);

jobs.get('/:id', async (c) => {
  const userId = c.get('userId');
  const jobId = c.req.param('id');
  const pb = await getPocketBase();

  try {
    const job = await pb.collection('jobs').getOne(jobId);
    if (job.user_id !== userId) return c.json({ error: 'Not found' }, 404);

    const items = await pb.collection('job_items').getFullList({
      filter: `job_id = "${jobId}"`,
    });

    return c.json({ job, items });
  } catch (err) {
    if (err instanceof ClientResponseError && err.status === 404) {
      return c.json({ error: 'Not found' }, 404);
    }
    throw err;
  }
});

export default jobs;
