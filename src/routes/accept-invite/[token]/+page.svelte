<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>{m.app_name()} — {m.invite_accept_title()}</title>
</svelte:head>

<div class="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
	<span class="text-primary text-2xl font-semibold">{m.app_name()}</span>
	<div class="w-full max-w-sm">
		<Card>
			<CardHeader>
				<CardTitle>{m.invite_accept_title()}</CardTitle>
			</CardHeader>
			<CardContent>
				{#if !data.pending || form?.error === 'invalid'}
					<p class="text-destructive text-sm">{m.invite_accept_invalid()}</p>
				{:else}
					<p class="text-muted-foreground mb-4 text-sm">
						{data.pending.userExists
							? m.invite_accept_intro_existing()
							: m.invite_accept_intro_new({ orgName: data.orgName })}
					</p>
					<form method="POST" class="flex flex-col gap-4">
						{#if !data.pending.userExists}
							<div class="flex flex-col gap-1.5">
								<Label for="name">{m.common_name()}</Label>
								<Input id="name" name="name" required />
							</div>
						{/if}
						<div class="flex flex-col gap-1.5">
							<Label for="password">{m.common_password()}</Label>
							<Input
								id="password"
								name="password"
								type="password"
								required
								minlength={10}
								autocomplete="new-password"
							/>
						</div>
						{#if form?.error === 'weak_password'}
							<p class="text-destructive text-sm">{m.common_error_generic()}</p>
						{/if}
						<Button type="submit">{m.invite_accept_submit()}</Button>
					</form>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
