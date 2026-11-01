<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { setUnauthorizedHandler } from '#lib/api.ts';
	import { auth, homePath, isAdmin, loadUser, logout } from '#lib/auth.svelte.ts';
	import { shopName } from '#lib/format.ts';
	import { i18n, t } from '#lib/i18n.svelte.ts';
	import LanguageSwitch from '#lib/LanguageSwitch.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const adminOnly = ['/dashboard', '/admin'];

	const path = $derived(page.url.pathname);
	const bare = $derived(path === '/login' || path.endsWith('/receipt'));
	const allowed = $derived(
		path === '/login' || (auth.user !== null && (isAdmin() || !adminOnly.some((p) => path.startsWith(p))))
	);

	setUnauthorizedHandler(() => {
		auth.user = null;
		goto('/login');
	});
	loadUser();

	$effect(() => {
		if (!auth.ready) return;
		if (!auth.user && path !== '/login') goto('/login');
		else if (auth.user && !allowed) goto(homePath());
	});

	$effect(() => {
		document.documentElement.lang = i18n.locale;
	});

	const links = $derived(
		isAdmin()
			? [
					{ href: '/dashboard', label: t('nav.dashboard') },
					{ href: '/pos', label: t('nav.sell') },
					{ href: '/orders', label: t('nav.orders') },
					{ href: '/admin/products', label: t('nav.products') },
					{ href: '/admin/categories', label: t('nav.categories') },
					{ href: '/admin/users', label: t('nav.users') }
				]
			: [
					{ href: '/pos', label: t('nav.sell') },
					{ href: '/orders', label: t('nav.myOrders') }
				]
	);

	async function signOut() {
		await logout();
		goto('/login');
	}
</script>

<svelte:head>
	<title>{t('app.title', { shop: shopName })}</title>
</svelte:head>

{#if !auth.ready}
	<p class="empty">{t('common.loading')}</p>
{:else if bare}
	{#if allowed}{@render children()}{/if}
{:else if allowed}
	<header class="topbar no-print">
		<a class="brand" href={homePath()}>{shopName}</a>
		<nav>
			{#each links as link (link.href)}
				<a href={link.href} class:active={path.startsWith(link.href)}>{link.label}</a>
			{/each}
		</nav>
		<div class="user">
			<span class="muted">{auth.user?.username} · {auth.user ? t(`role.${auth.user.role}`) : ''}</span>
			<LanguageSwitch />
			<button class="btn-sm" onclick={signOut}>{t('nav.logout')}</button>
		</div>
	</header>
	<main>{@render children()}</main>
{/if}

<style>
	.topbar {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0 1.25rem;
		min-height: 56px;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 10;
		flex-wrap: wrap;
	}

	.brand {
		font-weight: 700;
		color: var(--text);
		text-decoration: none;
		font-size: 1.05rem;
	}

	nav {
		display: flex;
		gap: 0.25rem;
		flex: 1;
		overflow-x: auto;
	}

	nav a {
		padding: 0.45rem 0.75rem;
		border-radius: 8px;
		color: var(--muted);
		text-decoration: none;
		font-weight: 500;
		white-space: nowrap;
	}

	nav a:hover {
		background: var(--surface-2);
		color: var(--text);
	}

	nav a.active {
		background: var(--accent-soft);
		color: var(--accent);
	}

	@media (max-width: 900px) {
		.user .muted {
			display: none;
		}
	}

	.user {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.85rem;
	}
</style>
