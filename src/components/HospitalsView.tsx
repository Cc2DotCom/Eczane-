import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { type HospitalWithDistance, useHospitals } from '../hooks/useHospitals';
import { radius, useTheme } from '../theme';
import type { Coords, Pharmacy } from '../types';
import { callPharmacy, openDirections, sharePlace } from '../utils/actions';
import { formatDistance, travelHint } from '../utils/geo';
import { FadeIn, PressableScale } from './motion';
import { EmergencyCardButton } from './EmergencyCard';
import { MapPanel } from './MapPanel';
import { LoadingSkeleton, Message } from './States';
import { ViewToggle } from './ViewToggle';

const KIND_LABEL = { devlet: 'Devlet hastanesi', ozel: 'Özel hastane', universite: 'Üniversite hastanesi' } as const;

/** Yol tarifi ve arama yardımcıları eczane biçimini beklediği için hastaneyi ona çeviririz. */
const asPlace = (h: HospitalWithDistance): Pharmacy => ({
  id: h.id,
  name: h.name,
  district: '',
  address: h.address,
  phone: h.phone,
  coords: { latitude: h.lat, longitude: h.lng },
});

function call112() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  Linking.openURL('tel:112');
}

export function EmergencyButton() {
  const t = useTheme();
  return (
    <PressableScale
      onPress={call112}
      accessibilityRole="button"
      accessibilityLabel="112 acil çağrı merkezini ara"
      style={[styles.emergency, { backgroundColor: t.danger }]}
    >
      <Ionicons name="call" size={20} color="#FFFFFF" />
      <View style={{ flex: 1 }}>
        <Text style={styles.emergencyTitle}>112 Acil'i ara</Text>
        <Text style={styles.emergencySub}>Hayati bir durumda önce burayı ara</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
    </PressableScale>
  );
}

function HospitalCard({ h, isNearest, fromArea }: { h: HospitalWithDistance; isNearest: boolean; fromArea?: string }) {
  const t = useTheme();
  return (
    <FadeIn key={h.id} offset={10}>
      <LinearGradient
        colors={[t.primarySoft, t.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { shadowColor: t.shadow, borderColor: t.border }]}
      >
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: t.primary }]}>
            <Ionicons name="navigate" size={12} color={t.onPrimary} />
            <Text style={[styles.badgeText, { color: t.onPrimary }]}>{!isNearest ? 'Senin seçimin' : fromArea ? 'Bu bölgede en yakın' : 'Sana yakın hastane'}</Text>
          </View>
          {h.emergency && (
            <View style={[styles.badge, { backgroundColor: t.dangerSoft }]}>
              <Ionicons name="medical" size={12} color={t.danger} />
              <Text style={[styles.badgeText, { color: t.danger }]}>Acil servis</Text>
            </View>
          )}
        </View>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={3}>
          {h.name}
        </Text>
        {!!h.kind && <Text style={[styles.sub, { color: t.textMuted }]}>{KIND_LABEL[h.kind]}</Text>}
        {h.emergency !== true && (
          <View style={[styles.erNote, { backgroundColor: t.warmSoft }]}>
            <Ionicons name="information-circle-outline" size={16} color={t.warm} />
            <Text style={[styles.erNoteText, { color: t.text }]}>
              {h.emergency === false
                ? 'Bu hastanede acil servis görünmüyor. Acil bir durumda 112\'yi ara.'
                : 'Acil servis bilgisi kayıtlı değil. Gitmeden önce aramanı ya da 112\'ye danışmanı öneririz.'}
            </Text>
          </View>
        )}
        <View style={styles.distanceRow}>
          <Text style={[styles.distance, { color: t.primary }]} numberOfLines={1}>{formatDistance(h.distanceKm)}</Text>
          <Text style={[styles.hint, { color: t.textMuted }]}>{fromArea ? `${fromArea} merkezine` : travelHint(h.distanceKm)}</Text>
        </View>
        {!!h.address && (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={16} color={t.textMuted} />
            <Text style={[styles.address, { color: t.text }]}>{h.address}</Text>
          </View>
        )}
        <View style={styles.actions}>
          <PressableScale
            onPress={() => openDirections(asPlace(h))}
            containerStyle={{ flex: 1 }}
            style={[styles.primaryBtn, { backgroundColor: t.primary }]}
            accessibilityRole="button"
            accessibilityLabel={`${h.name} için yol tarifi`}
          >
            <Ionicons name="navigate-outline" size={18} color={t.onPrimary} />
            <Text style={[styles.primaryText, { color: t.onPrimary }]}>Yol tarifi</Text>
          </PressableScale>
          <PressableScale
            onPress={() => sharePlace(asPlace(h), h.emergency ? 'Acil servis var' : undefined)}
            style={[styles.secondaryBtn, { backgroundColor: t.card, borderColor: t.border, paddingHorizontal: 16 }]}
            accessibilityRole="button"
            accessibilityLabel="Hastaneyi paylaş"
          >
            <Ionicons name="share-social-outline" size={18} color={t.primary} />
          </PressableScale>
          {!!h.phone && (
            <PressableScale
              onPress={() => callPharmacy(asPlace(h))}
              style={[styles.secondaryBtn, { backgroundColor: t.card, borderColor: t.border }]}
            >
              <Ionicons name="call-outline" size={18} color={t.primary} />
              <Text style={[styles.secondaryText, { color: t.primary }]}>Ara</Text>
            </PressableScale>
          )}
        </View>
      </LinearGradient>
    </FadeIn>
  );
}

function HospitalRow({ h, selected, onPress }: { h: HospitalWithDistance; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityState={{ selected }}
      style={[styles.listRow, { backgroundColor: selected ? t.primarySoft : t.card, borderColor: selected ? t.primary : t.border }]}
    >
      <View style={[styles.icon, { backgroundColor: h.emergency ? t.dangerSoft : t.bgAccent }]}>
        <Ionicons
          name={h.dental ? 'happy-outline' : h.emergency ? 'medical' : 'business-outline'}
          size={18}
          color={h.emergency ? t.danger : t.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowName, { color: t.text }]} numberOfLines={2}>
          {h.name}
        </Text>
        <Text style={[styles.rowSub, { color: t.textMuted }]} numberOfLines={1}>
          {[
            h.dental ? 'Ağız ve diş sağlığı' : h.emergency ? 'Acil servis var' : h.emergency === false ? 'Acil servis yok' : 'Acil durumu bilinmiyor',
            h.kind ? KIND_LABEL[h.kind] : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <Text style={[styles.rowDistance, { color: t.text }]}>{formatDistance(h.distanceKm)}</Text>
    </PressableScale>
  );
}

type Filter = 'tumu' | 'acil' | 'dis';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'tumu', label: 'Tümü' },
  { key: 'acil', label: 'Acil servisi olan' },
  { key: 'dis', label: 'Ağız ve diş' },
];

export function HospitalsView({
  coords,
  locating,
  areaLabel,
  onPicked,
}: {
  coords: Coords | null;
  locating: boolean;
  /** Bölge elle seçildiyse adı; mesafeler o bölgenin ortasından hesaplanır. */
  areaLabel?: string;
  onPicked?: () => void;
}) {
  const t = useTheme();
  const { general, emergencyOnly, dental, featured, loading, error, retry } = useHospitals(coords, true);
  const [filter, setFilter] = useState<Filter>('tumu');
  const list = filter === 'acil' ? emergencyOnly : filter === 'dis' ? dental : general;
  const [view, setView] = useState<'liste' | 'harita'>('liste');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const all = [...general, ...dental];
  const shown = all.find((h) => h.id === selectedId) ?? featured;
  const pick = (h: HospitalWithDistance) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedId(h.id === featured?.id ? null : h.id);
    onPicked?.();
  };

  let body: React.ReactNode;
  if (!coords && locating) body = <LoadingSkeleton />;
  else if (!coords)
    body = (
      <Message
        icon="location-outline"
        title={areaLabel ? 'Bu bölgenin konumu bulunamadı' : 'Konumuna ihtiyacımız var'}
        body={
          areaLabel
            ? `${areaLabel} için hastaneleri gösterebilmek için konum bilgisi gerekiyor. Konumunu kullanmayı ya da başka bir il seçmeyi deneyebilirsin.`
            : 'Sana en yakın hastaneleri gösterebilmek için konum izni gerekiyor. Ayarlardan konum iznini açabilirsin.'
        }
      />
    );
  else if (loading) body = <LoadingSkeleton />;
  else if (error) body = <Message icon="cloud-offline-outline" title="Şu an ulaşamadık" body={error} action="Tekrar dene" onAction={retry} />;
  else if (!featured)
    body = <Message icon="business-outline" title="Yakında hastane bulunamadı" body="60 km içinde kayıtlı bir hastane görünmüyor. Acil bir durumda 112'yi ara." />;
  else
    body = (
      <>
        <HospitalCard h={shown!} isNearest={shown?.id === featured.id} fromArea={areaLabel} />
        <FadeIn delay={160}>
          <View style={styles.sectionRow}>
            <Text style={[styles.section, { color: t.textMuted, flex: 1, marginTop: 0 }]}>Yakındaki hastaneler</Text>
            <ViewToggle value={view} onChange={setView} />
          </View>
          <View style={styles.chips}>
            {FILTERS.map((f) => {
              const active = f.key === filter;
              return (
                <PressableScale
                  key={f.key}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setFilter(f.key);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? t.primary : t.card, borderColor: active ? t.primary : t.border },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? t.onPrimary : t.text }]}>{f.label}</Text>
                </PressableScale>
              );
            })}
          </View>
        </FadeIn>
        {list.length === 0 && (
          <Text style={[styles.note, { color: t.textMuted, marginTop: 0 }]}>
            {filter === 'dis' ? 'Yakında kayıtlı bir ağız ve diş sağlığı merkezi görünmüyor.' : 'Bu grupta yakında kayıtlı hastane görünmüyor.'}
          </Text>
        )}
        {view === 'harita' ? (
          <MapPanel
            points={list.map((h) => ({ id: h.id, lat: h.lat, lng: h.lng, label: h.name, kind: h.emergency ? 'emergency' : 'hospital' }))}
            user={coords}
            selectedId={shown?.id}
            onSelect={(id) => {
              const h = list.find((x) => x.id === id);
              if (h) pick(h);
            }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {list.map((h, i) => (
              <FadeIn key={`${filter}-${h.id}`} delay={Math.min(i, 8) * 50}>
                <HospitalRow h={h} selected={h.id === shown?.id} onPress={() => pick(h)} />
              </FadeIn>
            ))}
          </View>
        )}
        <Text style={[styles.note, { color: t.textMuted }]}>
          Hastane bilgileri OpenStreetMap gönüllülerinden gelir; acil servis bilgisi her hastane için girilmemiş olabilir.
        </Text>
      </>
    );

  return (
    <View style={{ gap: 14 }}>
      <EmergencyButton />
      <EmergencyCardButton />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  emergency: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.md },
  emergencyTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  emergencySub: { color: '#FFFFFF', opacity: 0.9, fontSize: 13, marginTop: 2 },
  card: { borderRadius: radius.lg, padding: 22, borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  name: { fontSize: 24, fontWeight: '700', marginTop: 16, letterSpacing: -0.3 },
  sub: { fontSize: 15, marginTop: 2 },
  distanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 14 },
  distance: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8, flexShrink: 0 },
  hint: { fontSize: 14, flex: 1 },
  row: { flexDirection: 'row', gap: 6, marginTop: 12, alignItems: 'flex-start' },
  address: { flex: 1, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  primaryBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: radius.md },
  primaryText: { fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 50, paddingHorizontal: 20, borderRadius: radius.md, borderWidth: 1 },
  secondaryText: { fontSize: 16, fontWeight: '600' },
  erNote: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, borderRadius: radius.sm, marginTop: 12 },
  erNoteText: { flex: 1, fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 14, height: 34, justifyContent: 'center', borderRadius: 99, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  section: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, marginTop: 10, textTransform: 'uppercase' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 2 },
  rowDistance: { fontSize: 14, fontWeight: '600' },
  note: { fontSize: 12, lineHeight: 17, marginTop: 6 },
});
