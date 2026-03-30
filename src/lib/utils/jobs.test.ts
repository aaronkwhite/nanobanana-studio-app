import { describe, it, expect } from 'vitest';
import { isActiveJob } from './jobs';
import type { Job } from '$lib/types';

function makeJob(status: string): Job {
  return {
    id: 'test-id',
    status,
    mode: 'text-to-image',
    prompt: 'test',
    output_size: '1K',
    temperature: 1,
    aspect_ratio: '1:1',
    batch_job_name: null,
    total_items: 1,
    completed_items: 0,
    failed_items: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  } as Job;
}

describe('isActiveJob', () => {
  it('returns true for pending jobs', () => {
    expect(isActiveJob(makeJob('pending'))).toBe(true);
  });

  it('returns true for processing jobs', () => {
    expect(isActiveJob(makeJob('processing'))).toBe(true);
  });

  it('returns false for completed jobs', () => {
    expect(isActiveJob(makeJob('completed'))).toBe(false);
  });

  it('returns false for failed jobs', () => {
    expect(isActiveJob(makeJob('failed'))).toBe(false);
  });

  it('returns false for cancelled jobs', () => {
    expect(isActiveJob(makeJob('cancelled'))).toBe(false);
  });
});
