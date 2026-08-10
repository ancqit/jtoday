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

## Environment variables (Render)

| Variable | Description |
| --- | --- |
| `MAPBOX_ACCESS_TOKEN` | Mapbox public access token for production maps |
| `JUNCTION_API_BASE_URL` | Base URL for cities/localities API (defaults to `/api`) |

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

Output is written to `junction-web/dist/junction-web`.
