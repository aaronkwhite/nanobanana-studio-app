<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Header, PromptForm, PromptInput, JobList } from '$lib/components';
  import ModelPicker from '$lib/components/ModelPicker.svelte';
  import ModePicker from '$lib/components/ModePicker.svelte';
  import CostPreview from '$lib/components/CostPreview.svelte';
  import { jobs } from '$lib/stores/jobs';
  import { credits } from '$lib/stores';
  import { apiGenerate } from '$lib/utils/commands';
  import { dev } from '$app/environment';
  import { settings } from '$lib/stores/settings';
  import { mockMode } from '$lib/utils/mock-mode';
  import { createMockJobs } from '$lib/utils/mock-data';
  import type { ApiJob, KieModel, ProcessingMode, OutputSize, AspectRatio } from '$lib/types';

  let prompts: string[] = $state([]);
  let submitting: boolean = $state(false);

  let outputSize: OutputSize = $state('1K');
  let aspectRatio: AspectRatio = $state('16:9');
  let temperature: number = $state(1);

  let selectedModel: KieModel = $state('nano-banana-pro');
  let selectedMode: ProcessingMode = $state('realtime');
  let submitError: string | null = $state(null);

  let settingsLoaded = false;
  $effect(() => {
    const s = $settings;
    if (!settingsLoaded && s.output_size) {
      outputSize = s.output_size;
      aspectRatio = s.aspect_ratio;
      temperature = s.temperature;
      settingsLoaded = true;
    }
  });

  onMount(() => {
    if ($mockMode) {
      // Load mock data instead of real API calls
      jobs.setJobs(createMockJobs() as unknown as ApiJob[]);
    } else {
      settings.load();
      jobs.loadJobs();
      jobs.startPolling();
    }

    return () => jobs.stopPolling();
  });

  async function handleSubmit() {
    if (submitting) return;
    submitting = true;
    submitError = null;

    try {
      const result = await apiGenerate({
        model: selectedModel,
        resolution: outputSize,
        prompts,
        aspect_ratio: aspectRatio,
        mode: selectedMode,
      });
      jobs.addJob(result.job);
      await credits.refresh();
      prompts = [];
    } catch (err) {
      submitError = err instanceof Error ? err.message : 'Generation failed. Please try again.';
      console.error('Failed to submit job:', err);
    } finally {
      submitting = false;
    }
  }


</script>

<Header />

<main class="px-6 py-6 flex flex-col gap-4">
  <ModelPicker bind:value={selectedModel} />
  <ModePicker bind:value={selectedMode} />
  <CostPreview
    model={selectedModel}
    resolution={outputSize}
    mode={selectedMode}
    count={prompts.length}
  />

  <PromptForm
    bind:outputSize
    bind:aspectRatio
    bind:temperature
    itemCount={prompts.length}
    {submitting}
    onsubmit={handleSubmit}
  >
    <PromptInput bind:prompts onsubmit={handleSubmit} />
  </PromptForm>

  {#if submitError}
    <p class="submit-error">{submitError}</p>
  {/if}

  <JobList />
</main>

<style>
  .submit-error { font-size: 0.875rem; color: var(--error, red); margin: 0; }
</style>

<!-- Dev tools: mock mode toggle -->
{#if dev}
<div class="fixed bottom-4 right-4 z-50">
  <button
    onclick={() => { mockMode.toggle(); window.location.reload(); }}
    class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg transition-colors {$mockMode ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]'}"
  >
    {$mockMode ? 'Mock Mode' : 'Live Mode'}
  </button>
</div>
{/if}
