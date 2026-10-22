import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './src/components/Text';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CityPicker } from './src/components/CityPicker';
import { HeroCard } from './src/components/HeroCard';
import { Favorites } from './src/components/Favorites';
import { EmergencyButton, HospitalsView } from './src/components/HospitalsView';
import { FadeIn, PressableScale, Pulse } from './src/components/motion';
import { PharmacyRow } from './src/components/PharmacyRow';
import { MapPanel } from './src/components/MapPanel';
import { SettingsSheet } from './src/components/SettingsSheet';
import { LoadingSkeleton, Message } from './src/components/States';
import { ViewToggle } from './src/components/ViewToggle';
import { Welcome } from './src/components/Welcome';
import { getHospitals } from './src/data/hospitals';
import { usingDemoData } from './src/data/repository';
import { useDutyPharmacies } from './src/hooks/useDutyPharmacies';
import { usePreferences } from './src/hooks/usePreferences';
import { useUserLocation } from './src/hooks/useUserLocation';
import { radius, useTheme } from './src/theme';
import { dutyDayLabel, greeting, relativeTime } from './src/utils/duty';
import { distanceKm } from './src/utils/geo';

export default function App() {
  return (
    <SafeAreaProvider>
      <Home />
      <Welcome />
    </SafeAreaProvider>
  );
}

function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const { location, relocate } = useUserLocation();
  const prefs = usePreferences();
  const coords = location.status === 'ready' ? location.coords : null;
  const area = prefs.manualArea ?? (location.status === 'ready' ? location.area : null);

  const { pharmacies: rawPharmacies, source, origin, districtMissing, fetchedAt, stale, offline, notCovered, loading, refreshing, error, refresh } = useDutyPharmacies(
    prefs.ready ? area : null,
    // Bölge elle seçildiyse mesafeyi kullanıcının bulunduğu yerden değil, seçilen yerden düşünürüz.
    prefs.manualArea ? null : coords,
  );

  // Bölge elle seçildiyse o bölgedeki nöbetçi eczanelerin ortası "merkez" sayılır:
  // liste merkeze yakınlığa göre sıralanır, hastaneler de buradan aranır.
  const areaCenter = useMemo(() => {
    if (!prefs.manualArea) return null;
    const pts = rawPharmacies.flatMap((p) => (p.coords ? [p.coords] : []));
    if (!pts.length) return null;
    return {
      latitude: pts.reduce((a, c) => a + c.latitude, 0) / pts.length,
      longitude: pts.reduce((a, c) => a + c.longitude, 0) / pts.length,
    };
  }, [prefs.manualArea, rawPharmacies]);
  const pharmacies = useMemo(() => {
    if (!areaCenter) return rawPharmacies;
    const d = (p: (typeof rawPharmacies)[number]) => (p.coords ? distanceKm(areaCenter, p.coords) : Infinity);
    return [...rawPharmacies].sort((a, b) => d(a) - d(b));
  }, [rawPharmacies, areaCenter]);
  const hospitalCenter = prefs.manualArea ? areaCenter : coords;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState<'eczane' | 'hastane'>('eczane');
  const [view, setView] = useState<'liste' | 'harita'>('liste');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Hastane listesini arkada bir kez indirip saklayalım; internet kesilse de Hastaneler sekmesi çalışsın.
  useEffect(() => {
    const id = setTimeout(() => getHospitals().catch(() => {}), 4000);
    return () => clearTimeout(id);
  }, []);
  const [, forceTick] = useState(0);

  // "x dk önce" yazısı canlı kalsın.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Liste değişip seçim artık nöbetçi değilse en yakına dön.
  useEffect(() => {
    if (selectedId && !pharmacies.some((p) => p.id === selectedId)) setSelectedId(null);
  }, [pharmacies, selectedId]);

  const nearest = pharmacies[0];
  const hero = useMemo(
    () => pharmacies.find((p) => p.id === selectedId) ?? nearest,
    [pharmacies, selectedId, nearest],
  );

  const select = (id: string | null) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.create(320, 'easeInEaseOut', 'opacity'));
    setSelectedId(id === nearest?.id ? null : id);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const toggleFav = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    prefs.toggleFavorite(name);
  };

  const areaLabel = area ? (area.district ? `${area.district}, ${area.city}` : area.city) : 'Konum seç';

  let content: React.ReactNode;
  if (!area && location.status === 'loading') {
    content = <LoadingSkeleton />;
  } else if (!area && location.status === 'denied') {
    content = (
      <Message
        icon="location-outline"
        title="Konum izni kapalı"
        body="Sana en yakın nöbetçi eczaneyi bulmak için konumuna ihtiyacımız var. İstersen ili kendin de seçebilirsin."
        action="İl seç"
        onAction={() => setPickerOpen(true)}
      />
    );
  } else if (!area) {
    content = (
      <Message
        icon="map-outline"
        title="Neredesin?"
        body="Bulunduğun yeri çıkaramadık. İli seçersen nöbetçi eczaneleri hemen getirelim."
        action="İl seç"
        onAction={() => setPickerOpen(true)}
      />
    );
  } else if (notCovered) {
    content = (
      <Message
        icon="map-outline"
        title={`${area.city} için liste yok`}
        body="Bu ilin nöbet listesi şu an resmi kaynakta yayınlanmıyor. Acil bir durumda 112'yi arayabilir ya da il eczacı odasının sitesine bakabilirsin."
        action="İl seç"
        onAction={() => setPickerOpen(true)}
      />
    );
  } else if (loading && pharmacies.length === 0) {
    content = <LoadingSkeleton />;
  } else if (error && pharmacies.length === 0) {
    content = (
      <Message icon="cloud-offline-outline" title="Şu an ulaşamadık" body={error} action="Tekrar dene" onAction={refresh} />
    );
  } else if (!hero) {
    content = (
      <Message
        icon="moon-outline"
        title="Nöbetçi eczane bulunamadı"
        body={`${areaLabel} için bugün kayıtlı nöbetçi eczane görünmüyor. Başka bir ilçe deneyebilirsin.`}
        action="Bölge değiştir"
        onAction={() => setPickerOpen(true)}
      />
    );
  } else {
    content = (
      <>
        <HeroCard
          pharmacy={hero}
          isNearest={hero.id === nearest?.id}
          nearestLabel={prefs.manualArea ? (districtMissing ? 'İlde nöbetçi' : 'Bu bölgede nöbetçi') : undefined}
          isFavorite={prefs.favorites.includes(hero.name)}
          onToggleFavorite={() => toggleFav(hero.name)}
          onBackToNearest={() => select(null)}
        />

        <FadeIn delay={120}>
          <Favorites
            names={prefs.favorites}
            pharmacies={pharmacies}
            heroId={hero.id}
            onSelect={select}
            onToggle={toggleFav}
          />
        </FadeIn>

        <FadeIn delay={160}>
          <View style={styles.sectionRow}>
            <Text style={[styles.section, { color: t.textMuted, flex: 1, marginTop: 0 }]}>Bugün nöbetçi · {pharmacies.length}</Text>
            <ViewToggle value={view} onChange={setView} />
          </View>
        </FadeIn>
        {view === 'harita' ? (
          <FadeIn>
            <MapPanel
              points={pharmacies
                .filter((p) => p.coords)
                .map((p) => ({ id: p.id, lat: p.coords!.latitude, lng: p.coords!.longitude, label: p.name, kind: 'pharmacy' as const }))}
              user={prefs.manualArea ? null : coords}
              selectedId={hero.id}
              onSelect={select}
            />
          </FadeIn>
        ) : (
          <View style={{ gap: 10 }}>
            {pharmacies.map((p, i) => (
              <FadeIn key={p.id} delay={200 + Math.min(i, 8) * 60}>
                <PharmacyRow
                  pharmacy={p}
                  selected={p.id === hero.id}
                  favorite={prefs.favorites.includes(p.name)}
                  onPress={() => select(p.id)}
                  onToggleFavorite={() => toggleFav(p.name)}
                />
              </FadeIn>
            ))}
          </View>
        )}
      </>
    );
  }

  const switchTab = (next: 'eczane' | 'hastane') => {
    if (next === tab) return;
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.create(260, 'easeInEaseOut', 'opacity'));
    setTab(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const isHospital = tab === 'hastane';

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      {/* Üstte yumuşak, sıcak bir ışık halesi */}
      <LinearGradient pointerEvents="none" colors={[t.glow, t.bg]} style={styles.glow} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.primary} colors={[t.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.date, { color: t.textMuted }]}>{dutyDayLabel()}</Text>
              <Text style={[styles.title, { color: t.text }]}>{greeting()}</Text>
            </View>
            <PressableScale
              onPress={() => setSettingsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Ayarlar"
              style={[styles.aaBtn, { backgroundColor: t.card, borderColor: t.border }]}
            >
              <Ionicons name="options-outline" size={18} color={t.text} />
            </PressableScale>
            <PressableScale
              onPress={() => setPickerOpen(true)}
              style={[styles.areaChip, { backgroundColor: t.card, borderColor: t.border }]}
            >
              <Ionicons name={prefs.manualArea ? 'pin-outline' : 'navigate-outline'} size={14} color={t.primary} />
              <Text style={[styles.areaText, { color: t.text }]} numberOfLines={1}>
                {areaLabel}
              </Text>
            </PressableScale>
          </View>

          <Text style={[styles.subtitle, { color: t.text }]}>
            {isHospital
              ? 'Sakin ol, yardım yakında. En yakın hastaneler burada.'
              : hero
                ? 'Endişelenme, yakınında açık bir eczane var.'
                : 'Sana en yakın açık eczaneyi buluyoruz.'}
          </Text>

          <View style={styles.liveRow}>
            <Pulse color={t.primary} />
            <Text style={[styles.liveText, { color: t.textMuted }]}>
              {isHospital
                ? 'Mesafeye göre sıralı, acil servisler işaretli'
                : fetchedAt
                ? `${origin ? `Kaynak: ${origin} · ` : ''}Güncellendi ${relativeTime(fetchedAt)}`
                : !area && location.status === 'loading'
                  ? 'Konumun bulunuyor'
                  : loading
                    ? 'Liste getiriliyor'
                    : 'Resmi kaynak: e-Devlet'}
              {source === 'demo' || usingDemoData ? ' · demo veri' : ''}
            </Text>
          </View>

          <View style={[styles.tabs, { backgroundColor: t.bgAccent }]}>
            {(['eczane', 'hastane'] as const).map((k) => {
              const active = tab === k;
              return (
                <PressableScale
                  key={k}
                  onPress={() => switchTab(k)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  containerStyle={{ flex: 1 }}
                  style={[styles.tab, active && { backgroundColor: t.card, shadowColor: t.shadow }, active && styles.tabActive]}
                >
                  <Ionicons
                    name={k === 'eczane' ? (active ? 'medkit' : 'medkit-outline') : active ? 'business' : 'business-outline'}
                    size={16}
                    color={active ? t.primary : t.textMuted}
                  />
                  <Text style={[styles.tabText, { color: active ? t.text : t.textMuted }]}>
                    {k === 'eczane' ? 'Nöbetçi eczane' : 'Hastaneler'}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </FadeIn>

        {!isHospital && offline && (
          <View style={[styles.demo, { backgroundColor: t.warmSoft }]}>
            <Ionicons name="cloud-offline-outline" size={18} color={t.warm} />
            <Text style={[styles.demoText, { color: t.text }]}>
              İnternete şu an ulaşamıyoruz. Telefonunda kayıtlı son liste gösteriliyor
              {fetchedAt ? ` (${relativeTime(fetchedAt)} indirildi)` : ''}.
            </Text>
          </View>
        )}

        {!isHospital && districtMissing && !!area?.district && (
          <View style={[styles.demo, { backgroundColor: t.warmSoft }]}>
            <Ionicons name="information-circle-outline" size={18} color={t.warm} />
            <Text style={[styles.demoText, { color: t.text }]}>
              {area.district} için bugün nöbetçi eczane kaydı yok. {area.city} genelindeki nöbetçiler gösteriliyor.
            </Text>
          </View>
        )}

        {!isHospital && stale && (
          <View style={[styles.demo, { backgroundColor: t.warmSoft }]}>
            <Ionicons name="time-outline" size={18} color={t.warm} />
            <Text style={[styles.demoText, { color: t.text }]}>
              Bugünün listesi henüz gelmedi, gösterilen liste önceki güne ait olabilir. Gitmeden önce eczaneyi aramanı öneririz.
            </Text>
          </View>
        )}

        {!isHospital && (source === 'demo' || usingDemoData) && (
          <View style={[styles.demo, { backgroundColor: t.warmSoft }]}>
            <Ionicons name="information-circle-outline" size={18} color={t.warm} />
            <Text style={[styles.demoText, { color: t.text }]}>
              Örnek veri gösteriliyor. Bu eczaneler ve konumları gerçek değil.
            </Text>
          </View>
        )}

        {isHospital ? (
          <HospitalsView
            coords={hospitalCenter}
            areaLabel={prefs.manualArea ? areaLabel : undefined}
            locating={prefs.manualArea ? loading : location.status === 'loading'}
            onPicked={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          />
        ) : (
          <View style={{ gap: 14 }}>
            {content}
            {notCovered && <EmergencyButton />}
          </View>
        )}
      </ScrollView>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <CityPicker
        visible={pickerOpen}
        current={area}
        onClose={() => setPickerOpen(false)}
        onPick={(a) => {
          prefs.setManualArea(a);
          setSelectedId(null);
          setPickerOpen(false);
        }}
        onUseLocation={() => {
          prefs.setManualArea(null);
          setSelectedId(null);
          setPickerOpen(false);
          relocate();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  date: { fontSize: 14, textTransform: 'capitalize' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginTop: 2 },
  subtitle: { fontSize: 17, lineHeight: 24, marginTop: 10 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 170,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 99,
    borderWidth: 1,
  },
  aaBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  areaText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 16 },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 99, marginBottom: 18 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 99 },
  tabActive: { shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '700' },
  liveText: { fontSize: 13 },
  demo: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: radius.sm, marginBottom: 14 },
  demoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  section: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, marginTop: 10, marginBottom: 2, textTransform: 'uppercase' },
});
