import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { City, Locality } from '../models/location.model';

const FALLBACK_CITIES: City[] = [
  { id: 'bengaluru', name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946 },
  { id: 'mumbai', name: 'Mumbai', latitude: 19.076, longitude: 72.8777 },
  { id: 'delhi', name: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { id: 'hyderabad', name: 'Hyderabad', latitude: 17.385, longitude: 78.4867 },
  { id: 'chennai', name: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
];

const FALLBACK_LOCALITIES: Record<string, Locality[]> = {
  bengaluru: [
    { id: 'indiranagar', cityId: 'bengaluru', name: 'Indiranagar', latitude: 12.9784, longitude: 77.6408 },
    { id: 'koramangala', cityId: 'bengaluru', name: 'Koramangala', latitude: 12.9352, longitude: 77.6245 },
    { id: 'whitefield', cityId: 'bengaluru', name: 'Whitefield', latitude: 12.9698, longitude: 77.75 },
    { id: 'jayanagar', cityId: 'bengaluru', name: 'Jayanagar', latitude: 12.925, longitude: 77.5938 },
  ],
  mumbai: [
    { id: 'bandra', cityId: 'mumbai', name: 'Bandra', latitude: 19.0596, longitude: 72.8295 },
    { id: 'andheri', cityId: 'mumbai', name: 'Andheri', latitude: 19.1197, longitude: 72.8468 },
    { id: 'powai', cityId: 'mumbai', name: 'Powai', latitude: 19.1176, longitude: 72.906 },
  ],
  delhi: [
    { id: 'connaught-place', cityId: 'delhi', name: 'Connaught Place', latitude: 28.6315, longitude: 77.2167 },
    { id: 'saket', cityId: 'delhi', name: 'Saket', latitude: 28.5244, longitude: 77.2066 },
    { id: 'dwarka', cityId: 'delhi', name: 'Dwarka', latitude: 28.5921, longitude: 77.046 },
  ],
  hyderabad: [
    { id: 'hitech-city', cityId: 'hyderabad', name: 'Hitech City', latitude: 17.4435, longitude: 78.3772 },
    { id: 'banjara-hills', cityId: 'hyderabad', name: 'Banjara Hills', latitude: 17.4156, longitude: 78.4347 },
    { id: 'gachibowli', cityId: 'hyderabad', name: 'Gachibowli', latitude: 17.4401, longitude: 78.3489 },
  ],
  chennai: [
    { id: 'adyar', cityId: 'chennai', name: 'Adyar', latitude: 13.0067, longitude: 80.2572 },
    { id: 't-nagar', cityId: 'chennai', name: 'T. Nagar', latitude: 13.0418, longitude: 80.2341 },
    { id: 'anna-nagar', cityId: 'chennai', name: 'Anna Nagar', latitude: 13.085, longitude: 80.2101 },
  ],
};

@Injectable({ providedIn: 'root' })
export class LocationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getCities(): Observable<City[]> {
    return this.http.get<City[] | { cities: City[] }>(`${this.baseUrl}/cities`).pipe(
      map((response) => (Array.isArray(response) ? response : response.cities)),
      catchError(() => of(FALLBACK_CITIES)),
    );
  }

  getLocalities(cityId: string): Observable<Locality[]> {
    return this.http
      .get<Locality[] | { localities: Locality[] }>(`${this.baseUrl}/cities/${cityId}/localities`)
      .pipe(
        map((response) => (Array.isArray(response) ? response : response.localities)),
        catchError(() => of(FALLBACK_LOCALITIES[cityId] ?? [])),
      );
  }
}
