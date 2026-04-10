<script lang="ts">
  import { KIE_MODELS } from '$lib/types';
  import type { KieModel } from '$lib/types';

  let { value = $bindable('nano-banana-pro') }: { value: KieModel } = $props();
</script>

<div class="model-picker">
  <span class="group-label">Model</span>
  <div class="options">
    {#each Object.entries(KIE_MODELS) as [id, info]}
      <button
        type="button"
        class="option"
        class:selected={value === id}
        onclick={() => value = id as KieModel}
      >
        <span class="name">{info.label}</span>
        <span class="desc">{info.description}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .model-picker { display: flex; flex-direction: column; gap: 0.5rem; }
  .group-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .options { display: flex; flex-direction: column; gap: 0.25rem; }
  .option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-secondary);
    cursor: pointer;
    text-align: left;
  }
  .option.selected { border-color: var(--accent); background: var(--accent-subtle, #f0f0ff); }
  .name { font-size: 0.875rem; font-weight: 500; }
  .desc { font-size: 0.75rem; opacity: 0.6; }
</style>
