<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  interface Props extends HTMLTextareaAttributes {
    label?: string;
    error?: string;
    autoResize?: boolean;
    maxLength?: number;
  }

  let { label, error, autoResize = false, maxLength, class: className = '', value = $bindable(''), id, ...rest }: Props = $props();

  const fallbackId = `textarea-${Math.random().toString(36).slice(2, 9)}`;
  const textareaId = $derived(id ?? fallbackId);
  let textareaEl: HTMLTextAreaElement | undefined = $state();

  function handleInput() {
    if (autoResize && textareaEl) {
      textareaEl.style.height = 'auto';
      textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
    }
  }
</script>

<div class="flex flex-col gap-1.5">
  {#if label}
    <label for={textareaId} class="text-xs font-medium text-[var(--muted)]">{label}</label>
  {/if}
  <textarea
    id={textareaId}
    bind:this={textareaEl}
    bind:value
    oninput={handleInput}
    maxlength={maxLength}
    class="min-h-[80px] rounded-[var(--radius-md)] border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] transition-colors duration-[var(--transition-fast)] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] {error ? 'border-[var(--error)]' : 'border-[var(--border)]'} {className}"
    {...rest}
  ></textarea>
  <div class="flex items-center justify-between">
    {#if error}
      <p class="text-xs text-[var(--error)]">{error}</p>
    {:else}
      <span></span>
    {/if}
    {#if maxLength}
      <span class="text-xs text-[var(--muted)] text-right">{String(value ?? '').length}/{maxLength}</span>
    {/if}
  </div>
</div>
