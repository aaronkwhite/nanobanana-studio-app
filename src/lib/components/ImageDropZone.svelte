<!-- src/lib/components/ImageDropZone.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Upload } from 'lucide-svelte';
  import { open } from '@tauri-apps/plugin-dialog';
  import { getCurrentWebview } from '@tauri-apps/api/webview';
  import { uploadImages } from '$lib/utils/commands';
  import { toastError } from '$lib/stores/toasts';
  import type { UploadedFile } from '$lib/types';

  interface Props {
    files: UploadedFile[];
    onfilesadded: (files: UploadedFile[]) => void;
  }

  let { files, onfilesadded }: Props = $props();
  let dragging: boolean = $state(false);

  onMount(() => {
    const webview = getCurrentWebview();
    const unlistenPromise = webview.onDragDropEvent((event) => {
      if (event.payload.type === 'over') {
        dragging = true;
      } else if (event.payload.type === 'drop') {
        dragging = false;
        if (event.payload.paths.length > 0) {
          handleDroppedFiles(event.payload.paths);
        }
      } else {
        dragging = false;
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  });

  async function handleDroppedFiles(paths: string[]) {
    const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const imagePaths = paths.filter((p) => {
      const ext = p.split('.').pop()?.toLowerCase() ?? '';
      return imageExts.includes(ext);
    });
    if (imagePaths.length === 0) return;

    const remaining = 20 - files.length;
    const toUpload = imagePaths.slice(0, remaining);
    if (toUpload.length > 0) {
      try {
        const uploaded = await uploadImages(toUpload);
        onfilesadded(uploaded);
      } catch (err) {
        console.error('Upload failed:', err);
        toastError(err, 'Image upload failed');
      }
    }
  }

  async function selectFiles() {
    const paths = await open({
      multiple: true,
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
    });
    if (paths && Array.isArray(paths)) {
      const remaining = 20 - files.length;
      const toUpload = paths.slice(0, remaining);
      if (toUpload.length > 0) {
        try {
          const uploaded = await uploadImages(toUpload);
          onfilesadded(uploaded);
        } catch (err) {
          console.error('Upload failed:', err);
          toastError(err, 'Image upload failed');
        }
      }
    }
  }
</script>

<button
  type="button"
  onclick={selectFiles}
  class="drop-zone flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed p-8 text-center transition-colors duration-[var(--transition-base)]"
  class:drop-zone--active={dragging}
  aria-label="Drop images or click to select"
>
  <Upload size={24} class="text-[var(--muted)]" />
  <div>
    <p class="text-sm font-medium text-[var(--text)]">Drop images or click to select</p>
    <p class="text-xs text-[var(--muted)] mt-1">JPEG, PNG, WebP, GIF · Max 10MB each · Up to 20 files</p>
  </div>
</button>

<style>
  .drop-zone {
    border-color: var(--border);
    background-clip: padding-box;
  }
  .drop-zone:hover {
    border-color: var(--accent);
    background: var(--accent-subtle);
  }
  .drop-zone--active {
    border-color: var(--accent);
    background: var(--accent-glow);
  }
</style>
