export type Coords = { latitude: number; longitude: number };

export type Pharmacy = {
  id: string;
  name: string;
  district: string;
  address: string;
  phone: string;
  coords: Coords | null;
  /** Nöbet başlangıç/bitiş zamanı, ISO biçiminde (ör. 2026-10-20T19:00:00+03:00). */
  dutyStart?: string | null;
  dutyEnd?: string | null;
};

export type PharmacyWithDistance = Pharmacy & { distanceKm: number | null };

export type Area = { city: string; district?: string };

export type DutyResult = {
  pharmacies: Pharmacy[];
  source: 'remote' | 'demo';
  fetchedAt: number;
  /** Listenin ait olduğu nöbet günü (YYYY-AA-GG). */
  dutyDay: string;
  /** İnternete ulaşılamadı, telefonda kayıtlı son liste gösteriliyor. */
  offline?: boolean;
  /** Liste e-Devlet yerine başka bir resmi kaynaktan (ilin eczacı odası) geldiyse onun adı. */
  origin?: string;
  /** Seçilen ilçede bugün nöbetçi yok; ilin tüm nöbetçileri gösteriliyor. */
  districtMissing?: boolean;
};
