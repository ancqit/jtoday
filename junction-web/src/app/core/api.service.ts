import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { resolveApiBaseUrl } from './api.config';

export interface ApiGetOptions {
  context?: HttpContext;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = resolveApiBaseUrl();

  get<T>(path: string, params?: Record<string, string>, options?: ApiGetOptions): Observable<T> {
    return this.http.get<T>(this.url(path), {
      params: new HttpParams({ fromObject: params ?? {} }),
      context: options?.context,
    });
  }

  post<T>(path: string, body: unknown, options?: ApiGetOptions): Observable<T> {
    return this.http.post<T>(this.url(path), body, {
      context: options?.context,
    });
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  patch<T>(path: string, body: unknown, options?: ApiGetOptions): Observable<T> {
    return this.http.patch<T>(this.url(path), body, {
      context: options?.context,
    });
  }

  delete<T = void>(path: string, body?: unknown, options?: ApiGetOptions): Observable<T> {
    return this.http.delete<T>(this.url(path), {
      body,
      context: options?.context,
    });
  }

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
}
