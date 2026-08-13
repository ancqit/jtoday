import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { Notice } from '../models/notice.model';
import { ApiService } from './api.service';

/**
 * junctionBack notice reads (https://github.com/ancqit/junctionBack).
 * - GET /notices — today's notices (session or user JWT)
 * - GET /notices/today?shop_id= — one shop (public; store_id alias works)
 */
@Injectable({ providedIn: 'root' })
export class NoticesApi {
  private readonly api = inject(ApiService);

  listToday(): Observable<Notice[]> {
    return this.api.get<Notice[]>('/notices').pipe(catchError(() => of([])));
  }

  todayForShop(shopId: string): Observable<Notice | null> {
    const trimmed = shopId.trim();
    if (!trimmed) {
      return of(null);
    }

    return this.api
      .get<Notice>('/notices/today', { shop_id: trimmed })
      .pipe(catchError(() => of(null)));
  }
}
