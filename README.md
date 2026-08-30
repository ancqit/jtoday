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

The map is always **Leaflet** (light, view-only). Tiles default to free **CARTO/OSM** (no key). Optionally set `LEAFLET_API_KEY` (or `MAPTILER_API_KEY`) on Vercel to use **MapTiler** streets tiles — injected at build time by `tools/inject-maps-env.mjs`. Leaflet itself has no Google API key; that is what caused the “API key required” banner before.

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

### Map tile API key (optional)

Leaflet does not use a Google Maps key. For optional paid/reliable tiles with Leaflet, create a free [MapTiler](https://www.maptiler.com/) key and set on Vercel (Production + Preview):

| Name | Value |
| --- | --- |
| `LEAFLET_API_KEY` | Your MapTiler API key (aliases: `MAPTILER_API_KEY`, `LEAFLET_TILE_API_KEY`) |

Leave it unset to keep free CARTO tiles. Redeploy after saving so the key is baked into the build. You can remove any old `GOOGLE_MAPS_API_KEY` — it is unused.

Do not set a separate Root Directory to `junction-web` — keep it at the repository root so Vercel picks up `vercel.json` correctly.

### API proxy

`/api/*` requests are rewritten to `https://junctionback.onrender.com/*`, matching `proxy.conf.json` used by `ng serve`.

## Shared shop orders (PR agent)

Branch **`feature/shared-shop-orders`** posts checkout orders to junctionBack so Front Web owners see them.

Agent brief (push + `gh pr create` copy-paste): [docs/SHARED_SHOP_ORDERS_PR.md](./docs/SHARED_SHOP_ORDERS_PR.md)
