<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { createSubmit } from '$lib/client/submit.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const LOCALES = [
		{ code: 'it', label: 'Italiano' },
		{ code: 'de', label: 'Deutsch' },
		{ code: 'fr', label: 'Français' },
		{ code: 'en', label: 'English' }
	];

	const selected = untrack(() => new SvelteSet<string>(data.org.enabledLocales ?? ['it']));
	const sendTest = createSubmit({
		success: (result) => (result?.testResult === 'sent' ? m.setup_email_test_sent() : null),
		error: false
	});
	const next = createSubmit({ error: () => m.setup_locales_required() });

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
				aria-pressed={selected.has(locale.code)}
				onclick={() => toggle(locale.code)}
				class="min-h-11 rounded-full border px-3 py-1.5 text-sm {selected.has(locale.code)
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
		<form method="POST" action="?/sendTest" class="mt-3" use:enhance={sendTest.enhance}>
			<Button type="submit" variant="outline" size="sm" loading={sendTest.pending}>
				{m.setup_email_test_send()}
			</Button>
		</form>

		{#if form?.testResult === 'sent'}
			<p class="text-success mt-2 text-sm">{m.setup_email_test_sent()}</p>
		{:else if form?.testResult === 'failed'}
			<p class="text-destructive mt-2 text-sm" role="alert">
				{m.setup_email_test_failed({ error: form.testError ?? '' })}
			</p>
		{/if}
	{/if}
</div>

<form
	method="POST"
	action="?/continue"
	use:enhance={next.enhance}
	class="mt-6 flex flex-col items-end gap-2"
>
	{#each selected as code (code)}
		<input type="hidden" name="locales" value={code} />
	{/each}
	{#if form && 'errors' in form && form.errors}
		<p class="text-destructive text-sm" role="alert">{m.setup_locales_required()}</p>
	{/if}
	<Button type="submit" loading={next.pending}>{m.common_continue()}</Button>
</form>
