import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@sveltejs/kit';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('./confirm.svelte', () => ({ confirmDialog: vi.fn() }));

const { toast } = await import('svelte-sonner');
const { confirmDialog } = await import('./confirm.svelte');
const { createSubmit } = await import('./submit.svelte');

type SubmitInput = Parameters<ReturnType<typeof createSubmit>['enhance']>[0];

function input(fields: Record<string, string> = {}) {
	const formData = new FormData();
	for (const [k, v] of Object.entries(fields)) formData.set(k, v);
	const cancel = vi.fn();
	return {
		cancel,
		value: { formData, cancel, formElement: {}, submitter: null } as unknown as SubmitInput
	};
}

async function run(
	submit: ReturnType<typeof createSubmit>,
	result: ActionResult,
	fields?: Record<string, string>
) {
	const { value, cancel } = input(fields);
	const callback = await submit.enhance(value);
	const update = vi.fn(async () => {});
	if (typeof callback === 'function') {
		await callback({ result, update } as unknown as Parameters<typeof callback>[0]);
	}
	return { update, cancel, callback };
}

beforeEach(() => vi.clearAllMocks());

describe('createSubmit', () => {
	it('is pending while the action runs, and toasts success afterwards', async () => {
		const submit = createSubmit({ success: () => 'Saved' });
		const { value } = input({ id: 'row-1' });

		const callback = await submit.enhance(value);
		expect(submit.pending).toBe(true);
		expect(submit.isPending('row-1')).toBe(true);
		expect(submit.isPending('row-2')).toBe(false);

		if (typeof callback !== 'function') throw new Error('expected a callback');
		await callback({
			result: { type: 'success', status: 200, data: {} },
			update: async () => {}
		} as unknown as Parameters<typeof callback>[0]);

		expect(submit.pending).toBe(false);
		expect(toast.success).toHaveBeenCalledWith('Saved');
	});

	it('toasts before applying a redirect, so create/edit flows get feedback', async () => {
		const order: string[] = [];
		vi.mocked(toast.success).mockImplementation(() => {
			order.push('toast');
			return 1;
		});
		const submit = createSubmit({ success: () => 'Created' });
		const { value } = input();
		const callback = await submit.enhance(value);
		if (typeof callback !== 'function') throw new Error('expected a callback');
		await callback({
			result: { type: 'redirect', status: 303, location: '/x' },
			update: async () => {
				order.push('navigate');
			}
		} as unknown as Parameters<typeof callback>[0]);
		expect(order).toEqual(['toast', 'navigate']);
	});

	it('asks to check fields when a failure carries field errors', async () => {
		await run(createSubmit(), { type: 'failure', status: 400, data: { errors: { name: ['x'] } } });
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.success).not.toHaveBeenCalled();
	});

	it('lets the page suppress the failure toast', async () => {
		await run(createSubmit({ error: false }), { type: 'failure', status: 400, data: {} });
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('stays on the page (no update) and toasts when the action crashes', async () => {
		const { update } = await run(createSubmit(), {
			type: 'error',
			status: 500,
			error: new Error('boom')
		});
		expect(update).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledTimes(1);
	});

	it('cancels without submitting when the confirmation is declined', async () => {
		vi.mocked(confirmDialog).mockResolvedValueOnce(false);
		const submit = createSubmit({ confirm: { title: 'Delete?' } });
		const { value, cancel } = input();
		const callback = await submit.enhance(value);
		expect(cancel).toHaveBeenCalled();
		expect(callback).toBeUndefined();
		expect(submit.pending).toBe(false);
	});
});
