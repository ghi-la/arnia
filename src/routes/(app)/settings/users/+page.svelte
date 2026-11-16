<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { enhance } from '$app/forms';
	import { SvelteSet } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import { Copy } from '@lucide/svelte';
	import { createSubmit } from '$lib/client/submit.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const invite = createSubmit({
		success: (result) => {
			const sent = (result?.invite as { emailSent?: boolean } | undefined)?.emailSent;
			return sent ? m.users_invite_sent() : m.users_invite_created();
		},
		error: (failure) =>
			failure?.inviteError === 'invalid' ? m.users_invite_invalid() : m.common_error_generic(),
		onSuccess: () => inviteRoleIds.clear()
	});
	const revoke = createSubmit({
		confirm: ({ formElement }) => ({
			title: m.users_revoke_confirm_title({ email: formElement.dataset.email ?? '' }),
			description: m.users_revoke_confirm_body(),
			confirmLabel: m.users_action_revoke_invite(),
			destructive: true
		}),
		success: () => m.users_invite_revoked()
	});
	const toggle = createSubmit({
		keyField: 'userId',
		confirm: ({ formData, formElement }) =>
			formData.get('nextActive') === 'false'
				? {
						title: m.users_deactivate_confirm_title({ name: formElement.dataset.name ?? '' }),
						description: m.users_deactivate_confirm_body(),
						confirmLabel: m.users_action_deactivate(),
						destructive: true
					}
				: null,
		success: (result) => (result?.activated ? m.users_activated() : m.users_deactivated()),
		error: (failure) =>
			failure?.toggleError === 'self' ? m.users_cannot_deactivate_self() : m.common_error_generic()
	});
	const resetPassword = createSubmit({
		keyField: 'userId',
		confirm: ({ formElement }) => ({
			title: m.users_reset_confirm_title({ name: formElement.dataset.name ?? '' }),
			description: m.users_reset_confirm_body(),
			confirmLabel: m.users_action_reset_password(),
			destructive: true
		}),
		success: () => m.users_password_reset()
	});
	const updateRoles = createSubmit({
		keyField: 'userId',
		reset: false,
		success: () => m.users_roles_saved()
	});

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(m.common_copied());
		} catch {
			toast.error(m.common_error_generic());
		}
	}

	const inviteRoleIds = new SvelteSet<string>();
	function toggleInviteRole(id: string) {
		if (inviteRoleIds.has(id)) inviteRoleIds.delete(id);
		else inviteRoleIds.add(id);
	}

	function roleName(id: string): string {
		return data.roles.find((r) => r.id === id)?.name ?? id;
	}
</script>

<svelte:head>
	<title>{m.app_name()} — {m.users_title()}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<h1 class="text-xl font-semibold">{m.users_title()}</h1>

	<Card>
		<CardHeader>
			<CardTitle>{m.users_invite()}</CardTitle>
		</CardHeader>
		<CardContent>
			<form
				method="POST"
				action="?/invite"
				use:enhance={invite.enhance}
				class="flex flex-col gap-4"
			>
				<div class="flex flex-col gap-1.5">
					<Label for="invite-email">{m.users_invite_email()}</Label>
					<Input id="invite-email" name="email" type="email" required />
				</div>
				<div>
					<span class="text-sm font-medium">{m.users_invite_roles()}</span>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each data.roles as r (r.id)}
							<button
								type="button"
								aria-pressed={inviteRoleIds.has(r.id)}
								onclick={() => toggleInviteRole(r.id)}
								class="min-h-11 rounded-full border px-3 py-1.5 text-sm {inviteRoleIds.has(r.id)
									? 'border-primary bg-primary/10 text-primary'
									: 'border-input text-muted-foreground'}"
							>
								{r.name}
							</button>
						{/each}
					</div>
					{#each inviteRoleIds as id (id)}
						<input type="hidden" name="roleIds" value={id} />
					{/each}
				</div>
				<div class="flex justify-center sm:justify-end">
					<Button type="submit" class="w-full sm:w-auto" loading={invite.pending}>
						{m.users_invite_send()}
					</Button>
				</div>
			</form>

			{#if form?.invite}
				<div class="border-border bg-muted mt-4 rounded-lg border p-3 text-sm">
					<p class="mb-2">
						{form.invite.emailSent ? m.users_invite_sent() : m.users_invite_link_ready()}
					</p>
					<div class="flex items-center gap-2">
						<code class="block min-w-0 flex-1 overflow-x-auto text-xs">{form.invite.url}</code>
						<Button
							variant="ghost"
							size="icon"
							onclick={() => form?.invite && copy(form.invite.url)}
							aria-label={m.common_copy()}
						>
							<Copy class="size-4" />
						</Button>
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>

	{#if data.pendingInvitations.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>{m.users_status_pending()}</CardTitle>
			</CardHeader>
			<CardContent>
				<ul class="flex flex-col gap-3">
					{#each data.pendingInvitations as inv (inv.id)}
						<li class="flex items-center justify-between gap-3 text-sm">
							<div>
								<p class="font-medium">{inv.email}</p>
								<p class="text-muted-foreground text-xs">
									{inv.roleIds.map(roleName).join(', ')}
								</p>
							</div>
							<form
								method="POST"
								action="?/revokeInvite"
								data-email={inv.email}
								use:enhance={revoke.enhance}
							>
								<input type="hidden" name="id" value={inv.id} />
								<Button
									type="submit"
									variant="ghost"
									size="sm"
									loading={revoke.isPending(inv.id)}
									aria-label={`${m.users_action_revoke_invite()} — ${inv.email}`}
								>
									{m.users_action_revoke_invite()}
								</Button>
							</form>
						</li>
					{/each}
				</ul>
			</CardContent>
		</Card>
	{/if}

	<div class="flex flex-col gap-3">
		{#each data.users as u (u.id)}
			<Card>
				<CardContent class="pt-4">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="font-medium">{u.name}</p>
							<p class="text-muted-foreground text-sm">{u.email}</p>
							<div class="mt-1.5 flex flex-wrap gap-1.5">
								<Badge variant={u.isActive ? 'success' : 'secondary'}>
									{u.isActive ? m.users_status_active() : m.users_status_inactive()}
								</Badge>
								{#each u.roleIds as roleId (roleId)}
									<Badge variant="outline">{roleName(roleId)}</Badge>
								{/each}
							</div>
						</div>
					</div>

					{#if form?.resetPasswordFor === u.id && form.tempPassword}
						<div
							class="border-border bg-muted mt-3 flex items-center gap-2 rounded-lg border p-2 text-sm"
						>
							<p class="min-w-0 flex-1">
								{m.users_reset_password_result({ password: form.tempPassword })}
							</p>
							<Button
								variant="ghost"
								size="icon"
								onclick={() => form?.tempPassword && copy(form.tempPassword)}
								aria-label={m.common_copy()}
							>
								<Copy class="size-4" />
							</Button>
						</div>
					{/if}

					<div class="mt-3 flex flex-wrap gap-2">
						<form
							method="POST"
							action="?/toggleActive"
							data-name={u.name}
							use:enhance={toggle.enhance}
						>
							<input type="hidden" name="userId" value={u.id} />
							<input type="hidden" name="nextActive" value={String(!u.isActive)} />
							<Button
								type="submit"
								variant="outline"
								size="sm"
								loading={toggle.isPending(u.id)}
								aria-label={`${u.isActive ? m.users_action_deactivate() : m.users_action_activate()} — ${u.name}`}
							>
								{u.isActive ? m.users_action_deactivate() : m.users_action_activate()}
							</Button>
						</form>
						<form
							method="POST"
							action="?/resetPassword"
							data-name={u.name}
							use:enhance={resetPassword.enhance}
						>
							<input type="hidden" name="userId" value={u.id} />
							<Button
								type="submit"
								variant="outline"
								size="sm"
								loading={resetPassword.isPending(u.id)}
								aria-label={`${m.users_action_reset_password()} — ${u.name}`}
							>
								{m.users_action_reset_password()}
							</Button>
						</form>
					</div>

					<details class="mt-3">
						<summary class="text-muted-foreground cursor-pointer text-sm font-medium">
							{m.users_action_edit_roles()}
						</summary>
						<form
							method="POST"
							action="?/updateRoles"
							use:enhance={updateRoles.enhance}
							class="mt-2 flex flex-col gap-2"
						>
							<input type="hidden" name="userId" value={u.id} />
							<div class="flex flex-wrap gap-2">
								{#each data.roles as r (r.id)}
									<label
										class="border-input flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
									>
										<input
											type="checkbox"
											name="roleIds"
											value={r.id}
											checked={u.roleIds.includes(r.id)}
										/>
										{r.name}
									</label>
								{/each}
							</div>
							<div class="flex justify-center sm:justify-end">
								<Button type="submit" size="sm" loading={updateRoles.isPending(u.id)}>
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
