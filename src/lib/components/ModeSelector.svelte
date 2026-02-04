<script lang="ts">
	import { browser } from '$app/environment';

	type Mode = 'text-to-image' | 'image-to-image';

	interface Props {
		mode: Mode;
		onchange: (mode: Mode) => void;
	}

	let { mode, onchange }: Props = $props();

	// Persist mode to localStorage
	$effect(() => {
		if (browser) {
			localStorage.setItem('nanobanana-mode', mode);
		}
	});
</script>

<div class="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
	<button
		onclick={() => onchange('text-to-image')}
		class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors {mode ===
		'text-to-image'
			? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
			: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
	>
		✏️ Text to Image
	</button>
	<button
		onclick={() => onchange('image-to-image')}
		class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors {mode ===
		'image-to-image'
			? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
			: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
	>
		🖼️ Image to Image
	</button>
</div>
