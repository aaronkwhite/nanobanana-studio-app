// backend/src/routes/generate.ts
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.ts';
import { deductCredits, creditAccount } from '../services/credits.ts';
import { submitRealtime, submitBatch } from '../services/kie.ts';
import { getPocketBase } from '../services/pocketbase.ts';
import type { GenerateRequest, JobRecord } from '../types.ts';
import { calculateCreditCost } from '../types.ts';

const generate = new Hono<{ Variables: { userId: string } }>();
generate.use('*', authMiddleware);

async function createJob(params: {
  userId: string;
  mode: JobRecord['mode'];
  model: JobRecord['model'];
  creditsCost: number;
  kieJobId: string;
  prompts: string[];
  resolution: '1K' | '2K' | '4K';
}): Promise<string> {
  const pb = await getPocketBase();
  const job = await pb.collection('jobs').create({
    user_id: params.userId,
    status: 'pending',
    mode: params.mode,
    model: params.model,
    credits_cost: params.creditsCost,
    kie_job_id: params.kieJobId,
  });

  await Promise.all(
    params.prompts.map((prompt) =>
      pb.collection('job_items').create({
        job_id: job.id,
        status: 'pending',
        prompt,
        resolution: params.resolution,
      })
    )
  );

  return job.id as string;
}

generate.post('/', async (c) => {
  const userId = c.get('userId');

  let body: GenerateRequest;
  try {
    body = await c.req.json<GenerateRequest>();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  if (!body.prompts?.length) return c.json({ error: 'prompts required' }, 400);
  if (!body.model || !body.resolution) return c.json({ error: 'model and resolution required' }, 400);

  const jobId = crypto.randomUUID();
  const creditsCost = calculateCreditCost(body.model, body.resolution, 'realtime', body.prompts.length);

  try {
    await deductCredits({
      userId,
      model: body.model,
      resolution: body.resolution,
      mode: 'realtime',
      count: body.prompts.length,
      referenceId: jobId,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('Insufficient')) {
      return c.json({ error: err.message }, 402);
    }
    throw err;
  }

  let kieJobId: string;
  try {
    kieJobId = await submitRealtime(body);
  } catch (err) {
    await creditAccount({ userId, amount: creditsCost, type: 'refund', referenceId: jobId });
    throw err;
  }

  let storedJobId: string;
  try {
    storedJobId = await createJob({
      userId,
      mode: 'realtime',
      model: body.model,
      creditsCost,
      kieJobId,
      prompts: body.prompts,
      resolution: body.resolution,
    });
  } catch (err) {
    await creditAccount({ userId, amount: creditsCost, type: 'refund', referenceId: jobId });
    throw err;
  }

  return c.json({ job_id: storedJobId });
});

generate.post('/batch', async (c) => {
  const userId = c.get('userId');

  let body: GenerateRequest;
  try {
    body = await c.req.json<GenerateRequest>();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  if (!body.prompts?.length) return c.json({ error: 'prompts required' }, 400);
  if (!body.model || !body.resolution) return c.json({ error: 'model and resolution required' }, 400);

  const jobId = crypto.randomUUID();
  const creditsCost = calculateCreditCost(body.model, body.resolution, 'batch', body.prompts.length);

  try {
    await deductCredits({
      userId,
      model: body.model,
      resolution: body.resolution,
      mode: 'batch',
      count: body.prompts.length,
      referenceId: jobId,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('Insufficient')) {
      return c.json({ error: err.message }, 402);
    }
    throw err;
  }

  let kieJobId: string;
  try {
    kieJobId = await submitBatch(body);
  } catch (err) {
    await creditAccount({ userId, amount: creditsCost, type: 'refund', referenceId: jobId });
    throw err;
  }

  let storedJobId: string;
  try {
    storedJobId = await createJob({
      userId,
      mode: 'batch',
      model: body.model,
      creditsCost,
      kieJobId,
      prompts: body.prompts,
      resolution: body.resolution,
    });
  } catch (err) {
    await creditAccount({ userId, amount: creditsCost, type: 'refund', referenceId: jobId });
    throw err;
  }

  return c.json({ job_id: storedJobId });
});

export default generate;
