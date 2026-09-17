<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getPrimaryNavItems } from './nav-items';
	import { cn } from '$lib/utils';

	const items = getPrimaryNavItems();

	function isActive(href: string) {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}
</script>

<nav
	class="border-border bg-card/95 fixed inset-x-0 bottom-0 z-30 flex h-[calc(var(--bottom-nav-height)+var(--safe-bottom))] border-t pb-[var(--safe-bottom)] backdrop-blur-sm md:hidden"
	aria-label="Primary"
>
	{#each items as item (item.href)}
		{@const active = isActive(item.href)}
		<a
			href={resolve(item.href)}
			class={cn(
				'flex min-w-11 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium',
				active ? 'text-primary' : 'text-muted-foreground'
			)}
			aria-current={active ? 'page' : undefined}
		>
			<item.icon class="size-5" />
			<span>{item.label()}</span>
		</a>
	{/each}
</nav>
