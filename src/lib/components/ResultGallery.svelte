<!-- src/lib/components/ResultGallery.svelte -->
<script lang="ts">
  import { Download } from 'lucide-svelte';
  import { getImage } from '$lib/utils/commands';
  import type { JobItem } from '$lib/types';

  interface Props {
    items: JobItem[];
  }

  let { items }: Props = $props();
  let images: Map<string, string> = $state(new Map());

  $effect(() => {
    items.forEach(async (item) => {
      if (item.output_image_path && !images.has(item.id)) {
        const dataUrl = await getImage(item.output_image_path);
        images = new Map(images).set(item.id, dataUrl);
      }
    });
  });
</script>

<div class="grid grid-cols-2 gap-2 p-3 pt-0">
  {#each items as item}
    <div class="group relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] aspect-square">
      {#if images.has(item.id)}
        <img
          src={images.get(item.id)}
          alt={item.input_prompt ?? 'Generated image'}
          class="h-full w-full object-cover"
        />
        <div class="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--transition-fast)]">
          <div class="flex w-full items-center justify-between p-2">
            <span class="text-xs text-white truncate max-w-[70%]">{item.input_prompt ?? ''}</span>
            <button
              class="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
              aria-label="Download image"
            >
              <Download size={12} />
            </button>
          </div>
        </div>
      {:else if item.status === 'failed'}
        <div class="flex h-full items-center justify-center text-xs text-[var(--error)]">
          {item.error ?? 'Failed'}
        </div>
      {:else}
        <div class="flex h-full items-center justify-center">
          <div class="h-5 w-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"></div>
        </div>
      {/if}
    </div>
  {/each}
</div>
