<script lang="ts">
  import { Dialog as BitsDialog } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    onclose: () => void;
    title?: string;
    children: Snippet;
  }

  let { open = $bindable(), onclose, title, children }: Props = $props();
</script>

<BitsDialog.Root bind:open onOpenChange={(o) => { if (!o) onclose(); }}>
  <BitsDialog.Portal>
    <BitsDialog.Overlay class="fixed inset-0 z-50 glass-overlay" />
    <BitsDialog.Content
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 glass rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-lg)]"
    >
      {#if title}
        <BitsDialog.Title class="text-base font-semibold text-[var(--text)] mb-4">{title}</BitsDialog.Title>
      {/if}
      {@render children()}
    </BitsDialog.Content>
  </BitsDialog.Portal>
</BitsDialog.Root>
