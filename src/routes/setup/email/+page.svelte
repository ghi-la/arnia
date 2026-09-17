<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const LOCALES = [
		{ code: 'it', label: 'Italiano' },
		{ code: 'de', label: 'Deutsch' },
		{ code: 'fr', label: 'Français' },
		{ code: 'en', label: 'English' }
	];

	const selected = untrack(() => new SvelteSet<string>(data.org.enabledLocales ?? ['it']));
	let sending = $state(false);

	function toggle(code: string) {
		if (selected.has(code)) {
			if (selected.size === 1) return;
			selected.delete(code);
		} else {
			selected.add(code);
		}
	}
</script>

<svelte:head>
	<title>{m.app_name()} — {m.setup_step_locales_email()}</title>
</svelte:head>

<h2 class="text-base font-semibold">{m.setup_step_locales_email()}</h2>
<p class="text-muted-foreground mt-2 text-sm">{m.setup_locales_intro()}</p>

<div class="mt-5">
	<span class="text-sm font-medium">{m.setup_locales_enabled()}</span>
	<div class="mt-2 flex flex-wrap gap-2">
		{#each LOCALES as locale (locale.code)}
			<button
				type="button"
				onclick={() => toggle(locale.code)}
				class="rounded-full border px-3 py-1.5 text-sm {selected.has(locale.code)
					? 'border-primary bg-primary/10 text-primary'
					: 'border-input text-muted-foreground'}"
			>
				{locale.label}
			</button>
		{/each}
	</div>
</div>

<div class="border-border mt-6 rounded-lg border p-4">
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium">{m.setup_email_provider()}</span>
		<span class="text-muted-foreground text-sm">
			{#if data.emailProvider === 'resend'}{m.setup_email_provider_resend()}
			{:else if data.emailProvider === 'smtp'}{m.setup_email_provider_smtp()}
			{:else}{m.setup_email_provider_none()}
			{/if}
		</span>
	</div>

	{#if data.emailProvider !== 'none'}
		<form
			method="POST"
			action="?/sendTest"
			class="mt-3"
			use:enhance={() => {
				sending = true;
				return async ({ update }) => {
					sending = false;
					await update();
				};
			}}
		>
			<Button type="submit" variant="outline" size="sm" disabled={sending}>
				{m.setup_email_test_send()}
			</Button>
		</form>

		{#if form?.testResult === 'sent'}
			<p class="text-success mt-2 text-sm">{m.setup_email_test_sent()}</p>
		{:else if form?.testResult === 'failed'}
			<p class="text-destructive mt-2 text-sm">
				{m.setup_email_test_failed({ error: form.testError ?? '' })}
			</p>
		{/if}
	{/if}
</div>

<form method="POST" action="?/continue" class="mt-6 flex justify-end">
	{#each selected as code (code)}
		<input type="hidden" name="locales" value={code} />
	{/each}
	<Button type="submit">{m.common_continue()}</Button>
</form>
