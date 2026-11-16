<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import FieldError from '$lib/components/feedback/field-error.svelte';
	import { createSubmit } from '$lib/client/submit.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	// Errors render inline (they're about the fields); just show progress.
	const signIn = createSubmit({ error: false, reset: false });
	const verify = createSubmit({ error: false, reset: false });

	let useBackupCode = $state(false);
	const showTwoFactor = $derived(form?.step === 'twoFactor');
</script>

<svelte:head>
	<title>{m.app_name()} — {m.login_title()}</title>
</svelte:head>

<Card>
	<CardHeader>
		<CardTitle>{showTwoFactor ? m.login_2fa_title() : m.login_title()}</CardTitle>
	</CardHeader>
	<CardContent>
		{#if page.url.searchParams.get('invited') === '1' && !form}
			<p class="border-success/30 bg-success/10 mb-4 rounded-lg border p-3 text-sm" role="status">
				{m.invite_accept_done_existing()}
			</p>
		{/if}
		{#if showTwoFactor}
			<form
				method="POST"
				action="?/verifyTwoFactor"
				use:enhance={verify.enhance}
				class="flex flex-col gap-4"
			>
				<input type="hidden" name="useBackupCode" value={useBackupCode} />
				<div class="flex flex-col gap-1.5">
					<Label for="code">
						{useBackupCode ? m.login_2fa_backup_code_label() : m.login_2fa_code()}
					</Label>
					<Input
						id="code"
						name="code"
						inputmode={useBackupCode ? 'text' : 'numeric'}
						autocomplete="one-time-code"
						required
						aria-invalid={form?.error === 'invalid' ? true : undefined}
						aria-describedby="code-error"
					/>
					<FieldError
						id="code-error"
						error={form?.error === 'invalid' ? m.twofactor_invalid_code() : null}
					/>
				</div>
				<Button type="submit" loading={verify.pending}>{m.login_2fa_submit()}</Button>
				<button
					type="button"
					class="text-muted-foreground min-h-11 text-sm underline underline-offset-2"
					aria-pressed={useBackupCode}
					onclick={() => (useBackupCode = !useBackupCode)}
				>
					{useBackupCode ? m.login_2fa_use_app() : m.login_2fa_backup_code()}
				</button>
			</form>
		{:else}
			<form
				method="POST"
				action="?/credentials"
				use:enhance={signIn.enhance}
				class="flex flex-col gap-4"
			>
				<div class="flex flex-col gap-1.5">
					<Label for="email">{m.login_email()}</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						value={form?.step === 'credentials' ? (form.email ?? '') : ''}
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="password">{m.login_password()}</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
					/>
				</div>
				{#if form?.error === 'invalid'}
					<p class="text-destructive text-sm" role="alert">{m.login_error_invalid()}</p>
				{/if}
				<Button type="submit" loading={signIn.pending}>{m.login_submit()}</Button>
				<a
					href={resolve('/forgot-password')}
					class="text-muted-foreground text-center text-sm underline underline-offset-2"
				>
					{m.login_forgot_password()}
				</a>
			</form>
		{/if}
	</CardContent>
</Card>
