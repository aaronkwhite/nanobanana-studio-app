<script lang="ts" generics="T extends string">
  import { ChevronDown, Check } from 'lucide-svelte';

  interface Option {
    value: T;
    label: string;
  }

  interface Props {
    options: Option[];
    value: T;
    onchange?: (value: T) => void;
    label?: string;
    class?: string;
  }

  let { options, value = $bindable(), onchange, label, class: className = '' }: Props = $props();

  let open = $state(false);
  let triggerEl: HTMLButtonElement | undefined = $state();

  const selected = $derived(options.find((o) => o.value === value));

  function toggle() {
    open = !open;
  }

  function select(option: Option) {
    value = option.value;
    onchange?.(option.value);
    open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
      triggerEl?.focus();
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (triggerEl && !triggerEl.closest('.select-wrapper')?.contains(e.target as Node)) {
      open = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="select-wrapper relative flex flex-col gap-1.5 {className}">
  {#if label}
    <span class="text-xs font-medium text-[var(--muted)]">{label}</span>
  {/if}
  <button
    bind:this={triggerEl}
    type="button"
    onclick={toggle}
    class="flex h-9 w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] transition-colors hover:border-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
    aria-expanded={open}
    aria-haspopup="listbox"
  >
    <span class="truncate">{selected?.label ?? 'Select...'}</span>
    <ChevronDown size={14} class="ml-1 shrink-0 text-[var(--muted)] transition-transform {open ? 'rotate-180' : ''}" />
  </button>

  {#if open}
    <div
      class="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] p-1 shadow-lg"
      role="listbox"
    >
      {#each options as option}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          onclick={() => select(option)}
          class="flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-[var(--text)] cursor-pointer hover:bg-[var(--border)] {option.value === value ? 'bg-[var(--accent-subtle)]' : ''}"
          role="option"
          aria-selected={option.value === value}
        >
          <span class="w-4 shrink-0">
            {#if option.value === value}
              <Check size={14} class="text-[var(--accent)]" />
            {/if}
          </span>
          {option.label}
        </div>
      {/each}
    </div>
  {/if}
</div>
