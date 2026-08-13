import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { Notice } from '../models/notice.model';
import { ApiService } from './api.service';

/**
 * junctionBack notice reads (https://github.com/ancqit/junctionBack).
 * GET /notices/today?store_id= — today's notice for one shop (public).
 */
@Injectable({ providedIn: 'root' })
export class NoticesApi {
  private readonly api = inject(ApiService);

  todayForShop(storeId: string): Observable<Notice | null> {
    const trimmed = storeId.trim();
    if (!trimmed) {
      return of(null);
    }

    return this.api
      .get<Notice>('/notices/today', { store_id: trimmed })
      .pipe(catchError(() => of(null)));
  }
}
