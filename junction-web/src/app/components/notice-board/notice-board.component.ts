import { Component, OnInit, inject, output, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Notice } from '../../models/notice.model';
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
 * Junction-agnostic — does not reload or filter when the user changes locality/city.
 */
@Component({
  selector: 'app-notice-board',
  imports: [TranslatePipe],
  templateUrl: './notice-board.component.html',
  styleUrl: './notice-board.component.scss',
})
export class NoticeBoardComponent implements OnInit {
  private readonly notices = inject(NoticesService);

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
      .listTodayFifo(NOTICE_BOARD_FIFO_MAX)
      .pipe(catchError(() => of(null)))
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
