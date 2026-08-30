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

export interface MapTarget {
  latitude: number;
  longitude: number;
  label: string;
  zoom?: number;
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

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

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private zoomControl: L.Control.Zoom | null = null;
  private lastFlyKey: string | null = null;
  private readonly host = inject(ElementRef<HTMLElement>);

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
      this.host.nativeElement.classList.toggle('map--disabled', !enabled);
      this.applyInteractionState(enabled);
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [20.5937, 78.9629],
      zoom: 4,
      zoomControl: false,
      // Compact attribution — avoids a noisy “API key” style watermark look.
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
      .addAttribution(TILE_ATTRIBUTION)
      .addTo(this.map);

    L.tileLayer(TILE_URL, {
      attribution: '',
      subdomains: 'abcd',
      maxZoom: 20,
      // Never surface tile provider errors as an on-map banner.
      errorTileUrl:
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    }).addTo(this.map);

    this.applyInteractionState(this.interactive());

    const initialTarget = this.target();
    if (initialTarget) {
      this.flyToTarget(initialTarget);
    }
  }

  ngOnDestroy(): void {
    this.marker?.remove();
    this.zoomControl?.remove();
    this.map?.remove();
  }

  private applyInteractionState(enabled: boolean): void {
    if (!this.map) {
      return;
    }

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

    if (enabled) {
      if (!this.zoomControl) {
        this.zoomControl = L.control.zoom({ position: 'bottomright' });
        this.zoomControl.addTo(this.map);
      }
    } else if (this.zoomControl) {
      this.zoomControl.remove();
      this.zoomControl = null;
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
