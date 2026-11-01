<script lang="ts">
	import { api, type Dashboard } from '#lib/api.ts';
	import { formatDate, formatMoney } from '#lib/format.ts';
	import { t } from '#lib/i18n.svelte.ts';

	let data = $state<Dashboard | null>(null);
	let error = $state('');

	api.dashboard()
		.then((d) => (data = d))
		.catch((e) => (error = e instanceof Error ? e.message : t('common.loadFailed')));
</script>

<div class="page">
	<h1>{t('dashboard.today')}{data ? ` · ${formatDate(data.date)}` : ''}</h1>

	{#if error}<div class="alert">{error}</div>{/if}

	{#if data}
		<div class="stats">
			<div class="card stat">
				<span class="muted">{t('dashboard.sales')}</span>
				<strong>{formatMoney(data.sales_total)}</strong>
			</div>
			<div class="card stat">
				<span class="muted">{t('dashboard.orders')}</span>
				<strong>{data.order_count}</strong>
			</div>
			<div class="card stat">
				<span class="muted">{t('dashboard.average')}</span>
				<strong>{data.order_count ? formatMoney(Number(data.sales_total) / data.order_count) : '-'}</strong>
			</div>
			<div class="card stat">
				<span class="muted">{t('dashboard.lowStockCount')}</span>
				<strong class:warn={data.low_stock.length > 0}>{data.low_stock.length}</strong>
			</div>
		</div>

		<div class="panels">
			<section class="card">
				<h2>{t('dashboard.topProducts')}</h2>
				<table>
					<thead>
						<tr><th>{t('common.product')}</th><th class="num">{t('common.qty')}</th><th class="num">{t('dashboard.revenue')}</th></tr>
					</thead>
					<tbody>
						{#each data.top_products as p (p.product_id)}
							<tr><td>{p.product_name}</td><td class="num">{p.quantity}</td><td class="num">{formatMoney(p.revenue)}</td></tr>
						{:else}
							<tr><td colspan="3" class="empty">{t('dashboard.noSales')}</td></tr>
						{/each}
					</tbody>
				</table>
			</section>

			<section class="card">
				<h2>{t('dashboard.lowStock')}</h2>
				<table>
					<thead>
						<tr><th>{t('common.product')}</th><th>{t('common.sku')}</th><th class="num">{t('common.stock')}</th></tr>
					</thead>
					<tbody>
						{#each data.low_stock as p (p.id)}
							<tr>
								<td>{p.name}</td>
								<td class="muted">{p.sku}</td>
								<td class="num"><span class="badge" class:danger={p.stock === 0} class:warning={p.stock > 0}>{p.stock}</span></td>
							</tr>
						{:else}
							<tr><td colspan="3" class="empty">{t('dashboard.allStocked')}</td></tr>
						{/each}
					</tbody>
				</table>
				<p><a href="/admin/products">{t('dashboard.manageProducts')}</a></p>
			</section>
		</div>
	{:else if !error}
		<p class="empty">{t('common.loading')}</p>
	{/if}
</div>

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat strong {
		font-size: 1.7rem;
		font-variant-numeric: tabular-nums;
	}

	.stat .warn {
		color: var(--warning);
	}

	.panels {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
		gap: 1rem;
	}

	.panels p {
		margin: 0.75rem 0 0;
	}
</style>
