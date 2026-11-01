<script lang="ts">
	import { page } from '$app/state';
	import { api, type Order } from '#lib/api.ts';
	import { isAdmin } from '#lib/auth.svelte.ts';
	import { formatDateTime, formatMoney } from '#lib/format.ts';
	import { t } from '#lib/i18n.svelte.ts';

	let order = $state<Order | null>(null);
	let error = $state('');
	let message = $state('');
	let refunding = $state(false);

	$effect(() => {
		const id = page.params.id;
		if (!id) return;
		order = null;
		api.order(id)
			.then((o) => (order = o))
			.catch((e) => (error = e instanceof Error ? e.message : t('common.loadFailed')));
	});

	async function refund() {
		if (!order) return;
		if (!confirm(t('orders.refundConfirm', { number: order.number }))) return;
		refunding = true;
		error = '';
		try {
			order = await api.refund(order.id);
			message = t('orders.refundDone');
		} catch (e) {
			error = e instanceof Error ? e.message : t('orders.refundFailed');
		} finally {
			refunding = false;
		}
	}
</script>

<div class="page">
	<a href="/orders" class="no-print">{t('orders.back')}</a>

	{#if error}<div class="alert">{error}</div>{/if}
	{#if message}<div class="alert success">{message}</div>{/if}

	{#if order}
		<div class="head">
			<h1>{t('orders.heading', { number: order.number })}</h1>
			<span class="badge" class:success={order.status === 'completed'} class:danger={order.status === 'refunded'}>
				{t(`status.${order.status}`)}
			</span>
			<span class="spacer"></span>
			<a class="btn" href="/orders/{order.id}/receipt" target="_blank" rel="noopener">{t('common.printReceipt')}</a>
			{#if isAdmin() && order.status === 'completed'}
				<button class="btn-danger" disabled={refunding} onclick={refund}>{refunding ? t('orders.refunding') : t('orders.refund')}</button>
			{/if}
		</div>

		<div class="meta card">
			<div><span class="muted">{t('common.date')}</span>{formatDateTime(order.created_at)}</div>
			<div><span class="muted">{t('common.cashier')}</span>{order.cashier_name}</div>
			<div><span class="muted">{t('common.payment')}</span>{t(`payment.${order.payment_method}`)}</div>
			{#if order.cash_received}
				<div><span class="muted">{t('orders.cashReceived')}</span>{formatMoney(order.cash_received)}</div>
				<div><span class="muted">{t('orders.change')}</span>{formatMoney(order.change_due)}</div>
			{/if}
			{#if order.refunded_at}
				<div>
					<span class="muted">{t('orders.refunded')}</span>
					{t('orders.refundedBy', { date: formatDateTime(order.refunded_at), name: order.refunded_by_name ?? '-' })}
				</div>
			{/if}
		</div>

		<div class="card table-wrap">
			<table>
				<thead>
					<tr>
						<th>{t('common.product')}</th>
						<th>{t('common.sku')}</th>
						<th class="num">{t('common.price')}</th>
						<th class="num">{t('common.qty')}</th>
						<th class="num">{t('common.total')}</th>
					</tr>
				</thead>
				<tbody>
					{#each order.items as item (item.id)}
						<tr>
							<td>{item.product_name}</td>
							<td class="muted">{item.sku}</td>
							<td class="num">{formatMoney(item.unit_price)}</td>
							<td class="num">{item.quantity}</td>
							<td class="num">{formatMoney(item.line_total)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr><th colspan="4">{t('common.total')}</th><th class="num total">{formatMoney(order.total)}</th></tr>
				</tfoot>
			</table>
		</div>
	{:else if !error}
		<p class="empty">{t('common.loading')}</p>
	{/if}
</div>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin: 0.75rem 0 1rem;
	}

	.head h1 {
		margin: 0;
	}

	.spacer {
		flex: 1;
	}

	.meta {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.meta div {
		display: flex;
		flex-direction: column;
	}

	.meta .muted {
		font-size: 0.8rem;
	}

	.total {
		font-size: 1.1rem;
		color: var(--text);
	}
</style>
