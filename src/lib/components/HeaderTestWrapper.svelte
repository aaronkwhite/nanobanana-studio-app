<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import Header from './Header.svelte';
</script>

<Tooltip.Provider delayDuration={300}>
  <Header />
</Tooltip.Provider>
