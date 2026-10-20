import * as Haptics from 'expo-haptics';
import { Linking, Platform } from 'react-native';
import type { Pharmacy } from '../types';

export async function openDirections(p: Pharmacy) {
  Haptics.selectionAsync().catch(() => {});
  const label = encodeURIComponent(p.name);
  const query = p.coords ? `${p.coords.latitude},${p.coords.longitude}` : encodeURIComponent(p.address);
  const native =
    Platform.OS === 'ios'
      ? `maps:?daddr=${query}&q=${label}`
      : p.coords
        ? `geo:0,0?q=${query}(${label})`
        : `geo:0,0?q=${query}`;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  try {
    await Linking.openURL(native);
  } catch {
    await Linking.openURL(web);
  }
}

export function callPharmacy(p: Pharmacy) {
  Haptics.selectionAsync().catch(() => {});
  const digits = p.phone.replace(/[^\d+]/g, '');
  if (digits) Linking.openURL(`tel:${digits}`);
}
