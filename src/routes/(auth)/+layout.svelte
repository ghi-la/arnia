<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
	<span class="text-primary text-2xl font-semibold">{m.app_name()}</span>
	<div class="w-full max-w-sm">
		{@render children()}
	</div>
</div>
