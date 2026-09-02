import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { BlogEntry } from '../models/blog.model';
import { ApiService } from './api.service';
import { SKIP_SESSION_AUTH } from './http-context';

/**
 * junctionBack blog reads (https://github.com/ancqit/junctionBack).
 * GET /blog/entries?q= — public; do not require session JWT.
 */
@Injectable({ providedIn: 'root' })
export class BlogApi {
  private readonly api = inject(ApiService);
  private readonly publicContext = new HttpContext().set(SKIP_SESSION_AUTH, true);

  listForQuery(query: string): Observable<BlogEntry[]> {
    const q = query.trim();
    if (!q) {
      return of([]);
    }

    return this.api
      .get<BlogEntry[]>('/blog/entries', { q }, { context: this.publicContext })
      .pipe(
        map((entries) => (Array.isArray(entries) ? entries : [])),
        catchError(() => of([])),
      );
  }
}
