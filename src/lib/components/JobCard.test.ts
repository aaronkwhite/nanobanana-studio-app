// src/lib/components/JobCard.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { invoke } from '@tauri-apps/api/core';
import JobCardTestWrapper from './JobCardTestWrapper.svelte';

const mockJob = {
  id: 'test-1',
  status: 'completed' as const,
  mode: 'text-to-image' as const,
  prompt: 'A beautiful sunset',
  output_size: '1K' as const,
  temperature: 1,
  aspect_ratio: '16:9' as const,
  batch_job_name: null,
  total_items: 2,
  completed_items: 2,
  failed_items: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('JobCard', () => {
  it('renders job prompt', () => {
    render(JobCardTestWrapper, { props: { job: mockJob } });
    expect(screen.getByText('A beautiful sunset')).toBeInTheDocument();
  });

  it('shows completed status with temperature', () => {
    render(JobCardTestWrapper, { props: { job: mockJob } });
    expect(screen.getByText('1K · 16:9 · 1 · 2 items')).toBeInTheDocument();
  });
});
