import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  resolveCityCoordinates,
  resolveLocalityCoordinates,
  slugifyLocationName,
} from '../core/location-coordinates';
import { LocationsApi } from '../core/locations.api';
import { City, Locality } from '../models/location.model';

@Injectable({ providedIn: 'root' })
export class LocationsService {
  private readonly locationsApi = inject(LocationsApi);

  getCities(): Observable<City[]> {
    return this.locationsApi.cities().pipe(
      map((names) =>
        names.map((name) => ({
          id: slugifyLocationName(name),
          name,
          ...resolveCityCoordinates(name),
        })),
      ),
    );
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
}
