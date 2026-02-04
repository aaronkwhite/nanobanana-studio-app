<script lang="ts">
	import { theme, type Theme } from '$lib/stores/theme';
	import { activeJobsCount } from '$lib/stores/jobs';
	import { config } from '$lib/stores/config';

	let showSettings = false;

	function getThemeIcon(t: Theme): string {
		switch (t) {
			case 'light':
				return '☀️';
			case 'dark':
				return '🌙';
			case 'system':
				return '💻';
		}
	}

	export { showSettings };
</script>

<header class="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
	<div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<span class="text-2xl">🍌</span>
			<h1 class="text-xl font-bold text-gray-900 dark:text-white">Nanobanana Studio</h1>
		</div>

		<div class="flex items-center gap-4">
			{#if $activeJobsCount > 0}
				<span
					class="px-2 py-1 text-sm bg-banana-100 dark:bg-banana-900 text-banana-800 dark:text-banana-200 rounded-full"
				>
					{$activeJobsCount} active
				</span>
			{/if}

			{#if !$config.has_key}
				<span class="text-sm text-amber-600 dark:text-amber-400"> ⚠️ API key required </span>
			{/if}

			<button
				onclick={() => theme.toggle()}
				class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
				title="Toggle theme ({$theme})"
			>
				{getThemeIcon($theme)}
			</button>

			<button
				onclick={() => (showSettings = true)}
				class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
				title="Settings"
			>
				⚙️
			</button>
		</div>
	</div>
</header>
