import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { ApiService } from './api.service';

interface CityListResponse {
  cities: string[];
}

interface LocalityListResponse {
  city: string;
  localities: string[];
}

@Injectable({ providedIn: 'root' })
export class LocationsApi {
  private readonly api = inject(ApiService);

  cities(): Observable<string[]> {
    return this.api.get<CityListResponse | string[]>('/locations/cities').pipe(
      map((response) => (Array.isArray(response) ? response : (response?.cities ?? []))),
      catchError(() => of([])),
    );
  }

  localities(city: string): Observable<string[]> {
    const trimmed = city.trim();
    if (!trimmed) {
      return of([]);
    }

    return this.api
      .get<LocalityListResponse | string[]>('/locations/localities', { city: trimmed })
      .pipe(
        map((response) => (Array.isArray(response) ? response : (response?.localities ?? []))),
        catchError(() => of([])),
      );
  }
}
