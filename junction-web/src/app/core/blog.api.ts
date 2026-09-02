import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { BlogAuthorKind, BlogEntry, BlogShopIdentity } from '../models/blog.model';
import { ApiService } from './api.service';
import { SKIP_SESSION_AUTH } from './http-context';

export interface BlogAuthorInput {
  creatorName: string;
  creatorNumber: string;
  nameTag: string;
  authorKind?: BlogAuthorKind;
  shopId?: string | null;
}

export interface BlogCommentCreateInput extends BlogAuthorInput {
  body: string;
}

export interface BlogEntryCreateInput extends BlogAuthorInput {
  junction: string;
  body: string;
  tags?: string[];
}

export interface BlogCommentOwnerInput {
  creatorNumber: string;
  nameTag: string;
}

/**
 * junctionBack blog API (https://github.com/ancqit/junctionBack).
 * Public reads/comments — do not require session JWT.
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

  createEntry(input: BlogEntryCreateInput): Observable<BlogEntry> {
    return this.api
      .post<BlogEntry>('/blog/entries', input, { context: this.publicContext })
      .pipe(catchError((error) => throwError(() => error)));
  }

  addComment(blogNumber: number, input: BlogCommentCreateInput): Observable<BlogEntry> {
    return this.api
      .post<BlogEntry>(`/blog/entries/${blogNumber}/comments`, input, {
        context: this.publicContext,
      })
      .pipe(catchError((error) => throwError(() => error)));
  }

  updateComment(
    blogNumber: number,
    commentId: string,
    body: string,
    owner: BlogCommentOwnerInput,
  ): Observable<BlogEntry> {
    return this.api
      .patch<BlogEntry>(
        `/blog/entries/${blogNumber}/comments/${commentId}`,
        { body, ...owner },
        { context: this.publicContext },
      )
      .pipe(catchError((error) => throwError(() => error)));
  }

  deleteComment(
    blogNumber: number,
    commentId: string,
    owner: BlogCommentOwnerInput,
  ): Observable<BlogEntry> {
    return this.api
      .delete<BlogEntry>(`/blog/entries/${blogNumber}/comments/${commentId}`, owner, {
        context: this.publicContext,
      })
      .pipe(catchError((error) => throwError(() => error)));
  }

  verifyShopPhone(phoneNumber: string): Observable<BlogShopIdentity> {
    return this.api
      .post<BlogShopIdentity>(
        '/blog/verify-shop-phone',
        { phone_number: phoneNumber },
        { context: this.publicContext },
      )
      .pipe(catchError((error) => throwError(() => error)));
  }
}
