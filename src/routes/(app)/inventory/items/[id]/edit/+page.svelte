<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ItemForm from '$lib/components/inventory/item-form.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>{m.app_name()} — {m.item_title_edit()}</title>
</svelte:head>

<h1 class="mb-4 text-xl font-semibold">{m.item_title_edit()}</h1>

<form method="POST">
	<ItemForm
		categories={data.categories}
		locations={data.locations}
		item={data.item}
		values={form?.values}
		errors={form?.errors}
	/>
</form>
