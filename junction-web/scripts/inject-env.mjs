import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const production = process.argv.includes('--production');
const targetFile = join(
  root,
  production ? 'src/environments/environment.prod.ts' : 'src/environments/environment.ts',
);

const mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN ?? '';

let contents = readFileSync(targetFile, 'utf8');
contents = contents.replace(/mapboxAccessToken:\s*'[^']*'/, `mapboxAccessToken: '${mapboxAccessToken}'`);

writeFileSync(targetFile, contents);

console.log(`Injected environment values into ${targetFile}`);
