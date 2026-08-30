/**
 * Writes Vercel/CI Leaflet tile API key into environment.prod.ts before `ng build`.
 *
 * Leaflet itself has no API key — this key is for a tile provider used *with* Leaflet.
 * Supported env names (first match wins):
 *   LEAFLET_API_KEY
 *   MAPTILER_API_KEY
 *   LEAFLET_TILE_API_KEY
 *
 * When set, tiles load from MapTiler. When empty, free CARTO/OSM tiles are used (no key).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'junction-web', 'src', 'environments', 'environment.prod.ts');

const key = (
  process.env.LEAFLET_API_KEY ||
  process.env.MAPTILER_API_KEY ||
  process.env.LEAFLET_TILE_API_KEY ||
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
    ? `[inject-maps-env] Wrote leafletApiKey (${key.length} chars) — MapTiler tiles`
    : '[inject-maps-env] No LEAFLET_API_KEY / MAPTILER_API_KEY — free CARTO tiles',
);
