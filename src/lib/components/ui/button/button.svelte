<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const buttonVariants = tv({
		base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				outline: 'border border-input bg-card hover:bg-muted',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				ghost: 'hover:bg-muted',
				link: 'text-primary underline-offset-4 hover:underline'
			},
			size: {
				default: 'h-11 px-4 py-2 has-[>svg]:px-3',
				sm: 'h-9 rounded-md px-3 text-xs',
				lg: 'h-12 rounded-md px-6 text-base',
				icon: 'h-11 w-11 shrink-0'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];
</script>

<script lang="ts">
	import type { HTMLButtonAttributes, HTMLAnchorAttributes } from 'svelte/elements';
	import { LoaderCircle } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	type Props = Omit<HTMLButtonAttributes & HTMLAnchorAttributes, 'type'> & {
		type?: HTMLButtonAttributes['type'];
		variant?: ButtonVariant;
		size?: ButtonSize;
		href?: string;
		class?: string;
		/**
		 * Shows a spinner over the label and disables the button while an
		 * action is in flight. The label stays in the DOM (invisible) so the
		 * button keeps its width and the layout doesn't jump.
		 */
		loading?: boolean;
		children?: import('svelte').Snippet;
	};

	let {
		class: className,
		variant = 'default',
		size = 'default',
		href,
		type = 'button',
		loading = false,
		disabled,
		children,
		...restProps
	}: Props = $props();
</script>

{#if href}
	<!-- href comes pre-resolved from the caller (see $app/paths `resolve`); this is a generic wrapper -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		{href}
		class={cn(buttonVariants({ variant, size }), className)}
		{...restProps as HTMLAnchorAttributes}
	>
		{@render children?.()}
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button
		{type}
		class={cn(
			buttonVariants({ variant, size }),
			loading && 'relative disabled:opacity-80',
			className
		)}
		disabled={disabled || loading}
		aria-busy={loading || undefined}
		{...restProps}
	>
		{#if loading}
			<span class="invisible inline-flex items-center gap-2">{@render children?.()}</span>
			<span class="absolute inset-0 flex items-center justify-center">
				<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
			</span>
		{:else}
			{@render children?.()}
		{/if}
	</button>
{/if}
