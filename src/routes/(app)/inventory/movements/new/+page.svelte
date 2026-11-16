<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { enhance } from '$app/forms';
	import FieldError from '$lib/components/feedback/field-error.svelte';
	import { createSubmit } from '$lib/client/submit.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function field(name: string, fallback: string): string {
		return form?.values?.[name] ?? (name === 'itemId' ? data.preselectedItemId : fallback);
	}

	let itemId = $state(field('itemId', ''));
	let type = $state(field('type', 'purchase'));
	let search = $state('');

	const filteredItems = $derived(
		data.items.filter((it) => {
			const q = search.trim().toLowerCase();
			if (!q) return true;
			return it.name.toLowerCase().includes(q) || (it.sku ?? '').toLowerCase().includes(q);
		})
	);

	const errors = $derived(form?.errors ?? {});

	const submit = createSubmit({
		success: () => m.movement_success(),
		// Specific reasons (stock, reason, item) are shown inline below.
		error: (data) =>
			data?.insufficientStockAvailable !== undefined
				? m.movement_insufficient_stock({ available: Number(data.insufficientStockAvailable) })
				: data?.notFound
					? m.item_not_found()
					: m.common_error_check_fields()
	});
</script>

<svelte:head>
	<title>{m.app_name()} — {m.movement_title()}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<h1 class="text-xl font-semibold">{m.movement_title()}</h1>

	<Card>
		<CardContent class="pt-4">
			<form method="POST" use:enhance={submit.enhance} class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<Label for="itemSearch">{m.movement_item()}</Label>
					<Input
						id="itemSearch"
						type="search"
						placeholder={m.movement_item_search_placeholder()}
						bind:value={search}
					/>
					<select
						id="itemId"
						name="itemId"
						bind:value={itemId}
						required
						aria-label={m.movement_item()}
						aria-invalid={errors.itemId ? true : undefined}
						aria-describedby={errors.itemId ? 'itemId-error' : undefined}
						class="border-input bg-card h-11 rounded-md border px-3 text-base md:text-sm"
					>
						<option value="" disabled>
							{filteredItems.length === 0 ? m.search_no_results() : m.movement_item_choose()}
						</option>
						{#each filteredItems as it (it.id)}
							<option value={it.id}
								>{it.name}{it.sku ? ` (${it.sku})` : ''} — {it.currentQty} {it.unit}</option
							>
						{/each}
					</select>
					<FieldError
						id="itemId-error"
						error={errors.itemId || form?.notFound ? m.movement_item_required() : null}
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="type">{m.movement_type()}</Label>
					<select
						id="type"
						name="type"
						bind:value={type}
						class="border-input bg-card h-11 rounded-md border px-3 text-base md:text-sm"
					>
						<option value="purchase">{m.movement_type_purchase()}</option>
						<option value="consumption">{m.movement_type_consumption()}</option>
						<option value="checkout">{m.movement_type_checkout()}</option>
						<option value="return">{m.movement_type_return()}</option>
						<option value="adjustment">{m.movement_type_adjustment()}</option>
						<option value="disposal">{m.movement_type_disposal()}</option>
					</select>
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="qty">{m.movement_qty()}</Label>
					<Input
						id="qty"
						name="qty"
						type="number"
						inputmode="numeric"
						min="1"
						required
						value={form?.values?.qty ?? '1'}
						aria-invalid={errors.qty ? true : undefined}
						aria-describedby={errors.qty ? 'qty-error' : undefined}
					/>
					<FieldError id="qty-error" error={errors.qty ? m.movement_qty_error() : null} />
				</div>

				{#if type === 'purchase'}
					<div class="flex flex-col gap-1.5">
						<Label for="unitCost">{m.movement_unit_cost()}</Label>
						<Input
							id="unitCost"
							name="unitCost"
							type="number"
							inputmode="decimal"
							min="0"
							step="0.01"
							value={form?.values?.unitCost ?? ''}
						/>
					</div>
				{/if}

				{#if type === 'adjustment'}
					<div class="flex flex-col gap-1.5">
						<Label for="direction">{m.movement_direction()}</Label>
						<select
							id="direction"
							name="direction"
							class="border-input bg-card h-11 rounded-md border px-3 text-base md:text-sm"
						>
							<option value="increase">{m.movement_direction_increase()}</option>
							<option value="decrease">{m.movement_direction_decrease()}</option>
						</select>
					</div>
				{/if}

				{#if type === 'return'}
					<div class="flex flex-col gap-1.5">
						<Label for="conditionOnReturn">{m.movement_condition_on_return()}</Label>
						<select
							id="conditionOnReturn"
							name="conditionOnReturn"
							class="border-input bg-card h-11 rounded-md border px-3 text-base md:text-sm"
						>
							<option value="returned">{m.movement_condition_returned()}</option>
							<option value="damaged">{m.movement_condition_damaged()}</option>
							<option value="lost">{m.movement_condition_lost()}</option>
						</select>
					</div>
				{/if}

				{#if type === 'adjustment' || type === 'disposal'}
					<div class="flex flex-col gap-1.5">
						<Label for="reason">{m.movement_reason()}</Label>
						<textarea
							id="reason"
							name="reason"
							rows="2"
							required
							class="border-input bg-card rounded-md border px-3 py-2 text-base md:text-sm"
							value={form?.values?.reason ?? ''}></textarea>
						<FieldError
							id="reason-error"
							error={form?.reasonRequired ? m.movement_reason_required() : null}
						/>
					</div>
				{/if}

				{#if form?.insufficientStockAvailable !== undefined}
					<p class="text-destructive text-sm" role="alert">
						{m.movement_insufficient_stock({ available: form.insufficientStockAvailable })}
					</p>
				{/if}

				<div class="flex justify-center sm:justify-end">
					<Button type="submit" class="w-full sm:w-auto" loading={submit.pending}>
						{m.movement_submit()}
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
