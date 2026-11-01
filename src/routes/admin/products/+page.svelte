<script lang="ts">
	import { api, type Category, type Product } from '#lib/api.ts';
	import { formatMoney } from '#lib/format.ts';
	import { t } from '#lib/i18n.svelte.ts';

	interface Form {
		id: number | null;
		name: string;
		sku: string;
		category: number | '';
		price: string;
		stock: number;
		low_stock_threshold: number;
		is_active: boolean;
	}

	const blank = (): Form => ({
		id: null,
		name: '',
		sku: '',
		category: '',
		price: '',
		stock: 0,
		low_stock_threshold: 5,
		is_active: true
	});

	let categories = $state<Category[]>([]);
	let products = $state<Product[]>([]);
	let count = $state(0);
	let hasNext = $state(false);
	let pageNo = $state(1);
	let search = $state('');
	let category = $state<number | ''>('');
	let active = $state<'' | 'true' | 'false'>('');
	let loading = $state(false);
	let error = $state('');

	let form = $state<Form | null>(null);
	let formError = $state('');
	let saving = $state(false);

	api.categories().then((c) => (categories = c));

	let timer: ReturnType<typeof setTimeout>;
	$effect(() => {
		const query = {
			search,
			category,
			active: active === '' ? undefined : active === 'true',
			page: pageNo
		};
		clearTimeout(timer);
		timer = setTimeout(() => load(query), search ? 250 : 0);
		return () => clearTimeout(timer);
	});

	let lastQuery: Parameters<typeof api.products>[0] = {};
	async function load(query: Parameters<typeof api.products>[0]) {
		lastQuery = query;
		loading = true;
		try {
			const res = await api.products(query);
			products = res.results;
			count = res.count;
			hasNext = res.next !== null;
		} catch (e) {
			error = e instanceof Error ? e.message : t('common.loadFailed');
		} finally {
			loading = false;
		}
	}

	function edit(p: Product) {
		formError = '';
		form = {
			id: p.id,
			name: p.name,
			sku: p.sku,
			category: p.category ?? '',
			price: p.price,
			stock: p.stock,
			low_stock_threshold: p.low_stock_threshold,
			is_active: p.is_active
		};
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!form) return;
		saving = true;
		formError = '';
		const { id, ...rest } = form;
		const data = { ...rest, category: rest.category === '' ? null : rest.category };
		try {
			if (id) await api.updateProduct(id, data);
			else await api.createProduct(data);
			form = null;
			load(lastQuery);
		} catch (e) {
			formError = e instanceof Error ? e.message : t('common.saveFailed');
		} finally {
			saving = false;
		}
	}

	async function toggleActive(p: Product) {
		try {
			await api.updateProduct(p.id, { is_active: !p.is_active });
			load(lastQuery);
		} catch (e) {
			error = e instanceof Error ? e.message : t('common.saveFailed');
		}
	}
</script>

<div class="page">
	<h1>{t('products.title')}</h1>

	<div class="toolbar">
		<label>
			{t('common.search')}
			<input type="search" bind:value={search} oninput={() => (pageNo = 1)} placeholder={t('products.searchPlaceholder')} />
		</label>
		<label>
			{t('common.category')}
			<select bind:value={category} onchange={() => (pageNo = 1)}>
				<option value="">{t('common.all')}</option>
				{#each categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
			</select>
		</label>
		<label>
			{t('common.status')}
			<select bind:value={active} onchange={() => (pageNo = 1)}>
				<option value="">{t('common.all')}</option>
				<option value="true">{t('common.active')}</option>
				<option value="false">{t('common.inactive')}</option>
			</select>
		</label>
		<span class="spacer"></span>
		<button class="btn-primary" onclick={() => ((formError = ''), (form = blank()))}>{t('products.new')}</button>
	</div>

	{#if error}<div class="alert">{error}</div>{/if}

	{#if form}
		<form class="card editor" onsubmit={save}>
			<h2>{form.id ? t('products.editTitle') : t('products.newTitle')}</h2>
			{#if formError}<div class="alert">{formError}</div>{/if}
			<div class="form-grid">
				<label>{t('common.name')} <input bind:value={form.name} required maxlength="200" /></label>
				<label>{t('common.sku')} <input bind:value={form.sku} required maxlength="64" /></label>
				<label>
					{t('common.category')}
					<select bind:value={form.category}>
						<option value="">{t('common.none')}</option>
						{#each categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
					</select>
				</label>
				<label>{t('common.price')} <input type="number" min="0" step="0.01" bind:value={form.price} required /></label>
				<label>{t('common.stock')} <input type="number" min="0" step="1" bind:value={form.stock} required /></label>
				<label>{t('products.lowStockAt')} <input type="number" min="0" step="1" bind:value={form.low_stock_threshold} required /></label>
				<label class="inline"><input type="checkbox" bind:checked={form.is_active} /> {t('common.active')}</label>
			</div>
			<div class="form-actions">
				<button type="button" onclick={() => (form = null)}>{t('common.cancel')}</button>
				<button class="btn-primary" type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
			</div>
		</form>
	{/if}

	<div class="card table-wrap">
		<table>
			<thead>
				<tr>
					<th>{t('common.name')}</th>
					<th>{t('common.sku')}</th>
					<th>{t('common.category')}</th>
					<th class="num">{t('common.price')}</th>
					<th class="num">{t('common.stock')}</th>
					<th>{t('common.status')}</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each products as p (p.id)}
					<tr class:inactive={!p.is_active}>
						<td>{p.name}</td>
						<td class="muted">{p.sku}</td>
						<td>{p.category_name ?? '-'}</td>
						<td class="num">{formatMoney(p.price)}</td>
						<td class="num">
							{#if p.is_low_stock}<span class="badge" class:danger={p.stock === 0} class:warning={p.stock > 0}>{p.stock}</span>
							{:else}{p.stock}{/if}
						</td>
						<td><span class="badge" class:success={p.is_active}>{p.is_active ? t('common.active') : t('common.inactive')}</span></td>
						<td class="row-actions">
							<button class="btn-sm" onclick={() => edit(p)}>{t('common.edit')}</button>
							<button class="btn-sm" onclick={() => toggleActive(p)}>
								{p.is_active ? t('products.deactivate') : t('products.activate')}
							</button>
						</td>
					</tr>
				{:else}
					<tr><td colspan="7" class="empty">{loading ? t('common.loading') : t('products.empty')}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="pager">
		<span class="muted">{t('products.count', { n: count })}</span>
		{#if pageNo > 1 || hasNext}
			<button class="btn-sm" disabled={pageNo === 1} onclick={() => pageNo--}>{t('common.previous')}</button>
			<span class="muted">{t('common.page', { n: pageNo })}</span>
			<button class="btn-sm" disabled={!hasNext} onclick={() => pageNo++}>{t('common.next')}</button>
		{/if}
	</div>
</div>

<style>
	.editor {
		margin-bottom: 1rem;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.row-actions {
		display: flex;
		gap: 0.35rem;
		justify-content: flex-end;
		white-space: nowrap;
	}

	tr.inactive td {
		color: var(--muted);
	}
</style>
