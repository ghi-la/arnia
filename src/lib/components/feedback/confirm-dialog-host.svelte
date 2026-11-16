<script lang="ts">
	import { AlertDialog } from 'bits-ui';
	import { buttonVariants } from '$lib/components/ui/button';
	import { confirmState, settleConfirm, type ConfirmOptions } from '$lib/client/confirm.svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';

	// Keep the last request around so the text doesn't vanish mid close-animation.
	let shown = $state<ConfirmOptions | null>(null);
	$effect(() => {
		if (confirmState.current) shown = confirmState.current;
	});
</script>

<AlertDialog.Root
	bind:open={
		() => confirmState.current !== null,
		(open) => {
			if (!open) settleConfirm(false);
		}
	}
>
	<AlertDialog.Portal>
		<AlertDialog.Overlay
			class="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/50"
		/>
		<AlertDialog.Content
			class="border-border bg-card text-card-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border p-5 shadow-xl"
		>
			{#if shown}
				<div class="flex flex-col gap-1.5">
					<AlertDialog.Title class="text-lg font-semibold">{shown.title}</AlertDialog.Title>
					{#if shown.description}
						<AlertDialog.Description class="text-muted-foreground text-sm">
							{shown.description}
						</AlertDialog.Description>
					{/if}
				</div>
				<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<AlertDialog.Cancel
						class={buttonVariants({ variant: 'outline' })}
						onclick={() => settleConfirm(false)}
					>
						{m.common_cancel()}
					</AlertDialog.Cancel>
					<AlertDialog.Action
						class={cn(buttonVariants({ variant: shown.destructive ? 'destructive' : 'default' }))}
						onclick={() => settleConfirm(true)}
					>
						{shown.confirmLabel ?? m.common_confirm()}
					</AlertDialog.Action>
				</div>
			{/if}
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
