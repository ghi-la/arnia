import { z } from 'zod';

function optionalId() {
	return z
		.string()
		.trim()
		.transform((v) => (v === '' ? null : v));
}

function optionalText(max: number) {
	return z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((v) => v || null);
}

/** Converts a decimal string (e.g. "12.50") to integer minor units, or null if blank. */
function decimalToMinor() {
	return z
		.string()
		.trim()
		.optional()
		.transform((v) => (v ? Math.round(Number(v) * 100) : null))
		.refine((v) => v === null || Number.isFinite(v), 'Invalid amount');
}

export const itemSchema = z
	.object({
		name: z.string().trim().min(1).max(200),
		description: optionalText(2000),
		type: z.enum(['consumable', 'equipment']),
		categoryId: optionalId(),
		locationId: optionalId(),
		unit: z.string().trim().min(1).max(20),
		sku: optionalText(100),
		barcode: optionalText(100),
		minThreshold: z.coerce.number().int().min(0).default(0),
		supplier: optionalText(200),
		notes: optionalText(2000),
		equipmentTracking: z.enum(['unit', 'quantity']).optional(),
		purchaseValue: decimalToMinor(),
		usageCost: decimalToMinor(),
		condition: z.enum(['ok', 'needs_repair', 'broken', 'lost']).optional()
	})
	.transform((v) => ({
		...v,
		purchaseValueMinor: v.type === 'equipment' ? v.purchaseValue : null,
		usageCostMinor: v.type === 'equipment' ? v.usageCost : null,
		equipmentTracking: v.type === 'equipment' ? (v.equipmentTracking ?? 'unit') : null,
		condition: v.type === 'equipment' ? (v.condition ?? 'ok') : null
	}));

export type ItemFormData = z.infer<typeof itemSchema>;
