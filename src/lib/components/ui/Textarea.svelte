<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  interface Props extends HTMLTextareaAttributes {
    label?: string;
    error?: string;
    autoResize?: boolean;
  }

  let { label, error, autoResize = false, class: className = '', value = $bindable(''), ...rest }: Props = $props();

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
    <label class="text-xs font-medium text-[var(--muted)]">{label}</label>
  {/if}
  <textarea
    bind:this={textareaEl}
    bind:value
    oninput={handleInput}
    class="min-h-[80px] rounded-[var(--radius-md)] border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] transition-colors duration-[var(--transition-fast)] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] {error ? 'border-[var(--error)]' : 'border-[var(--border)]'} {className}"
    {...rest}
  ></textarea>
  {#if error}
    <p class="text-xs text-[var(--error)]">{error}</p>
  {/if}
</div>
