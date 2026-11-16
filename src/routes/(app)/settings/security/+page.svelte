<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { enhance } from '$app/forms';
	import FieldError from '$lib/components/feedback/field-error.svelte';
	import { createSubmit } from '$lib/client/submit.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const enabled = $derived(
		form?.step === 'disabled' ? false : form?.step === 'enabled' ? true : data.twoFactorEnabled
	);

	/**
	 * The QR code and backup codes only arrive with the `enable` response. A
	 * failed `verify` must not make them vanish (the user still needs them to
	 * retry), so they're kept here until verification succeeds.
	 */
	let setup = $state<{ qrDataUrl: string; backupCodes: string[] } | null>(null);
	$effect(() => {
		if (form?.step === 'verify' && 'qrDataUrl' in form && form.qrDataUrl) {
			setup = { qrDataUrl: form.qrDataUrl, backupCodes: form.backupCodes };
		} else if (form?.step === 'enabled' || form?.step === 'disabled') {
			setup = null;
		}
	});

	// Errors are shown inline next to the field; toasts only for outcomes.
	const enableSubmit = createSubmit({ error: false });
	const verifySubmit = createSubmit({ error: false, success: () => m.twofactor_enabled_success() });
	const disableSubmit = createSubmit({
		error: false,
		success: () => m.twofactor_disabled_success()
	});
</script>

<svelte:head>
	<title>{m.app_name()} — {m.twofactor_title()}</title>
</svelte:head>

<Card>
	<CardHeader>
		<CardTitle>{m.twofactor_title()}</CardTitle>
		<CardDescription>{m.twofactor_intro()}</CardDescription>
	</CardHeader>
	<CardContent>
		{#if setup && !enabled}
			<div class="flex flex-col gap-4">
				<p class="text-sm">{m.twofactor_scan_qr()}</p>
				<img
					src={setup.qrDataUrl}
					alt={m.twofactor_qr_alt()}
					class="border-border size-48 self-center rounded-lg border bg-white"
				/>

				<div class="border-border bg-muted rounded-lg border p-3">
					<p class="text-sm font-medium">{m.twofactor_backup_codes_title()}</p>
					<p class="text-muted-foreground mt-1 text-xs">{m.twofactor_backup_codes_intro()}</p>
					<ul class="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
						{#each setup.backupCodes as code (code)}
							<li>{code}</li>
						{/each}
					</ul>
				</div>

				<form
					method="POST"
					action="?/verify"
					use:enhance={verifySubmit.enhance}
					class="flex flex-col gap-3"
				>
					<div class="flex flex-col gap-1.5">
						<Label for="code">{m.twofactor_verify_code()}</Label>
						<Input
							id="code"
							name="code"
							inputmode="numeric"
							autocomplete="one-time-code"
							required
							aria-invalid={form?.step === 'verify' && form.error ? true : undefined}
							aria-describedby="code-error"
						/>
						<FieldError
							id="code-error"
							error={form?.step === 'verify' && form.error ? m.twofactor_invalid_code() : null}
						/>
					</div>
					<Button type="submit" loading={verifySubmit.pending}>{m.login_2fa_submit()}</Button>
				</form>
			</div>
		{:else if enabled}
			<div class="flex flex-col gap-3">
				<form
					method="POST"
					action="?/disable"
					use:enhance={disableSubmit.enhance}
					class="flex flex-col gap-3"
				>
					<div class="flex flex-col gap-1.5">
						<Label for="disable-password">{m.common_password()}</Label>
						<Input
							id="disable-password"
							name="password"
							type="password"
							autocomplete="current-password"
							required
							aria-invalid={form?.step === 'disable' && form.error ? true : undefined}
							aria-describedby="disable-password-error"
						/>
						<FieldError
							id="disable-password-error"
							error={form?.step === 'disable' && form.error ? m.security_wrong_password() : null}
						/>
					</div>
					<Button type="submit" variant="destructive" loading={disableSubmit.pending}>
						{m.twofactor_disable()}
					</Button>
				</form>
			</div>
		{:else}
			<div class="flex flex-col gap-3">
				<form
					method="POST"
					action="?/enable"
					use:enhance={enableSubmit.enhance}
					class="flex flex-col gap-3"
				>
					<div class="flex flex-col gap-1.5">
						<Label for="enable-password">{m.common_password()}</Label>
						<Input
							id="enable-password"
							name="password"
							type="password"
							autocomplete="current-password"
							required
							aria-invalid={form?.step === 'enable' && form.error ? true : undefined}
							aria-describedby="enable-password-error"
						/>
						<FieldError
							id="enable-password-error"
							error={form?.step === 'enable' && form.error ? m.security_wrong_password() : null}
						/>
					</div>
					<Button type="submit" loading={enableSubmit.pending}>{m.twofactor_enable()}</Button>
				</form>
			</div>
		{/if}
	</CardContent>
</Card>
