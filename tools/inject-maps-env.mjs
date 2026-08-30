/**
 * Writes Vercel/CI map env into environment.prod.ts before `ng build`.
 * Supported names (first match wins):
 *   GOOGLE_MAPS_API_KEY
 *   NG_APP_GOOGLE_MAPS_API_KEY
 *   MAPS_API_KEY
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'junction-web', 'src', 'environments', 'environment.prod.ts');

const key = (
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.NG_APP_GOOGLE_MAPS_API_KEY ||
  process.env.MAPS_API_KEY ||
  ''
).trim();

const contents = `export const environment = {
  production: true,
  googleMapsApiKey: ${JSON.stringify(key)},
};
`;

writeFileSync(target, contents, 'utf8');
console.log(
  key
    ? `[inject-maps-env] Wrote googleMapsApiKey (${key.length} chars) into environment.prod.ts`
    : '[inject-maps-env] No GOOGLE_MAPS_API_KEY / MAPS_API_KEY — map will use Leaflet (no Google key).',
);
