<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import {
		ChevronLeft,
		ChevronRight,
		ImagePlus,
		LoaderCircle,
		RotateCw,
		Trash2,
		TriangleAlert,
		X
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		looksLikeImage,
		photoErrorMessage,
		uploadItemPhoto
	} from '$lib/client/item-photo-upload';
	import { createSubmit } from '$lib/client/submit.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Photo {
		id: string;
		originalName: string;
		hasThumbnail: boolean;
	}

	/**
	 * Photo gallery for an existing item. With `canEdit`, photos are added and
	 * deleted immediately (each with its own progress and feedback); without
	 * it, it's a read-only gallery with a full-screen viewer.
	 */
	let {
		itemId,
		photos,
		canEdit,
		maxUploadMb,
		maxPhotos
	}: {
		itemId: string;
		photos: Photo[];
		canEdit: boolean;
		maxUploadMb: number;
		maxPhotos: number;
	} = $props();

	/** An upload in progress (or failed), shown as a tile before the real photo exists. */
	interface PendingUpload {
		key: string;
		file: File;
		preview: string;
		status: 'preparing' | 'uploading' | 'error';
		error?: string;
	}

	let uploads = $state<PendingUpload[]>([]);
	let fileInput = $state<HTMLInputElement>();

	const remaining = $derived(maxPhotos - photos.length - uploads.length);
	const limits = $derived({ maxUploadMb, maxPhotos });

	function fileUrl(id: string, thumb = false): string {
		return resolve('/attachments/[id]', { id }) + (thumb ? '?size=thumb' : '');
	}

	function onFilesSelected() {
		let files = Array.from(fileInput?.files ?? []);
		if (fileInput) fileInput.value = '';
		if (files.length === 0) return;

		const notImages = files.filter((f) => !looksLikeImage(f));
		if (notImages.length > 0) {
			toast.error(m.item_photo_unsupported());
			files = files.filter(looksLikeImage);
		}
		if (files.length > remaining) {
			toast.error(m.item_photo_limit({ max: maxPhotos }));
			files = files.slice(0, Math.max(remaining, 0));
		}
		if (files.length === 0) return;

		const added = files.map((file) => ({
			key: crypto.randomUUID(),
			file,
			preview: URL.createObjectURL(file),
			status: 'preparing' as const
		}));
		uploads.push(...added);
		void uploadAll(added.map((u) => u.key));
	}

	/** Sequential on purpose: phones have little memory for parallel canvas work. */
	async function uploadAll(keys: string[]) {
		let succeeded = 0;
		for (const key of keys) {
			if (await upload(key)) succeeded++;
		}
		if (succeeded > 0) {
			await invalidateAll();
			// Only drop the finished tiles once the real thumbnails are in the list.
			for (const u of uploads.filter((x) => x.status !== 'error' && keys.includes(x.key))) {
				discard(u.key);
			}
			toast.success(
				succeeded === 1 ? m.item_photo_added() : m.item_photos_added({ count: succeeded })
			);
		}
	}

	async function upload(key: string): Promise<boolean> {
		const entry = uploads.find((u) => u.key === key);
		if (!entry) return false;

		entry.status = 'preparing';
		entry.error = undefined;

		const result = await uploadItemPhoto(itemId, entry.file, {
			...limits,
			onCompressed: () => (entry.status = 'uploading')
		});
		if (result.ok) return true; // tile stays busy until invalidateAll swaps it out

		entry.status = 'error';
		entry.error = result.message;
		toast.error(result.message);
		return false;
	}

	async function retry(key: string) {
		if (await upload(key)) {
			await invalidateAll();
			discard(key);
			toast.success(m.item_photo_added());
		}
	}

	function discard(key: string) {
		const index = uploads.findIndex((u) => u.key === key);
		if (index === -1) return;
		const [removed] = uploads.splice(index, 1);
		URL.revokeObjectURL(removed.preview);
	}

	// --- Viewer -------------------------------------------------------------

	let viewerIndex = $state<number | null>(null);
	const viewed = $derived(viewerIndex === null ? null : (photos[viewerIndex] ?? null));

	function openViewer(index: number) {
		viewerIndex = index;
	}

	function step(delta: number) {
		if (viewerIndex === null || photos.length === 0) return;
		viewerIndex = (viewerIndex + delta + photos.length) % photos.length;
	}

	const remove = createSubmit({
		confirm: {
			title: m.item_photo_delete_confirm(),
			confirmLabel: m.common_delete(),
			destructive: true
		},
		success: () => m.item_photo_deleted(),
		error: (data) => photoErrorMessage(data?.error, limits),
		onSuccess: () => {
			// `photos` is already refreshed here; close if nothing is left to show.
			if (photos.length === 0) viewerIndex = null;
			else if (viewerIndex !== null && viewerIndex >= photos.length)
				viewerIndex = photos.length - 1;
		}
	});
</script>

<section class="flex flex-col gap-3" aria-labelledby="item-photos-title">
	<div class="flex items-center justify-between gap-3">
		<h2 id="item-photos-title" class="font-semibold">{m.item_photos_title()}</h2>
		{#if photos.length > 0}
			<span class="text-muted-foreground text-xs">{photos.length} / {maxPhotos}</span>
		{/if}
	</div>

	<ul class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
		{#each photos as photo, index (photo.id)}
			<li class="bg-muted relative aspect-square overflow-hidden rounded-lg">
				<button
					type="button"
					class="focus-visible:ring-ring size-full focus-visible:ring-2 focus-visible:outline-none"
					onclick={() => openViewer(index)}
					aria-label={m.item_photo_open({ name: photo.originalName })}
				>
					<img
						src={fileUrl(photo.id, photo.hasThumbnail)}
						alt=""
						loading="lazy"
						decoding="async"
						class="size-full object-cover"
					/>
				</button>
			</li>
		{/each}

		{#each uploads as u (u.key)}
			<li class="bg-muted relative aspect-square overflow-hidden rounded-lg">
				<img
					src={u.preview}
					alt=""
					class="size-full object-cover {u.status === 'error' ? 'opacity-40' : 'opacity-70'}"
					onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
				/>
				<div
					class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2 text-center text-xs"
					role="status"
					aria-live="polite"
				>
					{#if u.status === 'error'}
						<TriangleAlert class="text-destructive size-5" aria-hidden="true" />
						<span class="sr-only">{u.error}</span>
						<div class="flex gap-1">
							<button
								type="button"
								class="bg-card/90 flex size-11 items-center justify-center rounded-full shadow"
								onclick={() => retry(u.key)}
								aria-label={m.common_retry()}
							>
								<RotateCw class="size-4" />
							</button>
							<button
								type="button"
								class="bg-card/90 flex size-11 items-center justify-center rounded-full shadow"
								onclick={() => discard(u.key)}
								aria-label={m.common_cancel()}
							>
								<X class="size-4" />
							</button>
						</div>
					{:else}
						<span class="bg-card/90 flex items-center gap-1.5 rounded-full px-2.5 py-1 shadow">
							<LoaderCircle class="size-3.5 animate-spin" aria-hidden="true" />
							{u.status === 'preparing' ? m.item_photo_preparing() : m.item_photo_uploading()}
						</span>
					{/if}
				</div>
			</li>
		{/each}

		{#if canEdit && remaining > 0}
			<li class="aspect-square">
				<button
					type="button"
					class="border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
					onclick={() => fileInput?.click()}
				>
					<ImagePlus class="size-6" aria-hidden="true" />
					{m.item_photo_add()}
				</button>
			</li>
		{/if}
	</ul>

	{#if photos.length === 0 && uploads.length === 0}
		<p class="text-muted-foreground text-sm">
			{canEdit ? m.item_photos_empty_edit() : m.item_photos_empty()}
		</p>
	{/if}

	{#if canEdit}
		<!-- No `capture` attribute: on phones that would force the camera; without
		     it the OS offers camera *or* gallery. -->
		<input
			bind:this={fileInput}
			type="file"
			accept="image/*"
			multiple
			class="hidden"
			onchange={onFilesSelected}
		/>
	{/if}
</section>

<Dialog.Root
	bind:open={
		() => viewed !== null,
		(open) => {
			if (!open) viewerIndex = null;
		}
	}
>
	<Dialog.Portal>
		<Dialog.Overlay
			class="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/90"
		/>
		<Dialog.Content
			class="fixed inset-0 z-50 flex flex-col text-white outline-none"
			onkeydown={(e) => {
				if (e.key === 'ArrowLeft') step(-1);
				if (e.key === 'ArrowRight') step(1);
			}}
		>
			{#if viewed}
				<div class="flex items-center justify-between gap-2 p-2 pt-[calc(var(--safe-top)+0.5rem)]">
					<Dialog.Title class="min-w-0 truncate px-2 text-sm font-medium">
						{viewed.originalName}
						<span class="text-white/60">· {(viewerIndex ?? 0) + 1} / {photos.length}</span>
					</Dialog.Title>
					<div class="flex shrink-0 items-center gap-1">
						{#if canEdit}
							<form
								method="POST"
								action={resolve('/(app)/inventory/items/[id]', { id: itemId }) + '?/deletePhoto'}
								use:enhance={remove.enhance}
							>
								<input type="hidden" name="id" value={viewed.id} />
								<Button
									type="submit"
									variant="ghost"
									size="icon"
									class="text-white hover:bg-white/10"
									loading={remove.pending}
									aria-label={m.common_delete()}
								>
									<Trash2 class="size-5" />
								</Button>
							</form>
						{/if}
						<Dialog.Close
							class="flex size-11 items-center justify-center rounded-md hover:bg-white/10"
							aria-label={m.common_close()}
						>
							<X class="size-5" />
						</Dialog.Close>
					</div>
				</div>

				<div
					class="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[calc(var(--safe-bottom)+0.5rem)]"
				>
					{#key viewed.id}
						<LoaderCircle class="absolute size-6 animate-spin text-white/40" aria-hidden="true" />
						<img
							src={fileUrl(viewed.id)}
							alt={viewed.originalName}
							class="relative max-h-full max-w-full object-contain"
						/>
					{/key}

					{#if photos.length > 1}
						<button
							type="button"
							class="absolute left-2 flex size-11 items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
							onclick={() => step(-1)}
							aria-label={m.item_photo_previous()}
						>
							<ChevronLeft class="size-6" />
						</button>
						<button
							type="button"
							class="absolute right-2 flex size-11 items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
							onclick={() => step(1)}
							aria-label={m.item_photo_next()}
						>
							<ChevronRight class="size-6" />
						</button>
					{/if}
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
