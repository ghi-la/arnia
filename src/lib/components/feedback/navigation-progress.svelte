<script lang="ts">
	import { navigating } from '$app/state';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Thin top progress bar while a client-side navigation (incl. its `load`)
	 * is in flight. Appears only after a short delay so instant navigations
	 * don't flicker; the bar eases toward ~90% and completes on arrival.
	 */
	const SHOW_AFTER_MS = 150;

	let visible = $state(false);
	let done = $state(false);

	$effect(() => {
		if (navigating.to) {
			done = false;
			const timer = setTimeout(() => (visible = true), SHOW_AFTER_MS);
			return () => clearTimeout(timer);
		}
		if (visible) {
			done = true;
			const timer = setTimeout(() => {
				visible = false;
				done = false;
			}, 250);
			return () => clearTimeout(timer);
		}
	});
</script>

{#if visible}
	<div
		class="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
		role="progressbar"
		aria-busy={!done}
		aria-label={m.common_loading()}
	>
		<div
			class="bg-accent h-full origin-left transition-opacity duration-200 {done
				? 'scale-x-100 opacity-0'
				: 'progress-grow'}"
		></div>
	</div>
{/if}

<style>
	.progress-grow {
		animation: grow 8s cubic-bezier(0.1, 0.7, 0.2, 1) forwards;
	}
	@keyframes grow {
		from {
			transform: scaleX(0.05);
		}
		to {
			transform: scaleX(0.9);
		}
	}
</style>
