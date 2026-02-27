<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { jobs, OUTPUT_SIZES, ASPECT_RATIOS, TEMPERATURES, calculateCost } from '$lib/stores/jobs';
	import { config } from '$lib/stores/config';

	let prompts: string[] = $state([]);
	let currentPrompt = $state('');
	let outputSize: '0.5K' | '1K' | '2K' | '4K' = $state('1K');
	let aspectRatio: keyof typeof ASPECT_RATIOS = $state('1:1');
	let temperature = $state(1);
	let submitting = $state(false);

	let textareaEl: HTMLTextAreaElement | null = $state(null);

	function autoResize() {
		if (textareaEl) {
			textareaEl.style.height = 'auto';
			textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (currentPrompt.trim()) {
				prompts = [...prompts, currentPrompt.trim()];
				currentPrompt = '';
				if (textareaEl) {
					textareaEl.style.height = 'auto';
				}
			}
		} else if (e.key === 'Enter' && e.shiftKey) {
			e.preventDefault();
			submitJob();
		}
	}

	function removePrompt(index: number) {
		prompts = prompts.filter((_, i) => i !== index);
	}

	async function submitJob() {
		const allPrompts = currentPrompt.trim() ? [...prompts, currentPrompt.trim()] : prompts;

		if (allPrompts.length === 0) return;
		if (!$config.has_key) return;

		submitting = true;
		try {
			const result = await invoke<{ job: any; items: any[] }>('create_t2i_job', {
				request: {
					prompts: allPrompts,
					output_size: outputSize,
					temperature,
					aspect_ratio: aspectRatio
				}
			});
			jobs.addJob(result.job);
			prompts = [];
			currentPrompt = '';
			if (textareaEl) {
				textareaEl.style.height = 'auto';
			}
		} catch (error) {
			console.error('Failed to create job:', error);
		} finally {
			submitting = false;
		}
	}

	const totalCount = $derived(prompts.length + (currentPrompt.trim() ? 1 : 0));
	const estimatedCost = $derived(calculateCost(outputSize, totalCount));
</script>

<div class="card p-4 space-y-4">
	{#if prompts.length > 0}
		<div class="space-y-2">
			<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Prompt Queue</label>
			<div class="flex flex-wrap gap-2">
				{#each prompts as prompt, i}
					<div
						class="flex items-center gap-2 px-3 py-1.5 bg-banana-100 dark:bg-banana-900/30 rounded-full text-sm"
					>
						<span class="max-w-[200px] truncate">{prompt}</span>
						<button
							onclick={() => removePrompt(i)}
							class="text-gray-500 hover:text-red-500 transition-colors"
						>
							×
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div>
		<textarea
			bind:this={textareaEl}
			bind:value={currentPrompt}
			oninput={autoResize}
			onkeydown={handleKeydown}
			placeholder="Enter a prompt... (Enter to queue, Shift+Enter to generate)"
			class="input resize-none min-h-[80px]"
			disabled={submitting}
		></textarea>
	</div>

	<div class="flex flex-wrap gap-3">
		<div class="flex-1 min-w-[120px]">
			<label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Size</label>
			<select bind:value={outputSize} class="select text-sm">
				{#each Object.entries(OUTPUT_SIZES) as [value, { label }]}
					<option {value}>{label}</option>
				{/each}
			</select>
		</div>

		<div class="flex-1 min-w-[120px]">
			<label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Aspect Ratio</label>
			<select bind:value={aspectRatio} class="select text-sm">
				{#each Object.entries(ASPECT_RATIOS) as [value, label]}
					<option {value}>{value} ({label})</option>
				{/each}
			</select>
		</div>

		<div class="flex-1 min-w-[120px]">
			<label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Creativity</label>
			<select bind:value={temperature} class="select text-sm">
				{#each TEMPERATURES as temp}
					<option value={temp}>
						{temp === 0 ? 'Precise' : temp === 2 ? 'Creative' : temp}
					</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="flex items-center justify-between">
		<span class="text-sm text-gray-500 dark:text-gray-400">
			{#if totalCount > 0}
				{totalCount} image{totalCount !== 1 ? 's' : ''} · ~${estimatedCost.toFixed(2)}
			{:else}
				Enter prompts to generate images
			{/if}
		</span>

		<button
			onclick={submitJob}
			disabled={totalCount === 0 || !$config.has_key || submitting}
			class="btn btn-primary"
		>
			{#if submitting}
				Generating...
			{:else if !$config.has_key}
				API Key Required
			{:else}
				Generate {totalCount > 0 ? `(${totalCount})` : ''}
			{/if}
		</button>
	</div>
</div>
