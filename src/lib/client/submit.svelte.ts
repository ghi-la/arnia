import type { SubmitFunction } from '@sveltejs/kit';
import { toast } from 'svelte-sonner';
import { m } from '$lib/paraglide/messages';
import { confirmDialog, type ConfirmOptions } from './confirm.svelte';

type ActionData = Record<string, unknown> | undefined;
type SubmitInput = Parameters<SubmitFunction>[0];

/** A message, a lazy message, or `null`/`false` to show no toast. */
type Message<T extends unknown[] = []> =
	string | ((...args: T) => string | null | false | undefined) | null | false;

export interface SubmitOptions {
	/**
	 * Ask before submitting. A function gets the submission (form data,
	 * element, submitter) so per-row forms can name what they're about to
	 * delete; returning `null` skips the confirmation for that submission.
	 */
	confirm?: ConfirmOptions | ((input: SubmitInput) => ConfirmOptions | null);
	/** Toast on success (including success-then-redirect). Omit for none. */
	success?: Message<[data: ActionData]>;
	/**
	 * Toast on `fail(...)`. Defaults to "check the highlighted fields" when
	 * the failure carries field `errors`, else the generic error message.
	 * Return `false` to suppress the toast (e.g. the page shows it inline).
	 */
	error?: Message<[data: ActionData, status: number]>;
	/** Reset the form after a successful submit (SvelteKit's default: true). */
	reset?: boolean;
	/** Field used to tell concurrent per-row submissions apart (default `id`). */
	keyField?: string;
	onSuccess?: (data: ActionData) => void;
	/**
	 * Runs when the action redirects, *before* navigating — e.g. the create
	 * form uploads queued photos to the item it just created (its id is in
	 * `location`). The button stays in its pending state meanwhile, and the
	 * success toast is evaluated after this finishes.
	 */
	beforeRedirect?: (location: string) => Promise<void>;
}

function resolveMessage<T extends unknown[]>(msg: Message<T> | undefined, ...args: T) {
	if (typeof msg === 'function') return msg(...args) || null;
	return msg || null;
}

function errorStatusMessage(status: number | undefined): string {
	if (status === 403) return m.common_error_forbidden();
	if (status === 404) return m.common_error_not_found();
	if (!status) return m.common_error_network();
	return m.common_error_generic();
}

/**
 * The one way forms in Arnia talk to their actions: `use:enhance={x.enhance}`
 * plus `<Button loading={x.pending}>`. Every submission gets a pending state,
 * an optional confirmation, and a toast for success / failure / crash — so
 * no action is ever silent.
 *
 *     const save = createSubmit({ success: () => m.item_saved() });
 *     <form method="POST" use:enhance={save.enhance}>
 *       <Button type="submit" loading={save.pending}>…</Button>
 *
 * For a list of per-row forms sharing one instance, use
 * `loading={del.isPending(row.id)}` (keyed on the form's `id` field).
 */
export function createSubmit(options: SubmitOptions = {}) {
	let pending = $state(false);
	let pendingKey = $state<string | null>(null);

	function showSuccess(data: ActionData) {
		const msg = resolveMessage(options.success, data);
		if (msg) toast.success(msg);
	}

	function showFailure(data: ActionData, status: number) {
		if (options.error !== undefined) {
			const msg = resolveMessage(options.error, data, status);
			if (msg) toast.error(msg);
			return;
		}
		const hasFieldErrors =
			!!data && typeof data.errors === 'object' && data.errors !== null
				? Object.keys(data.errors).length > 0
				: false;
		toast.error(hasFieldErrors ? m.common_error_check_fields() : m.common_error_generic());
	}

	const enhance: SubmitFunction = async (input) => {
		if (options.confirm) {
			const confirm =
				typeof options.confirm === 'function' ? options.confirm(input) : options.confirm;
			if (confirm && !(await confirmDialog(confirm))) {
				input.cancel();
				return;
			}
		}

		pending = true;
		const key = input.formData.get(options.keyField ?? 'id');
		pendingKey = typeof key === 'string' ? key : null;

		return async ({ result, update }) => {
			try {
				switch (result.type) {
					case 'success':
						await update({ reset: options.reset ?? true });
						showSuccess(result.data);
						options.onSuccess?.(result.data);
						break;
					case 'redirect':
						await options.beforeRedirect?.(result.location);
						// Toast first: the Toaster lives in the root layout, so it
						// survives the navigation `update()` performs.
						showSuccess(undefined);
						await update();
						break;
					case 'failure':
						await update({ reset: false });
						showFailure(result.data, result.status);
						break;
					case 'error':
						// Stay on the page with a toast rather than swapping the whole
						// screen for the error page over a failed button press.
						toast.error(errorStatusMessage(result.status));
						break;
				}
			} finally {
				pending = false;
				pendingKey = null;
			}
		};
	};

	return {
		get pending() {
			return pending;
		},
		isPending(key: string) {
			return pending && pendingKey === key;
		},
		enhance
	};
}
