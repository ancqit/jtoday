# Junction Today (junction.web)

Angular app with a full-screen Mapbox map, welcome modal, and city/locality selection.

The Angular source lives in `junction-web/` (same pattern as `frontend/` in [jWeb](https://github.com/ancqit/jWeb) and the repo-root layout in [junctionFrontweb](https://github.com/ancqit/junctionFrontweb)).

## Local development

```bash
cd junction-web
npm install
export MAPBOX_ACCESS_TOKEN=your_mapbox_token   # optional for local map rendering
npm start
```

Open `http://localhost:4200`.

Without `MAPBOX_ACCESS_TOKEN`, the app still builds and runs, but the map area shows a placeholder until a token is provided.

Local API calls use same-origin `/api/*`, proxied to `https://junctionback.onrender.com` via `junction-web/proxy.conf.json`.

## Environment variables

| Variable | Description |
| --- | --- |
| `MAPBOX_ACCESS_TOKEN` | Mapbox public access token for production maps |

Set this in the Vercel project dashboard for production deploys. The build script injects it into `environment.prod.ts` automatically.

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

Do not set a separate Root Directory to `junction-web` — keep it at the repository root so Vercel picks up `vercel.json` correctly.

### Environment variables on Vercel

| Variable | Required | Purpose |
| --- | --- | --- |
| `MAPBOX_ACCESS_TOKEN` | Yes (for live map) | Injected into `environment.prod.ts` at build time |

### API proxy

`/api/*` requests are rewritten to `https://junctionback.onrender.com/*`, matching `proxy.conf.json` used by `ng serve`.
