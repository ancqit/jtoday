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

/** Free raster tiles — used when no Google Maps API key is configured. */
const LEAFLET_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const LEAFLET_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Minimal Google Maps typings (avoid adding @types/google.maps dependency). */
type GoogleLatLngLiteral = { lat: number; lng: number };

interface GoogleMapInstance {
  panTo(latLng: GoogleLatLngLiteral): void;
  setZoom(zoom: number): void;
}

interface GoogleMarkerInstance {
  setMap(map: GoogleMapInstance | null): void;
  setPosition(latLng: GoogleLatLngLiteral): void;
}

interface GoogleMapsApi {
  Map: new (
    el: HTMLElement,
    opts: Record<string, unknown>,
  ) => GoogleMapInstance;
  Marker: new (opts: {
    map: GoogleMapInstance;
    position: GoogleLatLngLiteral;
    clickable?: boolean;
  }) => GoogleMarkerInstance;
}

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
  }
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  /** When false (default for Junction Today), users cannot pan/zoom — only programmatic flyTo. */
  readonly interactive = input(false);
  readonly target = input<MapTarget | null>(null);

  private leafletMap: L.Map | null = null;
  private leafletMarker: L.Marker | null = null;
  private zoomControl: L.Control.Zoom | null = null;
  private googleMap: GoogleMapInstance | null = null;
  private googleMarker: GoogleMarkerInstance | null = null;
  private lastFlyKey: string | null = null;
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly googleMapsApiKey = (environment.googleMapsApiKey || '').trim();
  private usingGoogle = false;

  constructor() {
    effect(() => {
      const nextTarget = this.target();
      if (!nextTarget) {
        return;
      }
      if (this.usingGoogle) {
        if (this.googleMap) {
          this.flyGoogle(nextTarget);
        }
        return;
      }
      if (this.leafletMap) {
        this.flyLeaflet(nextTarget);
      }
    });

    effect(() => {
      const enabled = this.interactive();
      this.host.nativeElement.classList.toggle('map--disabled', !enabled);
      if (!this.usingGoogle) {
        this.applyLeafletInteraction(enabled);
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.googleMapsApiKey) {
      void this.initGoogleMap(this.googleMapsApiKey);
      return;
    }
    this.initLeafletMap();
  }

  ngOnDestroy(): void {
    this.leafletMarker?.remove();
    this.zoomControl?.remove();
    this.leafletMap?.remove();
    this.googleMarker?.setMap(null);
    this.googleMap = null;
  }

  private async initGoogleMap(apiKey: string): Promise<void> {
    try {
      await this.loadGoogleMapsScript(apiKey);
    } catch {
      // Key missing/invalid — fall back silently so the UI never shows Google's red banner.
      this.initLeafletMap();
      return;
    }

    const maps = window.google?.maps;
    if (!maps) {
      this.initLeafletMap();
      return;
    }

    this.usingGoogle = true;
    const initial = this.target();
    this.googleMap = new maps.Map(this.mapContainer.nativeElement, {
      center: {
        lat: initial?.latitude ?? 20.5937,
        lng: initial?.longitude ?? 78.9629,
      },
      zoom: initial?.zoom ?? 4,
      disableDefaultUI: true,
      gestureHandling: this.interactive() ? 'greedy' : 'none',
      keyboardShortcuts: false,
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    if (initial) {
      this.flyGoogle(initial);
    }
  }

  private initLeafletMap(): void {
    this.usingGoogle = false;
    this.leafletMap = L.map(this.mapContainer.nativeElement, {
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

    L.control
      .attribution({ prefix: false, position: 'bottomright' })
      .addAttribution(LEAFLET_TILE_ATTRIBUTION)
      .addTo(this.leafletMap);

    L.tileLayer(LEAFLET_TILE_URL, {
      attribution: '',
      subdomains: 'abcd',
      maxZoom: 20,
      errorTileUrl:
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    }).addTo(this.leafletMap);

    this.applyLeafletInteraction(this.interactive());

    const initialTarget = this.target();
    if (initialTarget) {
      this.flyLeaflet(initialTarget);
    }
  }

  private loadGoogleMapsScript(apiKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.maps) {
        resolve();
        return;
      }

      const existing = document.querySelector<HTMLScriptElement>('script[data-junction-google-maps]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.dataset['junctionGoogleMaps'] = '1';
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Maps failed to load'));
      document.head.appendChild(script);
    });
  }

  private applyLeafletInteraction(enabled: boolean): void {
    if (!this.leafletMap) {
      return;
    }

    const handlers: Array<{ enable: () => void; disable: () => void } | undefined> = [
      this.leafletMap.dragging,
      this.leafletMap.touchZoom,
      this.leafletMap.doubleClickZoom,
      this.leafletMap.scrollWheelZoom,
      this.leafletMap.boxZoom,
      this.leafletMap.keyboard,
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

    if (enabled) {
      if (!this.zoomControl) {
        this.zoomControl = L.control.zoom({ position: 'bottomright' });
        this.zoomControl.addTo(this.leafletMap);
      }
    } else if (this.zoomControl) {
      this.zoomControl.remove();
      this.zoomControl = null;
    }
  }

  private flyLeaflet(target: MapTarget): void {
    if (!this.leafletMap) {
      return;
    }

    const center = L.latLng(target.latitude, target.longitude);
    const zoom = target.zoom ?? 13;
    const flyKey = `${target.latitude.toFixed(5)},${target.longitude.toFixed(5)},${zoom}`;
    if (flyKey === this.lastFlyKey) {
      return;
    }
    this.lastFlyKey = flyKey;

    this.leafletMap.flyTo(center, zoom, {
      animate: true,
      duration: zoom === this.leafletMap.getZoom() ? 0.8 : 1.4,
    });

    if (!this.leafletMarker) {
      this.leafletMarker = L.marker(center, {
        icon: this.createMarkerIcon(),
        interactive: false,
      }).addTo(this.leafletMap);
    } else {
      this.leafletMarker.setLatLng(center);
    }
  }

  private flyGoogle(target: MapTarget): void {
    const maps = window.google?.maps;
    if (!this.googleMap || !maps) {
      return;
    }

    const zoom = target.zoom ?? 13;
    const flyKey = `${target.latitude.toFixed(5)},${target.longitude.toFixed(5)},${zoom}`;
    if (flyKey === this.lastFlyKey) {
      return;
    }
    this.lastFlyKey = flyKey;

    const center = { lat: target.latitude, lng: target.longitude };
    this.googleMap.panTo(center);
    this.googleMap.setZoom(zoom);

    if (!this.googleMarker) {
      this.googleMarker = new maps.Marker({
        map: this.googleMap,
        position: center,
        clickable: false,
      });
    } else {
      this.googleMarker.setPosition(center);
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
