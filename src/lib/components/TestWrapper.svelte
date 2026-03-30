<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<Tooltip.Provider delayDuration={300}>
  {@render children()}
</Tooltip.Provider>
