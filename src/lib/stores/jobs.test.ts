import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';

// Mock Tauri invoke API
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

import { invoke } from '@tauri-apps/api/core';
import type { Job } from './jobs';

describe('jobs store', () => {
	const mockJob: Job = {
		id: 'test-job-1',
		status: 'pending',
		mode: 'text-to-image',
		prompt: 'A beautiful sunset',
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

	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('job CRUD operations', () => {
		it('should add a job to the store', async () => {
			const { jobs } = await import('./jobs');

			jobs.addJob(mockJob);

			const currentJobs = get(jobs);
			expect(currentJobs).toHaveLength(1);
			expect(currentJobs[0]).toEqual(mockJob);
		});

		it('should add new jobs at the beginning of the list', async () => {
			const { jobs } = await import('./jobs');

			const secondJob: Job = { ...mockJob, id: 'test-job-2', prompt: 'Another prompt' };

			jobs.addJob(mockJob);
			jobs.addJob(secondJob);

			const currentJobs = get(jobs);
			expect(currentJobs).toHaveLength(2);
			expect(currentJobs[0].id).toBe('test-job-2');
			expect(currentJobs[1].id).toBe('test-job-1');
		});

		it('should update a job in the store', async () => {
			const { jobs } = await import('./jobs');

			jobs.addJob(mockJob);

			const updatedJob: Job = { ...mockJob, status: 'processing', completed_items: 1 };
			jobs.updateJob(updatedJob);

			const currentJobs = get(jobs);
			expect(currentJobs[0].status).toBe('processing');
			expect(currentJobs[0].completed_items).toBe(1);
		});

		it('should remove a job from the store', async () => {
			const { jobs } = await import('./jobs');

			jobs.addJob(mockJob);
			expect(get(jobs)).toHaveLength(1);

			jobs.removeJob(mockJob.id);
			expect(get(jobs)).toHaveLength(0);
		});

		it('should not modify other jobs when removing one', async () => {
			const { jobs } = await import('./jobs');

			const secondJob: Job = { ...mockJob, id: 'test-job-2' };
			jobs.addJob(mockJob);
			jobs.addJob(secondJob);

			jobs.removeJob(mockJob.id);

			const currentJobs = get(jobs);
			expect(currentJobs).toHaveLength(1);
			expect(currentJobs[0].id).toBe('test-job-2');
		});
	});

	describe('loadJobs', () => {
		it('should load jobs from backend', async () => {
			const mockJobs = [mockJob, { ...mockJob, id: 'test-job-2' }];
			vi.mocked(invoke).mockResolvedValue(mockJobs);

			const { jobs } = await import('./jobs');
			await jobs.loadJobs();

			expect(invoke).toHaveBeenCalledWith('get_jobs');
			expect(get(jobs)).toEqual(mockJobs);
		});

		it('should handle errors when loading jobs', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.mocked(invoke).mockRejectedValue(new Error('Network error'));

			const { jobs } = await import('./jobs');
			await jobs.loadJobs();

			expect(consoleSpy).toHaveBeenCalledWith('Failed to load jobs:', expect.any(Error));
			consoleSpy.mockRestore();
		});
	});

	describe('loadActiveJobs', () => {
		it('should load active jobs and merge with existing', async () => {
			const activeJob: Job = { ...mockJob, id: 'active-1', status: 'processing' };
			const existingJob: Job = { ...mockJob, id: 'existing-1', status: 'completed' };

			vi.mocked(invoke).mockResolvedValue([activeJob]);

			const { jobs } = await import('./jobs');

			// Add an existing job first
			jobs.addJob(existingJob);

			await jobs.loadActiveJobs();

			expect(invoke).toHaveBeenCalledWith('get_jobs', { status: 'active' });

			const currentJobs = get(jobs);
			expect(currentJobs).toHaveLength(2);
			expect(currentJobs.some(j => j.id === 'active-1')).toBe(true);
			expect(currentJobs.some(j => j.id === 'existing-1')).toBe(true);
		});
	});

	describe('activeJobsCount derived store', () => {
		it('should count pending and processing jobs', async () => {
			const { jobs, activeJobsCount } = await import('./jobs');

			const pendingJob: Job = { ...mockJob, id: 'job-1', status: 'pending' };
			const processingJob: Job = { ...mockJob, id: 'job-2', status: 'processing' };
			const completedJob: Job = { ...mockJob, id: 'job-3', status: 'completed' };
			const failedJob: Job = { ...mockJob, id: 'job-4', status: 'failed' };

			jobs.addJob(pendingJob);
			jobs.addJob(processingJob);
			jobs.addJob(completedJob);
			jobs.addJob(failedJob);

			expect(get(activeJobsCount)).toBe(2);
		});

		it('should return 0 when no active jobs', async () => {
			const { jobs, activeJobsCount } = await import('./jobs');

			const completedJob: Job = { ...mockJob, id: 'job-1', status: 'completed' };
			jobs.addJob(completedJob);

			expect(get(activeJobsCount)).toBe(0);
		});
	});

	describe('calculateCost', () => {
		it('should calculate cost for 1K images', async () => {
			const { calculateCost } = await import('./jobs');
			expect(calculateCost('1K', 5)).toBe(0.10);
		});

		it('should calculate cost for 2K images', async () => {
			const { calculateCost } = await import('./jobs');
			expect(calculateCost('2K', 3)).toBeCloseTo(0.21);
		});

		it('should calculate cost for 4K images', async () => {
			const { calculateCost } = await import('./jobs');
			expect(calculateCost('4K', 2)).toBe(0.24);
		});

		it('should return 0 for 0 items', async () => {
			const { calculateCost } = await import('./jobs');
			expect(calculateCost('1K', 0)).toBe(0);
		});
	});

	describe('polling', () => {
		it('should start polling when adding a job', async () => {
			const { jobs } = await import('./jobs');

			jobs.addJob(mockJob);

			// Polling should have started - advance timer to trigger poll
			vi.mocked(invoke).mockResolvedValue({
				job: { ...mockJob, completed_items: 1 },
				items: []
			});

			await vi.advanceTimersByTimeAsync(2000);

			expect(invoke).toHaveBeenCalledWith('get_job', { id: mockJob.id });
		});

		it('should stop polling when no active jobs remain', async () => {
			const { jobs } = await import('./jobs');

			// Add a completed job (not active)
			const completedJob: Job = { ...mockJob, status: 'completed' };
			jobs.addJob(completedJob);

			// Clear mock to track new calls
			vi.mocked(invoke).mockClear();

			// Advance timer - should stop polling since no active jobs
			await vi.advanceTimersByTimeAsync(2000);

			// After one poll cycle with no active jobs, polling should stop
			await vi.advanceTimersByTimeAsync(2000);

			// invoke should have been called at most once (to check), then stopped
			expect(invoke).not.toHaveBeenCalledWith('get_job', expect.anything());
		});

		it('should update jobs during polling', async () => {
			const { jobs } = await import('./jobs');

			jobs.addJob(mockJob);

			const updatedJob: Job = { ...mockJob, status: 'processing', completed_items: 2 };
			vi.mocked(invoke).mockResolvedValue({
				job: updatedJob,
				items: []
			});

			await vi.advanceTimersByTimeAsync(2000);

			const currentJobs = get(jobs);
			expect(currentJobs[0].completed_items).toBe(2);
			expect(currentJobs[0].status).toBe('processing');
		});

		it('should handle errors during polling gracefully', async () => {
			const { jobs } = await import('./jobs');

			jobs.addJob(mockJob);

			// Simulate job deletion during poll
			vi.mocked(invoke).mockRejectedValue(new Error('Job not found'));

			// Should not throw
			await vi.advanceTimersByTimeAsync(2000);

			// Job should still be in store (not removed by poll error)
			expect(get(jobs)).toHaveLength(1);
		});

		it('should stop polling explicitly', async () => {
			const { jobs } = await import('./jobs');

			jobs.addJob(mockJob);
			jobs.stopPolling();

			vi.mocked(invoke).mockClear();

			await vi.advanceTimersByTimeAsync(4000);

			// No polling calls should have been made
			expect(invoke).not.toHaveBeenCalledWith('get_job', expect.anything());
		});

		it('should not start multiple polling intervals', async () => {
			const { jobs } = await import('./jobs');

			jobs.addJob(mockJob);
			jobs.startPolling(); // Explicitly call again

			vi.mocked(invoke).mockResolvedValue({
				job: mockJob,
				items: []
			});

			await vi.advanceTimersByTimeAsync(2000);

			// Should only have been called once per interval
			const getJobCalls = vi.mocked(invoke).mock.calls.filter(
				(call) => call[0] === 'get_job'
			);
			expect(getJobCalls.length).toBe(1);
		});
	});

	describe('constants', () => {
		it('should export correct OUTPUT_SIZES', async () => {
			const { OUTPUT_SIZES } = await import('./jobs');

			expect(OUTPUT_SIZES['1K'].price).toBe(0.02);
			expect(OUTPUT_SIZES['2K'].price).toBe(0.07);
			expect(OUTPUT_SIZES['4K'].price).toBe(0.12);
		});

		it('should export correct ASPECT_RATIOS', async () => {
			const { ASPECT_RATIOS } = await import('./jobs');

			expect(ASPECT_RATIOS['1:1']).toBe('Square');
			expect(ASPECT_RATIOS['16:9']).toBe('Wide');
			expect(ASPECT_RATIOS['9:16']).toBe('Portrait');
		});

		it('should export correct TEMPERATURES', async () => {
			const { TEMPERATURES } = await import('./jobs');

			expect(TEMPERATURES).toEqual([0, 0.5, 1, 1.5, 2]);
		});
	});
});
