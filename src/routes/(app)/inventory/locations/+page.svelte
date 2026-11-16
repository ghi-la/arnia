<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { enhance } from '$app/forms';
	import FieldError from '$lib/components/feedback/field-error.svelte';
	import { createSubmit } from '$lib/client/submit.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const create = createSubmit({
		success: (result) => m.location_created({ name: String(result?.created ?? '') })
	});
	const remove = createSubmit({
		confirm: ({ formElement }) => ({
			title: m.location_delete_confirm_title({ name: formElement.dataset.name ?? '' }),
			description: m.location_delete_confirm(),
			confirmLabel: m.common_delete(),
			destructive: true
		}),
		success: () => m.location_deleted()
	});

	const kindLabels: Record<string, () => string> = {
		site: m.location_kind_site,
		room: m.location_kind_room,
		shelf: m.location_kind_shelf
	};
</script>

<svelte:head>
	<title>{m.app_name()} — {m.locations_title()}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<h1 class="text-xl font-semibold">{m.locations_title()}</h1>

	<Card>
		<CardHeader>
			<CardTitle>{m.locations_new()}</CardTitle>
		</CardHeader>
		<CardContent>
			<form
				method="POST"
				action="?/create"
				use:enhance={create.enhance}
				class="flex flex-col gap-3"
			>
				<div class="flex flex-col gap-1.5">
					<Label for="name">{m.location_name()}</Label>
					<Input
						id="name"
						name="name"
						required
						aria-invalid={form?.errors?.name ? true : undefined}
						aria-describedby={form?.errors?.name ? 'name-error' : undefined}
					/>
					<FieldError id="name-error" error={form?.errors?.name ? m.field_name_error() : null} />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="flex flex-col gap-1.5">
						<Label for="kind">{m.location_kind()}</Label>
						<select
							id="kind"
							name="kind"
							class="border-input bg-card h-11 rounded-md border px-3 text-sm"
						>
							<option value="site">{m.location_kind_site()}</option>
							<option value="room">{m.location_kind_room()}</option>
							<option value="shelf">{m.location_kind_shelf()}</option>
						</select>
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="parentId">{m.location_parent()}</Label>
						<select
							id="parentId"
							name="parentId"
							class="border-input bg-card h-11 rounded-md border px-3 text-sm"
						>
							<option value="">{m.item_none()}</option>
							{#each data.flat as l (l.id)}
								<option value={l.id}>{l.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="flex justify-center sm:justify-end">
					<Button type="submit" class="w-full sm:w-auto" loading={create.pending}
						>{m.locations_new()}</Button
					>
				</div>
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardContent class="divide-border divide-y p-0">
			{#if data.tree.length === 0}
				<p class="text-muted-foreground p-6 text-center text-sm">{m.locations_empty()}</p>
			{/if}
			{#each data.tree as { node, depth } (node.id)}
				<div
					class="flex items-center justify-between gap-3 p-3.5"
					style="padding-left: {1 + depth * 1.25}rem"
				>
					<div>
						<p class="font-medium">{node.name}</p>
						<p class="text-muted-foreground text-xs">{kindLabels[node.kind]?.() ?? node.kind}</p>
					</div>
					<form method="POST" action="?/delete" data-name={node.name} use:enhance={remove.enhance}>
						<input type="hidden" name="id" value={node.id} />
						<Button
							type="submit"
							variant="ghost"
							size="sm"
							loading={remove.isPending(node.id)}
							aria-label={m.common_delete_named({ name: node.name })}
						>
							{m.common_delete()}
						</Button>
					</form>
				</div>
			{/each}
		</CardContent>
	</Card>
</div>
