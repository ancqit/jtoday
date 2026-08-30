/**
 * Writes Vercel/CI Leaflet tile API key into environment.prod.ts before `ng build`.
 *
 * CARTO raster basemaps now require a free API key (`?key=` on the tile URL).
 * Request one at https://carto.com/basemaps/apikey/ (no CARTO account needed).
 *
 * Supported env names (first match wins):
 *   LEAFLET_API_KEY
 *   CARTO_API_KEY
 *   CARTO_BASEMAPS_API_KEY
 *
 * When empty, the app uses OpenStreetMap tiles (no key, no CARTO watermark).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'junction-web', 'src', 'environments', 'environment.prod.ts');

const key = (
  process.env.LEAFLET_API_KEY ||
  process.env.CARTO_API_KEY ||
  process.env.CARTO_BASEMAPS_API_KEY ||
  ''
).trim();

const contents = `export const environment = {
  production: true,
  leafletApiKey: ${JSON.stringify(key)},
};
`;

writeFileSync(target, contents, 'utf8');
console.log(
  key
    ? `[inject-maps-env] Wrote leafletApiKey (${key.length} chars) — CARTO Voyager with key`
    : '[inject-maps-env] No LEAFLET_API_KEY / CARTO_API_KEY — OpenStreetMap tiles (no watermark)',
);
