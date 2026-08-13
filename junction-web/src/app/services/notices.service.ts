import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { NoticesApi } from '../core/notices.api';
import { Notice } from '../models/notice.model';
import { SessionService } from '../core/session.service';

@Injectable({ providedIn: 'root' })
export class NoticesService {
  private readonly noticesApi = inject(NoticesApi);
  private readonly session = inject(SessionService);

  /** junctionBack: GET /notices/today?shop_id= (public) */
  getTodayForShop(storeId: string): Observable<Notice | null> {
    return this.noticesApi.todayForShop(storeId);
  }

  /**
   * junctionBack: GET /notices (session JWT) — all of today's notices,
   * filtered to the given shop ids.
   */
  getTodayForShops(storeIds: string[]): Observable<Record<string, Notice>> {
    const ids = new Set(storeIds.map((id) => id.trim()).filter(Boolean));
    if (ids.size === 0) {
      return of({});
    }

    return this.session.ensureSession().pipe(
      switchMap(() => this.noticesApi.listToday()),
      map((notices) => {
        const result: Record<string, Notice> = {};
        for (const notice of notices) {
          const storeId = notice.store_id?.trim();
          if (storeId && ids.has(storeId) && notice.message?.trim()) {
            result[storeId] = notice;
          }
        }
        return result;
      }),
      catchError(() => of({})),
    );
  }
}
