<script lang="ts" generics="T extends string">
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

  function handleChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    value = target.value as T;
    onchange?.(target.value as T);
  }
</script>

<div class="flex flex-col gap-1.5 {className}">
  {#if label}
    <span class="text-xs font-medium text-[var(--muted)]">{label}</span>
  {/if}
  <select
    {value}
    onchange={handleChange}
    class="h-9 w-full appearance-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 pr-8 text-sm text-[var(--text)] transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
    style="background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394A3B8%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>'); background-repeat: no-repeat; background-position: right 8px center; background-size: 16px;"
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>
