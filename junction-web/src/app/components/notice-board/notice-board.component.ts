import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { catchError, map, of, switchMap } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Notice } from '../../models/notice.model';
import { CatalogService } from '../../services/catalog.service';
import { NOTICE_BOARD_FIFO_MAX, NoticesService } from '../../services/notices.service';
import { UserSessionService } from '../../services/user-session.service';

export interface NoticeBoardItem {
  id: string;
  storeId: string;
  shopName: string;
  message: string;
  updatedAt: string;
}

@Component({
  selector: 'app-notice-board',
  imports: [DatePipe, TranslatePipe],
  templateUrl: './notice-board.component.html',
  styleUrl: './notice-board.component.scss',
})
export class NoticeBoardComponent {
  private readonly notices = inject(NoticesService);
  private readonly catalog = inject(CatalogService);
  private readonly session = inject(UserSessionService);

  /** Default open so recent shop notices are visible under Shops/Services. */
  readonly open = signal(true);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly items = signal<NoticeBoardItem[]>([]);

  private lastLoadKey: string | null = null;

  constructor() {
    effect(() => {
      const profile = this.session.userProfile();
      const locationKey = this.session.locationKey();
      const scope = this.session.serviceScope();
      if (!profile || !locationKey) {
        this.items.set([]);
        this.lastLoadKey = null;
        return;
      }

      const loadKey = `${locationKey}|${scope}`;
      if (this.lastLoadKey === loadKey) {
        return;
      }

      this.lastLoadKey = loadKey;
      this.loadNotices();
    });
  }

  toggle(): void {
    this.open.update((value) => !value);
  }

  private loadNotices(): void {
    const profile = this.session.userProfile();
    if (!profile) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    const shops$ =
      this.session.serviceScope() === 'city'
        ? this.catalog.getShopsByCity(profile.city.name)
        : this.catalog.getShops(profile.city.name, profile.locality.name);

    shops$
      .pipe(
        switchMap((shops) => {
          const shopNames = new Map(shops.map((shop) => [shop.id, shop.name] as const));
          const localIds = new Set(shops.map((shop) => shop.id));

          return this.notices.listTodayFifo(NOTICE_BOARD_FIFO_MAX).pipe(
            map((all) => {
              const local = all.filter((notice) => localIds.has(notice.store_id));
              const queue =
                local.length > 0
                  ? this.notices.toFifoQueue(local, NOTICE_BOARD_FIFO_MAX)
                  : all;
              return this.toBoardItems(queue, shopNames);
            }),
            catchError(() =>
              this.notices.getTodayForShops([...localIds]).pipe(
                map((byShop) =>
                  this.toBoardItems(
                    this.notices.toFifoQueue(Object.values(byShop), NOTICE_BOARD_FIFO_MAX),
                    shopNames,
                  ),
                ),
                catchError(() => of([] as NoticeBoardItem[])),
              ),
            ),
          );
        }),
        catchError(() => of(null)),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result === null) {
          this.error.set(true);
          this.items.set([]);
          return;
        }
        this.items.set(result);
      });
  }

  private toBoardItems(
    notices: Notice[],
    shopNames: Map<string, string>,
  ): NoticeBoardItem[] {
    return notices.map((notice) => ({
      id: notice.id,
      storeId: notice.store_id,
      shopName: shopNames.get(notice.store_id)?.trim() || '',
      message: notice.message.trim(),
      updatedAt: notice.updated_at || notice.created_at,
    }));
  }
}
