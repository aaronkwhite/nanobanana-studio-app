<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme';
  import { Tooltip } from 'bits-ui';

  let { children } = $props();

  onMount(() => {
    theme.set($theme);
  });
</script>

<svelte:head>
  <title>Nana Studio</title>
  <meta name="description" content="Peel. Prompt. Produce. Batch media generation powered by Gemini." />
</svelte:head>

<Tooltip.Provider delayDuration={300}>
  <div class="min-h-screen">
    {@render children()}
  </div>
</Tooltip.Provider>
