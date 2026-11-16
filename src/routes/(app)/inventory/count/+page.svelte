<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import FieldError from '$lib/components/feedback/field-error.svelte';
	import { createSubmit } from '$lib/client/submit.svelte';
	import { CircleCheck } from '@lucide/svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let search = $state('');
	let selectedItemId = $state('');
	let countedQty = $state('');
	let sessionCount = $state(0);

	const selectedItem = $derived(data.items.find((it) => it.id === selectedItemId));

	const filteredItems = $derived(
		search.trim()
			? data.items
					.filter((it) => {
						const q = search.trim().toLowerCase();
						return (
							it.name.toLowerCase().includes(q) ||
							(it.sku ?? '').toLowerCase().includes(q) ||
							(it.barcode ?? '').toLowerCase().includes(q)
						);
					})
					.slice(0, 20)
			: []
	);

	const save = createSubmit({
		reset: false,
		success: (result) =>
			result?.noChange
				? m.count_no_change()
				: m.count_saved({
						name: String(result?.itemName ?? ''),
						from: Number(result?.previousQty),
						to: Number(result?.newQty)
					}),
		error: (data) => (data?.notFound ? m.item_not_found() : false),
		onSuccess: (result) => {
			if (!result?.noChange) sessionCount += 1;
			selectedItemId = '';
			countedQty = '';
		}
	});

	function selectItem(id: string) {
		selectedItemId = id;
		search = '';
		countedQty = '';
	}
</script>

<svelte:head>
	<title>{m.app_name()} — {m.count_title()}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-start justify-between gap-3">
		<div>
			<h1 class="text-xl font-semibold">{m.count_title()}</h1>
			<p class="text-muted-foreground text-sm">{m.count_intro()}</p>
		</div>
		<Button href={resolve('/inventory')} variant="outline" size="sm">{m.count_done()}</Button>
	</div>

	{#if sessionCount > 0}
		<p class="text-muted-foreground text-sm">{m.count_session_summary({ count: sessionCount })}</p>
	{/if}

	{#if !selectedItem}
		<Card>
			<CardContent class="flex flex-col gap-3 pt-4">
				<Label for="countSearch">{m.movement_item()}</Label>
				<Input
					id="countSearch"
					bind:value={search}
					placeholder={m.movement_item_search_placeholder()}
				/>
				{#if filteredItems.length > 0}
					<ul class="divide-border flex flex-col divide-y">
						{#each filteredItems as it (it.id)}
							<li>
								<button
									type="button"
									class="hover:bg-muted flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm"
									onclick={() => selectItem(it.id)}
								>
									<span>{it.name}{it.sku ? ` (${it.sku})` : ''}</span>
									<span class="text-muted-foreground">{it.currentQty} {it.unit}</span>
								</button>
							</li>
						{/each}
					</ul>
				{:else if search.trim()}
					<p class="text-muted-foreground py-2 text-sm">{m.search_no_results()}</p>
				{/if}
			</CardContent>
		</Card>
	{:else}
		<Card>
			<CardContent class="flex flex-col gap-4 pt-4">
				<div>
					<p class="font-medium">{selectedItem.name}</p>
					<p class="text-muted-foreground text-sm">
						{m.count_expected_qty({ qty: `${selectedItem.currentQty} ${selectedItem.unit}` })}
					</p>
				</div>

				<form method="POST" use:enhance={save.enhance} class="flex flex-col gap-3">
					<input type="hidden" name="itemId" value={selectedItem.id} />
					<div class="flex flex-col gap-1.5">
						<Label for="countedQty">{m.count_counted_qty()}</Label>
						<Input
							id="countedQty"
							name="countedQty"
							type="number"
							inputmode="numeric"
							min="0"
							required
							bind:value={countedQty}
							aria-invalid={form?.errors?.countedQty ? true : undefined}
							aria-describedby={form?.errors?.countedQty ? 'countedQty-error' : undefined}
						/>
						<FieldError
							id="countedQty-error"
							error={form?.errors?.countedQty ? m.count_qty_error() : null}
						/>
					</div>
					<div class="flex flex-col-reverse justify-center gap-2 sm:flex-row sm:justify-end">
						<Button type="button" variant="ghost" onclick={() => (selectedItemId = '')}>
							{m.common_cancel()}
						</Button>
						<Button type="submit" class="w-full sm:w-auto" loading={save.pending}>
							{m.count_save()}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	{/if}

	{#if form && 'itemName' in form && !form.noChange && !selectedItem}
		<p class="text-success flex items-center gap-2 text-sm" role="status">
			<CircleCheck class="size-4" aria-hidden="true" />
			{m.count_saved({
				name: form.itemName ?? '',
				from: form.previousQty ?? 0,
				to: form.newQty ?? 0
			})}
		</p>
	{/if}
</div>
