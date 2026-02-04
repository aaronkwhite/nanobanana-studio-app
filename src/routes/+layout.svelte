<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Nanobanana Studio</title>
	<meta name="description" content="Batch image generation with Google Gemini" />
</svelte:head>

{@render children()}
