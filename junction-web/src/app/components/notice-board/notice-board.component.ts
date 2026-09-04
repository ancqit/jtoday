import { Component, OnInit, inject, output, signal } from '@angular/core';
import { catchError, map, of, switchMap } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Notice } from '../../models/notice.model';
import { CatalogService } from '../../services/catalog.service';
import { NOTICE_BOARD_FIFO_MAX, NoticesService } from '../../services/notices.service';

export interface NoticeBoardItem {
  id: string;
  storeId: string;
  shopName: string;
  locality: string;
  city: string;
  message: string;
  updatedAt: string;
}

/**
 * Global notice board: GET /notices (public), FIFO max 20.
 * Junction-agnostic. Shop name/place come from the notice payload when present,
 * otherwise enriched from the shop catalog by store_id.
 */
@Component({
  selector: 'app-notice-board',
  imports: [TranslatePipe],
  templateUrl: './notice-board.component.html',
  styleUrl: './notice-board.component.scss',
})
export class NoticeBoardComponent implements OnInit {
  private readonly notices = inject(NoticesService);
  private readonly catalog = inject(CatalogService);

  readonly closed = output<void>();
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly items = signal<NoticeBoardItem[]>([]);

  private loaded = false;

  ngOnInit(): void {
    this.loadNotices();
  }

  closePanel(): void {
    this.closed.emit();
  }

  private loadNotices(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    this.loading.set(true);
    this.error.set(false);

    this.notices
      .listTodayFifo(NOTICE_BOARD_FIFO_MAX, true)
      .pipe(
        switchMap((notices) => this.enrichWithShopCatalog(notices)),
        catchError(() => of(null)),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result === null) {
          this.error.set(true);
          this.items.set([]);
          this.loaded = false;
          return;
        }
        this.items.set(result.map((notice) => this.toBoardItem(notice)));
      });
  }

  /** Fill missing shop_name / city / locality from GET /shops by store_id. */
  private enrichWithShopCatalog(notices: Notice[]) {
    const needsLookup = notices.some(
      (notice) =>
        !notice.shop_name?.trim() || !notice.city?.trim() || !notice.locality?.trim(),
    );
    if (!needsLookup || notices.length === 0) {
      return of(notices);
    }

    return this.catalog.getAllShops().pipe(
      map((shops) => {
        const byId = new Map(shops.map((shop) => [shop.id, shop]));
        return notices.map((notice) => {
          const shop = byId.get(notice.store_id);
          if (!shop) {
            return notice;
          }
          return {
            ...notice,
            shop_name: notice.shop_name?.trim() || shop.name?.trim() || null,
            city: notice.city?.trim() || shop.city?.trim() || null,
            locality: notice.locality?.trim() || shop.locality?.trim() || null,
          };
        });
      }),
      catchError(() => of(notices)),
    );
  }

  private toBoardItem(notice: Notice): NoticeBoardItem {
    return {
      id: notice.id,
      storeId: notice.store_id,
      shopName: notice.shop_name?.trim() || '',
      locality: notice.locality?.trim() || '',
      city: notice.city?.trim() || '',
      message: notice.message.trim(),
      updatedAt: notice.updated_at || notice.created_at,
    };
  }
}
