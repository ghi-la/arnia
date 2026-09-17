<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

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
		{#if showTwoFactor}
			<form method="POST" action="?/verifyTwoFactor" class="flex flex-col gap-4">
				<input type="hidden" name="useBackupCode" value={useBackupCode} />
				<div class="flex flex-col gap-1.5">
					<Label for="code">{m.login_2fa_code()}</Label>
					<Input id="code" name="code" inputmode="numeric" autocomplete="one-time-code" required />
				</div>
				{#if form?.error === 'invalid'}
					<p class="text-destructive text-sm">{m.login_error_invalid()}</p>
				{/if}
				<Button type="submit">{m.login_2fa_submit()}</Button>
				<button
					type="button"
					class="text-muted-foreground text-sm underline underline-offset-2"
					onclick={() => (useBackupCode = !useBackupCode)}
				>
					{m.login_2fa_backup_code()}
				</button>
			</form>
		{:else}
			<form method="POST" action="?/credentials" class="flex flex-col gap-4">
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
					<p class="text-destructive text-sm">{m.login_error_invalid()}</p>
				{/if}
				<Button type="submit">{m.login_submit()}</Button>
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
