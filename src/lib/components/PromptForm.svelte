<!-- src/lib/components/PromptForm.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Select, Button } from '$lib/components/ui';
  import { config } from '$lib/stores/config';
  import { settings } from '$lib/stores/settings';
  import { calculateCost, OUTPUT_SIZES, ASPECT_RATIOS, TEMPERATURES } from '$lib/types';
  import type { OutputSize, AspectRatio } from '$lib/types';
  import { Sparkles } from 'lucide-svelte';
  import { get } from 'svelte/store';

  interface Props {
    itemCount: number;
    submitting: boolean;
    onsubmit: () => void;
    children: Snippet;
  }

  let { itemCount, submitting, onsubmit, children }: Props = $props();

  const defaults = get(settings);
  let outputSize: OutputSize = $state(defaults.output_size);
  let aspectRatio: AspectRatio = $state(defaults.aspect_ratio);
  let temperature: number = $state(defaults.temperature);

  const cost = $derived(calculateCost(outputSize, itemCount));

  const sizeOptions = Object.entries(OUTPUT_SIZES).map(([value, { label }]) => ({ value: value as OutputSize, label }));
  const ratioOptions = Object.entries(ASPECT_RATIOS).map(([value, label]) => ({ value: value as AspectRatio, label }));
  const tempOptions = TEMPERATURES.map((t) => ({ value: String(t), label: t === 0 ? 'Precise' : t === 2 ? 'Creative' : String(t) }));

  export function getConfig() {
    return { outputSize, aspectRatio, temperature };
  }
</script>

<div class="glass flex flex-col gap-3 p-4">
  {@render children()}

  <div class="flex items-center gap-2">
    <Select options={sizeOptions} bind:value={outputSize} class="flex-1" />
    <Select options={ratioOptions} bind:value={aspectRatio} class="flex-1" />
    <Select
      options={tempOptions}
      value={String(temperature)}
      onchange={(v) => { temperature = Number(v); }}
      class="flex-1"
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
