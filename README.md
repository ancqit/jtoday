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

This repo includes a root `vercel.json` (aligned with [ancqit/jWeb](https://github.com/ancqit/jWeb)) that installs/builds `junction-web/` and publishes the Angular browser bundle.

In the Vercel project:

1. **Root Directory** = repository root (`.`)
2. Set environment variables: `MAPBOX_ACCESS_TOKEN` (and optionally `JUNCTION_API_BASE_URL`)
3. Redeploy after pushing `vercel.json`

Angular client routes are rewritten to `index.html` so deep links do not 404.

API calls use same-origin `/api/*`, rewritten by Vercel to `https://junctionback.onrender.com/*` (avoids CORS). Local `ng serve` uses `junction-web/proxy.conf.json` the same way.
