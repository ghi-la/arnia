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

	const submit = createSubmit({ reset: false });
	const errors = $derived<Record<string, string[] | undefined>>(form?.errors ?? {});
</script>

<svelte:head>
	<title>{m.app_name()} — {m.setup_step_admin()}</title>
</svelte:head>

<h2 class="text-base font-semibold">{m.setup_step_admin()}</h2>
<p class="text-muted-foreground mt-2 text-sm">{m.setup_admin_intro()}</p>

<form method="POST" use:enhance={submit.enhance} class="mt-5 flex flex-col gap-4">
	<div class="flex flex-col gap-1.5">
		<Label for="name">{m.common_name()}</Label>
		<Input
			id="name"
			name="name"
			required
			value={form?.values?.name ?? ''}
			aria-invalid={errors.name ? true : undefined}
			aria-describedby="name-error"
		/>
		<FieldError id="name-error" error={errors.name ? m.field_required() : null} />
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="email">{m.common_email()}</Label>
		<Input
			id="email"
			name="email"
			type="email"
			required
			value={form?.values?.email ?? ''}
			aria-invalid={errors.email ? true : undefined}
			aria-describedby="email-error"
		/>
		<FieldError id="email-error" error={errors.email ? m.field_email_invalid() : null} />
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="password">{m.common_password()}</Label>
		<Input
			id="password"
			name="password"
			type="password"
			autocomplete="new-password"
			required
			minlength={10}
			aria-invalid={errors.password ? true : undefined}
			aria-describedby="password-hint"
		/>
		{#if errors.password}
			<FieldError id="password-hint" error={m.password_rule()} />
		{:else}
			<p id="password-hint" class="text-muted-foreground text-xs">{m.password_rule()}</p>
		{/if}
	</div>

	{#if form && 'signupError' in form && form.signupError}
		<p class="text-destructive text-sm" role="alert">{m.common_error_generic()}</p>
	{/if}

	<div class="mt-2 flex justify-end">
		<Button type="submit" loading={submit.pending}>{m.common_continue()}</Button>
	</div>
</form>
