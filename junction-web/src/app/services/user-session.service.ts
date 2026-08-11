import { Injectable, computed, signal } from '@angular/core';
import { City, Locality, UserProfile } from '../models/location.model';

@Injectable({ providedIn: 'root' })
export class UserSessionService {
  private readonly profile = signal<UserProfile | null>(null);
  private readonly welcomeComplete = signal(false);

  readonly userProfile = this.profile.asReadonly();
  readonly hasCompletedWelcome = this.welcomeComplete.asReadonly();
  readonly displayName = computed(() => this.profile()?.name ?? '');
  readonly junctionLabel = computed(() => {
    const profile = this.profile();
    if (!profile) {
      return '';
    }

    return `${profile.locality.name}, ${profile.city.name}`;
  });

  readonly junctionKey = computed(() => {
    const profile = this.profile();
    if (!profile) {
      return null;
    }

    return `${profile.city.id}:${profile.locality.id}`;
  });

  completeWelcome(name: string, city: City, locality: Locality): void {
    this.profile.set({ name: name.trim(), city, locality });
    this.welcomeComplete.set(true);
  }

  updateCity(city: City, locality: Locality): void {
    const current = this.profile();
    if (!current) {
      return;
    }

    this.profile.set({ ...current, city, locality });
  }

  updateLocality(locality: Locality): void {
    const current = this.profile();
    if (!current) {
      return;
    }

    this.profile.set({ ...current, locality });
  }
}
