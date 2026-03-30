<script lang="ts">
  import { tick } from 'svelte';

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

  let tabEls: HTMLButtonElement[] = [];
  let pillStyle = $state('');

  function selectTab(tab: Tab) {
    value = tab.value;
    onchange?.(tab.value);
  }

  $effect(() => {
    // Re-run when value changes
    void value;
    tick().then(updatePill);
  });

  function updatePill() {
    const idx = tabs.findIndex(t => t.value === value);
    const el = tabEls[idx];
    if (el) {
      pillStyle = `width: ${el.offsetWidth}px; transform: translateX(${el.offsetLeft - 2}px);`;
    }
  }
</script>

<div class="tabs-container flex relative rounded-[10px] p-[2px] {className}">
  <div
    class="tabs-pill absolute top-[2px] h-[calc(100%-4px)] rounded-[var(--radius-md)]"
    style="transition: transform 250ms cubic-bezier(0.22, 1, 0.36, 1), width 250ms cubic-bezier(0.22, 1, 0.36, 1); {pillStyle}"
  ></div>
  {#each tabs as tab, i}
    <button
      bind:this={tabEls[i]}
      type="button"
      onclick={() => selectTab(tab)}
      class="relative z-[1] flex-1 text-center rounded-[var(--radius-md)] px-4 py-[5px] text-[13px] cursor-pointer bg-transparent border-none font-sans tracking-tight transition-colors duration-200 {value === tab.value ? 'font-medium text-[var(--text)]' : 'font-normal text-[var(--muted)] hover:text-[var(--text)]'}"
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tabs-container {
    background: rgba(128, 128, 128, 0.08);
    border: 0.5px solid rgba(128, 128, 128, 0.12);
  }
  .tabs-pill {
    background: var(--surface);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.04);
  }
  :global([data-theme="dark"]) .tabs-container {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
  }
  :global([data-theme="dark"]) .tabs-pill {
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 0 0 0.5px rgba(255, 255, 255, 0.06);
  }
</style>
