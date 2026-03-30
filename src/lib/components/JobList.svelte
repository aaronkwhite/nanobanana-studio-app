<!-- src/lib/components/JobList.svelte -->
<script lang="ts">
  import { slide } from 'svelte/transition';
  import { jobs, activeJobsCount } from '$lib/stores/jobs';
  import { Badge } from '$lib/components/ui';
  import JobCard from './JobCard.svelte';
  import EmptyState from './EmptyState.svelte';
</script>

{#if $jobs.length === 0}
  <EmptyState />
{:else}
  <hr class="border-t border-[var(--glass-border)] mb-3" />
  <div class="flex items-center justify-between mb-2">
    <span class="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Generations</span>
    {#if $activeJobsCount > 0}
      <Badge variant="accent">{$activeJobsCount} active</Badge>
    {/if}
  </div>
  <div class="flex flex-col gap-2">
    {#each $jobs as job (job.id)}
      <div transition:slide={{ duration: 200 }}>
        <JobCard {job} />
      </div>
    {/each}
  </div>
{/if}
