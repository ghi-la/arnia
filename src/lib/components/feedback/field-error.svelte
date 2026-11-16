<script lang="ts">
	/**
	 * Inline, screen-reader-announced error under a form field. Give the input
	 * `aria-invalid={!!error}` and `aria-describedby={id}` so assistive tech
	 * links the two (see `fieldErrorId`).
	 */
	let { id, error }: { id: string; error?: string | string[] | null | false } = $props();

	const text = $derived(Array.isArray(error) ? error[0] : error);
</script>

{#if text}
	<p {id} class="text-destructive text-sm" role="alert">{text}</p>
{/if}
