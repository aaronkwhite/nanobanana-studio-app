<!-- src/lib/components/JobCard.svelte -->
<script lang="ts">
  import { slide } from 'svelte/transition';
  import { Loader, CheckCircle, XCircle, ChevronDown, Copy, Trash2, RotateCcw, Ban } from 'lucide-svelte';
  import { Card, ProgressBar, Tooltip, Button } from '$lib/components/ui';
  import ResultGallery from './ResultGallery.svelte';
  import { jobs } from '$lib/stores/jobs';
  import { deleteJob, getJob, retryJob } from '$lib/utils/commands';
  import { mockMode } from '$lib/utils/mock-mode';
  import { createMockJobItems } from '$lib/utils/mock-data';
  import { calculateCost } from '$lib/types';
  import type { Job, JobItem } from '$lib/types';
  import { celebrateBatchComplete } from '$lib/utils/confetti';
  import { get } from 'svelte/store';

  interface Props {
    job: Job;
  }

  let { job }: Props = $props();
  let expanded: boolean = $state(false);
  let items: JobItem[] = $state([]);
  let prevStatus: string = $state(job.status);

  const isActive = $derived(job.status === 'pending' || job.status === 'processing');
  const isCompleted = $derived(job.status === 'completed');
  const isFailed = $derived(job.status === 'failed');
  const canExpand = $derived(isCompleted || (isFailed && get(mockMode)));
  const progress = $derived(job.total_items > 0 ? (job.completed_items / job.total_items) * 100 : 0);
  const cost = $derived(calculateCost(job.output_size, job.total_items));

  $effect(() => {
    if (prevStatus !== 'completed' && job.status === 'completed') {
      celebrateBatchComplete();
    }
    prevStatus = job.status;
  });

  async function toggleExpand() {
    if (!canExpand) return;
    expanded = !expanded;
    if (expanded && items.length === 0) {
      if (get(mockMode)) {
        items = createMockJobItems(job.id);
      } else {
        const result = await getJob(job.id);
        items = result.items;
      }
    }
  }

  let confirmDelete: boolean = $state(false);

  async function handleDelete() {
    if (!confirmDelete) {
      confirmDelete = true;
      setTimeout(() => { confirmDelete = false; }, 3000);
      return;
    }
    await deleteJob(job.id);
    jobs.removeJob(job.id);
    confirmDelete = false;
  }

  let copied = $state(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(job.prompt);
    } catch {
      // Fallback for Tauri webview where clipboard API may be restricted
      const textarea = document.createElement('textarea');
      textarea.value = job.prompt;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    copied = true;
    setTimeout(() => { copied = false; }, 1500);
  }

  async function handleRetry() {
    await retryJob(job.id);
    jobs.updateJob({ ...job, status: 'processing' });
  }
</script>

<Card class="overflow-hidden">
  <button
    onclick={toggleExpand}
    class="flex w-full items-start gap-3 p-3 text-left {canExpand ? 'cursor-pointer' : 'cursor-default'}"
    disabled={!canExpand}
  >
    <!-- Status icon -->
    <div class="mt-0.5 flex-shrink-0">
      {#if isActive}
        <div class="animate-pulse-subtle text-[var(--accent)]">
          <Loader size={18} class="animate-spin" />
        </div>
      {:else if isCompleted}
        <CheckCircle size={18} class="text-[var(--success)]" />
      {:else if isFailed}
        <XCircle size={18} class="text-[var(--error)]" />
      {:else if job.status === 'cancelled'}
        <Ban size={18} class="text-[var(--muted)]" />
      {/if}
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="text-sm text-[var(--text)] line-clamp-2">{job.prompt}</p>
      <p class="text-xs text-[var(--muted)] mt-1">
        {job.output_size} · {job.aspect_ratio} · {job.temperature} · {job.total_items} item{job.total_items !== 1 ? 's' : ''}
      </p>

      {#if isActive && job.total_items > 0}
        <div class="flex items-center gap-2 mt-2">
          <ProgressBar value={job.completed_items} max={job.total_items} class="flex-1" />
          <span class="text-xs text-[var(--muted)] flex-shrink-0">{job.completed_items}/{job.total_items}</span>
        </div>
      {/if}

      {#if isFailed}
        <p class="text-xs text-[var(--error)] mt-1">Generation failed</p>
      {/if}
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 flex-shrink-0">
      {#if isFailed}
        <Tooltip text="Retry">
          <button
            onclick={(e) => { e.stopPropagation(); handleRetry(); }}
            class="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
            aria-label="Retry job"
          >
            <RotateCcw size={14} />
          </button>
        </Tooltip>
      {/if}
      <Tooltip text={copied ? 'Copied!' : 'Copy prompt'}>
        <button
          onclick={(e) => { e.stopPropagation(); handleCopy(); }}
          class="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors {copied ? 'text-[var(--success)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)]'}"
          aria-label="Copy prompt"
        >
          {#if copied}
            <CheckCircle size={14} />
          {:else}
            <Copy size={14} />
          {/if}
        </button>
      </Tooltip>
      <Tooltip text={confirmDelete ? 'Click again to confirm' : 'Delete'}>
        <button
          onclick={(e) => { e.stopPropagation(); handleDelete(); }}
          class="flex items-center justify-center rounded-[var(--radius-sm)] transition-all {confirmDelete ? 'h-7 px-2 bg-[var(--error-subtle)] text-[var(--error)]' : 'h-7 w-7 text-[var(--muted)] hover:text-[var(--error)] hover:bg-[var(--error-subtle)]'}"
          aria-label="Delete job"
        >
          {#if confirmDelete}
            <span class="text-xs font-medium">Confirm?</span>
          {:else}
            <Trash2 size={14} />
          {/if}
        </button>
      </Tooltip>
    </div>
  </button>

  {#if canExpand && !expanded}
    <div class="flex justify-center pb-1.5 -mt-1">
      <ChevronDown
        size={14}
        class="text-[var(--muted)] opacity-40"
      />
    </div>
  {/if}

  {#if expanded && items.length > 0}
    <div transition:slide={{ duration: 200 }}>
      <div class="border-t border-[var(--glass-border)]">
        <ResultGallery {items} />
      </div>
    </div>
  {/if}
</Card>
