<script lang="ts">
	import BottomNav from '$lib/components/nav/bottom-nav.svelte';
	import Sidebar from '$lib/components/nav/sidebar.svelte';
	import QuickActionButton from '$lib/components/nav/quick-action-button.svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import { LogOut } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="min-h-dvh">
	<a
		href="#main-content"
		class="bg-primary text-primary-foreground fixed top-2 left-2 z-50 -translate-y-16 rounded-md px-4 py-2 focus:translate-y-0"
	>
		{m.skip_to_content()}
	</a>

	<Sidebar />

	<header
		class="border-border bg-card/95 fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-end gap-1 border-b px-4 pt-[var(--safe-top)] backdrop-blur-sm md:left-60"
	>
		<ThemeToggle />
		<form method="POST" action="/logout">
			<Button type="submit" variant="ghost" size="icon" aria-label={m.logout_action()}>
				<LogOut class="size-5" />
			</Button>
		</form>
	</header>

	<main
		id="main-content"
		class="px-4 pt-[calc(3.5rem+var(--safe-top))] pb-[calc(var(--bottom-nav-height)+var(--safe-bottom)+1rem)] md:ml-60 md:px-6 md:pb-8"
	>
		<div class="mx-auto max-w-5xl py-4">
			{@render children()}
		</div>
	</main>

	<QuickActionButton />
	<BottomNav />
</div>
