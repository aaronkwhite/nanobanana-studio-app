// backend/tests/generate.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

vi.mock('../src/services/credits.ts', () => ({
  deductCredits: vi.fn().mockResolvedValue(99),
  creditAccount: vi.fn(),
}));
vi.mock('../src/services/kie.ts', () => ({
  submitRealtime: vi.fn().mockResolvedValue('kie-job-123'),
  submitBatch: vi.fn().mockResolvedValue('kie-batch-456'),
}));
vi.mock('../src/services/pocketbase.ts', () => ({
  getPocketBase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      create: vi.fn().mockResolvedValue({ id: 'job-abc' }),
    }),
  }),
}));
vi.mock('../src/middleware/auth.ts', () => ({
  authMiddleware: createMiddleware<{ Variables: { userId: string } }>(async (c, next) => {
    c.set('userId', 'user-123');
    await next();
  }),
}));

import generateRoutes from '../src/routes/generate.ts';
import { deductCredits, creditAccount } from '../src/services/credits.ts';
import { submitRealtime, submitBatch } from '../src/services/kie.ts';

beforeEach(() => {
  vi.mocked(deductCredits).mockReset();
  vi.mocked(deductCredits).mockResolvedValue(1);
  vi.mocked(creditAccount).mockReset();
  vi.mocked(submitRealtime).mockReset();
  vi.mocked(submitRealtime).mockResolvedValue('kie-job-123');
  vi.mocked(submitBatch).mockReset();
  vi.mocked(submitBatch).mockResolvedValue('kie-batch-456');
});

describe('POST / (realtime generate)', () => {
  it('returns 400 if prompts array is empty', async () => {
    const app = new Hono();
    app.route('/', generateRoutes);
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nano-banana-pro', resolution: '1K', prompts: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 if model is missing', async () => {
    const app = new Hono();
    app.route('/', generateRoutes);
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution: '1K', prompts: ['a cat'] }),
    });
    expect(res.status).toBe(400);
  });

  it('deducts credits and returns job_id on success', async () => {
    const app = new Hono();
    app.route('/', generateRoutes);
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nano-banana-pro', resolution: '1K', prompts: ['a cat'] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job_id).toBeDefined();
    expect(deductCredits).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-123', mode: 'realtime' }));
    expect(submitRealtime).toHaveBeenCalled();
  });

  it('returns 402 and does not call KIE when credits are insufficient', async () => {
    vi.mocked(deductCredits).mockRejectedValue(new Error('Insufficient credits: have 0, need 1'));
    const app = new Hono();
    app.route('/', generateRoutes);
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nano-banana-pro', resolution: '1K', prompts: ['a cat'] }),
    });
    expect(res.status).toBe(402);
    expect(submitRealtime).not.toHaveBeenCalled();
  });

  it('refunds credits and rethrows when KIE fails', async () => {
    vi.mocked(submitRealtime).mockRejectedValue(new Error('KIE API error 500: internal'));
    const app = new Hono();
    app.route('/', generateRoutes);
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nano-banana-pro', resolution: '1K', prompts: ['a cat'] }),
    });
    expect(res.status).toBe(500);
    expect(creditAccount).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-123', type: 'refund' }));
  });
});

describe('POST /batch (batch generate)', () => {
  it('deducts credits and returns job_id for batch', async () => {
    const app = new Hono();
    app.route('/', generateRoutes);
    const res = await app.request('/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nano-banana-pro', resolution: '1K', prompts: ['a cat', 'a dog'] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job_id).toBeDefined();
    expect(deductCredits).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-123', mode: 'batch' }));
    expect(submitBatch).toHaveBeenCalled();
  });

  it('refunds credits and rethrows when batch KIE fails', async () => {
    vi.mocked(submitBatch).mockRejectedValue(new Error('KIE API error 500: batch failed'));
    const app = new Hono();
    app.route('/', generateRoutes);
    const res = await app.request('/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nano-banana-pro', resolution: '1K', prompts: ['a cat'] }),
    });
    expect(res.status).toBe(500);
    expect(creditAccount).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-123', type: 'refund' }));
  });
});
