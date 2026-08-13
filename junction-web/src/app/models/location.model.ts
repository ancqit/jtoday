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
  city: City;
  locality: Locality;
}
