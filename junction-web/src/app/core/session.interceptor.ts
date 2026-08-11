import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { resolveApiBaseUrl } from './api.config';
import { SessionService } from './session.service';

function isApiRequest(url: string): boolean {
  const baseUrl = resolveApiBaseUrl();
  if (url.startsWith(baseUrl)) {
    return true;
  }

  if (baseUrl === '/api' && url.startsWith('/api/')) {
    return true;
  }

  return url.includes('/session') || url.includes('/locations/') || url.includes('/shops') || url.includes('/products');
}

function isSessionCreateRequest(url: string, method: string): boolean {
  return method === 'POST' && (url.endsWith('/session') || url.includes('/session?'));
}

export const sessionInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const token = session.accessToken();

  let outgoing = request;
  if (token && isApiRequest(request.url) && !isSessionCreateRequest(request.url, request.method)) {
    outgoing = request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(outgoing).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status !== 401 ||
        !isApiRequest(request.url) ||
        isSessionCreateRequest(request.url, request.method)
      ) {
        return throwError(() => error);
      }

      return session.refreshSession().pipe(
        switchMap(() => {
          const refreshed = session.accessToken();
          if (!refreshed) {
            return throwError(() => error);
          }

          return next(
            request.clone({
              setHeaders: { Authorization: `Bearer ${refreshed}` },
            }),
          );
        }),
        catchError((refreshError) => throwError(() => refreshError)),
      );
    }),
  );
};
