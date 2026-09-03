import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
} from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment';

export interface MapTarget {
  latitude: number;
  longitude: number;
  label: string;
  zoom?: number;
}

type BasemapKind = 'physical' | 'others';

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

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private zoomControl: L.Control.Zoom | null = null;
  private basemapControl: L.Control | null = null;
  private baseLayer: L.TileLayer | null = null;
  private attributionControl: L.Control.Attribution | null = null;
  private currentAttribution = '';
  private activeBasemap: BasemapKind = 'others';
  private lastFlyKey: string | null = null;
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly leafletApiKey = (environment.leafletApiKey || '').trim();

  constructor() {
    effect(() => {
      const nextTarget = this.target();
      if (!this.map || !nextTarget) {
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

    const initialTarget = this.target();
    if (initialTarget) {
      this.flyToTarget(initialTarget);
    }
  }

  ngOnDestroy(): void {
    this.marker?.remove();
    this.basemapControl?.remove();
    this.zoomControl?.remove();
    this.map?.remove();
  }

  private ensureZoomControl(): void {
    if (!this.map || this.zoomControl) {
      return;
    }
    this.zoomControl = L.control.zoom({ position: 'bottomright' });
    this.zoomControl.addTo(this.map);
  }

  private ensureBasemapControl(): void {
    if (!this.map || this.basemapControl) {
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
    if (!this.map) {
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
    if (!this.map) {
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

  private createMarkerIcon(): L.DivIcon {
    return L.divIcon({
      className: 'junction-marker',
      html: '<span class="junction-marker__pin" aria-hidden="true"></span>',
      iconSize: [28, 36],
      iconAnchor: [14, 36],
    });
  }
}
