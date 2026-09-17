<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { resolve } from '$app/paths';

	let accepted = $state(false);
</script>

<svelte:head>
	<title>{m.app_name()} — {m.disclaimer_title()}</title>
</svelte:head>

<h2 class="text-base font-semibold">{m.disclaimer_title()}</h2>
<p class="text-muted-foreground mt-3 text-sm leading-relaxed">{m.disclaimer_body()}</p>

<label class="mt-5 flex items-start gap-3 text-sm">
	<input
		type="checkbox"
		bind:checked={accepted}
		class="border-input mt-0.5 size-5 shrink-0 rounded"
	/>
	<span>{m.disclaimer_accept()}</span>
</label>

<div class="mt-6 flex justify-end">
	<Button href={accepted ? resolve('/setup/admin') : undefined} disabled={!accepted}>
		{m.common_continue()}
	</Button>
</div>
