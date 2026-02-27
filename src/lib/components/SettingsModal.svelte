<script lang="ts">
	import { config } from '$lib/stores/config';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open = $bindable(), onclose }: Props = $props();

	let activeTab: 'api' | 'about' | 'support' = $state('api');
	let apiKey = $state('');
	let showKey = $state(false);
	let saving = $state(false);
	let error = $state('');

	async function saveApiKey() {
		if (!apiKey.startsWith('AI')) {
			error = "API key must start with 'AI'";
			return;
		}

		saving = true;
		error = '';
		try {
			await config.save(apiKey);
			apiKey = '';
			showKey = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save API key';
		} finally {
			saving = false;
		}
	}

	async function removeApiKey() {
		await config.remove();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onclose();
		}}
		role="dialog"
		aria-modal="true"
	>
		<div class="card w-full max-w-md mx-4 p-0 overflow-hidden">
			<div class="flex border-b border-gray-200 dark:border-gray-700">
				<button
					onclick={() => (activeTab = 'api')}
					class="flex-1 px-4 py-3 text-sm font-medium transition-colors {activeTab === 'api'
						? 'bg-banana-50 dark:bg-banana-900/30 text-banana-700 dark:text-banana-300 border-b-2 border-banana-500'
						: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}"
				>
					API Key
				</button>
				<button
					onclick={() => (activeTab = 'about')}
					class="flex-1 px-4 py-3 text-sm font-medium transition-colors {activeTab === 'about'
						? 'bg-banana-50 dark:bg-banana-900/30 text-banana-700 dark:text-banana-300 border-b-2 border-banana-500'
						: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}"
				>
					About
				</button>
				<button
					onclick={() => (activeTab = 'support')}
					class="flex-1 px-4 py-3 text-sm font-medium transition-colors {activeTab === 'support'
						? 'bg-banana-50 dark:bg-banana-900/30 text-banana-700 dark:text-banana-300 border-b-2 border-banana-500'
						: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}"
				>
					Support
				</button>
			</div>

			<div class="p-6">
				{#if activeTab === 'api'}
					<div class="space-y-4">
						<div>
							<label for="api-key-input" class="block text-sm font-medium mb-2">Google Gemini API Key</label>
							{#if $config.has_key}
								<div class="flex items-center gap-2">
									<span class="input flex-1 bg-gray-100 dark:bg-gray-700">{$config.masked}</span>
									<button onclick={removeApiKey} class="btn btn-danger text-sm"> Remove </button>
								</div>
							{:else}
								<div class="relative">
									<input
										id="api-key-input"
										type={showKey ? 'text' : 'password'}
										bind:value={apiKey}
										placeholder="AIza..."
										class="input pr-10"
									/>
									<button
										onclick={() => (showKey = !showKey)}
										class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
									>
										{showKey ? '🙈' : '👁️'}
									</button>
								</div>
							{/if}
						</div>

						{#if error}
							<p class="text-sm text-red-500">{error}</p>
						{/if}

						{#if !$config.has_key}
							<button onclick={saveApiKey} disabled={saving || !apiKey} class="btn btn-primary w-full">
								{saving ? 'Saving...' : 'Save API Key'}
							</button>
						{/if}

						<p class="text-xs text-gray-500 dark:text-gray-400">
							Get your API key from
							<a
								href="https://makersuite.google.com/app/apikey"
								target="_blank"
								class="text-banana-600 hover:underline"
							>
								Google AI Studio
							</a>
						</p>
					</div>
				{:else if activeTab === 'about'}
					<div class="space-y-4 text-center">
						<div class="text-5xl">🍌</div>
						<h2 class="text-xl font-bold">Nanobanana Studio</h2>
						<p class="text-gray-600 dark:text-gray-400">Batch image generation powered by Google Gemini</p>
						<p class="text-sm text-gray-500">Version 0.1.0</p>
					</div>
				{:else if activeTab === 'support'}
					<div class="space-y-4 text-center">
						<p class="text-gray-600 dark:text-gray-400">Enjoying Nanobanana Studio?</p>
						<p class="text-sm text-gray-500">Consider supporting the project!</p>
						<div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
							<p class="text-sm font-medium mb-2">Buy Me a Coffee</p>
							<div class="w-32 h-32 mx-auto bg-white rounded-lg flex items-center justify-center">
								☕
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="px-6 pb-6">
				<button onclick={onclose} class="btn btn-secondary w-full"> Close </button>
			</div>
		</div>
	</div>
{/if}
