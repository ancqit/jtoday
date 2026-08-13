import { Injectable, computed, signal } from '@angular/core';
import { City, Locality, ProfileLevel, UserProfile } from '../models/location.model';

const PROFILE_KEY = 'junction.today.profile';

interface StoredProfileState {
  profile: UserProfile;
  welcomeComplete: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserSessionService {
  private readonly profile = signal<UserProfile | null>(null);
  private readonly welcomeComplete = signal(false);

  readonly userProfile = this.profile.asReadonly();
  readonly hasCompletedWelcome = this.welcomeComplete.asReadonly();
  readonly displayName = computed(() => this.profile()?.name ?? '');
  readonly hasContactProfile = computed(() => {
    const profile = this.profile();
    return Boolean(profile?.email?.trim() && profile?.phoneNumber?.trim());
  });

  readonly profileLevel = computed<ProfileLevel | null>(() => {
    const profile = this.profile();
    if (!profile) {
      return null;
    }

    if (profile.authenticated) {
      return 'authenticated';
    }

    if (profile.email?.trim() && profile.phoneNumber?.trim()) {
      return 'contact';
    }

    return 'created';
  });

  readonly profileLevelLabel = computed(() => {
    switch (this.profileLevel()) {
      case 'authenticated':
        return 'Authenticated';
      case 'contact':
        return 'Contact added';
      case 'created':
        return 'Profile created';
      default:
        return '';
    }
  });

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

  constructor() {
    this.restoreProfile();
  }

  completeWelcome(name: string, city: City, locality: Locality): void {
    const existing = this.profile();
    this.profile.set({
      name: name.trim(),
      email: existing?.email,
      phoneNumber: existing?.phoneNumber,
      authenticated: existing?.authenticated ?? false,
      city,
      locality,
    });
    this.welcomeComplete.set(true);
    this.persistProfile();
  }

  updateContactProfile(email: string, phoneNumber: string): void {
    const current = this.profile();
    if (!current) {
      return;
    }

    this.profile.set({
      ...current,
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      authenticated: false,
    });
    this.persistProfile();
  }

  authenticateProfile(): void {
    const current = this.profile();
    if (!current || !current.email?.trim() || !current.phoneNumber?.trim()) {
      return;
    }

    this.profile.set({
      ...current,
      authenticated: true,
    });
    this.persistProfile();
  }

  updateCity(city: City, locality: Locality): void {
    const current = this.profile();
    if (!current) {
      return;
    }

    this.profile.set({ ...current, city, locality });
    this.persistProfile();
  }

  updateLocality(locality: Locality): void {
    const current = this.profile();
    if (!current) {
      return;
    }

    this.profile.set({ ...current, locality });
    this.persistProfile();
  }

  private persistProfile(): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }

    const state: StoredProfileState = {
      profile,
      welcomeComplete: this.welcomeComplete(),
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(state));
  }

  private restoreProfile(): void {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) {
        return;
      }

      const state = JSON.parse(raw) as StoredProfileState;
      if (state.profile) {
        this.profile.set(state.profile);
      }
      if (state.welcomeComplete) {
        this.welcomeComplete.set(true);
      }
    } catch {
      // Ignore invalid stored profile data.
    }
  }
}
