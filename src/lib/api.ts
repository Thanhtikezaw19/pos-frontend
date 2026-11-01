// All calls to the Django REST API live here.

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const TOKEN_KEY = 'pos_token';

export type Role = 'admin' | 'cashier';
export type PaymentMethod = 'cash' | 'card' | 'other';
export type OrderStatus = 'completed' | 'refunded';

export interface User {
	id: number;
	username: string;
	first_name: string;
	last_name: string;
	role: Role;
	is_active: boolean;
}

export interface Category {
	id: number;
	name: string;
}

export interface Product {
	id: number;
	name: string;
	sku: string;
	category: number | null;
	category_name: string | null;
	price: string;
	stock: number;
	low_stock_threshold: number;
	is_low_stock: boolean;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface OrderItem {
	id: number;
	product: number;
	product_name: string;
	sku: string;
	unit_price: string;
	quantity: number;
	line_total: string;
}

export interface Order {
	id: number;
	number: string;
	status: OrderStatus;
	cashier: number;
	cashier_name: string;
	total: string;
	payment_method: PaymentMethod;
	cash_received: string | null;
	change_due: string;
	created_at: string;
	refunded_at: string | null;
	refunded_by_name: string | null;
	item_count: number;
	items: OrderItem[];
}

export interface Page<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

export interface Dashboard {
	date: string;
	sales_total: string;
	order_count: number;
	top_products: { product_id: number; product_name: string; quantity: number; revenue: string }[];
	low_stock: Product[];
}

export interface SaleInput {
	items: { product: number; quantity: number }[];
	payment_method: PaymentMethod;
	cash_received?: string | null;
}

export class ApiError extends Error {
	constructor(
		public status: number,
		public data: unknown
	) {
		super(errorMessage(data) || `Request failed (${status})`);
	}
}

/** Flatten DRF error payloads ({"field": ["msg"]}, {"detail": "msg"}) into one readable line. */
function errorMessage(data: unknown): string {
	if (!data) return '';
	if (typeof data === 'string') return data;
	if (Array.isArray(data)) return data.map(errorMessage).join(' ');
	if (typeof data === 'object') {
		return Object.entries(data as Record<string, unknown>)
			.map(([key, value]) => {
				const msg = errorMessage(value);
				return key === 'detail' || key === 'non_field_errors' ? msg : `${key}: ${msg}`;
			})
			.join(' ');
	}
	return String(data);
}

export function getToken(): string | null {
	try {
		return localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}

export function setToken(token: string | null) {
	try {
		if (token) localStorage.setItem(TOKEN_KEY, token);
		else localStorage.removeItem(TOKEN_KEY);
	} catch {
		// Storage can be unavailable (private mode); the session just won't persist.
	}
}

let onUnauthorized: () => void = () => {};

/** Called when the API rejects the token, so the app can send the user to the login page. */
export function setUnauthorizedHandler(handler: () => void) {
	onUnauthorized = handler;
}

type Query = Record<string, string | number | boolean | null | undefined>;

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
	const url = new URL(`${API_URL}${path}`);
	for (const [key, value] of Object.entries(query ?? {})) {
		if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
	}

	const headers: Record<string, string> = { Accept: 'application/json' };
	const token = getToken();
	if (token) headers.Authorization = `Token ${token}`;
	if (body !== undefined) headers['Content-Type'] = 'application/json';

	const res = await fetch(url, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body)
	});

	if (res.status === 401 && token) {
		setToken(null);
		onUnauthorized();
	}
	if (res.status === 204) return undefined as T;

	const data = await res.json().catch(() => null);
	if (!res.ok) throw new ApiError(res.status, data);
	return data as T;
}

export const api = {
	login: (username: string, password: string) =>
		request<{ token: string; user: User }>('POST', '/auth/login/', { username, password }),
	logout: () => request<void>('POST', '/auth/logout/'),
	me: () => request<User>('GET', '/auth/me/'),

	users: () => request<Page<User>>('GET', '/users/', undefined, { page_size: 200 }),
	createUser: (data: Partial<User> & { password: string }) => request<User>('POST', '/users/', data),
	updateUser: (id: number, data: Partial<User> & { password?: string }) =>
		request<User>('PATCH', `/users/${id}/`, data),

	categories: () => request<Category[]>('GET', '/categories/'),
	createCategory: (name: string) => request<Category>('POST', '/categories/', { name }),
	updateCategory: (id: number, name: string) => request<Category>('PATCH', `/categories/${id}/`, { name }),
	deleteCategory: (id: number) => request<void>('DELETE', `/categories/${id}/`),

	products: (query: { search?: string; category?: number | ''; active?: boolean; page?: number; page_size?: number }) =>
		request<Page<Product>>('GET', '/products/', undefined, query),
	createProduct: (data: Partial<Product>) => request<Product>('POST', '/products/', data),
	updateProduct: (id: number, data: Partial<Product>) => request<Product>('PATCH', `/products/${id}/`, data),

	orders: (query: { date_from?: string; date_to?: string; status?: OrderStatus | ''; page?: number }) =>
		request<Page<Order>>('GET', '/orders/', undefined, query),
	order: (id: number | string) => request<Order>('GET', `/orders/${id}/`),
	createSale: (data: SaleInput) => request<Order>('POST', '/orders/', data),
	refund: (id: number) => request<Order>('POST', `/orders/${id}/refund/`),

	dashboard: () => request<Dashboard>('GET', '/dashboard/')
};
