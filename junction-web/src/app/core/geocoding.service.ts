import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { Coordinates, resolveCityCoordinates, resolveLocalityCoordinates } from './location-coordinates';

interface NominatimResult {
  lat: string;
  lon: string;
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly headers = new HttpHeaders({
    'User-Agent': 'JunctionToday/1.0 (https://github.com/ancqit/jtoday)',
  });

  resolveCity(cityName: string): Observable<Coordinates> {
    return of(resolveCityCoordinates(cityName));
  }

  resolveLocality(cityName: string, localityName: string): Observable<Coordinates> {
    const staticCoords = resolveLocalityCoordinates(cityName, localityName);
    const cityCoords = resolveCityCoordinates(cityName);
    const hasDistinctLocality =
      staticCoords.latitude !== cityCoords.latitude || staticCoords.longitude !== cityCoords.longitude;

    if (hasDistinctLocality) {
      return of(staticCoords);
    }

    return this.geocode(`${localityName}, ${cityName}, India`).pipe(
      catchError(() => of(staticCoords)),
    );
  }

  private geocode(query: string): Observable<Coordinates> {
    return this.http
      .get<NominatimResult[]>('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: '1',
          countrycodes: 'in',
        },
        headers: this.headers,
      })
      .pipe(
        map((results) => {
          const match = results[0];
          if (!match) {
            throw new Error('No geocoding result');
          }

          return {
            latitude: Number(match.lat),
            longitude: Number(match.lon),
          };
        }),
      );
  }
}
