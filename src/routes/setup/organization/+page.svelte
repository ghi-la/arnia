<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import FieldError from '$lib/components/feedback/field-error.svelte';
	import { createSubmit } from '$lib/client/submit.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const submit = createSubmit({ reset: false });

	const v = $derived(form?.values ?? data.org ?? {});
	function field(name: string, fallback = ''): string {
		return (v as Record<string, string>)[name] ?? fallback;
	}
	const errors = $derived<Record<string, string[] | undefined>>(form?.errors ?? {});

	function errorFor(name: string): string | null {
		if (!errors[name]?.length) return null;
		if (name === 'email') return m.field_email_invalid();
		if (name === 'iban') return m.setup_org_iban_invalid();
		if (name === 'country') return m.setup_org_country_invalid();
		if (name === 'defaultCurrency') return m.setup_org_currency_invalid();
		return m.field_required();
	}
</script>

<svelte:head>
	<title>{m.app_name()} — {m.setup_step_organization()}</title>
</svelte:head>

<h2 class="text-base font-semibold">{m.setup_step_organization()}</h2>
<p class="text-muted-foreground mt-2 text-sm">{m.setup_org_intro()}</p>

<form method="POST" use:enhance={submit.enhance} class="mt-5 flex flex-col gap-4">
	<div class="flex flex-col gap-1.5">
		<Label for="name">{m.setup_org_name()}</Label>
		<Input
			id="name"
			name="name"
			required
			value={field('name')}
			aria-invalid={errors.name ? true : undefined}
			aria-describedby="name-error"
		/>
		<FieldError id="name-error" error={errorFor('name')} />
	</div>

	<div class="grid grid-cols-3 gap-3">
		<div class="col-span-2 flex flex-col gap-1.5">
			<Label for="street">{m.setup_org_street()}</Label>
			<Input
				id="street"
				name="street"
				required
				value={field('street')}
				aria-invalid={errors.street ? true : undefined}
				aria-describedby="street-error"
			/>
			<FieldError id="street-error" error={errorFor('street')} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="houseNumber">{m.setup_org_house_number()}</Label>
			<Input
				id="houseNumber"
				name="houseNumber"
				required
				value={field('houseNumber')}
				aria-invalid={errors.houseNumber ? true : undefined}
				aria-describedby="houseNumber-error"
			/>
			<FieldError id="houseNumber-error" error={errorFor('houseNumber')} />
		</div>
	</div>

	<div class="grid grid-cols-3 gap-3">
		<div class="flex flex-col gap-1.5">
			<Label for="postalCode">{m.setup_org_postal_code()}</Label>
			<Input
				id="postalCode"
				name="postalCode"
				required
				value={field('postalCode')}
				aria-invalid={errors.postalCode ? true : undefined}
				aria-describedby="postalCode-error"
			/>
			<FieldError id="postalCode-error" error={errorFor('postalCode')} />
		</div>
		<div class="col-span-2 flex flex-col gap-1.5">
			<Label for="town">{m.setup_org_town()}</Label>
			<Input
				id="town"
				name="town"
				required
				value={field('town')}
				aria-invalid={errors.town ? true : undefined}
				aria-describedby="town-error"
			/>
			<FieldError id="town-error" error={errorFor('town')} />
		</div>
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="country">{m.setup_org_country()}</Label>
		<Input
			id="country"
			name="country"
			required
			maxlength={2}
			value={field('country', 'CH')}
			aria-invalid={errors.country ? true : undefined}
			aria-describedby="country-error"
		/>
		<FieldError id="country-error" error={errorFor('country')} />
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="email">{m.common_email()}</Label>
		<Input
			id="email"
			name="email"
			type="email"
			required
			value={field('email')}
			aria-invalid={errors.email ? true : undefined}
			aria-describedby="email-error"
		/>
		<FieldError id="email-error" error={errorFor('email')} />
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="flex flex-col gap-1.5">
			<Label for="phone"
				>{m.setup_org_phone()}
				<span class="text-muted-foreground">({m.common_optional()})</span></Label
			>
			<Input
				id="phone"
				name="phone"
				type="tel"
				value={field('phone')}
				aria-invalid={errors.phone ? true : undefined}
				aria-describedby="phone-error"
			/>
			<FieldError id="phone-error" error={errorFor('phone')} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="website"
				>{m.setup_org_website()}
				<span class="text-muted-foreground">({m.common_optional()})</span></Label
			>
			<Input
				id="website"
				name="website"
				value={field('website')}
				aria-invalid={errors.website ? true : undefined}
				aria-describedby="website-error"
			/>
			<FieldError id="website-error" error={errorFor('website')} />
		</div>
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="iban"
			>{m.setup_org_iban()}
			<span class="text-muted-foreground">({m.common_optional()})</span></Label
		>
		<Input
			id="iban"
			name="iban"
			value={field('iban')}
			placeholder="CH00 0000 0000 0000 0000 0"
			aria-invalid={errors.iban ? true : undefined}
			aria-describedby="iban-error"
		/>
		<FieldError id="iban-error" error={errorFor('iban')} />
		<p class="text-muted-foreground text-xs">{m.setup_org_iban_hint()}</p>
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
				aria-invalid={errors.defaultCurrency ? true : undefined}
				aria-describedby="defaultCurrency-error"
			/>
			<FieldError id="defaultCurrency-error" error={errorFor('defaultCurrency')} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="timezone">{m.setup_org_timezone()}</Label>
			<Input
				id="timezone"
				name="timezone"
				required
				value={field('timezone', 'Europe/Zurich')}
				aria-invalid={errors.timezone ? true : undefined}
				aria-describedby="timezone-error"
			/>
			<FieldError id="timezone-error" error={errorFor('timezone')} />
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
		<Button type="submit" loading={submit.pending}>{m.common_continue()}</Button>
	</div>
</form>
