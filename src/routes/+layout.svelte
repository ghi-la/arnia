<script lang="ts">
	import '../app.css';
	import { ModeWatcher, mode } from 'mode-watcher';
	import { Toaster } from 'svelte-sonner';
	import ConfirmDialogHost from '$lib/components/feedback/confirm-dialog-host.svelte';
	import NavigationProgress from '$lib/components/feedback/navigation-progress.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<ModeWatcher disableHeadScriptInjection />
<NavigationProgress />

{@render children()}

<!--
	Global feedback hosts: every toast (via `toast` / `createSubmit`) and every
	confirmation (via `confirmDialog`) renders here, once, for the whole app.
	Bottom-center clears the mobile bottom nav via `mobileOffset`.
-->
<Toaster
	position="bottom-center"
	theme={mode.current ?? 'system'}
	richColors
	closeButton
	mobileOffset={{ bottom: 'calc(var(--bottom-nav-height) + var(--safe-bottom) + 0.75rem)' }}
/>
<ConfirmDialogHost />
