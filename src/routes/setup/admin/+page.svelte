<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>{m.app_name()} — {m.setup_step_admin()}</title>
</svelte:head>

<h2 class="text-base font-semibold">{m.setup_step_admin()}</h2>
<p class="text-muted-foreground mt-2 text-sm">{m.setup_admin_intro()}</p>

<form method="POST" class="mt-5 flex flex-col gap-4">
	<div class="flex flex-col gap-1.5">
		<Label for="name">{m.common_name()}</Label>
		<Input id="name" name="name" required value={form?.values?.name ?? ''} />
		{#if form?.errors?.name}
			<p class="text-destructive text-sm">{form.errors.name[0]}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="email">{m.common_email()}</Label>
		<Input id="email" name="email" type="email" required value={form?.values?.email ?? ''} />
		{#if form?.errors?.email}
			<p class="text-destructive text-sm">{form.errors.email[0]}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="password">{m.common_password()}</Label>
		<Input id="password" name="password" type="password" required minlength={10} />
		{#if form?.errors?.password}
			<p class="text-destructive text-sm">{form.errors.password[0]}</p>
		{/if}
	</div>

	<div class="mt-2 flex justify-end">
		<Button type="submit">{m.common_continue()}</Button>
	</div>
</form>
