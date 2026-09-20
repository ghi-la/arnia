<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { resolve } from '$app/paths';
	import { Package, ChevronRight } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{m.app_name()} — {m.nav_inventory()}</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between gap-3">
		<h1 class="text-xl font-semibold">{m.nav_inventory()}</h1>
		{#if data.canEdit}
			<Button href={resolve('/inventory/items/new')} size="sm">{m.inventory_new_item()}</Button>
		{/if}
	</div>

	<form method="GET" class="flex flex-col gap-3">
		<Input
			type="search"
			name="q"
			placeholder={m.inventory_search_label()}
			value={data.filters.search}
		/>
		<div class="grid grid-cols-2 gap-2">
			<select name="category" class="border-input bg-card h-11 rounded-md border px-3 text-sm">
				<option value="">{m.inventory_filter_category()}: {m.inventory_filter_all()}</option>
				{#each data.categories as c (c.id)}
					<option value={c.id} selected={data.filters.categoryId === c.id}>{c.name}</option>
				{/each}
			</select>
			<select name="location" class="border-input bg-card h-11 rounded-md border px-3 text-sm">
				<option value="">{m.inventory_filter_location()}: {m.inventory_filter_all()}</option>
				{#each data.locations as l (l.id)}
					<option value={l.id} selected={data.filters.locationId === l.id}>{l.name}</option>
				{/each}
			</select>
		</div>
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" name="lowStock" value="1" checked={data.filters.lowStockOnly} />
			{m.inventory_filter_low_stock()}
		</label>
		<Button type="submit" variant="outline" size="sm">{m.common_continue()}</Button>
	</form>

	<div class="flex flex-wrap gap-4 text-sm">
		<a href={resolve('/inventory/scan')} class="text-muted-foreground underline underline-offset-2">
			{m.scan_title()}
		</a>
		{#if data.canAdjustStock}
			<a
				href={resolve('/inventory/count')}
				class="text-muted-foreground underline underline-offset-2"
			>
				{m.count_title()}
			</a>
		{/if}
		{#if data.canEdit}
			<a
				href={resolve('/inventory/locations')}
				class="text-muted-foreground underline underline-offset-2"
			>
				{m.inventory_manage_locations()}
			</a>
			<a
				href={resolve('/inventory/categories')}
				class="text-muted-foreground underline underline-offset-2"
			>
				{m.inventory_manage_categories()}
			</a>
		{/if}
	</div>

	{#if data.items.length === 0}
		<Card>
			<CardContent class="flex flex-col items-center gap-3 py-10 text-center">
				<Package class="text-muted-foreground size-10" />
				<div>
					<p class="font-medium">{m.inventory_empty_title()}</p>
					<p class="text-muted-foreground text-sm">{m.inventory_empty_body()}</p>
				</div>
				{#if data.canEdit}
					<Button href={resolve('/inventory/items/new')}>{m.inventory_new_item()}</Button>
				{/if}
			</CardContent>
		</Card>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each data.items as it (it.id)}
				{@const low = it.currentQty <= it.minThreshold}
				<li>
					<a
						href={resolve('/(app)/inventory/items/[id]', { id: it.id })}
						class="border-border bg-card flex items-center justify-between gap-3 rounded-xl border p-3.5"
					>
						<div class="min-w-0">
							<p class="truncate font-medium">{it.name}</p>
							<p class="text-muted-foreground truncate text-xs">
								{it.categoryName ?? ''}{it.categoryName && it.locationName
									? ' · '
									: ''}{it.locationName ?? ''}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							{#if low}
								<Badge variant="warning">{m.inventory_low_stock_badge()}</Badge>
							{/if}
							<span class="text-sm font-medium"
								>{m.inventory_qty_in_unit({ qty: it.currentQty, unit: it.unit })}</span
							>
							<ChevronRight class="text-muted-foreground size-4" />
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
