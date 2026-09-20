<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import type { IScannerControls } from '@zxing/browser';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let videoEl: HTMLVideoElement | undefined = $state();
	let cameraDenied = $state(false);
	let notFoundCode = $state('');
	let search = $state('');
	let controls: IScannerControls | undefined;

	const filteredItems = $derived(
		search.trim()
			? data.items
					.filter((it) => {
						const q = search.trim().toLowerCase();
						return (
							it.name.toLowerCase().includes(q) ||
							(it.sku ?? '').toLowerCase().includes(q) ||
							(it.barcode ?? '').toLowerCase().includes(q)
						);
					})
					.slice(0, 20)
			: []
	);

	function findByCode(code: string) {
		return data.items.find((it) => it.barcode === code || it.sku === code);
	}

	function goToItem(id: string) {
		controls?.stop();
		goto(resolve('/(app)/inventory/items/[id]', { id }));
	}

	onMount(async () => {
		if (!videoEl) return;
		try {
			const { BrowserMultiFormatReader } = await import('@zxing/browser');
			const reader = new BrowserMultiFormatReader();
			controls = await reader.decodeFromVideoDevice(undefined, videoEl, (result) => {
				if (!result) return;
				const code = result.getText();
				const match = findByCode(code);
				if (match) {
					goToItem(match.id);
				} else {
					notFoundCode = code;
				}
			});
		} catch {
			cameraDenied = true;
		}
	});

	onDestroy(() => {
		controls?.stop();
	});
</script>

<svelte:head>
	<title>{m.app_name()} — {m.scan_title()}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<h1 class="text-xl font-semibold">{m.scan_title()}</h1>
	<p class="text-muted-foreground text-sm">{m.scan_intro()}</p>

	{#if cameraDenied}
		<p class="text-destructive text-sm">{m.scan_camera_denied()}</p>
	{:else}
		<Card class="overflow-hidden p-0">
			<video
				bind:this={videoEl}
				class="aspect-square w-full bg-black object-cover"
				muted
				playsinline
			></video>
		</Card>
		{#if notFoundCode}
			<p class="text-destructive text-sm">{m.scan_not_found()}</p>
		{/if}
	{/if}

	<Card>
		<CardContent class="flex flex-col gap-3 pt-4">
			<Label for="manualSearch">{m.scan_manual_search()}</Label>
			<Input
				id="manualSearch"
				bind:value={search}
				placeholder={m.movement_item_search_placeholder()}
			/>
			{#if filteredItems.length > 0}
				<ul class="divide-border flex flex-col divide-y">
					{#each filteredItems as it (it.id)}
						<li>
							<button
								type="button"
								class="hover:bg-muted flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm"
								onclick={() => goToItem(it.id)}
							>
								<span>{it.name}{it.sku ? ` (${it.sku})` : ''}</span>
								<span class="text-muted-foreground">{it.currentQty} {it.unit}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</CardContent>
	</Card>
</div>
