import { describe, it, expect } from 'vitest';
import { isActiveJob } from './jobs';
import type { ApiJob } from '$lib/types';

function makeJob(status: string): ApiJob {
  return {
    id: 'test-id',
    status: status as ApiJob['status'],
    mode: 'realtime',
    model: 'nano-banana-pro',
    credits_cost: 1,
    created: '2026-01-01T00:00:00Z',
    updated: '2026-01-01T00:00:00Z',
  };
}

describe('isActiveJob', () => {
  it('returns true for pending jobs', () => {
    expect(isActiveJob(makeJob('pending'))).toBe(true);
  });

  it('returns true for processing jobs', () => {
    expect(isActiveJob(makeJob('processing'))).toBe(true);
  });

  it('returns false for complete jobs', () => {
    expect(isActiveJob(makeJob('complete'))).toBe(false);
  });

  it('returns false for failed jobs', () => {
    expect(isActiveJob(makeJob('failed'))).toBe(false);
  });
});
