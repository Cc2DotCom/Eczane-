import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, useTheme } from '../theme';
import { FadeIn, PressableScale } from './motion';

const SEEN_KEY = 'welcome:v1';

/** Herkese hitap etsin diye birkaç farklı karşılama; açılışta biri rastgele seçilir. */
const GREETINGS = [
  {
    lead: 'Derdine derman, gönlüne ferahlık dileriz. Rabbim sana ve sevdiklerine acil şifalar versin.',
    quote: 'Her derdin bir dermanı vardır.',
    note: 'Sabırla, umutla. Yalnız değilsin.',
    button: 'Bismillah, başlayalım',
  },
  {
    lead: 'Geçmiş olsun. Sana ve sevdiklerine en kısa yoldan yardım bulalım.',
    quote: 'Umut, en karanlık gecede bile yanan bir ışıktır.',
    note: 'Sakin ol, buradayız.',
    button: 'Haydi, başlayalım',
  },
  {
    lead: 'Gönlün ferah, yolun açık olsun. Sağlıkla kal, sevdiklerinle kal.',
    quote: 'Gelin tanış olalım, işi kolay kılalım.',
    note: 'Yunus Emre',
    button: 'Hayırlısıyla başlayalım',
  },
  {
    lead: 'Allah\'a emanet ol. Sen merak etme, en yakın yardımı birlikte bulalım.',
    quote: 'Dert veren, dermanını da verir.',
    note: 'Atasözü',
    button: 'Allah\'ın izniyle başlayalım',
  },
  {
    lead: 'Kendin ya da bir yakının için buradaysan, doğru yerdesin.',
    quote: 'İyilik eden iyilik bulur.',
    note: 'Atasözü',
    button: 'İyilikle başlayalım',
  },
];

/**
 * İlk açılışta bir kez görünen karşılama. Ana ekran arkada yüklenmeye devam eder,
 * böylece "Başlayalım"a basıldığında liste çoğu zaman hazır olur.
 */
export function Welcome() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const [g] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((v) => {
        if (!v) setVisible(true);
      })
      .catch(() => {});
  }, []);

  const start = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});
    Animated.timing(fade, { toValue: 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(
      () => setVisible(false),
    );
  };

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      <LinearGradient colors={[t.glow, t.bg, t.bg]} style={StyleSheet.absoluteFill} />
      <View style={[styles.wrap, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 28 }]}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <FadeIn>
            <View style={[styles.icon, { backgroundColor: t.primarySoft }]}>
              <Ionicons name="heart" size={34} color={t.primary} />
            </View>
          </FadeIn>
          <FadeIn delay={150}>
            <Text style={[styles.title, { color: t.text }]}>Hoş geldin</Text>
          </FadeIn>
          <FadeIn delay={300}>
            <Text style={[styles.lead, { color: t.text }]}>
              {g.lead}
            </Text>
          </FadeIn>
          <FadeIn delay={450}>
            <View style={[styles.quote, { backgroundColor: t.card, borderColor: t.border }]}>
              <Text style={[styles.quoteText, { color: t.text }]}>“{g.quote}”</Text>
              <Text style={[styles.quoteNote, { color: t.textMuted }]}>{g.note}</Text>
            </View>
          </FadeIn>
          <FadeIn delay={600}>
            <View style={{ gap: 12, marginTop: 28 }}>
              <Line icon="navigate-outline" text="Konumuna en yakın nöbetçi eczaneyi hemen gösteririz." />
              <Line icon="business-outline" text="Yakınındaki hastanelere ve 112'ye tek dokunuşla ulaşırsın." />
              <Line icon="shield-checkmark-outline" text="Liste her gün resmi kaynaktan (e-Devlet) yenilenir." />
            </View>
          </FadeIn>
        </View>

        <FadeIn delay={750}>
          <PressableScale onPress={start} accessibilityRole="button" style={[styles.button, { backgroundColor: t.primary }]}>
            <Text style={[styles.buttonText, { color: t.onPrimary }]}>{g.button}</Text>
            <Ionicons name="arrow-forward" size={18} color={t.onPrimary} />
          </PressableScale>
          <Text style={[styles.small, { color: t.textMuted }]}>
            Konum izni sorulursa, en yakını bulabilmemiz için izin vermen yeterli.
          </Text>
        </FadeIn>
      </View>
    </Animated.View>
  );
}

function Line({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const t = useTheme();
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={18} color={t.primary} />
      <Text style={[styles.lineText, { color: t.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 28 },
  icon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.6 },
  lead: { fontSize: 18, lineHeight: 27, marginTop: 10 },
  quote: { marginTop: 22, padding: 18, borderRadius: radius.md, borderWidth: 1 },
  quoteText: { fontSize: 17, fontStyle: 'italic', fontWeight: '600' },
  quoteNote: { fontSize: 14, marginTop: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineText: { flex: 1, fontSize: 15, lineHeight: 21 },
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
