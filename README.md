# POS frontend

Web UI for a single-shop point-of-sale app. Built with SvelteKit 3 (TypeScript) as a single-page
app. It talks to the Django REST API in the separate backend repository.

## Requirements

- Node.js 22 (for example, `nvm install 22`)
- The backend running locally (see the backend README)

## Setup

```sh
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173 and sign in with a demo login from the backend (`admin` / `admin12345`
or `cashier` / `cashier12345`).

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://127.0.0.1:8000/api` | Backend API base URL |
| `VITE_SHOP_NAME` | `My Shop` | Name shown in the header and on receipts |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run check` | Type-check the app |
| `npm run build` | Build a static site into `build/` |

Serve `build/` with any web server that falls back to `index.html` for unknown paths.

## Pages

| Path | Who | What |
|---|---|---|
| `/login` | Everyone | Sign in |
| `/pos` | Staff | Sales screen: search or pick products, take payment, show change |
| `/orders`, `/orders/[id]` | Staff | Order list and detail. Admins can refund |
| `/orders/[id]/receipt` | Staff | Printable 80 mm receipt |
| `/dashboard` | Admin | Today's sales, top products, low stock |
| `/admin/products`, `/admin/categories`, `/admin/users` | Admin | Manage data |

All API calls are in `src/lib/api.ts`.

## Languages

The UI supports English and Myanmar. Users switch with the `EN | မြန်မာ` buttons in the header
or on the login page, and the browser remembers the choice. Strings live in
`src/lib/locales/en.ts` and `my.ts`. To add a string, add the key to `en.ts` first;
`npm run check` then fails until `my.ts` has the same key. Error messages that come from the
backend (for example, "Not enough stock") are still in English.
