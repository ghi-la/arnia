import { m } from '$lib/paraglide/messages';

/**
 * Stock-count corrections are recorded with this marker as their `reason`
 * (not English text) and translated at display time. `LEGACY_COUNT_REASON`
 * covers rows written before the marker existed.
 */
export const COUNT_REASON = 'inventory_count';
const LEGACY_COUNT_REASON = 'Inventory count';

export function movementReasonLabel(reason: string): string {
	return reason === COUNT_REASON || reason === LEGACY_COUNT_REASON
		? m.count_movement_reason()
		: reason;
}
