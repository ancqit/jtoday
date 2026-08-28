export interface City {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface Locality {
  id: string;
  cityId: string;
  name: string;
  latitude: number;
  longitude: number;
}

/** Locality junction vs city-wide services listing. */
export type ServiceScope = 'locality' | 'city';

export interface UserProfile {
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  authenticated?: boolean;
  city: City;
  locality: Locality;
  serviceScope?: ServiceScope;
}

export type ProfileLevel = 'created' | 'contact' | 'authenticated';
