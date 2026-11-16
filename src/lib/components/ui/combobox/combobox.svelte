<script lang="ts">
	import { Combobox } from 'bits-ui';
	import { Check, ChevronDown, LoaderCircle, Plus, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';

	type Option = { value: string; label: string };

	interface Props {
		/** Id of the text input (so a `<Label for>` works). */
		id?: string;
		/** Name of the hidden input that carries the selected value in a form post. */
		name?: string;
		/** Selected option value (`''` = nothing). */
		value?: string;
		options: Option[];
		placeholder?: string;
		/** Show a clear button and let emptying the text clear the value. */
		clearable?: boolean;
		disabled?: boolean;
		/**
		 * Makes the box creatable: when the typed text matches no option, a
		 * "Create “…”" row appears. Resolve to the new option, or `null` on
		 * failure (a toast is shown).
		 */
		oncreate?: (name: string) => Promise<Option | null>;
		class?: string;
		'aria-invalid'?: boolean;
		'aria-describedby'?: string;
	}

	let {
		id,
		name,
		value = $bindable(''),
		options,
		placeholder = '',
		clearable = false,
		disabled = false,
		oncreate,
		class: className,
		...aria
	}: Props = $props();

	const CREATE = '__create__';

	/** Options added on the fly, kept here so they survive until the parent reloads its list. */
	let created = $state<Option[]>([]);
	const all = $derived([
		...options,
		...created.filter((c) => !options.some((o) => o.value === c.value))
	]);

	function labelOf(v: string): string {
		return all.find((o) => o.value === v)?.label ?? '';
	}

	/** Lowercase + strip accents so "caffe" finds "Caffè". */
	function normalize(s: string): string {
		return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
	}

	// What the input displays, and the part of it the user typed to filter with.
	let text = $state(labelOf(value));
	let query = $state('');
	let creating = $state(false);
	/** Last real selection — restored if a "create" row is picked but creation fails. */
	let committed = value;

	const filtered = $derived(
		normalize(query) ? all.filter((o) => normalize(o.label).includes(normalize(query))) : all
	);
	const canCreate = $derived(
		!!oncreate &&
			normalize(query) !== '' &&
			!all.some((o) => normalize(o.label) === normalize(query))
	);

	function onType(v: string) {
		text = v;
		query = v;
		if (clearable && v === '') {
			value = '';
			committed = '';
		}
	}

	function onOpenChange(open: boolean) {
		query = '';
		// Closing with half-typed text snaps back to the actual selection.
		if (!open) text = labelOf(value);
	}

	async function onValueChange(v: string) {
		if (v !== CREATE) {
			committed = v;
			text = labelOf(v);
			query = '';
			return;
		}

		const newName = query.trim();
		value = committed;
		if (!oncreate || !newName) return;

		creating = true;
		try {
			const entry = await oncreate(newName);
			if (!entry) {
				toast.error(m.combobox_create_failed({ name: newName }));
				return;
			}
			if (!all.some((o) => o.value === entry.value)) created.push(entry);
			committed = entry.value;
			value = entry.value;
			text = entry.label;
		} finally {
			creating = false;
		}
	}

	function clear() {
		value = '';
		committed = '';
		text = '';
		query = '';
	}

	const itemClass =
		'data-highlighted:bg-muted flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-base outline-none select-none md:min-h-9 md:text-sm';
</script>

<div class={cn('relative', className)}>
	{#if name}<input type="hidden" {name} {value} />{/if}

	<Combobox.Root
		type="single"
		bind:value
		items={all}
		allowDeselect={false}
		disabled={disabled || creating}
		{onOpenChange}
		{onValueChange}
	>
		<Combobox.Input {id} oninput={(e) => onType(e.currentTarget.value)} {...aria}>
			{#snippet child({ props })}
				<input
					{...props}
					value={text}
					{placeholder}
					autocomplete="off"
					class={cn(
						'border-input bg-card placeholder:text-muted-foreground focus-visible:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
						clearable && value ? 'pr-20' : 'pr-11'
					)}
				/>
			{/snippet}
		</Combobox.Input>

		{#if clearable && value && !creating}
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground absolute top-0 right-11 flex size-11 items-center justify-center"
				aria-label={m.combobox_clear()}
				{disabled}
				onclick={clear}
			>
				<X class="size-4" />
			</button>
		{/if}

		<Combobox.Trigger
			class="text-muted-foreground absolute top-0 right-0 flex size-11 items-center justify-center"
			tabindex={-1}
		>
			{#if creating}
				<LoaderCircle class="size-4 animate-spin" />
			{:else}
				<ChevronDown class="size-4" />
			{/if}
		</Combobox.Trigger>

		<Combobox.Portal>
			<Combobox.Content
				sideOffset={4}
				class="border-border bg-card text-card-foreground z-50 max-h-72 w-(--bits-floating-anchor-width) min-w-40 overflow-y-auto rounded-xl border p-1 shadow-lg"
			>
				<Combobox.Viewport>
					{#each filtered as option (option.value)}
						<Combobox.Item value={option.value} label={option.label} class={itemClass}>
							{#snippet children({ selected })}
								<span class="flex-1 truncate">{option.label}</span>
								{#if selected}<Check class="size-4 shrink-0" />{/if}
							{/snippet}
						</Combobox.Item>
					{/each}

					{#if canCreate}
						<Combobox.Item
							value={CREATE}
							label={query.trim()}
							class={cn(itemClass, 'text-accent-foreground')}
						>
							<Plus class="size-4 shrink-0" />
							<span class="flex-1 truncate">{m.combobox_create({ name: query.trim() })}</span>
						</Combobox.Item>
					{:else if filtered.length === 0}
						<p class="text-muted-foreground px-3 py-2 text-sm">{m.combobox_no_results()}</p>
					{/if}
				</Combobox.Viewport>
			</Combobox.Content>
		</Combobox.Portal>
	</Combobox.Root>
</div>
