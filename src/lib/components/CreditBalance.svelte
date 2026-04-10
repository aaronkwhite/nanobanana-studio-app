<!-- src/lib/components/CreditBalance.svelte -->
<script lang="ts">
  import { credits } from '$lib/stores';
  import { open } from '@tauri-apps/plugin-shell';
  import * as cmd from '$lib/utils/commands';

  let purchasing = $state(false);
  let buyError = $state<string | null>(null);

  async function buyCredits(pack: 'starter' | 'standard' | 'pro') {
    purchasing = true;
    buyError = null;
    try {
      const session = await cmd.apiPurchaseCredits(pack);
      await open(session.url);
    } catch (err) {
      buyError = err instanceof Error ? err.message : 'Purchase failed. Please try again.';
    } finally {
      purchasing = false;
    }
  }
</script>

<div class="credit-balance">
  <span class="balance" class:low={$credits < 10}>
    {$credits} credits
  </span>
  <button class="buy-btn" onclick={() => buyCredits('standard')} disabled={purchasing}>
    {purchasing ? '…' : '+ Buy'}
  </button>
  {#if buyError}
    <span class="buy-error">{buyError}</span>
  {/if}
</div>

<style>
  .credit-balance {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .balance { font-size: 0.875rem; font-weight: 500; }
  .balance.low { color: var(--warning, orange); }
  .buy-btn {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
  }
  .buy-error { font-size: 0.75rem; color: var(--error, red); }
</style>
