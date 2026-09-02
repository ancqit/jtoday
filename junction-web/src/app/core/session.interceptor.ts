import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { resolveApiBaseUrl } from './api.config';
import { SKIP_SESSION_AUTH } from './http-context';
import { SessionService } from './session.service';

/** junctionBack routes that accept the junction.today session JWT. */
const SESSION_PROTECTED_PATHS = ['/session', '/locations/', '/shops', '/products', '/orders'] as const;

function isPublicNoticesTodayRequest(url: string, method: string): boolean {
  return method === 'GET' && url.includes('/notices/today');
}

function isPublicBlogEntriesRequest(url: string, method: string): boolean {
  return method === 'GET' && url.includes('/blog/entries');
}

function isPublicCatalogAuthRequest(url: string): boolean {
  return url.includes('/auth/catalog-otp') || url.includes('/auth/recaptcha-params');
}

function isApiRequest(url: string): boolean {
  const baseUrl = resolveApiBaseUrl();
  if (url.startsWith(baseUrl)) {
    return true;
  }

  if (baseUrl === '/api' && url.startsWith('/api/')) {
    return true;
  }

  return SESSION_PROTECTED_PATHS.some((segment) => url.includes(segment));
}

function isSessionCreateRequest(url: string, method: string): boolean {
  return method === 'POST' && (url.endsWith('/session') || url.includes('/session?'));
}

export const sessionInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const token = session.accessToken();

  let outgoing = request;
  if (
    token &&
    isApiRequest(request.url) &&
    !isSessionCreateRequest(request.url, request.method) &&
    !request.context.get(SKIP_SESSION_AUTH) &&
    !isPublicNoticesTodayRequest(request.url, request.method) &&
    !isPublicBlogEntriesRequest(request.url, request.method) &&
    !isPublicCatalogAuthRequest(request.url)
  ) {
    outgoing = request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(outgoing).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status !== 401 ||
        !isApiRequest(request.url) ||
        isSessionCreateRequest(request.url, request.method) ||
        request.context.get(SKIP_SESSION_AUTH) ||
        isPublicNoticesTodayRequest(request.url, request.method) ||
        isPublicBlogEntriesRequest(request.url, request.method) ||
        isPublicCatalogAuthRequest(request.url)
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
