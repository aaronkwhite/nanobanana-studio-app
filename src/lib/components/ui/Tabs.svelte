<script lang="ts">
  import { Tabs as BitsTabs } from 'bits-ui';

  interface Tab {
    value: string;
    label: string;
  }

  interface Props {
    tabs: Tab[];
    value: string;
    onchange?: (value: string) => void;
    class?: string;
  }

  let { tabs, value = $bindable(), onchange, class: className = '' }: Props = $props();
</script>

<BitsTabs.Root
  bind:value
  onValueChange={(v) => { if (v) { value = v; onchange?.(v); } }}
  class={className}
>
  <BitsTabs.List
    class="inline-flex gap-1 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] p-1"
  >
    {#each tabs as tab}
      <BitsTabs.Trigger
        value={tab.value}
        class="rounded-[var(--radius-md)] px-4 py-1.5 text-sm font-medium transition-colors duration-[var(--transition-fast)] text-[var(--muted)] hover:text-[var(--text)] data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--accent-text)]"
      >
        {tab.label}
      </BitsTabs.Trigger>
    {/each}
  </BitsTabs.List>
</BitsTabs.Root>
