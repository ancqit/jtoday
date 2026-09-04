import { Component, effect, inject, output, signal } from '@angular/core';
import { catchError, map, of, switchMap } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Notice } from '../../models/notice.model';
import { CatalogService } from '../../services/catalog.service';
import { NOTICE_BOARD_FIFO_MAX, NoticesService } from '../../services/notices.service';
import { UserSessionService } from '../../services/user-session.service';

interface ShopNoticeMeta {
  name: string;
  locality: string;
  city: string;
}

export interface NoticeBoardItem {
  id: string;
  storeId: string;
  shopName: string;
  locality: string;
  city: string;
  message: string;
  updatedAt: string;
}

@Component({
  selector: 'app-notice-board',
  imports: [TranslatePipe],
  templateUrl: './notice-board.component.html',
  styleUrl: './notice-board.component.scss',
})
export class NoticeBoardComponent {
  private readonly notices = inject(NoticesService);
  private readonly catalog = inject(CatalogService);
  private readonly session = inject(UserSessionService);

  readonly closed = output<void>();
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

  closePanel(): void {
    this.closed.emit();
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
          const shopMeta = new Map<string, ShopNoticeMeta>(
            shops.map((shop) => [
              shop.id,
              {
                name: shop.name?.trim() || '',
                locality: shop.locality?.trim() || '',
                city: shop.city?.trim() || '',
              },
            ]),
          );
          const localIds = new Set(shops.map((shop) => shop.id));

          return this.notices.listTodayFifo(NOTICE_BOARD_FIFO_MAX).pipe(
            map((all) => {
              const local = all.filter((notice) => localIds.has(notice.store_id));
              const queue =
                local.length > 0
                  ? this.notices.toFifoQueue(local, NOTICE_BOARD_FIFO_MAX)
                  : all;
              return this.toBoardItems(queue, shopMeta);
            }),
            catchError(() =>
              this.notices.getTodayForShops([...localIds]).pipe(
                map((byShop) =>
                  this.toBoardItems(
                    this.notices.toFifoQueue(Object.values(byShop), NOTICE_BOARD_FIFO_MAX),
                    shopMeta,
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
    shopMeta: Map<string, ShopNoticeMeta>,
  ): NoticeBoardItem[] {
    return notices.map((notice) => {
      const meta = shopMeta.get(notice.store_id);
      return {
        id: notice.id,
        storeId: notice.store_id,
        shopName: meta?.name || '',
        locality: meta?.locality || '',
        city: meta?.city || '',
        message: notice.message.trim(),
        updatedAt: notice.updated_at || notice.created_at,
      };
    });
  }
}
