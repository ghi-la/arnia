<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { CameraOff, CircleCheck, LoaderCircle, SearchX } from '@lucide/svelte';
	import type { IScannerControls } from '@zxing/browser';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type CameraError = 'denied' | 'unavailable' | 'insecure';

	let videoEl: HTMLVideoElement | undefined = $state();
	let cameraState = $state<'starting' | 'active' | 'error'>('starting');
	let cameraError = $state<CameraError | null>(null);
	let notFoundCode = $state('');
	let matchedName = $state('');
	let search = $state('');
	let controls: IScannerControls | undefined;
	let handled = false;

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

	function vibrate(pattern: number | number[]) {
		try {
			navigator.vibrate?.(pattern);
		} catch {
			// Not supported (iOS Safari) — the on-screen confirmation is enough.
		}
	}

	function classify(err: unknown): CameraError {
		if (!window.isSecureContext) return 'insecure';
		const name = err instanceof Error ? err.name : '';
		if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
		return 'unavailable';
	}

	function onDecoded(code: string) {
		if (handled) return;
		const match = findByCode(code);
		if (match) {
			// Stop decoding immediately, confirm visibly + haptically, then go.
			handled = true;
			controls?.stop();
			vibrate(60);
			matchedName = match.name;
			notFoundCode = '';
			setTimeout(() => goToItem(match.id), 600);
		} else if (code !== notFoundCode) {
			vibrate([30, 60, 30]);
			notFoundCode = code;
		}
	}

	async function startCamera() {
		if (!videoEl) return;
		cameraState = 'starting';
		cameraError = null;
		try {
			if (!window.isSecureContext || !navigator.mediaDevices) {
				throw new Error('insecure');
			}
			const { BrowserMultiFormatReader } = await import('@zxing/browser');
			const reader = new BrowserMultiFormatReader();
			controls = await reader.decodeFromVideoDevice(undefined, videoEl, (result) => {
				if (result) onDecoded(result.getText());
			});
			cameraState = 'active';
		} catch (err) {
			cameraState = 'error';
			cameraError = classify(err);
		}
	}

	onMount(startCamera);

	onDestroy(() => {
		controls?.stop();
	});

	const cameraErrorText = $derived(
		cameraError === 'denied'
			? m.scan_camera_denied()
			: cameraError === 'insecure'
				? m.scan_camera_insecure()
				: m.scan_camera_unavailable()
	);
</script>

<svelte:head>
	<title>{m.app_name()} — {m.scan_title()}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<h1 class="text-xl font-semibold">{m.scan_title()}</h1>
		<p class="text-muted-foreground text-sm">{m.scan_intro()}</p>
	</div>

	{#if cameraState === 'error'}
		<Card>
			<CardContent class="flex flex-col items-center gap-3 py-8 text-center">
				<CameraOff class="text-muted-foreground size-8" aria-hidden="true" />
				<p class="text-sm" role="alert">{cameraErrorText}</p>
				{#if cameraError !== 'insecure'}
					<Button variant="outline" size="sm" onclick={startCamera}>{m.common_retry()}</Button>
				{/if}
			</CardContent>
		</Card>
	{/if}

	<Card class="relative overflow-hidden p-0 {cameraState === 'error' ? 'hidden' : ''}">
		<video
			bind:this={videoEl}
			class="aspect-square w-full bg-black object-cover"
			muted
			playsinline
			aria-label={m.scan_camera_label()}
		></video>

		{#if cameraState === 'starting'}
			<div
				class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white"
				role="status"
			>
				<LoaderCircle class="size-6 animate-spin" aria-hidden="true" />
				{m.scan_camera_starting()}
			</div>
		{:else if cameraState === 'active' && !matchedName}
			<!-- Aiming guide -->
			<div
				class="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
				aria-hidden="true"
			></div>
		{/if}

		{#if matchedName}
			<div
				class="bg-success/90 text-success-foreground absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center"
				role="status"
				aria-live="assertive"
			>
				<CircleCheck class="size-12" aria-hidden="true" />
				<p class="text-lg font-semibold">{matchedName}</p>
			</div>
		{/if}
	</Card>

	{#if notFoundCode}
		<div
			class="border-destructive/30 bg-destructive/5 flex flex-col gap-2 rounded-xl border p-3"
			role="alert"
		>
			<p class="flex items-center gap-2 text-sm">
				<SearchX class="text-destructive size-4 shrink-0" aria-hidden="true" />
				{m.scan_not_found_code({ code: notFoundCode })}
			</p>
			{#if data.canEdit}
				<Button
					href={resolve('/inventory/items/new') + `?barcode=${encodeURIComponent(notFoundCode)}`}
					variant="outline"
					size="sm"
					class="self-start"
				>
					{m.scan_create_with_code()}
				</Button>
			{/if}
		</div>
	{/if}

	<Card>
		<CardContent class="flex flex-col gap-3 pt-4">
			<Label for="manualSearch">{m.scan_manual_search()}</Label>
			<Input
				id="manualSearch"
				type="search"
				bind:value={search}
				placeholder={m.movement_item_search_placeholder()}
			/>
			{#if filteredItems.length > 0}
				<ul class="divide-border flex flex-col divide-y">
					{#each filteredItems as it (it.id)}
						<li>
							<button
								type="button"
								class="hover:bg-muted flex min-h-11 w-full items-center justify-between gap-3 py-2.5 text-left text-sm"
								onclick={() => goToItem(it.id)}
							>
								<span>{it.name}{it.sku ? ` (${it.sku})` : ''}</span>
								<span class="text-muted-foreground">{it.currentQty} {it.unit}</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else if search.trim()}
				<p class="text-muted-foreground text-sm">{m.search_no_results()}</p>
			{/if}
		</CardContent>
	</Card>
</div>
