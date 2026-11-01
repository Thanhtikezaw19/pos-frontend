<script lang="ts">
	import { page } from '$app/state';
	import { api, type Order } from '#lib/api.ts';
	import { formatDateTime, formatMoney, shopName } from '#lib/format.ts';
	import { t } from '#lib/i18n.svelte.ts';

	let order = $state<Order | null>(null);
	let error = $state('');

	$effect(() => {
		const id = page.params.id;
		if (!id) return;
		api.order(id)
			.then((o) => (order = o))
			.catch((e) => (error = e instanceof Error ? e.message : t('common.loadFailed')));
	});
</script>

<svelte:head><title>{t('receipt.title', { number: order?.number ?? '' })}</title></svelte:head>

<div class="actions no-print">
	<button class="btn-primary" onclick={() => window.print()} disabled={!order}>{t('receipt.print')}</button>
	<button onclick={() => window.close()}>{t('receipt.close')}</button>
</div>

{#if error}
	<p class="alert">{error}</p>
{:else if order}
	<div class="receipt">
		<h1>{shopName}</h1>
		<p class="center">
			{t('receipt.order', { number: order.number })}<br />{formatDateTime(order.created_at)}<br />{t('receipt.cashier', { name: order.cashier_name })}
		</p>
		{#if order.status === 'refunded'}<p class="center refunded">{t('receipt.refunded')}</p>{/if}

		<hr />
		{#each order.items as item (item.id)}
			<div class="item">
				<div>{item.product_name}</div>
				<div class="row"><span>{item.quantity} × {formatMoney(item.unit_price)}</span><span>{formatMoney(item.line_total)}</span></div>
			</div>
		{/each}
		<hr />

		<div class="row total"><span>{t('receipt.total')}</span><span>{formatMoney(order.total)}</span></div>
		<div class="row"><span>{t('receipt.paidBy')}</span><span>{t(`payment.${order.payment_method}`)}</span></div>
		{#if order.cash_received}
			<div class="row"><span>{t('receipt.cash')}</span><span>{formatMoney(order.cash_received)}</span></div>
			<div class="row"><span>{t('receipt.change')}</span><span>{formatMoney(order.change_due)}</span></div>
		{/if}
		<hr />
		<p class="center">{t('receipt.thanks')}</p>
	</div>
{:else}
	<p class="empty">{t('common.loading')}</p>
{/if}

<style>
	.actions {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
	}

	.receipt {
		width: 80mm;
		margin: 0 auto 2rem;
		padding: 4mm;
		background: #fff;
		color: #000;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 12px;
		line-height: 1.4;
		box-shadow: var(--shadow);
	}

	:global(:root:lang(my)) .receipt {
		line-height: 1.75;
	}

	h1 {
		text-align: center;
		font-size: 16px;
		margin: 0 0 4px;
	}

	.center {
		text-align: center;
		margin: 4px 0;
	}

	.refunded {
		font-weight: 700;
	}

	hr {
		border: none;
		border-top: 1px dashed #000;
		margin: 6px 0;
	}

	.item {
		margin-bottom: 4px;
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 8px;
	}

	.total {
		font-weight: 700;
		font-size: 14px;
		margin-bottom: 2px;
	}

	@media print {
		@page {
			size: 80mm auto;
			margin: 0;
		}

		.receipt {
			box-shadow: none;
			margin: 0;
		}
	}
</style>
