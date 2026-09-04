import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { NoticesApi } from '../core/notices.api';
import { Notice } from '../models/notice.model';

/** Max notices kept in the home notice-board FIFO queue. */
export const NOTICE_BOARD_FIFO_MAX = 20;

/**
 * In-memory FIFO notice board store.
 * Serves the previous queue immediately; API refresh updates the store and view.
 */
@Injectable({ providedIn: 'root' })
export class NoticesStore {
  private readonly noticesApi = inject(NoticesApi);
  private readonly queue$ = new BehaviorSubject<Notice[]>([]);
  private readonly loaded$ = new BehaviorSubject(false);
  private refreshing = false;

  get snapshot(): Notice[] {
    return this.queue$.value;
  }

  get hasLoaded(): boolean {
    return this.loaded$.value;
  }

  setQueue(notices: Notice[]): void {
    this.queue$.next(this.toFifo(notices));
    this.loaded$.next(true);
  }

  /** Watch the board. Emits cache first, then refreshes from GET /notices. */
  watch(forceRefresh = false): Observable<Notice[]> {
    if (forceRefresh || !this.loaded$.value) {
      this.refresh(forceRefresh);
    } else if (!this.refreshing) {
      this.refresh(false);
    }
    return this.queue$.asObservable();
  }

  refresh(force = false): void {
    if (this.refreshing && !force) {
      return;
    }
    this.refreshing = true;
    this.noticesApi
      .listToday()
      .pipe(
        catchError(() => of(null)),
        tap(() => {
          this.refreshing = false;
        }),
      )
      .subscribe((rows) => {
        if (rows) {
          this.queue$.next(this.toFifo(rows));
          this.loaded$.next(true);
        } else if (!this.loaded$.value) {
          this.loaded$.next(true);
        }
      });
  }

  private toFifo(notices: Notice[], max: number = NOTICE_BOARD_FIFO_MAX): Notice[] {
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
