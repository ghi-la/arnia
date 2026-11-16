<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import FieldError from '$lib/components/feedback/field-error.svelte';
	import { createSubmit } from '$lib/client/submit.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let vatEnabled = $state(false);
	const finish = createSubmit({ reset: false, success: () => m.setup_finish_done() });
</script>

<svelte:head>
	<title>{m.app_name()} — {m.setup_step_finish()}</title>
</svelte:head>

<h2 class="text-base font-semibold">{m.setup_step_finish()}</h2>

<form method="POST" use:enhance={finish.enhance} class="mt-5 flex flex-col gap-5">
	<label class="flex items-start gap-3 text-sm">
		<input
			type="checkbox"
			name="seedRoles"
			checked
			class="border-input mt-0.5 size-5 shrink-0 rounded"
		/>
		<span>{m.setup_finish_seed_roles()}</span>
	</label>

	<div>
		<label class="flex items-start gap-3 text-sm">
			<input
				type="checkbox"
				name="vatEnabled"
				bind:checked={vatEnabled}
				class="border-input mt-0.5 size-5 shrink-0 rounded"
			/>
			<span>{m.setup_finish_vat_enable()}</span>
		</label>

		{#if vatEnabled}
			<div class="mt-3 flex flex-col gap-1.5 pl-8">
				<Label for="vatNumber">{m.setup_finish_vat_number()}</Label>
				<Input
					id="vatNumber"
					name="vatNumber"
					aria-invalid={form?.errors?.vatNumber ? true : undefined}
					aria-describedby="vatNumber-error"
				/>
				<FieldError
					id="vatNumber-error"
					error={form?.errors?.vatNumber ? m.field_too_long() : null}
				/>
			</div>
		{/if}
	</div>

	<div class="mt-2 flex justify-end">
		<Button type="submit" loading={finish.pending}>{m.setup_finish_complete()}</Button>
	</div>
</form>
