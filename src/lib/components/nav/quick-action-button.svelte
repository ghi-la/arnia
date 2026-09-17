<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { Plus, Receipt, PackageSearch, CalendarPlus, ScanLine } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';

	const actions = [
		{ href: resolve('/finance/expenses/new'), label: m.quick_action_new_expense, icon: Receipt },
		{
			href: resolve('/inventory/movements/new'),
			label: m.quick_action_stock_movement,
			icon: PackageSearch
		},
		{ href: resolve('/events/new'), label: m.quick_action_new_event, icon: CalendarPlus },
		{ href: resolve('/inventory/scan'), label: m.quick_action_scan_item, icon: ScanLine }
	];
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="bg-accent text-accent-foreground fixed right-4 bottom-[calc(var(--bottom-nav-height)+var(--safe-bottom)+1rem)] z-40 flex size-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 md:right-8 md:bottom-8"
		aria-label={m.quick_action_open()}
	>
		<Plus class="size-6" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			class="border-border bg-card text-card-foreground z-50 w-64 rounded-xl border p-1.5 shadow-lg"
			side="top"
			align="end"
			sideOffset={8}
		>
			{#each actions as action (action.href)}
				<DropdownMenu.Item
					class="hover:bg-muted data-highlighted:bg-muted flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none select-none"
				>
					{#snippet child({ props })}
						<a href={action.href} {...props}>
							<action.icon class="text-muted-foreground size-4" />
							{action.label()}
						</a>
					{/snippet}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
