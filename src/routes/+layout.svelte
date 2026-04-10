<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme';
  import { Tooltip } from 'bits-ui';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth, isLoggedIn, credits } from '$lib/stores';
  import CreditBalance from '$lib/components/CreditBalance.svelte';

  let { children } = $props();
  let loading = $state(true);

  onMount(async () => {
    theme.set($theme);
    const state = await auth.load();
    if (!state && $page.url.pathname !== '/login') {
      await goto('/login');
      return;
    }
    if (state) {
      await credits.refresh();
    }
    loading = false;
  });
</script>

<svelte:head>
  <title>Nana Studio</title>
  <meta name="description" content="Peel. Prompt. Produce. Batch media generation powered by Gemini." />
</svelte:head>

<Tooltip.Provider delayDuration={300}>
  <div class="min-h-screen">
    {#if !loading}
      {#if $isLoggedIn}
        <header class="app-header">
          <span class="app-title">Nana Studio</span>
          <CreditBalance />
        </header>
      {/if}
      {@render children()}
    {/if}
  </div>
</Tooltip.Provider>

<style>
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }
  .app-title { font-size: 0.875rem; font-weight: 600; }
</style>
