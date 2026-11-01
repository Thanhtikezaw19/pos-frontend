<script lang="ts">
	import { api, type Category, type Order, type PaymentMethod, type Product } from '#lib/api.ts';
	import { formatMoney, fromCents, toCents } from '#lib/format.ts';
	import { t } from '#lib/i18n.svelte.ts';

	interface CartLine {
		product: Product;
		quantity: number;
	}

	let categories = $state<Category[]>([]);
	let products = $state<Product[]>([]);
	let search = $state('');
	let category = $state<number | ''>('');
	let loading = $state(false);

	let cart = $state<CartLine[]>([]);
	let paymentMethod = $state<PaymentMethod>('cash');
	let cashReceived = $state('');
	let error = $state('');
	let submitting = $state(false);
	let completed = $state<Order | null>(null);

	const totalCents = $derived(cart.reduce((sum, l) => sum + toCents(l.product.price) * l.quantity, 0));
	const itemCount = $derived(cart.reduce((sum, l) => sum + l.quantity, 0));
	const cashCents = $derived(cashReceived === '' ? null : toCents(cashReceived));
	const changeCents = $derived(cashCents === null ? null : cashCents - totalCents);
	const canSubmit = $derived(
		cart.length > 0 &&
			!submitting &&
			(paymentMethod !== 'cash' || (changeCents !== null && changeCents >= 0))
	);

	// Quick-cash buttons: exact amount, then the next round 1,000 / 5,000 / 10,000 above the total.
	const quickCash = $derived.by(() => {
		if (totalCents === 0) return [];
		const values = [totalCents];
		for (const step of [100000, 500000, 1000000]) {
			const rounded = Math.ceil(totalCents / step) * step;
			if (!values.includes(rounded)) values.push(rounded);
		}
		return values;
	});

	api.categories().then((c) => (categories = c));

	let searchTimer: ReturnType<typeof setTimeout>;
	$effect(() => {
		const query = { search, category, active: true, page_size: 200 };
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => loadProducts(query), search ? 250 : 0);
		return () => clearTimeout(searchTimer);
	});

	async function loadProducts(query: Parameters<typeof api.products>[0]) {
		loading = true;
		try {
			products = (await api.products(query)).results;
		} catch (e) {
			error = e instanceof Error ? e.message : t('common.loadFailed');
		} finally {
			loading = false;
		}
	}

	function inCart(product: Product) {
		return cart.find((l) => l.product.id === product.id)?.quantity ?? 0;
	}

	function add(product: Product) {
		error = '';
		const line = cart.find((l) => l.product.id === product.id);
		if ((line?.quantity ?? 0) >= product.stock) {
			error = t('pos.onlyInStock', { n: product.stock, name: product.name });
			return;
		}
		if (line) line.quantity += 1;
		else cart.push({ product, quantity: 1 });
	}

	function setQuantity(line: CartLine, quantity: number) {
		error = '';
		if (!Number.isFinite(quantity) || quantity < 1) {
			remove(line);
			return;
		}
		if (quantity > line.product.stock) {
			error = t('pos.onlyInStock', { n: line.product.stock, name: line.product.name });
			quantity = line.product.stock;
		}
		line.quantity = Math.floor(quantity);
	}

	function remove(line: CartLine) {
		cart = cart.filter((l) => l !== line);
	}

	function clearCart() {
		cart = [];
		cashReceived = '';
		error = '';
	}

	function onSearchKey(event: KeyboardEvent) {
		if (event.key === 'Enter' && products.length === 1) {
			add(products[0]);
			search = '';
		}
	}

	async function completeSale() {
		error = '';
		submitting = true;
		try {
			completed = await api.createSale({
				items: cart.map((l) => ({ product: l.product.id, quantity: l.quantity })),
				payment_method: paymentMethod,
				cash_received: paymentMethod === 'cash' ? fromCents(cashCents ?? 0) : null
			});
			clearCart();
			paymentMethod = 'cash';
			loadProducts({ search, category, active: true, page_size: 200 });
		} catch (e) {
			error = e instanceof Error ? e.message : t('pos.saleFailed');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="pos">
	<section class="catalog">
		<div class="filters">
			<input
				class="search"
				type="search"
				placeholder={t('pos.search')}
				bind:value={search}
				onkeydown={onSearchKey}
			/>
			<div class="chips">
				<button class="chip" class:active={category === ''} onclick={() => (category = '')}>{t('common.all')}</button>
				{#each categories as c (c.id)}
					<button class="chip" class:active={category === c.id} onclick={() => (category = c.id)}>
						{c.name}
					</button>
				{/each}
			</div>
		</div>

		<div class="grid">
			{#each products as product (product.id)}
				{@const left = product.stock - inCart(product)}
				<button class="tile" disabled={left <= 0} onclick={() => add(product)}>
					<span class="name">{product.name}</span>
					<span class="sku">{product.sku}</span>
					<span class="row">
						<strong>{formatMoney(product.price)}</strong>
						<span class:low={left <= product.low_stock_threshold}>{t('pos.left', { n: left })}</span>
					</span>
				</button>
			{:else}
				<p class="empty">{loading ? t('common.loading') : t('pos.noProducts')}</p>
			{/each}
		</div>
	</section>

	<aside class="cart card">
		<div class="cart-head">
			<h2>{t('pos.currentSale')}</h2>
			{#if cart.length}<button class="btn-sm" onclick={clearCart}>{t('pos.clear')}</button>{/if}
		</div>

		<div class="lines">
			{#each cart as line (line.product.id)}
				<div class="line">
					<div class="info">
						<span>{line.product.name}</span>
						<span class="muted small">{t('pos.each', { price: formatMoney(line.product.price) })}</span>
					</div>
					<div class="qty">
						<button class="btn-sm" aria-label={t('pos.decrease')} onclick={() => setQuantity(line, line.quantity - 1)}>−</button>
						<input
							type="number"
							min="1"
							max={line.product.stock}
							value={line.quantity}
							onchange={(e) => setQuantity(line, Number(e.currentTarget.value))}
						/>
						<button class="btn-sm" aria-label={t('pos.increase')} onclick={() => setQuantity(line, line.quantity + 1)}>+</button>
					</div>
					<span class="num line-total">{formatMoney(fromCents(toCents(line.product.price) * line.quantity))}</span>
					<button class="btn-sm remove" aria-label={t('pos.remove')} onclick={() => remove(line)}>✕</button>
				</div>
			{:else}
				<p class="empty">{t('pos.tapToAdd')}</p>
			{/each}
		</div>

		<div class="total">
			<span>{t('common.total')} <span class="muted small">{t('pos.items', { n: itemCount })}</span></span>
			<strong>{formatMoney(fromCents(totalCents))}</strong>
		</div>

		<div class="methods" role="radiogroup" aria-label={t('pos.paymentMethod')}>
			{#each ['cash', 'card', 'other'] as const as m (m)}
				<button
					role="radio"
					aria-checked={paymentMethod === m}
					class:active={paymentMethod === m}
					onclick={() => (paymentMethod = m)}
				>
					{t(`payment.${m}`)}
				</button>
			{/each}
		</div>

		{#if paymentMethod === 'cash'}
			<label>
				{t('pos.cashReceived')}
				<input type="number" min="0" step="any" inputmode="decimal" bind:value={cashReceived} />
			</label>
			<div class="quick">
				{#each quickCash as cents (cents)}
					<button class="btn-sm" onclick={() => (cashReceived = fromCents(cents))}>{formatMoney(fromCents(cents))}</button>
				{/each}
			</div>
			<div class="change" class:bad={changeCents !== null && changeCents < 0}>
				<span>{t('pos.change')}</span>
				<strong>{changeCents === null ? '-' : formatMoney(fromCents(changeCents))}</strong>
			</div>
		{/if}

		{#if error}<div class="alert">{error}</div>{/if}

		<button class="btn-primary complete" disabled={!canSubmit} onclick={completeSale}>
			{submitting ? t('common.saving') : t('pos.complete', { total: formatMoney(fromCents(totalCents)) })}
		</button>
	</aside>
</div>

{#if completed}
	<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="done-title">
		<div class="card done">
			<h2 id="done-title">{t('pos.done')}</h2>
			<p class="muted">{t('orders.heading', { number: completed.number })}</p>
			<div class="done-row"><span>{t('common.total')}</span><strong>{formatMoney(completed.total)}</strong></div>
			{#if completed.payment_method === 'cash'}
				<div class="done-row big"><span>{t('pos.changeDue')}</span><strong>{formatMoney(completed.change_due)}</strong></div>
			{/if}
			<div class="done-actions">
				<a class="btn" href="/orders/{completed.id}/receipt" target="_blank" rel="noopener">{t('common.printReceipt')}</a>
				<button class="btn-primary" onclick={() => (completed = null)}>{t('pos.newSale')}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.pos {
		display: grid;
		grid-template-columns: 1fr minmax(340px, 400px);
		gap: 1rem;
		padding: 1rem;
		height: calc(100vh - 56px);
	}

	.catalog {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-bottom: 0.75rem;
	}

	.search {
		width: 100%;
		font-size: 1rem;
	}

	.chips {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		padding-bottom: 2px;
	}

	.chip {
		border-radius: 999px;
		min-height: 36px;
		white-space: nowrap;
	}

	.chip.active {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.6rem;
		overflow-y: auto;
		align-content: start;
		padding: 2px;
	}

	.grid .empty {
		grid-column: 1 / -1;
	}

	.tile {
		flex-direction: column;
		align-items: stretch;
		text-align: left;
		gap: 0.2rem;
		padding: 0.75rem;
		min-height: 104px;
		background: var(--surface);
		box-shadow: var(--shadow);
	}

	.tile:hover:not(:disabled) {
		border-color: var(--accent);
		background: var(--surface);
	}

	.tile .name {
		font-weight: 600;
		line-height: 1.25;
	}

	.tile .sku {
		font-size: 0.78rem;
		color: var(--muted);
	}

	.tile .row {
		margin-top: auto;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.tile .row strong {
		color: var(--text);
		font-size: 1rem;
	}

	.tile .low {
		color: var(--warning);
		font-weight: 600;
	}

	.cart {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-height: 0;
	}

	.cart-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.cart-head h2 {
		margin: 0;
	}

	.lines {
		flex: 1;
		overflow-y: auto;
		min-height: 80px;
		border-top: 1px solid var(--border);
	}

	.line {
		display: grid;
		grid-template-columns: 1fr auto auto auto;
		gap: 0.5rem;
		align-items: center;
		padding: 0.55rem 0;
		border-bottom: 1px solid var(--border);
	}

	.info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.small {
		font-size: 0.8rem;
	}

	.qty {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}

	.qty input {
		width: 3.2rem;
		min-height: 32px;
		padding: 0.2rem;
		text-align: center;
	}

	.qty button {
		width: 32px;
		padding: 0;
	}

	.line-total {
		min-width: 4.5rem;
		font-weight: 600;
	}

	.remove {
		border: none;
		color: var(--muted);
		padding: 0 0.4rem;
	}

	.total {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font-size: 1.05rem;
	}

	.total strong {
		font-size: 1.6rem;
		font-variant-numeric: tabular-nums;
	}

	.methods {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.4rem;
	}

	.methods button.active {
		background: var(--accent-soft);
		border-color: var(--accent);
		color: var(--accent);
	}

	.quick {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.change {
		display: flex;
		justify-content: space-between;
		font-size: 1.05rem;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		background: var(--success-soft);
		color: var(--success);
	}

	.change.bad {
		background: var(--danger-soft);
		color: var(--danger);
	}

	.complete {
		min-height: 52px;
		font-size: 1.05rem;
	}

	.cart .alert {
		margin: 0;
	}

	.overlay {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 0.35);
		display: grid;
		place-items: center;
		padding: 1rem;
		z-index: 20;
	}

	.done {
		width: 100%;
		max-width: 380px;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1.5rem;
	}

	.done h2,
	.done p {
		margin: 0;
	}

	.done-row {
		display: flex;
		justify-content: space-between;
	}

	.done-row.big {
		font-size: 1.4rem;
		color: var(--success);
	}

	.done-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	@media (max-width: 900px) {
		.pos {
			grid-template-columns: 1fr;
			height: auto;
		}

		.grid {
			max-height: 50vh;
		}
	}
</style>
