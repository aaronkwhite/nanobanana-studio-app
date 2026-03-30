<!-- src/lib/components/ImageChip.svelte -->
<script lang="ts">
  import { X } from 'lucide-svelte';
  import { getImage } from '$lib/utils/commands';
  import type { UploadedFile } from '$lib/types';

  interface Props {
    file: UploadedFile;
    onremove: () => void;
  }

  let { file, onremove }: Props = $props();
  let thumbnail: string = $state('');

  $effect(() => {
    getImage(file.path).then(url => { thumbnail = url; }).catch(() => {});
  });
</script>

<span class="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1.5 text-xs">
  {#if thumbnail}
    <img src={thumbnail} alt={file.name} class="h-6 w-6 rounded object-cover flex-shrink-0" />
  {:else}
    <span class="h-6 w-6 rounded bg-[var(--border)] flex-shrink-0"></span>
  {/if}
  <span class="max-w-[150px] truncate text-[var(--text)]">{file.name}</span>
  <button
    onclick={onremove}
    class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--error)] hover:text-white text-[var(--muted)] transition-colors"
    aria-label="Remove {file.name}"
  >
    <X size={10} />
  </button>
</span>
