<script lang="ts">
	import { ImagePlus, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { looksLikeImage } from '$lib/client/item-photo-upload';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Photo picker for an item that doesn't exist yet (the create form): the
	 * chosen photos are only previewed and queued here; the page uploads them
	 * right after the item is saved (see `items/new/+page.svelte`).
	 */
	let {
		files = $bindable([]),
		maxPhotos,
		disabled = false
	}: { files: File[]; maxPhotos: number; disabled?: boolean } = $props();

	let fileInput = $state<HTMLInputElement>();

	// Object URLs for the previews; the effect cleanup revokes the previous
	// set whenever the queue changes (and on unmount), so nothing leaks.
	const previews = $derived(files.map((file) => URL.createObjectURL(file)));
	$effect(() => {
		const urls = previews;
		return () => urls.forEach((url) => URL.revokeObjectURL(url));
	});

	function onSelected() {
		let picked = Array.from(fileInput?.files ?? []);
		if (fileInput) fileInput.value = '';
		if (picked.some((f) => !looksLikeImage(f))) {
			toast.error(m.item_photo_unsupported());
			picked = picked.filter(looksLikeImage);
		}
		const room = maxPhotos - files.length;
		if (picked.length > room) {
			toast.error(m.item_photo_limit({ max: maxPhotos }));
			picked = picked.slice(0, Math.max(room, 0));
		}
		files = [...files, ...picked];
	}

	function removeAt(index: number) {
		files = files.filter((_, i) => i !== index);
	}
</script>

<div class="flex flex-col gap-2">
	<span class="text-sm font-medium">{m.item_photos_title()}</span>
	<ul class="grid grid-cols-3 gap-2 sm:grid-cols-4">
		{#each files as file, index (file)}
			<li class="bg-muted relative aspect-square overflow-hidden rounded-lg">
				<img src={previews[index]} alt="" class="size-full object-cover" />
				<button
					type="button"
					class="bg-card/90 absolute top-1 right-1 flex size-9 items-center justify-center rounded-full shadow disabled:opacity-50"
					onclick={() => removeAt(index)}
					{disabled}
					aria-label={m.item_photo_remove({ name: file.name })}
				>
					<X class="size-4" />
				</button>
			</li>
		{/each}
		{#if files.length < maxPhotos}
			<li class="aspect-square">
				<button
					type="button"
					class="border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
					onclick={() => fileInput?.click()}
					{disabled}
				>
					<ImagePlus class="size-6" aria-hidden="true" />
					{m.item_photo_add()}
				</button>
			</li>
		{/if}
	</ul>
	<p class="text-muted-foreground text-xs">{m.item_photos_upload_on_save()}</p>
	<!-- No `name`: these files are uploaded separately after save, not posted
	     with the item form. No `capture`: phones offer camera *or* gallery. -->
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		multiple
		class="hidden"
		onchange={onSelected}
	/>
</div>
