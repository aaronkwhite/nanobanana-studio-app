<script lang="ts" generics="T extends string">
  import { Select as BitsSelect } from 'bits-ui';

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

  const selected = $derived(options.find((o) => o.value === value));
</script>

<div class="flex flex-col gap-1.5 {className}">
  {#if label}
    <span class="text-xs font-medium text-[var(--muted)]">{label}</span>
  {/if}
  <BitsSelect.Root
    type="single"
    value={value}
    onValueChange={(v) => {
      if (v) {
        value = v as T;
        onchange?.(v as T);
      }
    }}
  >
    <BitsSelect.Trigger
      class="inline-flex h-9 items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <span>{selected?.label ?? 'Select...'}</span>
      <svg class="h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </BitsSelect.Trigger>
    <BitsSelect.Content
      class="glass z-50 min-w-[8rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-md)]"
      sideOffset={4}
    >
      {#each options as option}
        <BitsSelect.Item
          value={option.value}
          label={option.label}
          class="relative flex cursor-pointer items-center rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-[var(--text)] outline-none hover:bg-[var(--accent-subtle)] data-[highlighted]:bg-[var(--accent-subtle)]"
        >
          {option.label}
        </BitsSelect.Item>
      {/each}
    </BitsSelect.Content>
  </BitsSelect.Root>
</div>
