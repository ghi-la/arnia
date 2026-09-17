<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import { SETUP_STEPS } from './steps';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const currentIndex = $derived(SETUP_STEPS.findIndex((s) => page.url.pathname === s.path));
	const currentStep = $derived(currentIndex === -1 ? SETUP_STEPS[0] : SETUP_STEPS[currentIndex]);
</script>

<div class="flex min-h-dvh flex-col items-center px-4 py-8 sm:py-12">
	<div class="w-full max-w-lg">
		<div class="mb-6 text-center">
			<span class="text-primary text-xl font-semibold">{m.app_name()}</span>
			<h1 class="mt-2 text-lg font-semibold">{m.setup_title()}</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				{m.setup_step_of({ current: currentIndex + 1, total: SETUP_STEPS.length })} — {currentStep.label()}
			</p>
			<div class="mt-4 flex gap-1.5">
				{#each SETUP_STEPS as step, i (step.path)}
					<div
						class="h-1.5 flex-1 rounded-full {i <= currentIndex ? 'bg-primary' : 'bg-muted'}"
					></div>
				{/each}
			</div>
		</div>

		<div class="border-border bg-card rounded-xl border p-5 shadow-sm sm:p-6">
			{@render children()}
		</div>
	</div>
</div>
