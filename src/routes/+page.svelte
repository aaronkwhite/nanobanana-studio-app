<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { Header, ModeSelector, PromptForm, PromptInput, ImageDropZone, ImageChip, JobList } from '$lib/components';
  import { Textarea } from '$lib/components/ui';
  import { jobs } from '$lib/stores/jobs';
  import { config } from '$lib/stores/config';
  import { createT2IJob, createI2IJob } from '$lib/utils/commands';
  import { invoke } from '@tauri-apps/api/core';
  import { dev } from '$app/environment';
  import { settings } from '$lib/stores/settings';
  import { mockMode } from '$lib/utils/mock-mode';
  import { createMockJobs } from '$lib/utils/mock-data';
  import type { JobMode, UploadedFile, OutputSize, AspectRatio } from '$lib/types';
  let mode: JobMode = $state('text-to-image');
  let prompts: string[] = $state([]);
  let i2iFiles: UploadedFile[] = $state([]);
  let i2iPrompt: string = $state('');
  let submitting: boolean = $state(false);

  let outputSize: OutputSize = $state('1K');
  let aspectRatio: AspectRatio = $state('16:9');
  let temperature: number = $state(1);

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

  const itemCount = $derived(mode === 'text-to-image' ? prompts.length : i2iFiles.length);

  onMount(() => {
    if ($mockMode) {
      // Load mock data instead of real API calls
      jobs.setJobs(createMockJobs());
    } else {
      config.load();
      settings.load();
      jobs.loadJobs();
      jobs.startPolling();
    }

    if (browser) {
      const stored = localStorage.getItem('nanobanana-mode');
      if (stored === 'text-to-image' || stored === 'image-to-image') {
        mode = stored;
      }
    }

    return () => jobs.stopPolling();
  });

  async function handleSubmit() {
    if (submitting) return;
    submitting = true;

    try {

      if (mode === 'text-to-image') {
        const result = await createT2IJob({
          prompts,
          output_size: outputSize,
          temperature,
          aspect_ratio: aspectRatio,
        });
        jobs.addJob(result.job);
        invoke('submit_batch', { jobId: result.job.id }).catch((err) => {
          console.error('Failed to submit batch:', err);
          jobs.updateJob({ ...result.job, status: 'failed' });
        });
        prompts = [];
      } else {
        const result = await createI2IJob({
          prompt: i2iPrompt,
          image_paths: i2iFiles.map((f) => f.path),
          output_size: outputSize,
          temperature,
          aspect_ratio: aspectRatio,
        });
        jobs.addJob(result.job);
        invoke('submit_batch', { jobId: result.job.id }).catch((err) => {
          console.error('Failed to submit batch:', err);
          jobs.updateJob({ ...result.job, status: 'failed' });
        });
        i2iFiles = [];
        i2iPrompt = '';
      }
    } catch (err) {
      console.error('Failed to submit job:', err);
    } finally {
      submitting = false;
    }
  }

  function removeFile(id: string) {
    i2iFiles = i2iFiles.filter((f) => f.id !== id);
  }
</script>

<Header />

<main class="px-6 py-6 flex flex-col gap-4">
  <ModeSelector bind:mode />

  <PromptForm
    bind:outputSize
    bind:aspectRatio
    bind:temperature
    {itemCount}
    {submitting}
    onsubmit={handleSubmit}
  >
    {#if mode === 'text-to-image'}
      <PromptInput bind:prompts onsubmit={handleSubmit} />
    {:else}
      <div class="flex flex-col gap-2">
        <ImageDropZone
          files={i2iFiles}
          onfilesadded={(files) => { i2iFiles = [...i2iFiles, ...files]; }}
        />
        {#if i2iFiles.length > 0}
          <div class="flex flex-wrap gap-1.5">
            {#each i2iFiles as file}
              <ImageChip {file} onremove={() => removeFile(file.id)} />
            {/each}
          </div>
        {/if}
        <Textarea
          bind:value={i2iPrompt}
          placeholder="Describe the transformation..."
          autoResize
        />
      </div>
    {/if}
  </PromptForm>

  <JobList />
</main>

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
