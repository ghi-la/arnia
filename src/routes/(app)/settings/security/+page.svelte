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
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const enabled = $derived(
		form?.step === 'disabled' ? false : form?.step === 'enabled' ? true : data.twoFactorEnabled
	);
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
		{#if form?.step === 'verify'}
			<div class="flex flex-col gap-4">
				<p class="text-sm">{m.twofactor_scan_qr()}</p>
				<img
					src={form.qrDataUrl}
					alt="QR code"
					class="border-border size-48 self-center rounded-lg border"
				/>

				<div class="border-border bg-muted rounded-lg border p-3">
					<p class="text-sm font-medium">{m.twofactor_backup_codes_title()}</p>
					<p class="text-muted-foreground mt-1 text-xs">{m.twofactor_backup_codes_intro()}</p>
					<ul class="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
						{#each form.backupCodes as code (code)}
							<li>{code}</li>
						{/each}
					</ul>
				</div>

				<form method="POST" action="?/verify" class="flex flex-col gap-3">
					<div class="flex flex-col gap-1.5">
						<Label for="code">{m.twofactor_verify_code()}</Label>
						<Input id="code" name="code" inputmode="numeric" required />
					</div>
					{#if form.error}<p class="text-destructive text-sm">{m.common_error_generic()}</p>{/if}
					<Button type="submit">{m.login_2fa_submit()}</Button>
				</form>
			</div>
		{:else if enabled}
			<div class="flex flex-col gap-3">
				<p class="text-success text-sm">
					{form?.step === 'enabled' ? m.twofactor_enabled_success() : ''}
				</p>
				<form method="POST" action="?/disable" class="flex flex-col gap-3">
					<div class="flex flex-col gap-1.5">
						<Label for="disable-password">{m.common_password()}</Label>
						<Input id="disable-password" name="password" type="password" required />
					</div>
					{#if form?.step === 'disable' && form.error}
						<p class="text-destructive text-sm">{m.common_error_generic()}</p>
					{/if}
					<Button type="submit" variant="destructive">{m.twofactor_disable()}</Button>
				</form>
			</div>
		{:else}
			<div class="flex flex-col gap-3">
				{#if form?.step === 'disabled'}
					<p class="text-muted-foreground text-sm">{m.twofactor_disabled_success()}</p>
				{/if}
				<form method="POST" action="?/enable" class="flex flex-col gap-3">
					<div class="flex flex-col gap-1.5">
						<Label for="enable-password">{m.common_password()}</Label>
						<Input id="enable-password" name="password" type="password" required />
					</div>
					{#if form?.step === 'enable' && form.error}
						<p class="text-destructive text-sm">{m.common_error_generic()}</p>
					{/if}
					<Button type="submit">{m.twofactor_enable()}</Button>
				</form>
			</div>
		{/if}
	</CardContent>
</Card>
