import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { NoticesApi } from '../core/notices.api';
import { Notice } from '../models/notice.model';
import { NOTICE_BOARD_FIFO_MAX, NoticesStore } from '../stores/notices.store';

export { NOTICE_BOARD_FIFO_MAX };

@Injectable({ providedIn: 'root' })
export class NoticesService {
  private readonly noticesApi = inject(NoticesApi);
  private readonly store = inject(NoticesStore);

  /** junctionBack: GET /notices (public) — prefers in-memory store. */
  listToday(forceRefresh = false): Observable<Notice[]> {
    return this.store.watch(forceRefresh);
  }

  listTodayFifo(max: number = NOTICE_BOARD_FIFO_MAX, forceRefresh = false): Observable<Notice[]> {
    return this.listToday(forceRefresh).pipe(map((notices) => this.toFifoQueue(notices, max)));
  }

  getTodayForShop(storeId: string): Observable<Notice | null> {
    return this.noticesApi.todayForShop(storeId);
  }

  getTodayForShops(storeIds: string[]): Observable<Record<string, Notice>> {
    const ids = [...new Set(storeIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) {
      return of({});
    }

    return forkJoin(
      ids.map((storeId) =>
        this.noticesApi.todayForShop(storeId).pipe(map((notice) => ({ storeId, notice }))),
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

  toFifoQueue(notices: Notice[], max: number = NOTICE_BOARD_FIFO_MAX): Notice[] {
    const withMessage = notices.filter((notice) => notice.message?.trim());
    const sorted = [...withMessage].sort((a, b) => {
      const aTime = Date.parse(a.updated_at || a.created_at || '') || 0;
      const bTime = Date.parse(b.updated_at || b.created_at || '') || 0;
      return aTime - bTime;
    });
    if (sorted.length <= max) {
      return sorted;
    }
    return sorted.slice(sorted.length - max);
  }
}
