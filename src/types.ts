export type Coords = { latitude: number; longitude: number };

export type Pharmacy = {
  id: string;
  name: string;
  district: string;
  address: string;
  phone: string;
  coords: Coords | null;
};

export type PharmacyWithDistance = Pharmacy & { distanceKm: number | null };

export type Area = { city: string; district?: string };

export type DutyResult = {
  pharmacies: Pharmacy[];
  source: 'remote' | 'demo';
  fetchedAt: number;
  /** Listenin ait olduğu nöbet günü (YYYY-AA-GG). */
  dutyDay: string;
};
