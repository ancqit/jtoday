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
import mapboxgl from 'mapbox-gl';
import { environment } from '../../../environments/environment';

export interface MapTarget {
  latitude: number;
  longitude: number;
  label: string;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  readonly interactive = input(true);
  readonly target = input<MapTarget | null>(null);

  private map: mapboxgl.Map | null = null;
  private marker: mapboxgl.Marker | null = null;
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
    const token = environment.mapboxAccessToken;

    if (!token) {
      this.mapContainer.nativeElement.innerHTML =
        '<div class="map-fallback">Add MAPBOX_ACCESS_TOKEN to enable the production map.</div>';
      return;
    }

    mapboxgl.accessToken = token;

    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.9629, 20.5937],
      zoom: 4.2,
      attributionControl: true,
    });

    this.map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    this.applyInteractionState(this.interactive());

    this.map.on('load', () => {
      const initialTarget = this.target();
      if (initialTarget) {
        this.flyToTarget(initialTarget);
      }
    });
  }

  ngOnDestroy(): void {
    this.marker?.remove();
    this.map?.remove();
  }

  private applyInteractionState(enabled: boolean): void {
    if (!this.map) {
      return;
    }

    const controls = [
      this.map.scrollZoom,
      this.map.dragPan,
      this.map.boxZoom,
      this.map.doubleClickZoom,
      this.map.touchZoomRotate,
      this.map.keyboard,
    ];

    for (const control of controls) {
      if (enabled) {
        control.enable();
      } else {
        control.disable();
      }
    }

    const navContainer = this.map
      .getContainer()
      .querySelector('.mapboxgl-ctrl-top-right, .mapboxgl-ctrl-bottom-right');
    if (navContainer instanceof HTMLElement) {
      navContainer.style.display = enabled ? '' : 'none';
    }
  }

  private flyToTarget(target: MapTarget): void {
    if (!this.map) {
      return;
    }

    const center: [number, number] = [target.longitude, target.latitude];

    this.map.flyTo({
      center,
      zoom: 13.5,
      pitch: 45,
      bearing: -12,
      duration: 2400,
      essential: true,
    });

    if (!this.marker) {
      this.marker = new mapboxgl.Marker({ color: '#0f766e' }).setLngLat(center).addTo(this.map);
    } else {
      this.marker.setLngLat(center);
    }
  }
}
