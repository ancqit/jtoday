export interface Coordinates {
  latitude: number;
  longitude: number;
}

const INDIA_CENTER: Coordinates = { latitude: 20.5937, longitude: 78.9629 };

const CITY_COORDINATES: Record<string, Coordinates> = {
  Mumbai: { latitude: 19.076, longitude: 72.8777 },
  Delhi: { latitude: 28.6139, longitude: 77.209 },
  Bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  Chennai: { latitude: 13.0827, longitude: 80.2707 },
  Kolkata: { latitude: 22.5726, longitude: 88.3639 },
  Hyderabad: { latitude: 17.385, longitude: 78.4867 },
  Pune: { latitude: 18.5204, longitude: 73.8567 },
  Ranchi: { latitude: 23.3441, longitude: 85.3096 },
};

const LOCALITY_COORDINATES: Record<string, Record<string, Coordinates>> = {
  Mumbai: {
    'Andheri West': { latitude: 19.1197, longitude: 72.8468 },
    Bandra: { latitude: 19.0596, longitude: 72.8295 },
    Dadar: { latitude: 19.0178, longitude: 72.8478 },
    Powai: { latitude: 19.1176, longitude: 72.906 },
    Colaba: { latitude: 18.9067, longitude: 72.8147 },
  },
  Delhi: {
    'Connaught Place': { latitude: 28.6315, longitude: 77.2167 },
    'Karol Bagh': { latitude: 28.6519, longitude: 77.1909 },
    Saket: { latitude: 28.5244, longitude: 77.2066 },
    Dwarka: { latitude: 28.5921, longitude: 77.046 },
    Rohini: { latitude: 28.7495, longitude: 77.0565 },
  },
  Bengaluru: {
    Indiranagar: { latitude: 12.9784, longitude: 77.6408 },
    Koramangala: { latitude: 12.9352, longitude: 77.6245 },
    Whitefield: { latitude: 12.9698, longitude: 77.75 },
    Jayanagar: { latitude: 12.925, longitude: 77.5938 },
    'MG Road': { latitude: 12.975, longitude: 77.6063 },
  },
  Chennai: {
    'T Nagar': { latitude: 13.0418, longitude: 80.2341 },
    'Anna Nagar': { latitude: 13.085, longitude: 80.2101 },
    Adyar: { latitude: 13.0067, longitude: 80.2572 },
    Velachery: { latitude: 12.9815, longitude: 80.218 },
    Mylapore: { latitude: 13.0368, longitude: 80.2676 },
  },
  Kolkata: {
    'Salt Lake': { latitude: 22.5868, longitude: 88.4125 },
    'Park Street': { latitude: 22.5512, longitude: 88.3535 },
    Ballygunge: { latitude: 22.5335, longitude: 88.3654 },
    Howrah: { latitude: 22.5958, longitude: 88.2636 },
    'New Town': { latitude: 22.6246, longitude: 88.459 },
  },
  Hyderabad: {
    'Banjara Hills': { latitude: 17.4156, longitude: 78.4347 },
    Gachibowli: { latitude: 17.4401, longitude: 78.3489 },
    'Hitech City': { latitude: 17.4435, longitude: 78.3772 },
    Secunderabad: { latitude: 17.4399, longitude: 78.4983 },
    Madhapur: { latitude: 17.4486, longitude: 78.3908 },
  },
  Pune: {
    'Koregaon Park': { latitude: 18.5362, longitude: 73.8958 },
    Hinjewadi: { latitude: 18.5912, longitude: 73.7389 },
    Kothrud: { latitude: 18.5074, longitude: 73.8077 },
    'Viman Nagar': { latitude: 18.5679, longitude: 73.9143 },
    Camp: { latitude: 18.5204, longitude: 73.8787 },
  },
  Ranchi: {
    Lalpur: { latitude: 23.3706, longitude: 85.3392 },
    Morabadi: { latitude: 23.3838, longitude: 85.334 },
    Bariatu: { latitude: 23.3967, longitude: 85.3289 },
    Doranda: { latitude: 23.3441, longitude: 85.3096 },
    'Ashok Nagar': { latitude: 23.3587, longitude: 85.3158 },
  },
};

export function slugifyLocationName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function resolveCityCoordinates(cityName: string): Coordinates {
  return CITY_COORDINATES[cityName] ?? INDIA_CENTER;
}

export function resolveLocalityCoordinates(cityName: string, localityName: string): Coordinates {
  return LOCALITY_COORDINATES[cityName]?.[localityName] ?? resolveCityCoordinates(cityName);
}
