import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CityPicker } from './src/components/CityPicker';
import { HeroCard } from './src/components/HeroCard';
import { FadeIn, PressableScale, Pulse } from './src/components/motion';
import { PharmacyRow } from './src/components/PharmacyRow';
import { LoadingSkeleton, Message } from './src/components/States';
import { usingDemoData } from './src/data/repository';
import { useDutyPharmacies } from './src/hooks/useDutyPharmacies';
import { usePreferences } from './src/hooks/usePreferences';
import { useUserLocation } from './src/hooks/useUserLocation';
import { radius, useTheme } from './src/theme';
import { dutyDayLabel, greeting, relativeTime } from './src/utils/duty';

export default function App() {
  return (
    <SafeAreaProvider>
      <Home />
    </SafeAreaProvider>
  );
}

function Home() {
  const t = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const { location, relocate } = useUserLocation();
  const prefs = usePreferences();
  const coords = location.status === 'ready' ? location.coords : null;
  const area = prefs.manualArea ?? (location.status === 'ready' ? location.area : null);

  const { pharmacies, source, fetchedAt, stale, notCovered, loading, refreshing, error, refresh } = useDutyPharmacies(
    prefs.ready ? area : null,
    coords,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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
  const favoriteOnDuty = pharmacies.find((p) => prefs.favorites.includes(p.name) && p.id !== hero?.id);

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
          isFavorite={prefs.favorites.includes(hero.name)}
          onToggleFavorite={() => toggleFav(hero.name)}
          onBackToNearest={() => select(null)}
        />

        {favoriteOnDuty && (
          <FadeIn delay={120}>
            <PressableScale
              onPress={() => select(favoriteOnDuty.id)}
              style={[styles.favBanner, { backgroundColor: t.warmSoft }]}
            >
              <Ionicons name="star" size={16} color={t.warm} />
              <Text style={[styles.favText, { color: t.text }]} numberOfLines={1}>
                Favorin <Text style={{ fontWeight: '700' }}>{favoriteOnDuty.name}</Text> bugün nöbetçi
              </Text>
              <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
            </PressableScale>
          </FadeIn>
        )}

        <FadeIn delay={160}>
          <Text style={[styles.section, { color: t.textMuted }]}>Bugün nöbetçi olanlar · {pharmacies.length}</Text>
        </FadeIn>
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
      </>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
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
            {hero
              ? 'Endişelenme, yakınında açık bir eczane var.'
              : 'Sana en yakın açık eczaneyi buluyoruz.'}
          </Text>

          <View style={styles.liveRow}>
            <Pulse color={t.primary} />
            <Text style={[styles.liveText, { color: t.textMuted }]}>
              {fetchedAt
                ? `Güncellendi ${relativeTime(fetchedAt)}`
                : !area && location.status === 'loading'
                  ? 'Konumun bulunuyor'
                  : loading
                    ? 'Liste getiriliyor'
                    : 'Resmi kaynak: e-Devlet'}
              {source === 'demo' || usingDemoData ? ' · demo veri' : ''}
            </Text>
          </View>
        </FadeIn>

        {stale && (
          <View style={[styles.demo, { backgroundColor: t.warmSoft }]}>
            <Ionicons name="time-outline" size={18} color={t.warm} />
            <Text style={[styles.demoText, { color: t.text }]}>
              Bugünün listesi henüz gelmedi, gösterilen liste önceki güne ait olabilir. Gitmeden önce eczaneyi aramanı öneririz.
            </Text>
          </View>
        )}

        {(source === 'demo' || usingDemoData) && (
          <View style={[styles.demo, { backgroundColor: t.warmSoft }]}>
            <Ionicons name="information-circle-outline" size={18} color={t.warm} />
            <Text style={[styles.demoText, { color: t.text }]}>
              Örnek veri gösteriliyor. Bu eczaneler ve konumları gerçek değil.
            </Text>
          </View>
        )}

        <View style={{ gap: 14 }}>{content}</View>
      </ScrollView>

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
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
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
  areaText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 18 },
  liveText: { fontSize: 13 },
  demo: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: radius.sm, marginBottom: 14 },
  demoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  favBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.md },
  favText: { flex: 1, fontSize: 14 },
  section: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, marginTop: 10, marginBottom: 2, textTransform: 'uppercase' },
});
