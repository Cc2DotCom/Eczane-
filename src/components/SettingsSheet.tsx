import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Modal, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setLargeText, showWelcome, useLargeText } from '../state/settings';
import { radius, useTheme } from '../theme';
import { PressableScale } from './motion';
import { Text } from './Text';
import { ThemePicker } from './ThemePicker';

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const large = useLargeText();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 12 : 20 }]}>
          <Text style={[styles.title, { color: t.text }]}>Ayarlar</Text>
          <PressableScale onPress={onClose} hitSlop={12} accessibilityLabel="Kapat">
            <Ionicons name="close" size={24} color={t.textMuted} />
          </PressableScale>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 22, paddingBottom: insets.bottom + 32 }}>
          <View style={{ gap: 10 }}>
            <Text style={[styles.label, { color: t.textMuted }]}>Renk</Text>
            <ThemePicker />
          </View>

          <View style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}>
            <Ionicons name="text-outline" size={20} color={t.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: t.text }]}>Büyük yazı</Text>
              <Text style={[styles.rowSub, { color: t.textMuted }]}>Tüm yazıları daha okunaklı yapar</Text>
            </View>
            <Switch
              value={large}
              onValueChange={(v) => {
                Haptics.selectionAsync().catch(() => {});
                setLargeText(v);
              }}
              trackColor={{ true: t.primary, false: t.border }}
              thumbColor="#FFFFFF"
            />
          </View>

          <PressableScale
            onPress={() => {
              onClose();
              setTimeout(showWelcome, 350);
            }}
            style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}
          >
            <Ionicons name="heart-outline" size={20} color={t.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: t.text }]}>Karşılama ekranını göster</Text>
              <Text style={[styles.rowSub, { color: t.textMuted }]}>Hoş geldin sözlerini yeniden gör</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
          </PressableScale>

          <Text style={[styles.foot, { color: t.textMuted }]}>
            Nöbet listeleri her gün e-Devlet'teki resmi kaynaktan, hastane bilgileri OpenStreetMap gönüllülerinden gelir.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 2 },
  foot: { fontSize: 12, lineHeight: 17 },
});
