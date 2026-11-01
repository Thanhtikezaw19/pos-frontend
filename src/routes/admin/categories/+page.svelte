<script lang="ts">
	import { api, type Category } from '#lib/api.ts';
	import { t } from '#lib/i18n.svelte.ts';

	let categories = $state<Category[]>([]);
	let newName = $state('');
	let editingId = $state<number | null>(null);
	let editName = $state('');
	let error = $state('');

	async function load() {
		try {
			categories = await api.categories();
		} catch (e) {
			error = e instanceof Error ? e.message : t('common.loadFailed');
		}
	}
	load();

	async function run(action: () => Promise<unknown>) {
		error = '';
		try {
			await action();
			await load();
			return true;
		} catch (e) {
			error = e instanceof Error ? e.message : t('common.requestFailed');
			return false;
		}
	}

	async function create(event: SubmitEvent) {
		event.preventDefault();
		if (await run(() => api.createCategory(newName.trim()))) newName = '';
	}

	async function saveEdit(id: number) {
		if (await run(() => api.updateCategory(id, editName.trim()))) editingId = null;
	}

	async function remove(c: Category) {
		if (!confirm(t('categories.deleteConfirm', { name: c.name }))) return;
		await run(() => api.deleteCategory(c.id));
	}
</script>

<div class="page narrow">
	<h1>{t('categories.title')}</h1>

	{#if error}<div class="alert">{error}</div>{/if}

	<form class="toolbar" onsubmit={create}>
		<label class="grow">{t('categories.new')} <input bind:value={newName} required maxlength="100" /></label>
		<button class="btn-primary" type="submit">{t('categories.add')}</button>
	</form>

	<div class="card">
		<table>
			<tbody>
				{#each categories as c (c.id)}
					<tr>
						<td>
							{#if editingId === c.id}
								<input bind:value={editName} maxlength="100" aria-label={t('categories.nameLabel')} />
							{:else}
								{c.name}
							{/if}
						</td>
						<td class="actions">
							{#if editingId === c.id}
								<button class="btn-sm" onclick={() => (editingId = null)}>{t('common.cancel')}</button>
								<button class="btn-sm btn-primary" onclick={() => saveEdit(c.id)}>{t('common.save')}</button>
							{:else}
								<button class="btn-sm" onclick={() => ((editingId = c.id), (editName = c.name))}>{t('categories.rename')}</button>
								<button class="btn-sm btn-danger" onclick={() => remove(c)}>{t('common.delete')}</button>
							{/if}
						</td>
					</tr>
				{:else}
					<tr><td class="empty">{t('categories.empty')}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.narrow {
		max-width: 640px;
	}

	.grow {
		flex: 1;
	}

	.actions {
		display: flex;
		gap: 0.35rem;
		justify-content: flex-end;
	}
</style>
