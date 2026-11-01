<script lang="ts">
	import { i18n, locales, setLocale } from './i18n.svelte.ts';
</script>

<div class="switch" role="group" aria-label="Language / ဘာသာစကား">
	{#each locales as l (l.code)}
		<button
			type="button"
			class:active={i18n.locale === l.code}
			aria-pressed={i18n.locale === l.code}
			lang={l.code}
			onclick={() => setLocale(l.code)}
		>
			{l.label}
		</button>
	{/each}
</div>

<style>
	.switch {
		display: inline-flex;
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	button {
		border: none;
		border-radius: 0;
		min-height: 32px;
		padding: 0.25rem 0.6rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	button + button {
		border-left: 1px solid var(--border);
	}

	button.active {
		background: var(--accent-soft);
		color: var(--accent);
		font-weight: 600;
	}
</style>
