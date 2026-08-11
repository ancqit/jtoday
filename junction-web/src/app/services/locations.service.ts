import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { GeocodingService } from '../core/geocoding.service';
import {
  resolveCityCoordinates,
  resolveLocalityCoordinates,
  slugifyLocationName,
} from '../core/location-coordinates';
import { LocationsApi } from '../core/locations.api';
import { City, Locality } from '../models/location.model';

export interface MapLocationTarget {
  latitude: number;
  longitude: number;
  label: string;
  zoom: number;
}

@Injectable({ providedIn: 'root' })
export class LocationsService {
  private readonly locationsApi = inject(LocationsApi);
  private readonly geocoding = inject(GeocodingService);
  private cities$?: Observable<City[]>;

  preloadCities(): void {
    if (this.cities$) {
      return;
    }

    this.cities$ = this.locationsApi.cities().pipe(
      map((names) =>
        names.map((name) => ({
          id: slugifyLocationName(name),
          name,
          ...resolveCityCoordinates(name),
        })),
      ),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.cities$.subscribe();
  }

  getCities(): Observable<City[]> {
    this.preloadCities();
    return this.cities$!;
  }

  getLocalities(cityName: string): Observable<Locality[]> {
    const cityId = slugifyLocationName(cityName);

    return this.locationsApi.localities(cityName).pipe(
      map((names) =>
        names.map((name) => ({
          id: slugifyLocationName(name),
          cityId,
          name,
          ...resolveLocalityCoordinates(cityName, name),
        })),
      ),
    );
  }

  resolveCityTarget(cityName: string): Observable<MapLocationTarget> {
    return this.geocoding.resolveCity(cityName).pipe(
      map((coordinates) => ({
        ...coordinates,
        label: cityName,
        zoom: 11,
      })),
    );
  }

  resolveLocalityTarget(cityName: string, localityName: string): Observable<MapLocationTarget> {
    return this.geocoding.resolveLocality(cityName, localityName).pipe(
      map((coordinates) => ({
        ...coordinates,
        label: `${localityName}, ${cityName}`,
        zoom: 15,
      })),
    );
  }

  resolveLocality(cityName: string, localityName: string): Observable<Locality> {
    const cityId = slugifyLocationName(cityName);

    return this.geocoding.resolveLocality(cityName, localityName).pipe(
      map((coordinates) => ({
        id: slugifyLocationName(localityName),
        cityId,
        name: localityName,
        ...coordinates,
      })),
    );
  }

  resolveCity(cityName: string): Observable<City> {
    return this.geocoding.resolveCity(cityName).pipe(
      map((coordinates) => ({
        id: slugifyLocationName(cityName),
        name: cityName.trim(),
        ...coordinates,
      })),
    );
  }

  tryResolveLocality(cityName: string, localityName: string): Observable<Locality | null> {
    const cityId = slugifyLocationName(cityName);

    return this.geocoding.tryGeocodeLocality(cityName, localityName).pipe(
      map((coordinates) => {
        if (!coordinates) {
          return null;
        }

        return {
          id: slugifyLocationName(localityName),
          cityId,
          name: localityName.trim(),
          ...coordinates,
        };
      }),
    );
  }
}
