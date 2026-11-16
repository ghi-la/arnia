<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import FieldError from '$lib/components/feedback/field-error.svelte';
	import { createSubmit } from '$lib/client/submit.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const save = createSubmit({ error: false });
</script>

<svelte:head>
	<title>{m.app_name()} — {m.reset_password_title()}</title>
</svelte:head>

<Card>
	<CardHeader>
		<CardTitle>{m.reset_password_title()}</CardTitle>
	</CardHeader>
	<CardContent>
		{#if !data.hasToken || form?.error === 'invalid_token'}
			<p class="text-destructive text-sm">{m.reset_password_invalid_token()}</p>
		{:else if form?.success}
			<p class="text-success text-sm" role="status">{m.reset_password_success()}</p>
			<Button href={resolve('/login')} class="mt-4 w-full">{m.login_submit()}</Button>
		{:else}
			<form method="POST" use:enhance={save.enhance} class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<Label for="password">{m.common_password()}</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						required
						minlength={10}
						aria-invalid={form?.error === 'weak_password' ? true : undefined}
						aria-describedby="password-hint"
					/>
					{#if form?.error === 'weak_password'}
						<FieldError id="password-hint" error={m.password_rule()} />
					{:else}
						<p id="password-hint" class="text-muted-foreground text-xs">{m.password_rule()}</p>
					{/if}
				</div>
				<Button type="submit" loading={save.pending}>{m.reset_password_submit()}</Button>
			</form>
		{/if}
	</CardContent>
</Card>
