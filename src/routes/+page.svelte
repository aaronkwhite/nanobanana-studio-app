<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import {
		Header,
		SettingsModal,
		ModeSelector,
		TextToImageForm,
		ImageToImageForm,
		JobList
	} from '$lib/components';
	import { jobs } from '$lib/stores/jobs';
	import { config } from '$lib/stores/config';

	type Mode = 'text-to-image' | 'image-to-image';

	let mode: Mode = $state('text-to-image');
	let showSettings = $state(false);

	onMount(() => {
		// Load initial data
		config.load();
		jobs.loadJobs();
		jobs.startPolling();

		// Restore mode from localStorage
		if (browser) {
			const savedMode = localStorage.getItem('nanobanana-mode') as Mode | null;
			if (savedMode === 'text-to-image' || savedMode === 'image-to-image') {
				mode = savedMode;
			}
		}

		return () => {
			jobs.stopPolling();
		};
	});
</script>

<div class="min-h-screen flex flex-col">
	<Header bind:showSettings />

	<main class="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
		<ModeSelector {mode} onchange={(m) => (mode = m)} />

		{#if mode === 'text-to-image'}
			<TextToImageForm />
		{:else}
			<ImageToImageForm />
		{/if}

		<div class="pt-4">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Jobs</h2>
			<JobList />
		</div>
	</main>
</div>

<SettingsModal bind:open={showSettings} onclose={() => (showSettings = false)} />
