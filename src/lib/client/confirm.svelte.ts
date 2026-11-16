/**
 * Imperative, promise-based confirmation dialog: `await confirmDialog({...})`
 * resolves `true` when the user confirms and `false` on cancel/dismiss. A
 * single `<ConfirmDialogHost />` (mounted once in the root layout) renders
 * whatever request is current — call sites never mount their own dialog.
 * Used by `createSubmit({ confirm })` to gate destructive form actions.
 */
export interface ConfirmOptions {
	title: string;
	description?: string;
	/** Defaults to `m.common_confirm()`. */
	confirmLabel?: string;
	/** Renders the confirm button in the destructive (red) variant. */
	destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
	resolve: (confirmed: boolean) => void;
}

export const confirmState = $state<{ current: PendingConfirm | null }>({ current: null });

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
	// A new request supersedes any dialog still open (treated as cancelled).
	confirmState.current?.resolve(false);
	return new Promise((resolve) => {
		confirmState.current = { ...options, resolve };
	});
}

export function settleConfirm(confirmed: boolean): void {
	const current = confirmState.current;
	confirmState.current = null;
	current?.resolve(confirmed);
}
