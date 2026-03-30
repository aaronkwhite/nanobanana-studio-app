<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import JobCard from './JobCard.svelte';
  import type { Job } from '$lib/types';

  let { job }: { job: Job } = $props();
</script>

<Tooltip.Provider delayDuration={300}>
  <JobCard {job} />
</Tooltip.Provider>
