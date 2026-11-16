<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Combobox } from '$lib/components/ui/combobox';
	import { createTaxonomyEntry } from '$lib/client/taxonomy';
	import FieldError from '$lib/components/feedback/field-error.svelte';
	import type { Snippet } from 'svelte';
	import type { InventoryCategory, Item, Location } from '$lib/server/db/types';

	interface Props {
		categories: InventoryCategory[];
		locations: Location[];
		item?: Item;
		values?: Record<string, string>;
		errors?: Record<string, string[] | undefined>;
		/** The parent form's submission is in flight. */
		pending?: boolean;
		/** Progress text shown under the save button while `pending` (e.g. photo uploads). */
		status?: string | null;
		/** Photo section, rendered just above the save button. */
		photos?: Snippet;
	}

	let {
		categories,
		locations,
		item,
		values,
		errors = {},
		pending = false,
		status = null,
		photos
	}: Props = $props();

	/**
	 * Localized message per field — the server's Zod messages are English
	 * and never shown directly. `undefined` when the field is valid.
	 */
	function errorFor(name: string): string | undefined {
		if (!errors[name]?.length) return undefined;
		switch (name) {
			case 'name':
				return m.item_name_error();
			case 'unit':
				return m.item_unit_error();
			case 'minThreshold':
				return m.item_min_threshold_error();
			case 'purchaseValue':
			case 'usageCost':
				return m.field_amount_invalid();
			default:
				return m.field_too_long();
		}
	}

	/** Spread onto an input to link it to its `FieldError` for screen readers. */
	function a11y(name: string) {
		const invalid = !!errorFor(name);
		return invalid ? { 'aria-invalid': true as const, 'aria-describedby': `${name}-error` } : {};
	}

	function field(name: string, fallback = ''): string {
		return values?.[name] ?? (item as unknown as Record<string, string>)?.[name] ?? fallback;
	}

	let type = $state(field('type', 'consumable'));
	let categoryId = $state(field('categoryId'));
	let locationId = $state(field('locationId'));
	let equipmentTracking = $state(field('equipmentTracking', 'unit'));
	let condition = $state(field('condition', 'ok'));

	// Fixed domain values (they drive behaviour), so these are pick-only.
	const typeOptions = $derived([
		{ value: 'consumable', label: m.inventory_type_consumable() },
		{ value: 'equipment', label: m.inventory_type_equipment() }
	]);
	const trackingOptions = $derived([
		{ value: 'unit', label: m.item_equipment_tracking_unit() },
		{ value: 'quantity', label: m.item_equipment_tracking_quantity() }
	]);
	const conditionOptions = $derived([
		{ value: 'ok', label: m.item_condition_ok() },
		{ value: 'needs_repair', label: m.item_condition_needs_repair() },
		{ value: 'broken', label: m.item_condition_broken() },
		{ value: 'lost', label: m.item_condition_lost() }
	]);

	// User-defined lists, creatable on the fly.
	const categoryOptions = $derived(categories.map((c) => ({ value: c.id, label: c.name })));
	const locationOptions = $derived(locations.map((l) => ({ value: l.id, label: l.name })));
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-1.5">
		<Label for="name">{m.item_name()}</Label>
		<Input id="name" name="name" required value={field('name')} {...a11y('name')} />
		<FieldError id="name-error" error={errorFor('name')} />
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="description">{m.item_description()}</Label>
		<textarea
			id="description"
			name="description"
			rows="2"
			class="border-input bg-card rounded-md border px-3 py-2 text-base md:text-sm"
			value={field('description')}
			{...a11y('description')}></textarea>
		<FieldError id="description-error" error={errorFor('description')} />
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="type">{m.item_type()}</Label>
		<Combobox id="type" name="type" bind:value={type} options={typeOptions} />
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="flex flex-col gap-1.5">
			<Label for="categoryId">{m.item_category()}</Label>
			<Combobox
				id="categoryId"
				name="categoryId"
				bind:value={categoryId}
				options={categoryOptions}
				placeholder={m.item_none()}
				clearable
				oncreate={(name) => createTaxonomyEntry('category', name)}
			/>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="locationId">{m.item_location()}</Label>
			<Combobox
				id="locationId"
				name="locationId"
				bind:value={locationId}
				options={locationOptions}
				placeholder={m.item_none()}
				clearable
				oncreate={(name) => createTaxonomyEntry('location', name)}
			/>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="flex flex-col gap-1.5">
			<Label for="unit">{m.item_unit()}</Label>
			<Input
				id="unit"
				name="unit"
				required
				value={field('unit', m.item_unit_default())}
				{...a11y('unit')}
			/>
			<FieldError id="unit-error" error={errorFor('unit')} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="minThreshold">{m.item_min_threshold()}</Label>
			<Input
				id="minThreshold"
				name="minThreshold"
				type="number"
				inputmode="numeric"
				min="0"
				value={field('minThreshold', '0')}
				{...a11y('minThreshold')}
			/>
			<FieldError id="minThreshold-error" error={errorFor('minThreshold')} />
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="flex flex-col gap-1.5">
			<Label for="sku">{m.item_sku()}</Label>
			<Input id="sku" name="sku" value={field('sku')} {...a11y('sku')} />
			<FieldError id="sku-error" error={errorFor('sku')} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="barcode">{m.item_barcode()}</Label>
			<Input id="barcode" name="barcode" value={field('barcode')} {...a11y('barcode')} />
			<FieldError id="barcode-error" error={errorFor('barcode')} />
		</div>
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="supplier">{m.item_supplier()}</Label>
		<Input id="supplier" name="supplier" value={field('supplier')} {...a11y('supplier')} />
		<FieldError id="supplier-error" error={errorFor('supplier')} />
	</div>

	{#if type === 'equipment'}
		<div class="border-border flex flex-col gap-4 rounded-lg border p-3">
			<div class="flex flex-col gap-1.5">
				<Label for="equipmentTracking">{m.item_equipment_tracking()}</Label>
				<Combobox
					id="equipmentTracking"
					name="equipmentTracking"
					bind:value={equipmentTracking}
					options={trackingOptions}
				/>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1.5">
					<Label for="purchaseValueMinor">{m.item_purchase_value()}</Label>
					<Input
						id="purchaseValueMinor"
						name="purchaseValue"
						type="number"
						inputmode="decimal"
						min="0"
						step="0.01"
						value={field('purchaseValue')}
						{...a11y('purchaseValue')}
					/>
					<FieldError id="purchaseValue-error" error={errorFor('purchaseValue')} />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="usageCostMinor">{m.item_usage_cost()}</Label>
					<Input
						id="usageCostMinor"
						name="usageCost"
						type="number"
						inputmode="decimal"
						min="0"
						step="0.01"
						value={field('usageCost')}
						{...a11y('usageCost')}
					/>
					<FieldError id="usageCost-error" error={errorFor('usageCost')} />
				</div>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="condition">{m.item_condition()}</Label>
				<Combobox
					id="condition"
					name="condition"
					bind:value={condition}
					options={conditionOptions}
				/>
			</div>
		</div>
	{/if}

	<div class="flex flex-col gap-1.5">
		<Label for="notes">{m.item_notes()}</Label>
		<textarea
			id="notes"
			name="notes"
			rows="2"
			class="border-input bg-card rounded-md border px-3 py-2 text-base md:text-sm"
			value={field('notes')}
			{...a11y('notes')}></textarea>
		<FieldError id="notes-error" error={errorFor('notes')} />
	</div>

	{@render photos?.()}

	<div class="flex flex-col items-center gap-2 sm:items-end">
		<Button type="submit" class="w-full sm:w-auto" loading={pending}>{m.item_save()}</Button>
		{#if pending && status}
			<p class="text-muted-foreground text-sm" role="status" aria-live="polite">{status}</p>
		{/if}
	</div>
</div>
