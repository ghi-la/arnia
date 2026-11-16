<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ItemForm from '$lib/components/inventory/item-form.svelte';
	import ItemPhotoPicker from '$lib/components/inventory/item-photo-picker.svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { createSubmit } from '$lib/client/submit.svelte';
	import { uploadItemPhoto } from '$lib/client/item-photo-upload';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let queuedPhotos = $state<File[]>([]);
	let status = $state<string | null>(null);
	let uploaded = 0;
	let failed = 0;

	/**
	 * Save = create the item, then (still on this page, button still busy)
	 * upload the queued photos to it one by one with visible progress, then
	 * open the new item. A failed photo never loses the item: it's created
	 * already, and the toast says how many photos to add again from Edit.
	 */
	const save = createSubmit({
		beforeRedirect: async (location) => {
			const itemId = location.split('/').filter(Boolean).pop();
			uploaded = 0;
			failed = 0;
			if (!itemId || queuedPhotos.length === 0) return;

			for (const [i, file] of queuedPhotos.entries()) {
				status = m.item_photos_uploading_progress({
					current: i + 1,
					total: queuedPhotos.length
				});
				const result = await uploadItemPhoto(itemId, file, {
					maxUploadMb: data.maxUploadMb,
					maxPhotos: data.maxPhotos
				});
				if (result.ok) uploaded++;
				else failed++;
			}
			status = null;
			if (failed > 0) toast.warning(m.item_created_photos_failed({ count: failed }));
		},
		success: () =>
			failed > 0
				? null // the warning above already says the item was created
				: uploaded > 0
					? m.item_created_with_photos({ count: uploaded })
					: m.item_created()
	});
</script>

<svelte:head>
	<title>{m.app_name()} — {m.item_title_new()}</title>
</svelte:head>

<h1 class="mb-4 text-xl font-semibold">{m.item_title_new()}</h1>

<form method="POST" use:enhance={save.enhance}>
	<ItemForm
		categories={data.categories}
		locations={data.locations}
		values={form?.values ?? data.prefill}
		errors={form?.errors}
		pending={save.pending}
		{status}
		photos={photoSection}
	/>
</form>

{#snippet photoSection()}
	<ItemPhotoPicker bind:files={queuedPhotos} maxPhotos={data.maxPhotos} disabled={save.pending} />
{/snippet}
