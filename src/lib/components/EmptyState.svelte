<script lang="ts">
  import { ImagePlus } from 'lucide-svelte';
</script>

<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-subtle)] mb-4">
    <ImagePlus size={28} class="text-[var(--accent)]" />
  </div>
  <p class="text-sm font-medium text-[var(--text)]">No jobs yet</p>
  <p class="text-xs text-[var(--muted)] mt-1">Create a prompt above to get started</p>
</div>
