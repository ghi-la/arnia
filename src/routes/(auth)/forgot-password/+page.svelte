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
			<p class="text-muted-foreground text-sm">{m.forgot_password_sent()}</p>
		{:else}
			<form method="POST" class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<Label for="email">{m.common_email()}</Label>
					<Input id="email" name="email" type="email" autocomplete="email" required />
				</div>
				<Button type="submit">{m.forgot_password_submit()}</Button>
			</form>
		{/if}
	</CardContent>
</Card>
