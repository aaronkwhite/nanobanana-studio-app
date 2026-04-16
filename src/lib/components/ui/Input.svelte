<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { nextDomId } from '$lib/utils/dom-id';

  interface Props extends HTMLInputAttributes {
    label?: string;
    error?: string;
  }

  let { label, error, class: className = '', value = $bindable(''), id, ...rest }: Props = $props();
  const fallbackId = nextDomId('input');
  const inputId = $derived(id ?? fallbackId);
</script>

<div class="flex flex-col gap-1.5">
  {#if label}
    <label for={inputId} class="text-xs font-medium text-[var(--muted)]">{label}</label>
  {/if}
  <input
    id={inputId}
    bind:value
    class="h-9 rounded-[var(--radius-md)] border bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] transition-colors duration-[var(--transition-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] {error ? 'border-[var(--error)]' : 'border-[var(--border)]'} {className}"
    {...rest}
  />
  {#if error}
    <p class="text-xs text-[var(--error)]">{error}</p>
  {/if}
</div>
