<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const v = $derived(form?.values ?? data.org ?? {});
	function field(name: string, fallback = ''): string {
		return (v as Record<string, string>)[name] ?? fallback;
	}
	const errors = $derived(form?.errors ?? {});
</script>

<svelte:head>
	<title>{m.app_name()} — {m.setup_step_organization()}</title>
</svelte:head>

<h2 class="text-base font-semibold">{m.setup_step_organization()}</h2>
<p class="text-muted-foreground mt-2 text-sm">{m.setup_org_intro()}</p>

<form method="POST" class="mt-5 flex flex-col gap-4">
	<div class="flex flex-col gap-1.5">
		<Label for="name">{m.setup_org_name()}</Label>
		<Input id="name" name="name" required value={field('name')} />
		{#if errors.name}<p class="text-destructive text-sm">{errors.name[0]}</p>{/if}
	</div>

	<div class="grid grid-cols-3 gap-3">
		<div class="col-span-2 flex flex-col gap-1.5">
			<Label for="street">{m.setup_org_street()}</Label>
			<Input id="street" name="street" required value={field('street')} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="houseNumber">{m.setup_org_house_number()}</Label>
			<Input id="houseNumber" name="houseNumber" required value={field('houseNumber')} />
		</div>
	</div>

	<div class="grid grid-cols-3 gap-3">
		<div class="flex flex-col gap-1.5">
			<Label for="postalCode">{m.setup_org_postal_code()}</Label>
			<Input id="postalCode" name="postalCode" required value={field('postalCode')} />
		</div>
		<div class="col-span-2 flex flex-col gap-1.5">
			<Label for="town">{m.setup_org_town()}</Label>
			<Input id="town" name="town" required value={field('town')} />
		</div>
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="country">{m.setup_org_country()}</Label>
		<Input id="country" name="country" required maxlength={2} value={field('country', 'CH')} />
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="email">{m.common_email()}</Label>
		<Input id="email" name="email" type="email" required value={field('email')} />
		{#if errors.email}<p class="text-destructive text-sm">{errors.email[0]}</p>{/if}
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="flex flex-col gap-1.5">
			<Label for="phone"
				>{m.setup_org_phone()}
				<span class="text-muted-foreground">({m.common_optional()})</span></Label
			>
			<Input id="phone" name="phone" type="tel" value={field('phone')} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="website"
				>{m.setup_org_website()}
				<span class="text-muted-foreground">({m.common_optional()})</span></Label
			>
			<Input id="website" name="website" value={field('website')} />
		</div>
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="iban"
			>{m.setup_org_iban()}
			<span class="text-muted-foreground">({m.common_optional()})</span></Label
		>
		<Input id="iban" name="iban" value={field('iban')} placeholder="CH00 0000 0000 0000 0000 0" />
		<p class="text-muted-foreground text-xs">{m.setup_org_iban_hint()}</p>
		{#if errors.iban}<p class="text-destructive text-sm">{errors.iban[0]}</p>{/if}
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="flex flex-col gap-1.5">
			<Label for="defaultCurrency">{m.setup_org_currency()}</Label>
			<Input
				id="defaultCurrency"
				name="defaultCurrency"
				maxlength={3}
				required
				value={field('defaultCurrency', 'CHF')}
			/>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="timezone">{m.setup_org_timezone()}</Label>
			<Input id="timezone" name="timezone" required value={field('timezone', 'Europe/Zurich')} />
		</div>
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="defaultLocale">{m.setup_org_default_locale()}</Label>
		<select
			id="defaultLocale"
			name="defaultLocale"
			required
			value={field('defaultLocale', 'it')}
			class="border-input bg-card h-11 rounded-md border px-3 text-base md:text-sm"
		>
			<option value="it">Italiano</option>
			<option value="de">Deutsch</option>
			<option value="fr">Français</option>
			<option value="en">English</option>
		</select>
	</div>

	<div class="mt-2 flex justify-end">
		<Button type="submit">{m.common_continue()}</Button>
	</div>
</form>
