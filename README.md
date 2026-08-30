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

The map is always **Leaflet** (light, view-only).

**CARTO Voyager** tiles now require a free API key (`?key=` on the tile URL) — without it CARTO stamps an “API key required” watermark. Request a key at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/) (no CARTO account), set `LEAFLET_API_KEY` or `CARTO_API_KEY` on Vercel, and redeploy (`tools/inject-maps-env.mjs` bakes it in).

If no key is set, the app uses **OpenStreetMap** tiles instead (no key, no watermark).

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
| **Build command** | `node tools/inject-maps-env.mjs && npm run build --prefix junction-web` |
| **Output directory** | `junction-web/dist/junction-web/browser` |

### Map tile API key (CARTO)

CARTO raster basemaps require a free key. Without it you get an “API key required” watermark on the map.

1. Request a key: [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/) (email + domain, no account)
2. Vercel → Environment Variables (Production + Preview):

| Name | Value |
| --- | --- |
| `LEAFLET_API_KEY` | Your CARTO basemap key (aliases: `CARTO_API_KEY`, `CARTO_BASEMAPS_API_KEY`) |

3. Redeploy so `inject-maps-env.mjs` bakes the key into the build.

Leave unset to use OpenStreetMap tiles (no watermark). Remove any unused `GOOGLE_MAPS_API_KEY` / MapTiler vars.

Do not set a separate Root Directory to `junction-web` — keep it at the repository root so Vercel picks up `vercel.json` correctly.

### API proxy

`/api/*` requests are rewritten to `https://junctionback.onrender.com/*`, matching `proxy.conf.json` used by `ng serve`.

## Shared shop orders (PR agent)

Branch **`feature/shared-shop-orders`** posts checkout orders to junctionBack so Front Web owners see them.

Agent brief (push + `gh pr create` copy-paste): [docs/SHARED_SHOP_ORDERS_PR.md](./docs/SHARED_SHOP_ORDERS_PR.md)
