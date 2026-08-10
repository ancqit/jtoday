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

Deployment is configured for Vercel in two places — use the file that matches your Vercel **Root Directory**:

| Vercel Root Directory | Config file | Output directory |
| --- | --- | --- |
| `.` (repo root) | [`../vercel.json`](../vercel.json) | `junction-web/dist/junction-web/browser` |
| `junction-web` | [`vercel.json`](./vercel.json) | `dist/junction-web/browser` |

See the root [README](../README.md) for full Vercel troubleshooting (including `NOT_FOUND` / 404 fixes).
