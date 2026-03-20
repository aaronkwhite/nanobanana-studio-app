<script lang="ts">
  import { Tabs } from '$lib/components/ui';
  import { browser } from '$app/environment';
  import type { JobMode } from '$lib/types';

  interface Props {
    mode: JobMode;
    onchange?: (mode: JobMode) => void;
  }

  let { mode = $bindable('text-to-image'), onchange }: Props = $props();

  const tabs = [
    { value: 'text-to-image', label: 'Text to Image' },
    { value: 'image-to-image', label: 'Image to Image' },
  ];

  function handleChange(value: string) {
    mode = value as JobMode;
    if (browser) localStorage.setItem('nanobanana-mode', mode);
    onchange?.(mode);
  }
</script>

<Tabs {tabs} value={mode} onchange={handleChange} />
