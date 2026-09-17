<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getPrimaryNavItems } from './nav-items';
	import { cn } from '$lib/utils';
	import { m } from '$lib/paraglide/messages';

	const items = getPrimaryNavItems();

	function isActive(href: string) {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}
</script>

<aside
	class="border-border bg-card fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r px-3 py-6 md:flex"
>
	<div class="mb-8 flex items-center gap-2 px-3">
		<span class="text-primary text-lg font-semibold">{m.app_name()}</span>
	</div>
	<nav class="flex flex-1 flex-col gap-1" aria-label="Primary">
		{#each items as item (item.href)}
			{@const active = isActive(item.href)}
			<a
				href={resolve(item.href)}
				class={cn(
					'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
					active
						? 'bg-primary/10 text-primary'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'
				)}
				aria-current={active ? 'page' : undefined}
			>
				<item.icon class="size-5" />
				{item.label()}
			</a>
		{/each}
	</nav>
</aside>
