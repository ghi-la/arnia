<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { InventoryCategory, Item, Location } from '$lib/server/db/schema';

	interface Props {
		categories: InventoryCategory[];
		locations: Location[];
		item?: Item;
		values?: Record<string, string>;
		errors?: Record<string, string[]>;
	}

	let { categories, locations, item, values, errors = {} }: Props = $props();

	function field(name: string, fallback = ''): string {
		return values?.[name] ?? (item as unknown as Record<string, string>)?.[name] ?? fallback;
	}

	let type = $state(field('type', 'consumable'));
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-1.5">
		<Label for="name">{m.item_name()}</Label>
		<Input id="name" name="name" required value={field('name')} />
		{#if errors.name}<p class="text-destructive text-sm">{errors.name[0]}</p>{/if}
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="description">{m.item_description()}</Label>
		<textarea
			id="description"
			name="description"
			rows="2"
			class="border-input bg-card rounded-md border px-3 py-2 text-base md:text-sm"
			value={field('description')}></textarea>
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="type">{m.item_type()}</Label>
		<select
			id="type"
			name="type"
			bind:value={type}
			class="border-input bg-card h-11 rounded-md border px-3 text-base md:text-sm"
		>
			<option value="consumable">{m.inventory_type_consumable()}</option>
			<option value="equipment">{m.inventory_type_equipment()}</option>
		</select>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="flex flex-col gap-1.5">
			<Label for="categoryId">{m.item_category()}</Label>
			<select
				id="categoryId"
				name="categoryId"
				class="border-input bg-card h-11 rounded-md border px-3 text-base md:text-sm"
			>
				<option value="">{m.item_none()}</option>
				{#each categories as c (c.id)}
					<option value={c.id} selected={field('categoryId') === c.id}>{c.name}</option>
				{/each}
			</select>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="locationId">{m.item_location()}</Label>
			<select
				id="locationId"
				name="locationId"
				class="border-input bg-card h-11 rounded-md border px-3 text-base md:text-sm"
			>
				<option value="">{m.item_none()}</option>
				{#each locations as l (l.id)}
					<option value={l.id} selected={field('locationId') === l.id}>{l.name}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="flex flex-col gap-1.5">
			<Label for="unit">{m.item_unit()}</Label>
			<Input id="unit" name="unit" required value={field('unit', 'pz')} />
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
			/>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="flex flex-col gap-1.5">
			<Label for="sku">{m.item_sku()}</Label>
			<Input id="sku" name="sku" value={field('sku')} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="barcode">{m.item_barcode()}</Label>
			<Input id="barcode" name="barcode" value={field('barcode')} />
		</div>
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="supplier">{m.item_supplier()}</Label>
		<Input id="supplier" name="supplier" value={field('supplier')} />
	</div>

	{#if type === 'equipment'}
		<div class="border-border flex flex-col gap-4 rounded-lg border p-3">
			<div class="flex flex-col gap-1.5">
				<Label for="equipmentTracking">{m.item_equipment_tracking()}</Label>
				<select
					id="equipmentTracking"
					name="equipmentTracking"
					class="border-input bg-card h-11 rounded-md border px-3 text-base md:text-sm"
				>
					<option value="unit" selected={field('equipmentTracking', 'unit') === 'unit'}
						>{m.item_equipment_tracking_unit()}</option
					>
					<option value="quantity" selected={field('equipmentTracking') === 'quantity'}
						>{m.item_equipment_tracking_quantity()}</option
					>
				</select>
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
					/>
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
					/>
				</div>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="condition">{m.item_condition()}</Label>
				<select
					id="condition"
					name="condition"
					class="border-input bg-card h-11 rounded-md border px-3 text-base md:text-sm"
				>
					<option value="ok" selected={field('condition', 'ok') === 'ok'}
						>{m.item_condition_ok()}</option
					>
					<option value="needs_repair" selected={field('condition') === 'needs_repair'}
						>{m.item_condition_needs_repair()}</option
					>
					<option value="broken" selected={field('condition') === 'broken'}
						>{m.item_condition_broken()}</option
					>
					<option value="lost" selected={field('condition') === 'lost'}
						>{m.item_condition_lost()}</option
					>
				</select>
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
			value={field('notes')}></textarea>
	</div>

	<div class="flex justify-center sm:justify-end">
		<Button type="submit" class="w-full sm:w-auto">{m.item_save()}</Button>
	</div>
</div>
