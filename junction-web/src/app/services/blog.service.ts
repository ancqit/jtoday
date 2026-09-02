import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BlogApi, BlogCommentCreateInput } from '../core/blog.api';
import { BlogEntry } from '../models/blog.model';
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

  addComment(blogNumber: number, input: BlogCommentCreateInput): Observable<BlogEntry> {
    return this.blogApi.addComment(blogNumber, {
      body: input.body.trim(),
      creatorName: input.creatorName.trim(),
      creatorNumber: input.creatorNumber.trim(),
      nameTag: input.nameTag.trim(),
    });
  }

  /** Build comment identity from the junction.today profile. */
  commentIdentityFromProfile(profile: UserProfile): BlogCommentCreateInput | null {
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
      body: '',
      creatorName,
      creatorNumber,
      nameTag: `${slug}#${creatorNumber}`,
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
