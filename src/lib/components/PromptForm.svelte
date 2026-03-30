<!-- src/lib/components/PromptForm.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Select, Button } from '$lib/components/ui';
  import { config } from '$lib/stores/config';
  import { calculateCost } from '$lib/types';
  import type { OutputSize, AspectRatio } from '$lib/types';
  import { sizeOptions, ratioOptions, tempOptions } from '$lib/utils/options';
  import { Sparkles } from 'lucide-svelte';

  interface Props {
    itemCount: number;
    submitting: boolean;
    onsubmit: () => void;
    children: Snippet;
    outputSize: OutputSize;
    aspectRatio: AspectRatio;
    temperature: number;
  }

  let { itemCount, submitting, onsubmit, children, outputSize = $bindable(), aspectRatio = $bindable(), temperature = $bindable() }: Props = $props();

  const cost = $derived(calculateCost(outputSize, itemCount));

</script>

<div class="glass relative z-30 flex flex-col gap-3 p-4 overflow-visible">
  {@render children()}

  <div class="grid grid-cols-3 gap-2">
    <Select options={sizeOptions} bind:value={outputSize} />
    <Select options={ratioOptions} bind:value={aspectRatio} />
    <Select
      options={tempOptions}
      value={String(temperature)}
      onchange={(v) => { temperature = Number(v); }}
    />
  </div>

  <div class="flex items-center justify-between">
    <span class="text-xs text-[var(--muted)]">
      {#if itemCount > 0}
        {itemCount} item{itemCount !== 1 ? 's' : ''} · ~${cost.toFixed(2)}
      {/if}
    </span>
    <Button
      onclick={onsubmit}
      disabled={!$config.has_key || itemCount === 0 || submitting}
      size="md"
    >
      <Sparkles size={16} />
      {submitting ? 'Generating...' : 'Generate'}
    </Button>
  </div>
</div>
