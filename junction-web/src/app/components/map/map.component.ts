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
import { resolveMapTileConfig } from '../../core/map.config';

export interface MapTarget {
  latitude: number;
  longitude: number;
  label: string;
  zoom?: number;
}

const TILE = resolveMapTileConfig();

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  readonly interactive = input(true);
  readonly target = input<MapTarget | null>(null);

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
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
      attributionControl: true,
    });

    L.tileLayer(TILE.url, {
      attribution: TILE.attribution,
      subdomains: TILE.subdomains,
      maxZoom: TILE.maxZoom,
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    this.applyInteractionState(this.interactive());

    const initialTarget = this.target();
    if (initialTarget) {
      this.flyToTarget(initialTarget);
    }
  }

  ngOnDestroy(): void {
    this.marker?.remove();
    this.map?.remove();
  }

  private applyInteractionState(enabled: boolean): void {
    if (!this.map) {
      return;
    }

    const handlers: Array<{ enable: () => void; disable: () => void }> = [
      this.map.dragging,
      this.map.touchZoom,
      this.map.doubleClickZoom,
      this.map.scrollWheelZoom,
      this.map.boxZoom,
      this.map.keyboard,
    ];

    for (const handler of handlers) {
      if (enabled) {
        handler.enable();
      } else {
        handler.disable();
      }
    }

    const zoomControl = this.map.zoomControl?.getContainer();
    if (zoomControl instanceof HTMLElement) {
      zoomControl.style.display = enabled ? '' : 'none';
    }
  }

  private flyToTarget(target: MapTarget): void {
    if (!this.map) {
      return;
    }

    const center = L.latLng(target.latitude, target.longitude);
    const zoom = target.zoom ?? 13;

    this.map.flyTo(center, zoom, {
      animate: true,
      duration: 2.4,
    });

    if (!this.marker) {
      this.marker = L.marker(center, { icon: this.createMarkerIcon() }).addTo(this.map);
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
