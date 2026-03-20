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
  import { settings } from '$lib/stores/settings';
  import type { JobMode, UploadedFile, OutputSize, AspectRatio } from '$lib/types';
  import { get } from 'svelte/store';

  let mode: JobMode = $state('text-to-image');
  let prompts: string[] = $state([]);
  let i2iFiles: UploadedFile[] = $state([]);
  let i2iPrompt: string = $state('');
  let submitting: boolean = $state(false);

  const defaults = get(settings);
  let outputSize: OutputSize = $state(defaults.output_size);
  let aspectRatio: AspectRatio = $state(defaults.aspect_ratio);
  let temperature: number = $state(defaults.temperature);

  const itemCount = $derived(mode === 'text-to-image' ? prompts.length : i2iFiles.length);

  onMount(() => {
    config.load();
    jobs.loadJobs();
    jobs.startPolling();

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

<main class="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-4">
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
