<script lang="ts">
	import { m } from '$lib/paraglide/messages';
</script>

<svelte:head>
	<title>{m.app_name()} — {m.quick_action_new_expense()}</title>
</svelte:head>

<h1 class="text-xl font-semibold">{m.quick_action_new_expense()}</h1>
<p class="text-muted-foreground mt-2 text-sm">{m.common_coming_soon()}</p>
