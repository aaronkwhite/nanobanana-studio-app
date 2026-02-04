<script lang="ts">
	import { jobs } from '$lib/stores/jobs';
	import JobCard from './JobCard.svelte';
</script>

<div class="space-y-3">
	{#if $jobs.length === 0}
		<div class="card p-8 text-center">
			<div class="text-4xl mb-3">🍌</div>
			<p class="text-gray-500 dark:text-gray-400">No jobs yet. Start generating!</p>
		</div>
	{:else}
		{#each $jobs as job (job.id)}
			<JobCard {job} />
		{/each}
	{/if}
</div>
