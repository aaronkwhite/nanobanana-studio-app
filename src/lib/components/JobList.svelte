<!-- src/lib/components/JobList.svelte -->
<script lang="ts">
  import { slide } from 'svelte/transition';
  import { jobs } from '$lib/stores/jobs';
  import JobCard from './JobCard.svelte';
  import EmptyState from './EmptyState.svelte';
</script>

{#if $jobs.length === 0}
  <EmptyState />
{:else}
  <div class="flex flex-col gap-2">
    {#each $jobs as job (job.id)}
      <div transition:slide={{ duration: 200 }}>
        <JobCard {job} />
      </div>
    {/each}
  </div>
{/if}
