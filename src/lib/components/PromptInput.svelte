<!-- src/lib/components/PromptInput.svelte -->
<script lang="ts">
  import { Textarea } from '$lib/components/ui';
  import { X } from 'lucide-svelte';

  interface Props {
    prompts: string[];
    onsubmit: () => void;
  }

  let { prompts = $bindable([]), onsubmit }: Props = $props();
  let currentPrompt: string = $state('');

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentPrompt.trim()) {
        prompts = [...prompts, currentPrompt.trim()];
        currentPrompt = '';
      }
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (currentPrompt.trim()) {
        prompts = [...prompts, currentPrompt.trim()];
        currentPrompt = '';
      }
      if (prompts.length > 0) onsubmit();
    }
  }

  function removePrompt(index: number) {
    prompts = prompts.filter((_, i) => i !== index);
  }
</script>

<div class="flex flex-col gap-2">
  {#if prompts.length > 0}
    <div class="flex flex-wrap gap-1.5">
      {#each prompts as prompt, i}
        <span class="inline-flex items-center gap-1 rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-xs text-[var(--text)]">
          <span class="max-w-[200px] truncate">{prompt}</span>
          <button
            onclick={() => removePrompt(i)}
            class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--border)] text-[var(--muted)]"
            aria-label="Remove prompt"
          >
            <X size={10} />
          </button>
        </span>
      {/each}
    </div>
  {/if}

  <Textarea
    bind:value={currentPrompt}
    onkeydown={handleKeydown}
    placeholder="Type a prompt and press Enter to queue. Shift+Enter to submit all."
    autoResize
  />
</div>
