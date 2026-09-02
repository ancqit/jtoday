import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BlogApi } from '../core/blog.api';
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
