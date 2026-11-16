<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import ItemPhotos from '$lib/components/inventory/item-photos.svelte';
	import { createSubmit } from '$lib/client/submit.svelte';
	import { formatDate, formatMoney } from '$lib/format';
	import { movementReasonLabel } from '$lib/inventory-labels';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const low = $derived(data.item.currentQty <= data.item.minThreshold);

	const archive = createSubmit({
		confirm: () =>
			data.item.archivedAt
				? null
				: {
						title: m.item_archive_confirm_title({ name: data.item.name }),
						description: m.item_archive_confirm_body(),
						confirmLabel: m.item_archive()
					},
		success: (result) => (result?.archived ? m.item_archived_toast() : m.item_unarchived_toast())
	});

	const movementTypeLabels: Record<string, () => string> = {
		purchase: m.movement_type_purchase,
		consumption: m.movement_type_consumption,
		checkout: m.movement_type_checkout,
		return: m.movement_type_return,
		adjustment: m.movement_type_adjustment,
		disposal: m.movement_type_disposal
	};
</script>

<svelte:head>
	<title>{m.app_name()} — {data.item.name}</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex items-start justify-between gap-3">
		<div>
			<h1 class="text-xl font-semibold">{data.item.name}</h1>
			<p class="text-muted-foreground text-sm">
				{data.item.type === 'consumable'
					? m.inventory_type_consumable()
					: m.inventory_type_equipment()}
				{#if data.categoryName}· {data.categoryName}{/if}
				{#if data.locationName}· {data.locationName}{/if}
			</p>
		</div>
		{#if data.item.archivedAt}
			<Badge variant="secondary">{m.item_archived_badge()}</Badge>
		{/if}
	</div>

	<Card>
		<CardContent class="flex flex-wrap items-center justify-between gap-3 pt-4">
			<div>
				<p class="text-muted-foreground text-xs uppercase">{m.item_current_qty()}</p>
				<p class="text-2xl font-semibold">
					{m.inventory_qty_in_unit({ qty: data.item.currentQty, unit: data.item.unit })}
				</p>
				{#if low}<Badge variant="warning" class="mt-1">{m.inventory_low_stock_badge()}</Badge>{/if}
			</div>
			{#if data.item.type === 'consumable'}
				<div class="text-right">
					<p class="text-muted-foreground text-xs uppercase">{m.item_avg_cost()}</p>
					<p class="text-lg font-medium">
						{formatMoney(data.item.avgCostMinor, data.item.currency)}
					</p>
				</div>
			{:else if data.item.condition}
				<div class="text-right">
					<p class="text-muted-foreground text-xs uppercase">{m.item_condition()}</p>
					<p class="text-lg font-medium">
						{#if data.item.condition === 'ok'}{m.item_condition_ok()}
						{:else if data.item.condition === 'needs_repair'}{m.item_condition_needs_repair()}
						{:else if data.item.condition === 'broken'}{m.item_condition_broken()}
						{:else}{m.item_condition_lost()}
						{/if}
					</p>
				</div>
			{/if}
		</CardContent>
	</Card>

	<div class="flex flex-wrap gap-2">
		{#if data.canAdjustStock}
			<Button href={resolve('/inventory/movements/new') + `?itemId=${data.item.id}`} size="sm">
				{m.movement_title()}
			</Button>
		{/if}
		{#if data.canEdit}
			<Button
				href={resolve('/(app)/inventory/items/[id]/edit', { id: data.item.id })}
				variant="outline"
				size="sm"
			>
				{m.common_edit()}
			</Button>
			<form
				method="POST"
				action={data.item.archivedAt ? '?/unarchive' : '?/archive'}
				use:enhance={archive.enhance}
			>
				<Button type="submit" variant="ghost" size="sm" loading={archive.pending}>
					{data.item.archivedAt ? m.item_unarchive() : m.item_archive()}
				</Button>
			</form>
		{/if}
	</div>

	{#if data.item.description}
		<p class="text-muted-foreground text-sm">{data.item.description}</p>
	{/if}

	{#if data.photos.length > 0}
		<Card>
			<CardContent class="pt-4">
				<!-- Read-only here; photos are added/removed from the create and edit forms. -->
				<ItemPhotos
					itemId={data.item.id}
					photos={data.photos}
					canEdit={false}
					maxUploadMb={data.maxUploadMb}
					maxPhotos={data.maxPhotos}
				/>
			</CardContent>
		</Card>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle>{m.item_view_movements()}</CardTitle>
		</CardHeader>
		<CardContent>
			{#if data.movements.length === 0}
				<p class="text-muted-foreground text-sm">{m.movement_history_empty()}</p>
			{:else}
				<ul class="divide-border flex flex-col divide-y">
					{#each data.movements as mv (mv.id)}
						<li class="flex items-center justify-between gap-3 py-2.5 text-sm">
							<div>
								<p class="font-medium">{movementTypeLabels[mv.type]?.() ?? mv.type}</p>
								<p class="text-muted-foreground text-xs">
									{formatDate(mv.createdAt)}
									{#if mv.createdByName}· {mv.createdByName}{/if}
									{#if mv.reason}· {movementReasonLabel(mv.reason)}{/if}
								</p>
							</div>
							<span class="font-medium {mv.qty < 0 ? 'text-destructive' : 'text-success'}">
								{mv.qty > 0 ? '+' : ''}{mv.qty}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</CardContent>
	</Card>
</div>
