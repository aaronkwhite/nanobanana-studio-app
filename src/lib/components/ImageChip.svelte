<!-- src/lib/components/ImageChip.svelte -->
<script lang="ts">
  import { X } from 'lucide-svelte';
  import type { UploadedFile } from '$lib/types';

  interface Props {
    file: UploadedFile;
    onremove: () => void;
  }

  let { file, onremove }: Props = $props();
</script>

<span class="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1.5 text-xs">
  <span class="max-w-[150px] truncate text-[var(--text)]">{file.name}</span>
  <button
    onclick={onremove}
    class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--error)] hover:text-white text-[var(--muted)] transition-colors"
    aria-label="Remove {file.name}"
  >
    <X size={10} />
  </button>
</span>
