<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div
	class={cn('border-border bg-card text-card-foreground rounded-xl border shadow-sm', className)}
	{...restProps}
>
	{@render children?.()}
</div>
