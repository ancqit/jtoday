import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { NoticesApi } from '../core/notices.api';
import { Notice } from '../models/notice.model';

/** Max notices kept in the home notice-board FIFO queue. */
export const NOTICE_BOARD_FIFO_MAX = 20;

@Injectable({ providedIn: 'root' })
export class NoticesService {
  private readonly noticesApi = inject(NoticesApi);

  /** junctionBack: GET /notices (public) — all today's notices. */
  listToday(): Observable<Notice[]> {
    return this.noticesApi.listToday();
  }

  /**
   * Today's notices as a FIFO queue (oldest → newest), capped at `max`.
   * When over capacity, oldest entries are dropped first.
   */
  listTodayFifo(max: number = NOTICE_BOARD_FIFO_MAX): Observable<Notice[]> {
    return this.listToday().pipe(map((notices) => this.toFifoQueue(notices, max)));
  }

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

  /**
   * Apply FIFO ordering + cap. Prefer when merging fresh loads into the board.
   * Oldest → newest; drop oldest when over `max`.
   */
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
