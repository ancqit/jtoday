import { Injectable, computed, signal } from '@angular/core';
import { City, Locality, ProfileLevel, ServiceScope, UserProfile } from '../models/location.model';

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

    if ((profile.serviceScope ?? 'locality') === 'city') {
      return profile.city.name;
    }

    return `${profile.locality.name}, ${profile.city.name}`;
  });

  readonly servicesHeading = computed(() => {
    const profile = this.profile();
    if (!profile) {
      return 'Shops/Services';
    }

    if ((profile.serviceScope ?? 'locality') === 'city') {
      return `${profile.city.name} Junction`;
    }

    return `Shops/Services in ${profile.locality.name}`;
  });

  readonly serviceScope = computed<ServiceScope>(() => this.profile()?.serviceScope ?? 'locality');

  readonly junctionKey = computed(() => {
    const profile = this.profile();
    if (!profile) {
      return null;
    }

    const scope = profile.serviceScope ?? 'locality';
    if (scope === 'city') {
      return `${profile.city.id}:city`;
    }

    return `${profile.city.id}:${profile.locality.id}`;
  });

  constructor() {
    this.restoreProfile();
  }

  completeWelcome(name: string, city: City, locality: Locality, serviceScope: ServiceScope = 'locality'): void {
    const existing = this.profile();
    this.profile.set({
      name: name.trim(),
      email: existing?.email,
      phoneNumber: existing?.phoneNumber,
      authenticated: existing?.authenticated ?? false,
      city,
      locality,
      serviceScope,
    });
    this.welcomeComplete.set(true);
    this.persistProfile();
  }

  completeCityServices(name: string, city: City): void {
    const cityWideLocality: Locality = {
      id: `city-wide-${city.id}`,
      cityId: city.id,
      name: 'City-wide',
      latitude: city.latitude,
      longitude: city.longitude,
    };

    this.completeWelcome(name, city, cityWideLocality, 'city');
  }

  updateServiceScope(serviceScope: ServiceScope, locality?: Locality): void {
    const current = this.profile();
    if (!current) {
      return;
    }

    this.profile.set({
      ...current,
      serviceScope,
      locality: locality ?? current.locality,
    });
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

  updateCity(city: City, locality: Locality, serviceScope: ServiceScope = 'locality'): void {
    const current = this.profile();
    if (!current) {
      return;
    }

    this.profile.set({ ...current, city, locality, serviceScope });
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
