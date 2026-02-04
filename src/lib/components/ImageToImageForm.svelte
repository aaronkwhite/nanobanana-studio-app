<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { open } from '@tauri-apps/plugin-dialog';
	import { jobs, OUTPUT_SIZES, ASPECT_RATIOS, TEMPERATURES, calculateCost } from '$lib/stores/jobs';
	import { config } from '$lib/stores/config';

	interface UploadedFile {
		id: string;
		path: string;
		name: string;
	}

	let files: UploadedFile[] = $state([]);
	let prompt = $state('');
	let outputSize: '1K' | '2K' | '4K' = $state('1K');
	let aspectRatio: keyof typeof ASPECT_RATIOS = $state('1:1');
	let temperature = $state(1);
	let submitting = $state(false);
	let dragging = $state(false);

	async function selectFiles() {
		const selected = await open({
			multiple: true,
			filters: [
				{
					name: 'Images',
					extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif']
				}
			]
		});

		if (selected) {
			const paths = Array.isArray(selected) ? selected : [selected];
			await uploadFiles(paths);
		}
	}

	async function uploadFiles(paths: string[]) {
		try {
			const uploaded = await invoke<UploadedFile[]>('upload_images', { files: paths });
			files = [...files, ...uploaded].slice(0, 20); // Max 20 files
		} catch (error) {
			console.error('Failed to upload files:', error);
		}
	}

	function removeFile(id: string) {
		files = files.filter((f) => f.id !== id);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragging = true;
	}

	function handleDragLeave() {
		dragging = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;

		// In Tauri, drag and drop doesn't provide file paths directly
		// Users should use the file picker instead
		// For now, just trigger the file picker
		await selectFiles();
	}

	async function submitJob() {
		if (files.length === 0 || !prompt.trim()) return;
		if (!$config.has_key) return;

		submitting = true;
		try {
			const result = await invoke<{ job: any; items: any[] }>('create_i2i_job', {
				request: {
					prompt: prompt.trim(),
					image_paths: files.map((f) => f.path),
					output_size: outputSize,
					temperature,
					aspect_ratio: aspectRatio
				}
			});
			jobs.addJob(result.job);
			files = [];
			prompt = '';
		} catch (error) {
			console.error('Failed to create job:', error);
		} finally {
			submitting = false;
		}
	}

	const totalCount = $derived(files.length);
	const estimatedCost = $derived(calculateCost(outputSize, totalCount));
</script>

<div class="card p-4 space-y-4">
	<!-- Drop Zone -->
	<div
		class="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
      {dragging
			? 'border-banana-500 bg-banana-50 dark:bg-banana-900/20'
			: 'border-gray-300 dark:border-gray-600 hover:border-banana-400'}"
		role="button"
		tabindex="0"
		onclick={selectFiles}
		onkeydown={(e) => e.key === 'Enter' && selectFiles()}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
	>
		<div class="text-4xl mb-2">📁</div>
		<p class="text-gray-600 dark:text-gray-400">
			Drop images here or <span class="text-banana-600 font-medium">browse</span>
		</p>
		<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">JPEG, PNG, WebP, GIF · Max 10MB each · Max 20 files</p>
	</div>

	{#if files.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each files as file}
				<div
					class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
				>
					<span class="max-w-[150px] truncate">{file.name}</span>
					<button
						onclick={() => removeFile(file.id)}
						class="text-gray-500 hover:text-red-500 transition-colors"
					>
						×
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<div>
		<textarea
			bind:value={prompt}
			placeholder="Describe the transformation..."
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
				Select images to transform
			{/if}
		</span>

		<button
			onclick={submitJob}
			disabled={totalCount === 0 || !prompt.trim() || !$config.has_key || submitting}
			class="btn btn-primary"
		>
			{#if submitting}
				Transforming...
			{:else if !$config.has_key}
				API Key Required
			{:else}
				Transform {totalCount > 0 ? `(${totalCount})` : ''}
			{/if}
		</button>
	</div>
</div>
