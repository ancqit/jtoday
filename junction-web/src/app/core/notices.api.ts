import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Notice } from '../models/notice.model';
import { ApiService } from './api.service';
import { SKIP_SESSION_AUTH } from './http-context';

/**
 * junctionBack notice reads (https://github.com/ancqit/junctionBack).
 * GET /notices/today?store_id= — public 0-or-1 list; do not send session JWT.
 */
@Injectable({ providedIn: 'root' })
export class NoticesApi {
  private readonly api = inject(ApiService);
  private readonly publicContext = new HttpContext().set(SKIP_SESSION_AUTH, true);

  todayForShop(storeId: string): Observable<Notice | null> {
    const trimmed = storeId.trim();
    if (!trimmed) {
      return of(null);
    }

    return this.api
      .get<Notice[] | Notice>(
        '/notices/today',
        { store_id: trimmed },
        { context: this.publicContext },
      )
      .pipe(
        map((payload) => {
          if (Array.isArray(payload)) {
            return payload[0] ?? null;
          }
          return payload?.message != null ? payload : null;
        }),
        catchError(() => of(null)),
      );
  }
}
