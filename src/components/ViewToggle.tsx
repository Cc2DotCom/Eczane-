import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { PressableScale } from './motion';

type Mode = 'liste' | 'harita';

/** Liste ile harita arasında geçiş yapan küçük ikili düğme. */
export function ViewToggle({ value, onChange }: { value: Mode; onChange: (v: Mode) => void }) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: t.bgAccent }]}>
      {(['liste', 'harita'] as const).map((k) => {
        const active = k === value;
        return (
          <PressableScale
            key={k}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(k);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.item, active && { backgroundColor: t.card }]}
          >
            <Ionicons name={k === 'liste' ? 'list' : 'map-outline'} size={14} color={active ? t.primary : t.textMuted} />
            <Text style={[styles.text, { color: active ? t.text : t.textMuted }]}>{k === 'liste' ? 'Liste' : 'Harita'}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 3, borderRadius: 99 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 99 },
  text: { fontSize: 12, fontWeight: '700' },
});
