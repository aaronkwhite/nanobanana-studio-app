<script lang="ts">
  import { Tooltip as BitsTooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props {
    text: string;
    children: Snippet;
  }

  let { text, children }: Props = $props();
</script>

<BitsTooltip.Provider>
  <BitsTooltip.Root openDelay={300}>
    <BitsTooltip.Trigger asChild>
      {@render children()}
    </BitsTooltip.Trigger>
    <BitsTooltip.Content
      class="z-50 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text)] shadow-[var(--shadow-md)]"
      sideOffset={4}
    >
      {text}
    </BitsTooltip.Content>
  </BitsTooltip.Root>
</BitsTooltip.Provider>
