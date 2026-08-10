# Junction Today

Angular 19 app for junction.web — full-screen Mapbox map, welcome modal, and city/locality selection.

## Local development

```bash
npm install
export MAPBOX_ACCESS_TOKEN=your_mapbox_token
npm start
```

API calls to `/api/*` are proxied to `https://junctionback.onrender.com` via `proxy.conf.json`.

## Build output

```bash
npm run build
```

Vercel publishes: `dist/junction-web/browser`

## Deploy

Set Vercel **Root Directory** to `junction-web` and use [`vercel.json`](./vercel.json):

- **Output:** `dist/junction-web/browser`
- **Build:** `npm run build` (includes env injection via `prebuild`)
- **API:** `/api/*` → `https://junctionback.onrender.com/*`

See the root [README](../README.md) for environment variables and troubleshooting.
