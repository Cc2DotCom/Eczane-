import type { Area, Coords, Pharmacy } from '../types';

/**
 * API anahtarı yokken arayüzü denemek için: kullanıcının çevresine
 * o güne özel, sabit (deterministik) sahte nöbetçi eczaneler yerleştirir.
 */
const NAMES = ['Şifa', 'Hayat', 'Deniz', 'Yeşil', 'Güneş', 'Lale', 'Papatya', 'Nur', 'Merkez', 'Umut', 'Ada', 'Çınar'];
const STREETS = ['Bağdat Cd.', 'Atatürk Blv.', 'Cumhuriyet Cd.', 'Gül Sk.', 'İnönü Cd.', 'Lale Sk.', 'Okul Sk.'];

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function demoPharmacies(area: Area, center: Coords | null, dayKey: string): Pharmacy[] {
  const c = center ?? { latitude: 41.0082, longitude: 28.9784 };
  const seed = [...dayKey + area.city].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
  const rnd = seeded(Math.abs(seed));
  const count = 6 + Math.floor(rnd() * 4);
  return Array.from({ length: count }, (_, i) => {
    const angle = rnd() * Math.PI * 2;
    const km = 0.3 + rnd() * (i < 2 ? 1.5 : 7);
    const coords = {
      latitude: c.latitude + (km / 111) * Math.cos(angle),
      longitude: c.longitude + (km / (111 * Math.cos((c.latitude * Math.PI) / 180))) * Math.sin(angle),
    };
    const name = NAMES[Math.floor(rnd() * NAMES.length)];
    return {
      id: `demo-${dayKey}-${i}`,
      name: `${name} Eczanesi`,
      district: area.district ?? area.city,
      address: `${STREETS[Math.floor(rnd() * STREETS.length)]} No:${1 + Math.floor(rnd() * 120)}, ${area.district ?? area.city}`,
      phone: `0${212 + Math.floor(rnd() * 4)} ${100 + Math.floor(rnd() * 899)} ${10 + Math.floor(rnd() * 89)} ${10 + Math.floor(rnd() * 89)}`,
      coords,
    };
  });
}
