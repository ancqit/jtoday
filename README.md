# Junction Today (junction.web)

Angular app with a full-screen Leaflet map, welcome modal, and city/locality selection.

The Angular source lives in `junction-web/` (same pattern as `frontend/` in [jWeb](https://github.com/ancqit/jWeb) and the repo-root layout in [junctionFrontweb](https://github.com/ancqit/junctionFrontweb)).

## Local development

```bash
cd junction-web
npm install
npm start
```

Open `http://localhost:4200`.

The map uses **Google Maps** when `GOOGLE_MAPS_API_KEY` (or `MAPS_API_KEY` / `NG_APP_GOOGLE_MAPS_API_KEY`) is set on Vercel — injected at build time by `tools/inject-maps-env.mjs`. If the key is missing or invalid, it falls back to **Leaflet + CARTO** tiles (no key) and never shows Google’s “API key required” banner.

Geocoding falls back to built-in coordinates and OpenStreetMap Nominatim when needed.

Local API calls use same-origin `/api/*`, proxied to `https://junctionback.onrender.com` via `junction-web/proxy.conf.json`.

## API (junctionBack)

Locations are loaded from [junctionBack](https://github.com/ancqit/junctionBack) using the same base URL pattern as [junctionFrontweb](https://github.com/ancqit/junctionFrontweb):

- **Local dev:** `http://localhost:8000`
- **Production:** `/api` (Vercel rewrites to `https://junctionback.onrender.com`)

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/locations/cities` | `{ "cities": ["Mumbai", "Bengaluru", ...] }` |
| `GET` | `/locations/localities?city=Mumbai` | `{ "city": "Mumbai", "localities": ["Bandra", ...] }` |

Map coordinates are resolved client-side from built-in lookups (junctionBack returns names only).

## Build

```bash
cd junction-web
npm run build
```

Static output: `junction-web/dist/junction-web/browser`

## Deploy on Vercel

Deployment is configured in the repo-root `vercel.json` (same approach as junctionFrontweb).

| Setting | Value |
| --- | --- |
| **Root Directory** | `.` (repository root) |
| **Install command** | `npm install --prefix junction-web` |
| **Build command** | `npm run build --prefix junction-web` |
| **Output directory** | `junction-web/dist/junction-web/browser` |

### Map API key (optional)

In Vercel → Project Settings → Environment Variables (Production + Preview), set:

| Name | Value |
| --- | --- |
| `GOOGLE_MAPS_API_KEY` | Your Google Maps JavaScript API key |

Restrict the key to HTTP referrers `https://www.junction.today/*` and `https://*.vercel.app/*`, and enable **Maps JavaScript API**. Redeploy after saving so `inject-maps-env.mjs` bakes the key into the build.

Do not set a separate Root Directory to `junction-web` — keep it at the repository root so Vercel picks up `vercel.json` correctly.

### API proxy

`/api/*` requests are rewritten to `https://junctionback.onrender.com/*`, matching `proxy.conf.json` used by `ng serve`.

## Shared shop orders (PR agent)

Branch **`feature/shared-shop-orders`** posts checkout orders to junctionBack so Front Web owners see them.

Agent brief (push + `gh pr create` copy-paste): [docs/SHARED_SHOP_ORDERS_PR.md](./docs/SHARED_SHOP_ORDERS_PR.md)
