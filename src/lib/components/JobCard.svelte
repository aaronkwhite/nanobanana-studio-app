<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { jobs, type Job, OUTPUT_SIZES, calculateCost } from '$lib/stores/jobs';

	interface Props {
		job: Job;
	}

	let { job }: Props = $props();

	let deleting = $state(false);

	async function deleteJob() {
		deleting = true;
		try {
			await invoke('delete_job', { id: job.id });
			jobs.removeJob(job.id);
		} catch (error) {
			console.error('Failed to delete job:', error);
		} finally {
			deleting = false;
		}
	}

	function copyPrompt() {
		navigator.clipboard.writeText(job.prompt);
	}

	const cost = $derived(calculateCost(job.output_size as keyof typeof OUTPUT_SIZES, job.total_items));
	const progress = $derived(
		job.total_items > 0 ? Math.round(((job.completed_items + job.failed_items) / job.total_items) * 100) : 0
	);
</script>

<div class="card p-4">
	<div class="flex gap-4">
		<!-- Thumbnail area -->
		<div class="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
			{#if job.status === 'pending' || job.status === 'processing'}
				<div class="w-full h-full shimmer flex items-center justify-center">
					<span class="text-2xl animate-spin">⏳</span>
				</div>
			{:else if job.status === 'completed'}
				<div class="w-full h-full flex items-center justify-center text-3xl">
					✅
				</div>
			{:else if job.status === 'failed'}
				<div class="w-full h-full flex items-center justify-center text-3xl">
					❌
				</div>
			{/if}
		</div>

		<!-- Info area -->
		<div class="flex-1 min-w-0">
			<p class="text-sm text-gray-900 dark:text-white line-clamp-2">{job.prompt}</p>
			<div class="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
				<span>{job.output_size}</span>
				<span>·</span>
				<span>{job.aspect_ratio}</span>
				<span>·</span>
				<span>{job.temperature}</span>
				<span>·</span>
				<span>{job.total_items} image{job.total_items !== 1 ? 's' : ''}</span>
				<span>·</span>
				<span>${cost.toFixed(2)}</span>
			</div>

			{#if job.status === 'pending' || job.status === 'processing'}
				<div class="mt-2">
					<div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
						<span>
							{job.status === 'pending' ? 'Starting...' : `Generating ${job.completed_items}/${job.total_items}`}
						</span>
						<span>{progress}%</span>
					</div>
					<div class="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
						<div
							class="h-full bg-banana-500 transition-all duration-300"
							style="width: {progress}%"
						></div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex flex-col gap-2">
			{#if job.status === 'completed' || job.status === 'failed'}
				<button
					onclick={copyPrompt}
					class="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
					title="Copy prompt"
				>
					📋
				</button>
			{/if}
			<button
				onclick={deleteJob}
				disabled={deleting}
				class="p-2 text-gray-500 hover:text-red-500 transition-colors"
				title="Delete"
			>
				🗑️
			</button>
		</div>
	</div>
</div>
