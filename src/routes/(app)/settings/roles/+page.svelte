<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { enhance } from '$app/forms';
	import { createSubmit } from '$lib/client/submit.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const create = createSubmit({
		success: (result) => m.roles_created({ name: String(result?.created ?? '') }),
		error: (failure) =>
			failure?.createError === 'duplicate' ? m.roles_duplicate() : m.roles_name_error()
	});
	const remove = createSubmit({
		confirm: ({ formElement }) => ({
			title: m.roles_delete_confirm_title(),
			description: `${formElement.dataset.name}: ${m.roles_delete_confirm_body()}`,
			confirmLabel: m.common_delete(),
			destructive: true
		}),
		success: () => m.roles_deleted(),
		error: (failure) =>
			failure?.deleteError === 'system' ? m.roles_system_locked() : m.common_error_generic()
	});
	const savePermissions = createSubmit({
		keyField: 'roleId',
		reset: false,
		success: () => m.roles_permissions_saved()
	});

	function groupOf(permission: string): string {
		return permission.split('.')[0];
	}
	const groups = $derived([...new Set(data.allPermissions.map(groupOf))]);
</script>

<svelte:head>
	<title>{m.app_name()} — {m.roles_title()}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<h1 class="text-xl font-semibold">{m.roles_title()}</h1>

	<Card>
		<CardHeader>
			<CardTitle>{m.roles_new()}</CardTitle>
		</CardHeader>
		<CardContent>
			<form
				method="POST"
				action="?/create"
				use:enhance={create.enhance}
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
			>
				<div class="flex flex-1 flex-col gap-1.5">
					<Label for="role-name">{m.roles_name()}</Label>
					<Input id="role-name" name="name" required />
				</div>
				<Button type="submit" loading={create.pending}>{m.roles_new()}</Button>
			</form>
			{#if form?.createError}
				<p class="text-destructive mt-2 text-sm" role="alert">
					{form.createError === 'duplicate' ? m.roles_duplicate() : m.roles_name_error()}
				</p>
			{/if}
		</CardContent>
	</Card>

	<div class="flex flex-col gap-3">
		{#if data.roles.length === 0}
			<p class="text-muted-foreground text-center text-sm">{m.roles_empty()}</p>
		{/if}
		{#each data.roles as r (r.id)}
			<Card>
				<CardContent class="pt-4">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="font-medium">{r.name}</p>
							{#if r.description}<p class="text-muted-foreground text-sm">{r.description}</p>{/if}
							<p class="text-muted-foreground mt-1 text-xs">
								{m.roles_in_use({ count: r.userCount })}
							</p>
						</div>
						{#if r.isSystem}
							<Badge variant="outline">{m.roles_system_locked()}</Badge>
						{:else}
							<form method="POST" action="?/delete" data-name={r.name} use:enhance={remove.enhance}>
								<input type="hidden" name="id" value={r.id} />
								<Button
									type="submit"
									variant="ghost"
									size="sm"
									loading={remove.isPending(r.id)}
									aria-label={m.common_delete_named({ name: r.name })}
								>
									{m.common_delete()}
								</Button>
							</form>
						{/if}
					</div>

					<details class="mt-3">
						<summary class="text-muted-foreground cursor-pointer text-sm font-medium">
							{m.roles_permissions()}
						</summary>
						<form
							method="POST"
							action="?/updatePermissions"
							use:enhance={savePermissions.enhance}
							class="mt-3 flex flex-col gap-4"
						>
							<input type="hidden" name="roleId" value={r.id} />
							{#each groups as group (group)}
								<div>
									<p class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
										{group}
									</p>
									<div class="mt-1.5 flex flex-wrap gap-2">
										{#each data.allPermissions.filter((p) => groupOf(p) === group) as permission (permission)}
											<label
												class="border-input flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
											>
												<input
													type="checkbox"
													name="permissions"
													value={permission}
													checked={r.permissions.includes(permission)}
												/>
												{permission.split('.')[1]}
											</label>
										{/each}
									</div>
								</div>
							{/each}
							<div class="flex justify-center sm:justify-end">
								<Button type="submit" size="sm" loading={savePermissions.isPending(r.id)}>
									{m.common_save()}
								</Button>
							</div>
						</form>
					</details>
				</CardContent>
			</Card>
		{/each}
	</div>
</div>
