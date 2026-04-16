<!-- src/lib/components/ui/Toaster.svelte -->
<script lang="ts">
  import { X, AlertCircle, CheckCircle2, Info } from 'lucide-svelte';
  import { toasts } from '$lib/stores/toasts';
</script>

<div
  class="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
  role="region"
  aria-label="Notifications"
  aria-live="polite"
>
  {#each $toasts as toast (toast.id)}
    <div
      class="toast toast--{toast.variant} pointer-events-auto flex max-w-sm items-start gap-2 rounded-[var(--radius-md)] border px-3 py-2 shadow-lg"
      role={toast.variant === 'error' ? 'alert' : 'status'}
    >
      <span class="mt-0.5 flex-shrink-0">
        {#if toast.variant === 'error'}
          <AlertCircle size={16} />
        {:else if toast.variant === 'success'}
          <CheckCircle2 size={16} />
        {:else}
          <Info size={16} />
        {/if}
      </span>
      <span class="flex-1 text-sm leading-snug">{toast.message}</span>
      <button
        type="button"
        onclick={() => toasts.dismiss(toast.id)}
        class="flex-shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toast {
    background: var(--surface);
    border-color: var(--border);
    color: var(--text);
  }
  .toast--error {
    background: var(--error-subtle);
    border-color: var(--error-border);
    color: var(--error);
  }
  .toast--success {
    background: var(--success-subtle);
    border-color: var(--success-border);
    color: var(--success);
  }
</style>
