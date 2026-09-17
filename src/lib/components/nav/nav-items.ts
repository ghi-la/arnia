import { Boxes, Calendar, Ellipsis, House, type LucideIcon, Wallet } from '@lucide/svelte';
import { m } from '$lib/paraglide/messages';

export interface NavItem {
	href: '/' | '/events' | '/inventory' | '/finance' | '/more';
	label: () => string;
	icon: LucideIcon;
}

export function getPrimaryNavItems(): NavItem[] {
	return [
		{ href: '/', label: m.nav_home, icon: House },
		{ href: '/events', label: m.nav_events, icon: Calendar },
		{ href: '/inventory', label: m.nav_inventory, icon: Boxes },
		{ href: '/finance', label: m.nav_finance, icon: Wallet },
		{ href: '/more', label: m.nav_more, icon: Ellipsis }
	];
}
