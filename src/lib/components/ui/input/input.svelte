<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		class: className,
		value = $bindable(),
		type = 'text',
		files = $bindable(),
		...restProps
	}: HTMLInputAttributes = $props();

	const inputClass = $derived(
		cn(
			'flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
			className
		)
	);
</script>

{#if type === 'file'}
	<input bind:files type="file" class={inputClass} {...restProps} />
{:else}
	<input
		{type}
		class={inputClass}
		{...restProps}
		value={value ?? ''}
		oninput={(e) => (value = e.currentTarget.value)}
	/>
{/if}
