# Junction Today (junction.web)

Angular app with a full-screen Mapbox map, welcome modal, and city/locality selection.

## Local development

```bash
cd junction-web
npm install
export MAPBOX_ACCESS_TOKEN=your_mapbox_token   # optional for local map rendering
npm start
```

Open `http://localhost:4200`.

Without `MAPBOX_ACCESS_TOKEN`, the app still builds and runs, but the map area shows a placeholder until a token is provided.

Local API calls use same-origin `/api/*`, proxied to `https://junctionback.onrender.com` via `junction-web/proxy.conf.json` (same pattern as [jWeb](https://github.com/ancqit/jWeb)).

## Environment variables

| Variable | Description |
| --- | --- |
| `MAPBOX_ACCESS_TOKEN` | Mapbox public access token for production maps |
| `JUNCTION_API_BASE_URL` | Base URL for cities/localities API (defaults to `/api`) |

Set these in the Vercel project dashboard for production deploys. The build script injects them into `environment.prod.ts` automatically.

## API contract

The locations service expects:

- `GET /cities` → `City[]` or `{ cities: City[] }`
- `GET /cities/:cityId/localities` → `Locality[]` or `{ localities: Locality[] }`

Each city/locality should include `id`, `name`, `latitude`, and `longitude`. If the API is unavailable, built-in fallback data is used for local development.

## Build

```bash
cd junction-web
npm run build
```

Static output (what Vercel publishes): `junction-web/dist/junction-web/browser`

## Deploy on Vercel

This repo supports **two** valid Vercel setups. Pick one and keep dashboard settings aligned with it — mixing them causes `NOT_FOUND` (404).

### Option A — Repo root (recommended, matches jWeb)

| Setting | Value |
| --- | --- |
| **Root Directory** | `.` (repository root) |
| **Config file** | `vercel.json` at repo root |
| **Output directory** | `junction-web/dist/junction-web/browser` (set in root `vercel.json`) |

### Option B — App subfolder

| Setting | Value |
| --- | --- |
| **Root Directory** | `junction-web` |
| **Config file** | `junction-web/vercel.json` |
| **Output directory** | `dist/junction-web/browser` (set in `junction-web/vercel.json`) |

### Common `NOT_FOUND` causes

1. **Root Directory mismatch** — e.g. Root Directory = `junction-web` but only the repo-root `vercel.json` exists. Vercel reads `vercel.json` from the Root Directory, not the repo root.
2. **Wrong output path** — Angular 19 publishes to `dist/junction-web/browser`, not `dist/junction-web` alone.
3. **Dashboard overrides** — If Output Directory is set manually in Vercel Project Settings, it overrides `vercel.json`. Clear it or match the table above.
4. **Missing build artifacts** — Check deployment build logs; a failed `npm run build` leaves nothing to serve.

### Steps

1. Choose Option A or B and set **Root Directory** accordingly
2. Set environment variables: `MAPBOX_ACCESS_TOKEN` (and optionally `JUNCTION_API_BASE_URL`)
3. Redeploy after pushing `vercel.json`

Angular client routes are rewritten to `index.html` so deep links do not 404.

API calls use same-origin `/api/*`, rewritten by Vercel to `https://junctionback.onrender.com/*` (avoids CORS). Local `ng serve` uses `junction-web/proxy.conf.json` the same way.
