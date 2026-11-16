<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ItemForm from '$lib/components/inventory/item-form.svelte';
	import ItemPhotos from '$lib/components/inventory/item-photos.svelte';
	import { enhance } from '$app/forms';
	import { createSubmit } from '$lib/client/submit.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const save = createSubmit({ success: () => m.item_saved() });
</script>

<svelte:head>
	<title>{m.app_name()} — {m.item_title_edit()}</title>
</svelte:head>

<h1 class="mb-4 text-xl font-semibold">{m.item_title_edit()}</h1>

<form method="POST" use:enhance={save.enhance}>
	<ItemForm
		categories={data.categories}
		locations={data.locations}
		item={data.item}
		values={form?.values}
		errors={form?.errors}
		pending={save.pending}
		photos={photoSection}
	/>
</form>

{#snippet photoSection()}
	<!-- Photos save on their own as soon as they're added or deleted (each
	     with its own progress/toast) — independent of the Save button. -->
	<div class="flex flex-col gap-1.5">
		<ItemPhotos
			itemId={data.item.id}
			photos={data.photos}
			canEdit
			maxUploadMb={data.maxUploadMb}
			maxPhotos={data.maxPhotos}
		/>
		<p class="text-muted-foreground text-xs">{m.item_photos_saved_immediately()}</p>
	</div>
{/snippet}
