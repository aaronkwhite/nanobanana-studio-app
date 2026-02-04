import { writable, derived } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';

export interface Job {
	id: string;
	status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
	mode: 'text-to-image' | 'image-to-image';
	prompt: string;
	output_size: '1K' | '2K' | '4K';
	temperature: number;
	aspect_ratio: string;
	batch_job_name: string | null;
	batch_temp_file: string | null;
	total_items: number;
	completed_items: number;
	failed_items: number;
	created_at: string;
	updated_at: string;
}

export interface JobItem {
	id: string;
	job_id: string;
	input_prompt: string | null;
	input_image_path: string | null;
	output_image_path: string | null;
	status: 'pending' | 'processing' | 'completed' | 'failed';
	error: string | null;
	created_at: string;
	updated_at: string;
}

export interface JobWithItems {
	job: Job;
	items: JobItem[];
}

// Prices per output size
export const OUTPUT_SIZES = {
	'1K': { label: '1K ($0.02)', price: 0.02 },
	'2K': { label: '2K ($0.07)', price: 0.07 },
	'4K': { label: '4K ($0.12)', price: 0.12 }
} as const;

export const ASPECT_RATIOS = {
	'1:1': 'Square',
	'16:9': 'Wide',
	'9:16': 'Portrait',
	'4:3': 'Landscape',
	'3:4': 'Tall'
} as const;

export const TEMPERATURES = [0, 0.5, 1, 1.5, 2] as const;

function createJobsStore() {
	const { subscribe, set, update } = writable<Job[]>([]);

	let pollInterval: ReturnType<typeof setInterval> | null = null;

	async function loadJobs() {
		try {
			const jobs = await invoke<Job[]>('get_jobs');
			set(jobs);
		} catch (error) {
			console.error('Failed to load jobs:', error);
		}
	}

	async function loadActiveJobs() {
		try {
			const jobs = await invoke<Job[]>('get_jobs', { status: 'active' });
			update((current) => {
				// Merge active jobs with existing
				const ids = new Set(jobs.map((j) => j.id));
				const others = current.filter((j) => !ids.has(j.id));
				return [...jobs, ...others];
			});
		} catch (error) {
			console.error('Failed to load active jobs:', error);
		}
	}

	function startPolling() {
		if (pollInterval) return;
		pollInterval = setInterval(async () => {
			const currentJobs = await new Promise<Job[]>((resolve) => {
				const unsubscribe = subscribe((jobs) => {
					resolve(jobs);
					unsubscribe();
				});
			});

			const activeJobs = currentJobs.filter(
				(j) => j.status === 'pending' || j.status === 'processing'
			);

			if (activeJobs.length === 0) {
				stopPolling();
				return;
			}

			// Update each active job
			for (const job of activeJobs) {
				try {
					const updated = await invoke<JobWithItems>('get_job', { id: job.id });
					update((jobs) => jobs.map((j) => (j.id === updated.job.id ? updated.job : j)));
				} catch {
					// Job may have been deleted
				}
			}
		}, 2000);
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	return {
		subscribe,
		loadJobs,
		loadActiveJobs,
		startPolling,
		stopPolling,
		addJob: (job: Job) => {
			update((jobs) => [job, ...jobs]);
			startPolling();
		},
		updateJob: (updated: Job) => {
			update((jobs) => jobs.map((j) => (j.id === updated.id ? updated : j)));
		},
		removeJob: (id: string) => {
			update((jobs) => jobs.filter((j) => j.id !== id));
		}
	};
}

export const jobs = createJobsStore();

// Derived store for active jobs count
export const activeJobsCount = derived(jobs, ($jobs) =>
	$jobs.filter((j) => j.status === 'pending' || j.status === 'processing').length
);

// Calculate cost for a job
export function calculateCost(size: keyof typeof OUTPUT_SIZES, count: number): number {
	return OUTPUT_SIZES[size].price * count;
}
