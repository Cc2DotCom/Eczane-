import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { radius, useTheme } from '../theme';
import type { PharmacyWithDistance } from '../types';
import { formatDistance } from '../utils/geo';
import { PressableScale } from './motion';

type Props = {
  pharmacy: PharmacyWithDistance;
  selected: boolean;
  favorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
};

export function PharmacyRow({ pharmacy: p, selected, favorite, onPress, onToggleFavorite }: Props) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.row,
        { backgroundColor: selected ? t.primarySoft : t.card, borderColor: selected ? t.primary : t.border },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: selected ? t.primary : t.bgAccent }]}>
        <Ionicons name="medkit-outline" size={18} color={selected ? t.onPrimary : t.primary} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {p.name}
        </Text>
        <Text style={[styles.sub, { color: t.textMuted }]} numberOfLines={1}>
          {p.address || p.district}
        </Text>
      </View>
      <View style={styles.right}>
        {p.distanceKm != null && (
          <Text style={[styles.distance, { color: selected ? t.primary : t.text }]}>{formatDistance(p.distanceKm)}</Text>
        )}
        <PressableScale onPress={onToggleFavorite} hitSlop={10} scaleTo={0.8}>
          <Ionicons name={favorite ? 'star' : 'star-outline'} size={18} color={favorite ? t.warm : t.textMuted} />
        </PressableScale>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  distance: { fontSize: 14, fontWeight: '600' },
});
