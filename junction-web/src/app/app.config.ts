import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { map, tap } from 'rxjs';

import { routes } from './app.routes';
import { LocationsService } from './services/locations.service';
import { sessionInterceptor } from './core/session.interceptor';
import { SessionService } from './core/session.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([sessionInterceptor])),
    provideAppInitializer(() => {
      const session = inject(SessionService);
      const locations = inject(LocationsService);
      return session.ensureSession().pipe(
        tap(() => locations.preloadCities()),
        map(() => undefined),
      );
    }),
  ],
};
