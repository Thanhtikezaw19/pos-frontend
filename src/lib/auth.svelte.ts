import { api, getToken, setToken, type User } from './api.ts';

export const auth = $state<{ user: User | null; ready: boolean }>({ user: null, ready: false });

/** Load the current user from the saved token, if any. */
export async function loadUser() {
	if (getToken()) {
		try {
			auth.user = await api.me();
		} catch {
			setToken(null);
			auth.user = null;
		}
	}
	auth.ready = true;
}

export async function login(username: string, password: string) {
	const res = await api.login(username, password);
	setToken(res.token);
	auth.user = res.user;
}

export async function logout() {
	try {
		await api.logout();
	} finally {
		setToken(null);
		auth.user = null;
	}
}

export function isAdmin() {
	return auth.user?.role === 'admin';
}

export function homePath() {
	return isAdmin() ? '/dashboard' : '/pos';
}
