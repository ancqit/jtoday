import { environment } from '../../environments/environment';

const CARTO_VOYAGER =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const OSM_STANDARD = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export interface MapTileConfig {
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom: number;
}

/**
 * CARTO raster basemaps now require a free API key (https://carto.com/basemaps/apikey).
 * Set `cartoApiKey` in environment.prod.ts or via build env `NG_APP_CARTO_API_KEY`.
 * Without a key we fall back to OpenStreetMap tiles (no watermark).
 */
export function resolveMapTileConfig(): MapTileConfig {
  const key = environment.cartoApiKey?.trim();
  if (key) {
    return {
      url: `${CARTO_VOYAGER}?key=${encodeURIComponent(key)}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    };
  }

  return {
    url: OSM_STANDARD,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19,
  };
}
