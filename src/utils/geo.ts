import type { Coords } from '../types';

export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number | null): string {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000 / 10) * 10} m`;
  return `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`;
}

/** Yürüme ~4.8 km/sa, araç şehir içi ~25 km/sa varsayımı. */
export function travelHint(km: number | null): string {
  if (km == null) return '';
  if (km <= 1.5) return `yürüyerek ~${Math.max(1, Math.round((km / 4.8) * 60))} dk`;
  return `araçla ~${Math.max(2, Math.round((km / 25) * 60))} dk`;
}
