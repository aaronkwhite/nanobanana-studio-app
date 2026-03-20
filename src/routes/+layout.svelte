<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme';

  let { children } = $props();

  onMount(() => {
    theme.set($theme);
  });
</script>

<svelte:head>
  <title>Nanobanana Studio</title>
  <meta name="description" content="Batch image generation powered by Gemini" />
</svelte:head>

<div class="min-h-screen">
  {@render children()}
</div>
