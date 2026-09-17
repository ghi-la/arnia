<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { enhance } from '$app/forms';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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
			<form method="POST" action="?/invite" use:enhance class="flex flex-col gap-4">
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
								onclick={() => toggleInviteRole(r.id)}
								class="rounded-full border px-3 py-1.5 text-sm {inviteRoleIds.has(r.id)
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
				<div class="flex justify-end">
					<Button type="submit">{m.users_invite_send()}</Button>
				</div>
			</form>

			{#if form?.invite}
				<div class="border-border bg-muted mt-4 rounded-lg border p-3 text-sm">
					{#if !form.invite.emailSent}
						<p class="mb-2">{m.users_invite_link_ready()}</p>
					{/if}
					<code class="block overflow-x-auto text-xs">{form.invite.url}</code>
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
							<form method="POST" action="?/revokeInvite" use:enhance>
								<input type="hidden" name="id" value={inv.id} />
								<Button type="submit" variant="ghost" size="sm"
									>{m.users_action_revoke_invite()}</Button
								>
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
						<p class="border-border bg-muted mt-3 rounded-lg border p-2 text-sm">
							{m.users_reset_password_result({ password: form.tempPassword })}
						</p>
					{/if}

					<div class="mt-3 flex flex-wrap gap-2">
						<form method="POST" action="?/toggleActive" use:enhance>
							<input type="hidden" name="userId" value={u.id} />
							<input type="hidden" name="nextActive" value={String(!u.isActive)} />
							<Button type="submit" variant="outline" size="sm">
								{u.isActive ? m.users_action_deactivate() : m.users_action_activate()}
							</Button>
						</form>
						<form method="POST" action="?/resetPassword" use:enhance>
							<input type="hidden" name="userId" value={u.id} />
							<Button type="submit" variant="outline" size="sm"
								>{m.users_action_reset_password()}</Button
							>
						</form>
					</div>

					<details class="mt-3">
						<summary class="text-muted-foreground cursor-pointer text-sm font-medium">
							{m.users_action_edit_roles()}
						</summary>
						<form method="POST" action="?/updateRoles" use:enhance class="mt-2 flex flex-col gap-2">
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
							<div class="flex justify-end">
								<Button type="submit" size="sm">{m.common_save()}</Button>
							</div>
						</form>
					</details>
				</CardContent>
			</Card>
		{/each}
	</div>
</div>
