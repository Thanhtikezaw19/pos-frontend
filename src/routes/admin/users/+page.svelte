<script lang="ts">
	import { api, type Role, type User } from '#lib/api.ts';
	import { auth } from '#lib/auth.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';

	interface Form {
		id: number | null;
		username: string;
		first_name: string;
		last_name: string;
		role: Role;
		is_active: boolean;
		password: string;
	}

	let users = $state<User[]>([]);
	let error = $state('');
	let form = $state<Form | null>(null);
	let formError = $state('');
	let saving = $state(false);

	async function load() {
		try {
			users = (await api.users()).results;
		} catch (e) {
			error = e instanceof Error ? e.message : t('common.loadFailed');
		}
	}
	load();

	function create() {
		formError = '';
		form = { id: null, username: '', first_name: '', last_name: '', role: 'cashier', is_active: true, password: '' };
	}

	function edit(u: User) {
		formError = '';
		form = { ...u, password: '' };
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!form) return;
		saving = true;
		formError = '';
		const { id, password, ...rest } = form;
		try {
			if (id) await api.updateUser(id, password ? { ...rest, password } : rest);
			else await api.createUser({ ...rest, password });
			form = null;
			await load();
		} catch (e) {
			formError = e instanceof Error ? e.message : t('common.saveFailed');
		} finally {
			saving = false;
		}
	}
</script>

<div class="page">
	<div class="toolbar">
		<h1>{t('users.title')}</h1>
		<span class="spacer"></span>
		<button class="btn-primary" onclick={create}>{t('users.new')}</button>
	</div>

	{#if error}<div class="alert">{error}</div>{/if}

	{#if form}
		{@const self = form.id === auth.user?.id}
		<form class="card editor" onsubmit={save}>
			<h2>{form.id ? t('users.editTitle', { name: form.username }) : t('users.newTitle')}</h2>
			{#if formError}<div class="alert">{formError}</div>{/if}
			<div class="form-grid">
				<label>{t('login.username')} <input bind:value={form.username} required autocomplete="off" /></label>
				<label>{t('users.firstName')} <input bind:value={form.first_name} /></label>
				<label>{t('users.lastName')} <input bind:value={form.last_name} /></label>
				<label>
					{t('users.role')}
					<select bind:value={form.role} disabled={self}>
						<option value="cashier">{t('role.cashier')}</option>
						<option value="admin">{t('role.admin')}</option>
					</select>
				</label>
				<label>
					{form.id ? t('users.newPassword') : t('login.password')}
					<input type="password" bind:value={form.password} required={!form.id} autocomplete="new-password" />
				</label>
				<label class="inline"><input type="checkbox" bind:checked={form.is_active} disabled={self} /> {t('common.active')}</label>
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
					<th>{t('login.username')}</th>
					<th>{t('common.name')}</th>
					<th>{t('users.role')}</th>
					<th>{t('common.status')}</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each users as u (u.id)}
					<tr>
						<td>{u.username}{u.id === auth.user?.id ? ` ${t('users.you')}` : ''}</td>
						<td>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '-'}</td>
						<td><span class="badge">{t(`role.${u.role}`)}</span></td>
						<td><span class="badge" class:success={u.is_active}>{u.is_active ? t('common.active') : t('common.inactive')}</span></td>
						<td class="num"><button class="btn-sm" onclick={() => edit(u)}>{t('common.edit')}</button></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.toolbar h1 {
		margin: 0;
	}

	.editor {
		margin-bottom: 1rem;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}
</style>
