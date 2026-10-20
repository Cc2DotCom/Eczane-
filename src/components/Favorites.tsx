import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { radius, useTheme } from '../theme';
import type { PharmacyWithDistance } from '../types';
import { formatDistance } from '../utils/geo';
import { PressableScale } from './motion';

type Props = {
  names: string[];
  pharmacies: PharmacyWithDistance[];
  heroId: string;
  onSelect: (id: string) => void;
  onToggle: (name: string) => void;
};

/**
 * Sık gidilen eczaneler. Nöbet her gün değiştiği için favoriler ada göre tutulur;
 * bugün nöbetçi olanlar öne çıkar, olmayanlar sakin bir yazıyla gösterilir.
 */
export function Favorites({ names, pharmacies, heroId, onSelect, onToggle }: Props) {
  const t = useTheme();

  if (names.length === 0) {
    return (
      <View style={[styles.hint, { backgroundColor: t.warmSoft }]}>
        <Ionicons name="star-outline" size={16} color={t.warm} />
        <Text style={[styles.hintText, { color: t.text }]}>
          Sık gittiğin eczaneyi yıldızla. Nöbetçi olduğu gün burada “Favorilerim” altında görürsün.
        </Text>
      </View>
    );
  }

  const rows = names
    .map((name) => ({ name, onDuty: pharmacies.find((p) => p.name === name) }))
    .sort((a, b) => Number(!!b.onDuty) - Number(!!a.onDuty));

  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.section, { color: t.textMuted }]}>Favorilerim</Text>
      {rows.map(({ name, onDuty }) => (
        <PressableScale
          key={name}
          disabled={!onDuty}
          onPress={() => onDuty && onSelect(onDuty.id)}
          style={[
            styles.row,
            { backgroundColor: onDuty ? t.warmSoft : t.cardMuted, borderColor: onDuty?.id === heroId ? t.warm : t.border },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: onDuty ? t.text : t.textMuted }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.status, { color: onDuty ? t.warm : t.textMuted }]}>
              {onDuty
                ? `Bugün nöbetçi${onDuty.distanceKm != null ? ` · ${formatDistance(onDuty.distanceKm)}` : ''}`
                : 'Bugün nöbetçi değil'}
            </Text>
          </View>
          <PressableScale
            onPress={() => onToggle(name)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`${name} favorilerden çıkar`}
          >
            <Ionicons name="star" size={20} color={t.warm} />
          </PressableScale>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, marginTop: 6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  status: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.sm },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
