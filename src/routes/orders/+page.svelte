<script lang="ts">
	import { api, type Order, type OrderStatus } from '#lib/api.ts';
	import { isAdmin } from '#lib/auth.svelte.ts';
	import { formatDateTime, formatMoney, todayISO } from '#lib/format.ts';
	import { t } from '#lib/i18n.svelte.ts';

	let dateFrom = $state(todayISO());
	let dateTo = $state(todayISO());
	let status = $state<OrderStatus | ''>('');
	let pageNo = $state(1);

	let orders = $state<Order[]>([]);
	let count = $state(0);
	let hasNext = $state(false);
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		load({ date_from: dateFrom, date_to: dateTo, status, page: pageNo });
	});

	async function load(query: Parameters<typeof api.orders>[0]) {
		loading = true;
		error = '';
		try {
			const res = await api.orders(query);
			orders = res.results;
			count = res.count;
			hasNext = res.next !== null;
		} catch (e) {
			error = e instanceof Error ? e.message : t('common.loadFailed');
		} finally {
			loading = false;
		}
	}

	function resetPage() {
		pageNo = 1;
	}
</script>

<div class="page">
	<h1>{isAdmin() ? t('orders.title') : t('orders.myTitle')}</h1>

	<div class="toolbar">
		<label>{t('orders.from')} <input type="date" bind:value={dateFrom} onchange={resetPage} /></label>
		<label>{t('orders.to')} <input type="date" bind:value={dateTo} onchange={resetPage} /></label>
		<label>
			{t('common.status')}
			<select bind:value={status} onchange={resetPage}>
				<option value="">{t('common.all')}</option>
				<option value="completed">{t('status.completed')}</option>
				<option value="refunded">{t('status.refunded')}</option>
			</select>
		</label>
		<span class="spacer"></span>
		<span class="muted">{t('orders.count', { n: count })}</span>
	</div>

	{#if error}<div class="alert">{error}</div>{/if}

	<div class="card table-wrap">
		<table>
			<thead>
				<tr>
					<th>{t('orders.order')}</th>
					<th>{t('common.date')}</th>
					{#if isAdmin()}<th>{t('common.cashier')}</th>{/if}
					<th class="num">{t('orders.items')}</th>
					<th>{t('common.payment')}</th>
					<th class="num">{t('common.total')}</th>
					<th>{t('common.status')}</th>
				</tr>
			</thead>
			<tbody>
				{#each orders as order (order.id)}
					<tr>
						<td><a href="/orders/{order.id}">{order.number}</a></td>
						<td>{formatDateTime(order.created_at)}</td>
						{#if isAdmin()}<td>{order.cashier_name}</td>{/if}
						<td class="num">{order.item_count}</td>
						<td>{t(`payment.${order.payment_method}`)}</td>
						<td class="num">{formatMoney(order.total)}</td>
						<td>
							<span class="badge" class:success={order.status === 'completed'} class:danger={order.status === 'refunded'}>
								{t(`status.${order.status}`)}
							</span>
						</td>
					</tr>
				{:else}
					<tr><td colspan="7" class="empty">{loading ? t('common.loading') : t('orders.empty')}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if pageNo > 1 || hasNext}
		<div class="pager">
			<button class="btn-sm" disabled={pageNo === 1} onclick={() => pageNo--}>{t('common.previous')}</button>
			<span class="muted">{t('common.page', { n: pageNo })}</span>
			<button class="btn-sm" disabled={!hasNext} onclick={() => pageNo++}>{t('common.next')}</button>
		</div>
	{/if}
</div>
