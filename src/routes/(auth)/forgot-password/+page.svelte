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
	import { MailCheck } from '@lucide/svelte';
	import { createSubmit } from '$lib/client/submit.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const send = createSubmit();
</script>

<svelte:head>
	<title>{m.app_name()} — {m.forgot_password_title()}</title>
</svelte:head>

<Card>
	<CardHeader>
		<CardTitle>{m.forgot_password_title()}</CardTitle>
		{#if data.emailAvailable && !form?.sent}
			<CardDescription>{m.forgot_password_intro()}</CardDescription>
		{/if}
	</CardHeader>
	<CardContent>
		{#if !data.emailAvailable}
			<p class="text-muted-foreground text-sm">{m.forgot_password_unavailable()}</p>
		{:else if form?.sent}
			<p class="flex items-start gap-2 text-sm" role="status">
				<MailCheck class="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
				{m.forgot_password_sent()}
			</p>
		{:else}
			<form method="POST" use:enhance={send.enhance} class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<Label for="email">{m.common_email()}</Label>
					<Input id="email" name="email" type="email" autocomplete="email" required />
				</div>
				<Button type="submit" loading={send.pending}>{m.forgot_password_submit()}</Button>
			</form>
		{/if}
	</CardContent>
</Card>
