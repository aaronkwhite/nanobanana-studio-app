// backend/tests/jobs.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

vi.mock('../src/middleware/auth.ts', () => ({
  authMiddleware: createMiddleware<{ Variables: { userId: string } }>(async (c, next) => {
    c.set('userId', 'user-123');
    await next();
  }),
}));

vi.mock('../src/services/pocketbase.ts', () => ({
  getPocketBase: vi.fn().mockResolvedValue({
    collection: (name: string) => ({
      getOne: vi.fn().mockImplementation((id: string) => {
        if (name === 'jobs' && id === 'job-abc') {
          return Promise.resolve({ id: 'job-abc', user_id: 'user-123', status: 'complete' });
        }
        throw new Error('Not found');
      }),
      getFullList: vi.fn().mockResolvedValue([
        { id: 'item-1', job_id: 'job-abc', status: 'complete', output_url: 'https://example.com/img.png' },
      ]),
    }),
  }),
}));

import jobRoutes from '../src/routes/jobs.ts';

describe('GET /api/jobs/:id', () => {
  it('returns 404 for unknown job id', async () => {
    const app = new Hono();
    app.route('/', jobRoutes);
    const res = await app.request('/unknown-job');
    expect(res.status).toBe(404);
  });

  it('returns job with items for valid id', async () => {
    const app = new Hono();
    app.route('/', jobRoutes);
    const res = await app.request('/job-abc');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job.id).toBe('job-abc');
    expect(body.items).toHaveLength(1);
  });

  it('returns 404 when job belongs to different user', async () => {
    // Override mock: job exists but has a different user_id
    const { getPocketBase } = await import('../src/services/pocketbase.ts');
    vi.mocked(getPocketBase).mockResolvedValueOnce({
      collection: (_name: string) => ({
        getOne: vi.fn().mockResolvedValue({ id: 'job-xyz', user_id: 'different-user', status: 'complete' }),
        getFullList: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    const app = new Hono();
    app.route('/', jobRoutes);
    const res = await app.request('/job-xyz');
    expect(res.status).toBe(404);
  });
});
