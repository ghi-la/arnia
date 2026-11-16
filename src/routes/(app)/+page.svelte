<script lang="ts">
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { m } from '$lib/paraglide/messages';
</script>

<svelte:head>
	<title>{m.app_name()} — {m.nav_home()}</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<Card>
		<CardHeader>
			<CardTitle>{m.app_name()}</CardTitle>
			<CardDescription>{m.home_placeholder_title()}</CardDescription>
		</CardHeader>
		<CardContent>
			<p class="text-muted-foreground text-sm">{m.home_placeholder_body()}</p>
		</CardContent>
	</Card>
</div>
