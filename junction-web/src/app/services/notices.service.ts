import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { NoticesApi } from '../core/notices.api';
import { Notice } from '../models/notice.model';

@Injectable({ providedIn: 'root' })
export class NoticesService {
  private readonly noticesApi = inject(NoticesApi);

  /** junctionBack: GET /notices/today?store_id= (public, no session JWT) */
  getTodayForShop(storeId: string): Observable<Notice | null> {
    return this.noticesApi.todayForShop(storeId);
  }

  /** Fetch today's notice per shop; 404/missing notices are omitted. */
  getTodayForShops(storeIds: string[]): Observable<Record<string, Notice>> {
    const ids = [...new Set(storeIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) {
      return of({});
    }

    return forkJoin(
      ids.map((storeId) =>
        this.noticesApi.todayForShop(storeId).pipe(
          map((notice) => ({ storeId, notice })),
        ),
      ),
    ).pipe(
      map((results) => {
        const notices: Record<string, Notice> = {};
        for (const { storeId, notice } of results) {
          if (notice?.message?.trim()) {
            notices[storeId] = notice;
          }
        }
        return notices;
      }),
    );
  }
}
