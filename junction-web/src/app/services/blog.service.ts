import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  BlogApi,
  BlogAuthorInput,
  BlogCommentCreateInput,
  BlogCommentOwnerInput,
  BlogEntryCreateInput,
} from '../core/blog.api';
import { BlogEntry, BlogShopIdentity } from '../models/blog.model';
import { ServiceScope, UserProfile } from '../models/location.model';

@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly blogApi = inject(BlogApi);

  /** Load blogs for the active locality or city Junction. */
  listForJunction(profile: UserProfile, scope: ServiceScope): Observable<BlogEntry[]> {
    const city = profile.city.name.trim();
    const locality = profile.locality.name.trim();
    const query = scope === 'city' ? city : `${locality}, ${city}`;

    return this.blogApi.listForQuery(query).pipe(
      map((entries) => entries.filter((entry) => this.matchesScope(entry, city, locality, scope))),
    );
  }

  createEntry(input: BlogEntryCreateInput): Observable<BlogEntry> {
    return this.blogApi.createEntry({
      ...input,
      junction: input.junction.trim(),
      body: input.body.trim(),
      creatorName: input.creatorName.trim(),
      creatorNumber: input.creatorNumber.trim(),
      nameTag: input.nameTag.trim(),
      tags: input.tags ?? [],
      authorKind: input.authorKind ?? 'person',
      shopId: input.shopId ?? null,
    });
  }

  addComment(blogNumber: number, input: BlogCommentCreateInput): Observable<BlogEntry> {
    return this.blogApi.addComment(blogNumber, {
      body: input.body.trim(),
      creatorName: input.creatorName.trim(),
      creatorNumber: input.creatorNumber.trim(),
      nameTag: input.nameTag.trim(),
      authorKind: input.authorKind ?? 'person',
      shopId: input.shopId ?? null,
    });
  }

  updateComment(
    blogNumber: number,
    commentId: string,
    body: string,
    owner: BlogCommentOwnerInput,
  ): Observable<BlogEntry> {
    return this.blogApi.updateComment(blogNumber, commentId, body.trim(), owner);
  }

  deleteComment(
    blogNumber: number,
    commentId: string,
    owner: BlogCommentOwnerInput,
  ): Observable<BlogEntry> {
    return this.blogApi.deleteComment(blogNumber, commentId, owner);
  }

  verifyShopPhone(phoneNumber: string): Observable<BlogShopIdentity> {
    return this.blogApi.verifyShopPhone(phoneNumber.trim());
  }

  /** Default junction string for create form. */
  defaultJunction(profile: UserProfile, scope: ServiceScope): string {
    const city = profile.city.name.trim();
    const locality = profile.locality.name.trim();
    return scope === 'city' ? city : `${locality}, ${city}`;
  }

  /** Build person identity from the junction.today profile. */
  personIdentityFromProfile(profile: UserProfile): BlogAuthorInput | null {
    const creatorName = profile.name.trim();
    if (!creatorName) {
      return null;
    }

    const digits = (profile.phoneNumber ?? '').replace(/\D/g, '');
    const creatorNumber = digits.slice(-4) || '0000';
    const slug =
      creatorName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 16) || 'user';

    return {
      creatorName,
      creatorNumber,
      nameTag: `${slug}#${creatorNumber}`,
      authorKind: 'person',
      shopId: null,
    };
  }

  /** @deprecated use personIdentityFromProfile */
  commentIdentityFromProfile(profile: UserProfile): BlogCommentCreateInput | null {
    const identity = this.personIdentityFromProfile(profile);
    if (!identity) {
      return null;
    }
    return { ...identity, body: '' };
  }

  shopIdentityFromLookup(shop: BlogShopIdentity): BlogAuthorInput {
    return {
      creatorName: shop.creator_name,
      creatorNumber: shop.creator_number,
      nameTag: shop.name_tag,
      authorKind: 'shop',
      shopId: shop.shop_id,
    };
  }

  private matchesScope(
    entry: BlogEntry,
    city: string,
    locality: string,
    scope: ServiceScope,
  ): boolean {
    const junction = entry.junction.trim().toLowerCase();
    const cityKey = city.toLowerCase();
    const localityKey = locality.toLowerCase();

    if (scope === 'city') {
      return junction === cityKey || junction.endsWith(`, ${cityKey}`) || junction.includes(cityKey);
    }

    const exact = `${localityKey}, ${cityKey}`;
    return junction === exact || (junction.includes(localityKey) && junction.includes(cityKey));
  }
}
