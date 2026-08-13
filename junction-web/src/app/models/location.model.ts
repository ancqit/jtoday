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

export interface UserProfile {
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  authenticated?: boolean;
  city: City;
  locality: Locality;
}

export type ProfileLevel = 'created' | 'contact' | 'authenticated';
