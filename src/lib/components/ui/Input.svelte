<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    label?: string;
    error?: string;
  }

  let { label, error, class: className = '', value = $bindable(''), ...rest }: Props = $props();
</script>

<div class="flex flex-col gap-1.5">
  {#if label}
    <label class="text-xs font-medium text-[var(--muted)]">{label}</label>
  {/if}
  <input
    bind:value
    class="h-9 rounded-[var(--radius-md)] border bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] transition-colors duration-[var(--transition-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] {error ? 'border-[var(--error)]' : 'border-[var(--border)]'} {className}"
    {...rest}
  />
  {#if error}
    <p class="text-xs text-[var(--error)]">{error}</p>
  {/if}
</div>
