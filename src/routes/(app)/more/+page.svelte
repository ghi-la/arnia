<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { ChevronRight, Users, ShieldCheck, Lock } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const links = $derived(
		[
			{ href: resolve('/settings/security'), label: m.twofactor_title(), icon: Lock },
			data.permissions.includes('users.manage') && {
				href: resolve('/settings/users'),
				label: m.users_title(),
				icon: Users
			},
			data.permissions.includes('settings.manage') && {
				href: resolve('/settings/roles'),
				label: m.roles_title(),
				icon: ShieldCheck
			}
		].filter((l) => l !== false)
	);
</script>

<svelte:head>
	<title>{m.app_name()} — {m.nav_more()}</title>
</svelte:head>

<h1 class="text-xl font-semibold">{m.nav_more()}</h1>

<Card class="mt-4">
	<CardContent class="divide-border divide-y p-0">
		{#each links as link (link.href)}
			<a href={link.href} class="flex items-center justify-between gap-3 p-4 text-sm">
				<span class="flex items-center gap-3">
					<link.icon class="text-muted-foreground size-5" />
					{link.label}
				</span>
				<ChevronRight class="text-muted-foreground size-4" />
			</a>
		{/each}
	</CardContent>
</Card>
