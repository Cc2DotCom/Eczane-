import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, useTheme } from '../theme';
import { hideWelcome, useWelcomeVisible } from '../state/settings';
import { FadeIn, PressableScale } from './motion';
import { ThemePicker } from './ThemePicker';



/**
 * İlk açılışta bir kez görünen karşılama. Ana ekran arkada yüklenmeye devam eder,
 * böylece "Başlayalım"a basıldığında liste çoğu zaman hazır olur.
 */
export function Welcome() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const visible = useWelcomeVisible();
  const fade = useRef(new Animated.Value(1)).current;
  const start = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(fade, { toValue: 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(
      hideWelcome,
    );
  };

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      <LinearGradient colors={[t.glow, t.bg, t.bg]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <FadeIn>
            <View style={[styles.icon, { backgroundColor: t.primarySoft }]}>
              <Ionicons name="heart" size={28} color={t.primary} />
            </View>
            <Text style={[styles.title, { color: t.text }]}>Hoş geldin</Text>
            <Text style={[styles.lead, { color: t.text }]}>Acil şifalar dileriz.</Text>
            <Text style={[styles.about, { color: t.textMuted }]}>
              Bu uygulama sana en yakın nöbetçi eczaneyi ve hastaneleri saniyeler içinde gösterir.
            </Text>
            <View style={[styles.source, { backgroundColor: t.card, borderColor: t.border }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={t.primary} />
              <Text style={[styles.sourceText, { color: t.text }]}>
                Nöbet listesi her gün e-Devlet'teki resmi kaynaktan (TİTCK) alınır.
              </Text>
            </View>
          </FadeIn>
        </View>

        <FadeIn delay={200}>
          <View style={[styles.pickBox, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[styles.pickLabel, { color: t.text }]}>Renk seç</Text>
            <ThemePicker />
          </View>
          <PressableScale onPress={start} accessibilityRole="button" style={[styles.button, { backgroundColor: t.primary }]}>
            <Text style={[styles.buttonText, { color: t.onPrimary }]}>Başlayalım</Text>
            <Ionicons name="arrow-forward" size={18} color={t.onPrimary} />
          </PressableScale>
          <Text style={[styles.small, { color: t.textMuted }]}>Rengi daha sonra Ayarlar'dan değiştirebilirsin.</Text>
        </FadeIn>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, paddingHorizontal: 28 },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  pickLabel: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  pickBox: { padding: 16, borderRadius: radius.lg, borderWidth: 1, marginTop: 28, marginBottom: 16 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 12, borderRadius: radius.md, borderWidth: 1 },
  sourceText: { flex: 1, fontSize: 14, lineHeight: 20 },
  about: { fontSize: 15, lineHeight: 22, marginTop: 14 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.6 },
  lead: { fontSize: 18, lineHeight: 27, marginTop: 10 },
  button: {
    height: 56,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { fontSize: 17, fontWeight: '700' },
  small: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 12 },
});
