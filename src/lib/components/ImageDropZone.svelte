<!-- src/lib/components/ImageDropZone.svelte -->
<script lang="ts">
  import { Upload } from 'lucide-svelte';
  import { open } from '@tauri-apps/plugin-dialog';
  import { uploadImages } from '$lib/utils/commands';
  import type { UploadedFile } from '$lib/types';

  interface Props {
    files: UploadedFile[];
    onfilesadded: (files: UploadedFile[]) => void;
  }

  let { files, onfilesadded }: Props = $props();
  let dragging: boolean = $state(false);

  async function selectFiles() {
    const paths = await open({
      multiple: true,
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
    });
    if (paths && Array.isArray(paths)) {
      const remaining = 20 - files.length;
      const toUpload = paths.slice(0, remaining);
      if (toUpload.length > 0) {
        const uploaded = await uploadImages(toUpload);
        onfilesadded(uploaded);
      }
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragging = true;
  }

  function handleDragLeave() {
    dragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    selectFiles();
  }
</script>

<button
  type="button"
  onclick={selectFiles}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  class="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] p-8 text-center transition-all duration-[var(--transition-base)] hover:border-[var(--accent)] {dragging ? 'scale-[1.02] border-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)]' : ''}"
  aria-label="Drop images or click to select"
>
  <Upload size={24} class="text-[var(--muted)]" />
  <div>
    <p class="text-sm font-medium text-[var(--text)]">Click to select images</p>
    <p class="text-xs text-[var(--muted)] mt-1">JPEG, PNG, WebP, GIF · Max 10MB each · Up to 20 files</p>
  </div>
</button>
