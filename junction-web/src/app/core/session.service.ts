import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { resolveApiBaseUrl } from './api.config';

export interface SessionResponse {
  session_id: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  audience: string;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = resolveApiBaseUrl();
  private refreshTimer?: ReturnType<typeof setTimeout>;

  private readonly tokenSignal = signal<string | null>(null);
  private expiresAtMs = 0;

  readonly accessToken = this.tokenSignal.asReadonly();

  ensureSession(): Observable<void> {
    if (this.tokenSignal() && Date.now() < this.expiresAtMs - 5_000) {
      return of(undefined);
    }

    return this.createSession();
  }

  createSession(): Observable<void> {
    // junctionBack: POST /session — guest JWT for junction.today (~100s TTL)
    return this.http.post<SessionResponse>(this.url('/session'), {}).pipe(
      tap((response) => this.applySession(response)),
      map(() => undefined),
      catchError((error) => throwError(() => error)),
    );
  }

  refreshSession(): Observable<void> {
    return this.createSession();
  }

  clearSession(): void {
    this.tokenSignal.set(null);
    this.expiresAtMs = 0;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  private applySession(response: SessionResponse): void {
    this.tokenSignal.set(response.access_token);
    this.expiresAtMs = Date.now() + response.expires_in * 1000;
    this.scheduleRefresh(response.expires_in);
  }

  private scheduleRefresh(expiresInSeconds: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const refreshMs = Math.max((expiresInSeconds - 15) * 1000, 5_000);
    this.refreshTimer = setTimeout(() => {
      this.createSession().subscribe();
    }, refreshMs);
  }

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
}
