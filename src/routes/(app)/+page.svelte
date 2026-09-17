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
			<CardDescription
				>Foundation scaffold — dashboard content arrives in later phases.</CardDescription
			>
		</CardHeader>
		<CardContent>
			<p class="text-muted-foreground text-sm">
				This is the authenticated app shell: bottom navigation on mobile, sidebar on desktop, theme
				toggle, and a floating quick-action button.
			</p>
		</CardContent>
	</Card>
</div>
