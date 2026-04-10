<script lang="ts">
  import type { ProcessingMode } from '$lib/types';

  let { value = $bindable('realtime') }: { value: ProcessingMode } = $props();
</script>

<div class="mode-picker">
  <label>Processing Mode</label>
  <div class="toggle">
    <button class:active={value === 'realtime'} onclick={() => value = 'realtime'}>
      Real-time
    </button>
    <button class:active={value === 'batch'} onclick={() => value = 'batch'}>
      Batch <span class="badge">20% off</span>
    </button>
  </div>
  {#if value === 'batch'}
    <p class="hint">Results may take minutes to hours. Credits are discounted.</p>
  {/if}
</div>

<style>
  .mode-picker { display: flex; flex-direction: column; gap: 0.5rem; }
  label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .toggle { display: flex; gap: 0; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  .toggle button {
    flex: 1;
    padding: 0.5rem;
    border: none;
    background: var(--bg-secondary);
    cursor: pointer;
    font-size: 0.875rem;
  }
  .toggle button.active { background: var(--accent); color: white; }
  .badge {
    font-size: 0.65rem;
    background: var(--success, green);
    color: white;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    margin-left: 0.25rem;
  }
  .hint { font-size: 0.75rem; opacity: 0.6; margin: 0; }
</style>
