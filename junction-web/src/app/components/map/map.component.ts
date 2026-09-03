import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import type * as Leaflet from 'leaflet';
import { environment } from '../../../environments/environment';

export interface MapTarget {
  latitude: number;
  longitude: number;
  label: string;
  zoom?: number;
}

type BasemapKind = 'physical' | 'others';
type MapLoadState = 'loading' | 'ready' | 'error';
type LeafletNS = typeof import('leaflet');

/**
 * CARTO Voyager — requires a free basemap API key since 2025/26.
 * Request: https://carto.com/basemaps/apikey/
 * URL shape: .../voyager/{z}/{x}/{y}.png?key=YOUR_KEY
 */
function cartoTileUrl(apiKey: string): string {
  return `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(apiKey)}`;
}

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Free OSM raster — no API key; used when CARTO key is not configured. */
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** OpenTopoMap — terrain / physical geography (no API key). */
const PHYSICAL_TILE_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
const PHYSICAL_ATTRIBUTION =
  'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)';

const TRANSPARENT_TILE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const FIRST_TILE_TIMEOUT_MS = 12_000;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  /** When false (default for Junction Today), users cannot pan — zoom +/- still works. */
  readonly interactive = input(false);
  readonly target = input<MapTarget | null>(null);
  readonly loadState = signal<MapLoadState>('loading');

  private map: Leaflet.Map | null = null;
  private marker: Leaflet.Marker | null = null;
  private zoomControl: Leaflet.Control.Zoom | null = null;
  private basemapControl: Leaflet.Control | null = null;
  private baseLayer: Leaflet.TileLayer | null = null;
  private attributionControl: Leaflet.Control.Attribution | null = null;
  private currentAttribution = '';
  private activeBasemap: BasemapKind = 'others';
  private lastFlyKey: string | null = null;
  private L: LeafletNS | null = null;
  private destroyed = false;
  private bootGeneration = 0;
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly leafletApiKey = (environment.leafletApiKey || '').trim();

  constructor() {
    effect(() => {
      const nextTarget = this.target();
      if (!this.map || !nextTarget || this.loadState() !== 'ready') {
        return;
      }
      this.flyToTarget(nextTarget);
    });

    effect(() => {
      const enabled = this.interactive();
      this.host.nativeElement.classList.toggle('map--locked', !enabled);
      this.applyInteractionState(enabled);
    });
  }

  ngAfterViewInit(): void {
    void this.bootstrapMap();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.teardownMap();
  }

  retry(): void {
    void this.bootstrapMap();
  }

  private async bootstrapMap(): Promise<void> {
    const generation = ++this.bootGeneration;
    this.loadState.set('loading');
    this.teardownMap();

    try {
      const L = await import('leaflet');
      if (this.destroyed || generation !== this.bootGeneration) {
        return;
      }

      this.L = L;
      this.map = L.map(this.mapContainer.nativeElement, {
        center: [20.5937, 78.9629],
        zoom: 4,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      this.attributionControl = L.control.attribution({ prefix: false, position: 'bottomright' });
      this.attributionControl.addTo(this.map);

      this.setBasemap('others');
      // Zoom first so it sits at the bottom of bottomright; basemap control stacks above it.
      this.ensureZoomControl();
      this.ensureBasemapControl();
      this.applyInteractionState(this.interactive());

      await this.waitForFirstTiles(generation);

      if (this.destroyed || generation !== this.bootGeneration) {
        return;
      }

      this.loadState.set('ready');

      // Invalidate size after revealing canvas — Leaflet measures while hidden otherwise.
      requestAnimationFrame(() => {
        if (!this.destroyed && generation === this.bootGeneration) {
          this.map?.invalidateSize();
        }
      });

      const initialTarget = this.target();
      if (initialTarget) {
        this.flyToTarget(initialTarget);
      }
    } catch {
      if (!this.destroyed && generation === this.bootGeneration) {
        this.teardownMap();
        this.loadState.set('error');
      }
    }
  }

  private waitForFirstTiles(generation: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.baseLayer) {
        reject(new Error('Missing base layer'));
        return;
      }

      let settled = false;
      const finish = (ok: boolean) => {
        if (settled || this.destroyed || generation !== this.bootGeneration) {
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        this.baseLayer?.off('load', onLoad);
        this.baseLayer?.off('tileerror', onTileError);
        if (ok) {
          resolve();
        } else {
          reject(new Error('Map tiles failed to load'));
        }
      };

      const onLoad = () => finish(true);
      let tileErrors = 0;
      const onTileError = () => {
        tileErrors += 1;
        if (tileErrors >= 6) {
          finish(false);
        }
      };

      this.baseLayer.once('load', onLoad);
      this.baseLayer.on('tileerror', onTileError);

      const timer = window.setTimeout(() => {
        // Slow networks: show the map anyway if Leaflet is up; tiles may still stream in.
        finish(true);
      }, FIRST_TILE_TIMEOUT_MS);
    });
  }

  private teardownMap(): void {
    this.marker?.remove();
    this.marker = null;
    this.basemapControl?.remove();
    this.basemapControl = null;
    this.zoomControl?.remove();
    this.zoomControl = null;
    this.baseLayer = null;
    this.attributionControl = null;
    this.currentAttribution = '';
    this.lastFlyKey = null;
    this.map?.remove();
    this.map = null;
  }

  private ensureZoomControl(): void {
    const L = this.L;
    if (!this.map || !L || this.zoomControl) {
      return;
    }
    this.zoomControl = L.control.zoom({ position: 'bottomright' });
    this.zoomControl.addTo(this.map);
  }

  private ensureBasemapControl(): void {
    const L = this.L;
    if (!this.map || !L || this.basemapControl) {
      return;
    }

    const component = this;
    const BasemapControl = L.Control.extend({
      onAdd() {
        const root = L.DomUtil.create('div', 'junction-basemap-control leaflet-bar');
        root.setAttribute('role', 'group');
        root.setAttribute('aria-label', 'Map style');

        const physicalBtn = L.DomUtil.create(
          'button',
          'junction-basemap-control__btn',
          root,
        ) as HTMLButtonElement;
        physicalBtn.type = 'button';
        physicalBtn.textContent = 'Physical';
        physicalBtn.setAttribute('aria-pressed', 'false');
        physicalBtn.dataset['basemap'] = 'physical';

        const othersBtn = L.DomUtil.create(
          'button',
          'junction-basemap-control__btn',
          root,
        ) as HTMLButtonElement;
        othersBtn.type = 'button';
        othersBtn.textContent = 'Others';
        othersBtn.setAttribute('aria-pressed', 'true');
        othersBtn.dataset['basemap'] = 'others';

        L.DomEvent.disableClickPropagation(root);
        L.DomEvent.disableScrollPropagation(root);

        const onClick = (kind: BasemapKind) => (event: Event) => {
          L.DomEvent.stop(event);
          component.setBasemap(kind);
          component.syncBasemapButtons(root);
        };

        L.DomEvent.on(physicalBtn, 'click', onClick('physical'));
        L.DomEvent.on(othersBtn, 'click', onClick('others'));

        component.syncBasemapButtons(root);
        return root;
      },
    });

    this.basemapControl = new BasemapControl({ position: 'bottomright' });
    this.basemapControl.addTo(this.map);
  }

  private syncBasemapButtons(root: HTMLElement): void {
    const buttons = root.querySelectorAll<HTMLButtonElement>('.junction-basemap-control__btn');
    buttons.forEach((btn) => {
      const kind = btn.dataset['basemap'] as BasemapKind | undefined;
      const active = kind === this.activeBasemap;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  private setBasemap(kind: BasemapKind): void {
    const L = this.L;
    if (!this.map || !L) {
      return;
    }

    this.activeBasemap = kind;
    if (this.baseLayer) {
      this.map.removeLayer(this.baseLayer);
      this.baseLayer = null;
    }

    if (kind === 'physical') {
      this.replaceAttribution(PHYSICAL_ATTRIBUTION);
      this.baseLayer = L.tileLayer(PHYSICAL_TILE_URL, {
        attribution: '',
        subdomains: 'abc',
        maxZoom: 17,
        errorTileUrl: TRANSPARENT_TILE,
      });
    } else {
      const useCarto = Boolean(this.leafletApiKey);
      this.replaceAttribution(useCarto ? CARTO_ATTRIBUTION : OSM_ATTRIBUTION);
      this.baseLayer = useCarto
        ? L.tileLayer(cartoTileUrl(this.leafletApiKey), {
            attribution: '',
            subdomains: 'abcd',
            maxZoom: 20,
            errorTileUrl: TRANSPARENT_TILE,
          })
        : L.tileLayer(OSM_TILE_URL, {
            attribution: '',
            subdomains: 'abc',
            maxZoom: 19,
            errorTileUrl: TRANSPARENT_TILE,
          });
    }

    this.baseLayer.addTo(this.map);

    const controlEl = this.map
      .getContainer()
      .querySelector('.junction-basemap-control') as HTMLElement | null;
    if (controlEl) {
      this.syncBasemapButtons(controlEl);
    }
  }

  private replaceAttribution(next: string): void {
    if (!this.attributionControl) {
      return;
    }
    if (this.currentAttribution) {
      this.attributionControl.removeAttribution(this.currentAttribution);
    }
    this.currentAttribution = next;
    this.attributionControl.addAttribution(next);
  }

  private applyInteractionState(enabled: boolean): void {
    if (!this.map) {
      return;
    }

    // Always keep +/- zoom and basemap filters; only gate freehand exploration.
    this.ensureZoomControl();
    this.ensureBasemapControl();

    const handlers: Array<{ enable: () => void; disable: () => void } | undefined> = [
      this.map.dragging,
      this.map.touchZoom,
      this.map.doubleClickZoom,
      this.map.scrollWheelZoom,
      this.map.boxZoom,
      this.map.keyboard,
    ];

    for (const handler of handlers) {
      if (!handler) {
        continue;
      }
      if (enabled) {
        handler.enable();
      } else {
        handler.disable();
      }
    }
  }

  private flyToTarget(target: MapTarget): void {
    const L = this.L;
    if (!this.map || !L) {
      return;
    }

    const center = L.latLng(target.latitude, target.longitude);
    const zoom = target.zoom ?? 13;
    const flyKey = `${target.latitude.toFixed(5)},${target.longitude.toFixed(5)},${zoom}`;
    if (flyKey === this.lastFlyKey) {
      return;
    }
    this.lastFlyKey = flyKey;

    this.map.flyTo(center, zoom, {
      animate: true,
      duration: zoom === this.map.getZoom() ? 0.8 : 1.4,
    });

    if (!this.marker) {
      this.marker = L.marker(center, { icon: this.createMarkerIcon(), interactive: false }).addTo(
        this.map,
      );
    } else {
      this.marker.setLatLng(center);
    }
  }

  private createMarkerIcon(): Leaflet.DivIcon {
    const L = this.L!;
    return L.divIcon({
      className: 'junction-marker',
      html: '<span class="junction-marker__pin" aria-hidden="true"></span>',
      iconSize: [28, 36],
      iconAnchor: [14, 36],
    });
  }
}
