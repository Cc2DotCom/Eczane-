import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { radius, useTheme } from '../theme';
import type { PharmacyWithDistance } from '../types';
import { callPharmacy, openDirections, sharePlace } from '../utils/actions';
import { dutyWindow } from '../utils/duty';
import { formatDistance, travelHint } from '../utils/geo';
import { FadeIn, PressableScale } from './motion';

type Props = {
  pharmacy: PharmacyWithDistance;
  isNearest: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBackToNearest?: () => void;
};

export function HeroCard({ pharmacy: p, isNearest, isFavorite, onToggleFavorite, onBackToNearest }: Props) {
  const t = useTheme();
  return (
    // key ile her seçimde kart yeniden, yumuşakça belirir.
    <FadeIn key={p.id} offset={10}>
      <LinearGradient
        colors={[t.primarySoft, t.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { shadowColor: t.shadow, borderColor: t.border }]}
      >
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: isNearest ? t.primary : t.warm }]}>
            <Ionicons name={isNearest ? 'navigate' : 'heart'} size={12} color={t.onPrimary} />
            <Text style={[styles.badgeText, { color: t.onPrimary }]}>
              {isNearest ? 'Sana en yakın' : 'Senin seçimin'}
            </Text>
          </View>
          <View style={styles.topIcons}>
            <PressableScale
              onPress={() =>
                sharePlace(p, ['Bugün nöbetçi eczane', dutyWindow(p.dutyStart, p.dutyEnd)].filter(Boolean).join(' · '))
              }
              hitSlop={12}
              scaleTo={0.85}
              accessibilityRole="button"
              accessibilityLabel="Eczaneyi paylaş"
            >
              <Ionicons name="share-social-outline" size={22} color={t.textMuted} />
            </PressableScale>
            <PressableScale
              onPress={onToggleFavorite}
              hitSlop={12}
              scaleTo={0.85}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            >
              <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={22} color={isFavorite ? t.warm : t.textMuted} />
            </PressableScale>
          </View>
        </View>

        <Text style={[styles.name, { color: t.text }]} numberOfLines={2}>
          {p.name}
        </Text>
        <Text style={[styles.district, { color: t.textMuted }]}>{p.district}</Text>

        {p.distanceKm != null && (
          <View style={styles.distanceRow}>
            <Text style={[styles.distance, { color: t.primary }]}>{formatDistance(p.distanceKm)}</Text>
            <Text style={[styles.hint, { color: t.textMuted }]}>{travelHint(p.distanceKm)}</Text>
          </View>
        )}

        {!!dutyWindow(p.dutyStart, p.dutyEnd) && (
          <View style={styles.addressRow}>
            <Ionicons name="time-outline" size={16} color={t.textMuted} />
            <Text style={[styles.address, { color: t.text }]}>Nöbet saatleri: {dutyWindow(p.dutyStart, p.dutyEnd)}</Text>
          </View>
        )}

        {!!p.address && (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color={t.textMuted} />
            <Text style={[styles.address, { color: t.text }]}>{p.address}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <PressableScale
            onPress={() => openDirections(p)}
            containerStyle={{ flex: 1 }}
            style={[styles.primaryBtn, { backgroundColor: t.primary }]}
            accessibilityRole="button"
            accessibilityLabel={`${p.name} için yol tarifi`}
          >
            <Ionicons name="navigate-outline" size={18} color={t.onPrimary} />
            <Text style={[styles.primaryText, { color: t.onPrimary }]}>Yol tarifi</Text>
          </PressableScale>
          {!!p.phone && (
            <PressableScale
              onPress={() => callPharmacy(p)}
              style={[styles.secondaryBtn, { backgroundColor: t.card, borderColor: t.border }]}
              accessibilityRole="button"
              accessibilityLabel={`${p.name} eczanesini ara`}
            >
              <Ionicons name="call-outline" size={18} color={t.primary} />
              <Text style={[styles.secondaryText, { color: t.primary }]}>Ara</Text>
            </PressableScale>
          )}
        </View>

        {!isNearest && onBackToNearest && (
          <PressableScale onPress={onBackToNearest} style={styles.back}>
            <Text style={[styles.backText, { color: t.textMuted }]}>En yakına dön</Text>
          </PressableScale>
        )}
      </LinearGradient>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 22,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  topIcons: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  badgeText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  name: { fontSize: 26, fontWeight: '700', marginTop: 16, letterSpacing: -0.4 },
  district: { fontSize: 15, marginTop: 2 },
  distanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 14 },
  distance: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8 },
  hint: { fontSize: 14 },
  addressRow: { flexDirection: 'row', gap: 6, marginTop: 12, alignItems: 'flex-start' },
  address: { flex: 1, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  primaryBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: radius.md },
  primaryText: { fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 50, paddingHorizontal: 20, borderRadius: radius.md, borderWidth: 1 },
  secondaryText: { fontSize: 16, fontWeight: '600' },
  back: { alignSelf: 'center', marginTop: 14, padding: 4 },
  backText: { fontSize: 13, textDecorationLine: 'underline' },
});
