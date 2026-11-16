<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { ShieldAlert, SearchX, TriangleAlert } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Localized error screen. The server's raw `error(…)` message (English,
	 * e.g. "Missing permission: inventory.edit") is deliberately not shown —
	 * it's for logs; users get a translated explanation per status.
	 */
	const status = $derived(page.status);
	const view = $derived(
		status === 403
			? { icon: ShieldAlert, title: m.error_403_title(), text: m.error_403_description() }
			: status === 404
				? { icon: SearchX, title: m.error_404_title(), text: m.error_404_description() }
				: { icon: TriangleAlert, title: m.error_500_title(), text: m.error_500_description() }
	);
</script>

<svelte:head>
	<title>{m.app_name()} — {view.title}</title>
</svelte:head>

<div class="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
	<div class="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
		<view.icon class="size-7" aria-hidden="true" />
	</div>
	<div class="flex flex-col gap-1.5">
		<h1 class="text-xl font-semibold">{view.title}</h1>
		<p class="text-muted-foreground text-sm">{view.text}</p>
		<p class="text-muted-foreground/70 text-xs">{m.error_status_code({ status })}</p>
	</div>
	<div class="flex flex-wrap justify-center gap-2">
		<Button variant="outline" onclick={() => history.back()}>{m.common_back()}</Button>
		<Button href={resolve('/')}>{m.error_go_home()}</Button>
	</div>
</div>
