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

Set **Root Directory** to `junction-web` in the Vercel project (recommended — matches the app). Vercel reads `junction-web/vercel.json`:

| Setting | Value |
| --- | --- |
| **Root Directory** | `junction-web` |
| **Install command** | `npm install` |
| **Build command** | `npm run build` (runs `prebuild` to inject env vars) |
| **Output directory** | `dist/junction-web/browser` |

Alternatively, keep **Root Directory** at `.` and use the repo-root `vercel.json` (same behavior, paths prefixed with `junction-web/`).

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MAPBOX_ACCESS_TOKEN` | Yes (for live map) | Injected into `environment.prod.ts` at build time |
| `JUNCTION_API_BASE_URL` | No | Defaults to `/api` (proxied to junctionBack) |

### API proxy

`/api/*` requests are rewritten to `https://junctionback.onrender.com/*`, matching `proxy.conf.json` used by `ng serve`.
