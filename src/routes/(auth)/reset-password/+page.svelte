<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
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
			<p class="text-success text-sm">{m.reset_password_success()}</p>
			<a href={resolve('/login')} class="mt-3 inline-block text-sm underline underline-offset-2">
				{m.login_title()}
			</a>
		{:else}
			<form method="POST" class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<Label for="password">{m.common_password()}</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						required
						minlength={10}
					/>
				</div>
				{#if form?.error === 'weak_password'}
					<p class="text-destructive text-sm">{m.common_error_generic()}</p>
				{/if}
				<Button type="submit">{m.reset_password_submit()}</Button>
			</form>
		{/if}
	</CardContent>
</Card>
