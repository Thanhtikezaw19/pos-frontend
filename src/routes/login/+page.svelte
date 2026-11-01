<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth, homePath, login } from '#lib/auth.svelte.ts';
	import { ApiError } from '#lib/api.ts';
	import { shopName } from '#lib/format.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import LanguageSwitch from '#lib/LanguageSwitch.svelte';

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	$effect(() => {
		if (auth.user) goto(homePath(), { replaceState: true });
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		busy = true;
		try {
			await login(username, password);
		} catch (e) {
			error = e instanceof ApiError && e.status === 400 ? t('login.failed') : e instanceof Error ? e.message : t('common.requestFailed');
		} finally {
			busy = false;
		}
	}
</script>

<div class="wrap">
	<form class="card" onsubmit={submit}>
		<div class="head">
			<h1>{shopName}</h1>
			<LanguageSwitch />
		</div>
		<p class="muted">{t('login.subtitle')}</p>
		{#if error}<div class="alert">{error}</div>{/if}
		<label>
			{t('login.username')}
			<!-- svelte-ignore a11y_autofocus -->
			<input bind:value={username} autocomplete="username" required autofocus />
		</label>
		<label>
			{t('login.password')}
			<input type="password" bind:value={password} autocomplete="current-password" required />
		</label>
		<button class="btn-primary" type="submit" disabled={busy}>{busy ? t('login.submitting') : t('login.submit')}</button>
	</form>
</div>

<style>
	.wrap {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 1rem;
	}

	form {
		width: 100%;
		max-width: 360px;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		padding: 1.75rem;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	h1 {
		margin: 0;
	}

	p {
		margin: -0.5rem 0 0.25rem;
	}
</style>
