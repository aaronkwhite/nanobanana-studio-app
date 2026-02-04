import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { get } from 'svelte/store';

// Import stores and component at module level (no dynamic imports)
import JobList from '../JobList.svelte';
import { jobs, type Job } from '$lib/stores/jobs';

const mockJob: Job = {
	id: 'test-job-1',
	status: 'completed',
	mode: 'text-to-image',
	prompt: 'A beautiful sunset',
	output_size: '1K',
	temperature: 1,
	aspect_ratio: '1:1',
	batch_job_name: null,
	batch_temp_file: null,
	total_items: 1,
	completed_items: 1,
	failed_items: 0,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
};

describe('JobList component', () => {
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

	it('should show empty state when no jobs', () => {
		render(JobList);

		expect(screen.getByText('No jobs yet. Start generating!')).toBeInTheDocument();
		expect(screen.getByText('🍌')).toBeInTheDocument();
	});

	it('should render job cards when jobs exist', () => {
		jobs.addJob(mockJob);

		render(JobList);

		expect(screen.getByText('A beautiful sunset')).toBeInTheDocument();
	});

	it('should render multiple job cards', () => {
		const job2: Job = { ...mockJob, id: 'test-job-2', prompt: 'A mountain landscape' };

		jobs.addJob(mockJob);
		jobs.addJob(job2);

		render(JobList);

		expect(screen.getByText('A beautiful sunset')).toBeInTheDocument();
		expect(screen.getByText('A mountain landscape')).toBeInTheDocument();
	});

	it('should show jobs in correct order (newest first)', () => {
		const job1: Job = { ...mockJob, id: 'job-1', prompt: 'First job' };
		const job2: Job = { ...mockJob, id: 'job-2', prompt: 'Second job' };

		// Add in order - second job should appear first since addJob prepends
		jobs.addJob(job1);
		jobs.addJob(job2);

		render(JobList);

		const prompts = screen.getAllByText(/job$/);
		expect(prompts[0]).toHaveTextContent('Second job');
		expect(prompts[1]).toHaveTextContent('First job');
	});

	it('should update when job is removed', () => {
		jobs.addJob(mockJob);

		const { rerender } = render(JobList);

		expect(screen.getByText('A beautiful sunset')).toBeInTheDocument();

		jobs.removeJob(mockJob.id);

		// Force re-render
		rerender({});

		expect(screen.queryByText('A beautiful sunset')).not.toBeInTheDocument();
		expect(screen.getByText('No jobs yet. Start generating!')).toBeInTheDocument();
	});

	it('should show different job statuses', () => {
		const pendingJob: Job = { ...mockJob, id: 'pending-1', status: 'pending', prompt: 'Pending task' };
		const processingJob: Job = { ...mockJob, id: 'processing-1', status: 'processing', prompt: 'Processing task' };
		const completedJob: Job = { ...mockJob, id: 'completed-1', status: 'completed', prompt: 'Completed task' };
		const failedJob: Job = { ...mockJob, id: 'failed-1', status: 'failed', prompt: 'Failed task' };

		jobs.addJob(pendingJob);
		jobs.addJob(processingJob);
		jobs.addJob(completedJob);
		jobs.addJob(failedJob);

		render(JobList);

		// All jobs should be visible
		expect(screen.getByText('Pending task')).toBeInTheDocument();
		expect(screen.getByText('Processing task')).toBeInTheDocument();
		expect(screen.getByText('Completed task')).toBeInTheDocument();
		expect(screen.getByText('Failed task')).toBeInTheDocument();

		// Status indicators
		expect(screen.getAllByText('⏳')).toHaveLength(2); // pending + processing
		expect(screen.getByText('✅')).toBeInTheDocument();
		expect(screen.getByText('❌')).toBeInTheDocument();
	});
});
