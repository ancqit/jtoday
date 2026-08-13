import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { Notice } from '../models/notice.model';
import { ApiService } from './api.service';
import { SKIP_SESSION_AUTH } from './http-context';

/**
 * junctionBack notice reads (https://github.com/ancqit/junctionBack).
 * GET /notices/today?store_id= — public; do not send session JWT (main rejects it).
 */
@Injectable({ providedIn: 'root' })
export class NoticesApi {
  private readonly api = inject(ApiService);
  private readonly publicContext = new HttpContext().set(SKIP_SESSION_AUTH, true);

  todayForShop(storeId: string): Observable<Notice | null> {
    const trimmed = storeId.trim();
    if (!trimmed) {
      return of(null);
    }

    return this.api
      .get<Notice>(
        '/notices/today',
        { store_id: trimmed },
        { context: this.publicContext },
      )
      .pipe(catchError(() => of(null)));
  }
}
