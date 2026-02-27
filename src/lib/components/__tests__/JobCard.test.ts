import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';

// Import stores and component at module level (no dynamic imports)
import JobCard from '../JobCard.svelte';
import { jobs, type Job } from '$lib/stores/jobs';

const mockJob: Job = {
	id: 'test-job-1',
	status: 'pending',
	mode: 'text-to-image',
	prompt: 'A beautiful sunset over mountains',
	output_size: '1K',
	temperature: 1,
	aspect_ratio: '1:1',
	batch_job_name: null,
	batch_temp_file: null,
	total_items: 3,
	completed_items: 0,
	failed_items: 0,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
};

describe('JobCard component', () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		// Clear jobs store
		const currentJobs = get(jobs);
		currentJobs.forEach(job => jobs.removeJob(job.id));
	});

	afterEach(() => {
		// Clean up jobs after each test
		const currentJobs = get(jobs);
		currentJobs.forEach(job => jobs.removeJob(job.id));
	});

	it('should render job prompt', () => {
		render(JobCard, { props: { job: mockJob } });
		expect(screen.getByText(mockJob.prompt)).toBeInTheDocument();
	});

	it('should show job settings', () => {
		render(JobCard, { props: { job: mockJob } });

		expect(screen.getByText('1K')).toBeInTheDocument();
		expect(screen.getByText('1:1')).toBeInTheDocument();
		expect(screen.getByText('3 images')).toBeInTheDocument();
	});

	it('should show cost based on output size and count', () => {
		render(JobCard, { props: { job: mockJob } });

		// 3 images at 1K = $0.1005
		expect(screen.getByText('$0.10')).toBeInTheDocument();
	});

	it('should show spinner for pending job', () => {
		render(JobCard, { props: { job: { ...mockJob, status: 'pending' } } });

		expect(screen.getByText('⏳')).toBeInTheDocument();
		expect(screen.getByText('Starting...')).toBeInTheDocument();
	});

	it('should show progress for processing job', () => {
		render(JobCard, {
			props: {
				job: {
					...mockJob,
					status: 'processing',
					completed_items: 2
				}
			}
		});

		expect(screen.getByText('⏳')).toBeInTheDocument();
		expect(screen.getByText('Generating 2/3')).toBeInTheDocument();
		expect(screen.getByText('67%')).toBeInTheDocument();
	});

	it('should show checkmark for completed job', () => {
		render(JobCard, { props: { job: { ...mockJob, status: 'completed' } } });
		expect(screen.getByText('✅')).toBeInTheDocument();
	});

	it('should show X for failed job', () => {
		render(JobCard, { props: { job: { ...mockJob, status: 'failed' } } });
		expect(screen.getByText('❌')).toBeInTheDocument();
	});

	it('should show delete button', () => {
		render(JobCard, { props: { job: mockJob } });
		expect(screen.getByTitle('Delete')).toBeInTheDocument();
	});

	it('should call delete_job when delete button is clicked', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		render(JobCard, { props: { job: mockJob } });

		const deleteButton = screen.getByTitle('Delete');
		await fireEvent.click(deleteButton);

		expect(invoke).toHaveBeenCalledWith('delete_job', { id: mockJob.id });
	});

	it('should show copy prompt button for completed job', () => {
		render(JobCard, { props: { job: { ...mockJob, status: 'completed' } } });
		expect(screen.getByTitle('Copy prompt')).toBeInTheDocument();
	});

	it('should show copy prompt button for failed job', () => {
		render(JobCard, { props: { job: { ...mockJob, status: 'failed' } } });
		expect(screen.getByTitle('Copy prompt')).toBeInTheDocument();
	});

	it('should not show copy prompt button for pending job', () => {
		render(JobCard, { props: { job: { ...mockJob, status: 'pending' } } });
		expect(screen.queryByTitle('Copy prompt')).not.toBeInTheDocument();
	});

	it('should copy prompt to clipboard when copy button is clicked', async () => {
		render(JobCard, { props: { job: { ...mockJob, status: 'completed' } } });

		const copyButton = screen.getByTitle('Copy prompt');
		await fireEvent.click(copyButton);

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockJob.prompt);
	});

	it('should show correct progress percentage', () => {
		// Test with 1/4 completed and 1 failed = 50%
		render(JobCard, {
			props: {
				job: {
					...mockJob,
					status: 'processing',
					total_items: 4,
					completed_items: 1,
					failed_items: 1
				}
			}
		});

		expect(screen.getByText('50%')).toBeInTheDocument();
	});

	it('should handle 4K job cost correctly', () => {
		render(JobCard, {
			props: {
				job: {
					...mockJob,
					output_size: '4K',
					total_items: 2
				}
			}
		});

		// 2 images at 4K = $0.151
		expect(screen.getByText('$0.15')).toBeInTheDocument();
	});

	it('should show temperature value', () => {
		render(JobCard, {
			props: {
				job: {
					...mockJob,
					temperature: 1.5
				}
			}
		});

		expect(screen.getByText('1.5')).toBeInTheDocument();
	});
});
