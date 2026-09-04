import { Component, DestroyRef, OnInit, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Notice } from '../../models/notice.model';
import { NoticesStore } from '../../stores/notices.store';
import { ShopsCatalogStore } from '../../stores/shops-catalog.store';

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
 * Global notice board backed by {@link NoticesStore}.
 * Shows cached FIFO immediately; API refresh updates the store and view.
 */
@Component({
  selector: 'app-notice-board',
  imports: [TranslatePipe],
  templateUrl: './notice-board.component.html',
  styleUrl: './notice-board.component.scss',
})
export class NoticeBoardComponent implements OnInit {
  private readonly noticesStore = inject(NoticesStore);
  private readonly shopsStore = inject(ShopsCatalogStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly closed = output<void>();
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly items = signal<NoticeBoardItem[]>([]);

  ngOnInit(): void {
    const cached = this.noticesStore.snapshot;
    if (cached.length) {
      this.items.set(cached.map((notice) => this.toBoardItem(this.enrichOne(notice))));
      this.loading.set(false);
    } else {
      this.loading.set(true);
    }
    this.error.set(false);

    // Ensure shop meta is warm for enrichment.
    this.shopsStore.watchAllShops().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

    this.noticesStore
      .watch()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notices) => {
          this.loading.set(false);
          this.items.set(notices.map((notice) => this.toBoardItem(this.enrichOne(notice))));
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  closePanel(): void {
    this.closed.emit();
  }

  private enrichOne(notice: Notice): Notice {
    if (notice.shop_name?.trim() && notice.city?.trim() && notice.locality?.trim()) {
      return notice;
    }
    const shop = this.shopsStore.getAllShopsSnapshot().find((row) => row.id === notice.store_id);
    if (!shop) {
      return notice;
    }
    return {
      ...notice,
      shop_name: notice.shop_name?.trim() || shop.name?.trim() || null,
      city: notice.city?.trim() || shop.city?.trim() || null,
      locality: notice.locality?.trim() || shop.locality?.trim() || null,
    };
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
