import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import { setThemeName, type ThemeName, useThemeName } from '../state/settings';
import { THEMES, radius, useTheme } from '../theme';
import { PressableScale } from './motion';
import { Text } from './Text';

const OPTIONS: { key: ThemeName; label: string }[] = [
  { key: 'sicak', label: 'Sıcak' },
  { key: 'acik', label: 'Açık' },
  { key: 'koyu', label: 'Koyu' },
];

/** Üç renk teması arasında seçim; seçim anında uygulanır ve hatırlanır. */
export function ThemePicker() {
  const t = useTheme();
  const current = useThemeName();
  return (
    <View style={styles.row}>
      {OPTIONS.map((o) => {
        const p = THEMES[o.key];
        const active = o.key === current;
        return (
          <PressableScale
            key={o.key}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setThemeName(o.key);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`${o.label} renk teması`}
            containerStyle={{ flex: 1 }}
            style={[styles.option, { borderColor: active ? t.primary : t.border, backgroundColor: t.card }]}
          >
            <View style={[styles.swatch, { backgroundColor: p.bg, borderColor: p.border }]}>
              <View style={[styles.swatchCard, { backgroundColor: p.card }]} />
              <View style={[styles.swatchDot, { backgroundColor: p.primary }]} />
              {active && (
                <View style={[styles.check, { backgroundColor: t.primary }]}>
                  <Ionicons name="checkmark" size={12} color={t.onPrimary} />
                </View>
              )}
            </View>
            <Text style={[styles.label, { color: active ? t.text : t.textMuted }]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  option: { alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, borderWidth: 1.5 },
  swatch: { width: '100%', height: 54, borderRadius: radius.sm, borderWidth: 1, padding: 8, justifyContent: 'flex-end' },
  swatchCard: { height: 16, borderRadius: 6, width: '80%' },
  swatchDot: { position: 'absolute', top: 8, left: 8, width: 14, height: 14, borderRadius: 7 },
  check: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '700' },
});
