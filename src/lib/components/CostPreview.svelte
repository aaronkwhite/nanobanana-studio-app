<script lang="ts">
  import { estimateCreditCost } from '$lib/types';
  import { credits } from '$lib/stores';
  import type { KieModel, OutputSize, ProcessingMode } from '$lib/types';

  let { model, resolution, mode, count }: {
    model: KieModel;
    resolution: OutputSize;
    mode: ProcessingMode;
    count: number;
  } = $props();

  let cost = $derived(estimateCreditCost(model, resolution, mode, count));
  let canAfford = $derived($credits >= cost);
</script>

<div class="cost-preview" class:cant-afford={!canAfford}>
  <span class="cost">
    This will use <strong>{cost} credit{cost !== 1 ? 's' : ''}</strong>
  </span>
  {#if !canAfford}
    <span class="warning">You have {$credits} credits — not enough.</span>
  {/if}
</div>

<style>
  .cost-preview { font-size: 0.875rem; }
  .cost-preview.cant-afford .cost { color: var(--error, red); }
  .warning { display: block; font-size: 0.8rem; opacity: 0.8; }
</style>
