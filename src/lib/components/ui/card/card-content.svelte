<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class={cn('p-4 pt-0 sm:p-6 sm:pt-0', className)} {...restProps}>
	{@render children?.()}
</div>
