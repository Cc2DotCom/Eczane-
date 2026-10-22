import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CITIES } from '../data/cities';
import { DISTRICTS } from '../data/districts';
import { radius, useTheme } from '../theme';
import type { Area } from '../types';
import { normalizeTr } from '../utils/text';
import { PressableScale } from './motion';

type Props = {
  visible: boolean;
  current: Area | null;
  onClose: () => void;
  onPick: (area: Area) => void;
  onUseLocation: () => void;
};

export function CityPicker({ visible, current, onClose, onPick, onUseLocation }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  // Önce il, sonra o ilin ilçesi seçilir. city doluysa ilçe adımındayız.
  const [city, setCity] = useState<string | null>(null);
  const ALL = 'Tüm il';
  const list = useMemo(() => {
    const q = normalizeTr(query);
    const items = city ? [ALL, ...(DISTRICTS[city] ?? [])] : CITIES;
    return q ? items.filter((c) => c !== ALL && normalizeTr(c).includes(q)) : items;
  }, [query, city]);

  const reset = () => {
    setQuery('');
    setCity(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const choose = (item: string) => {
    if (!city) {
      setCity(item);
      setQuery('');
      return;
    }
    onPick({ city, district: item === ALL ? undefined : item });
    reset();
  };
  const isActive = (item: string) =>
    city
      ? current?.city === city && (item === ALL ? !current?.district : current?.district === item)
      : current?.city === item;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={city ? () => setCity(null) : close} transparent={false}>
      <View style={[styles.sheet, { backgroundColor: t.bg, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          {city ? (
            <PressableScale onPress={() => { setCity(null); setQuery(''); }} hitSlop={12} style={styles.back} accessibilityLabel="İllere dön">
              <Ionicons name="chevron-back" size={22} color={t.primary} />
              <Text style={[styles.title, { color: t.text }]}>{city}</Text>
            </PressableScale>
          ) : (
            <Text style={[styles.title, { color: t.text }]}>Nerede arayalım?</Text>
          )}
          <PressableScale onPress={close} hitSlop={12}>
            <Ionicons name="close" size={24} color={t.textMuted} />
          </PressableScale>
        </View>

        {!city && (
        <PressableScale onPress={() => { reset(); onUseLocation(); }} style={[styles.locBtn, { backgroundColor: t.primarySoft }]}>
          <Ionicons name="locate-outline" size={18} color={t.primary} />
          <Text style={[styles.locText, { color: t.primary }]}>Konumumu kullan</Text>
        </PressableScale>
        )}

        <View style={[styles.input, { backgroundColor: t.card, borderColor: t.border }]}>
          <Ionicons name="search" size={16} color={t.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={city ? 'İlçe ara' : 'İl ara'}
            placeholderTextColor={t.textMuted}
            style={[styles.inputText, { color: t.text }]}
            autoCorrect={false}
          />
        </View>

        <FlatList
          data={list}
          keyExtractor={(c) => c}
          key={city ?? 'iller'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => {
            const active = isActive(item);
            return (
              <PressableScale onPress={() => choose(item)} style={[styles.city, active && { backgroundColor: t.primarySoft }]}>
                <Text style={[styles.cityText, { color: active ? t.primary : t.text }, item === ALL && { fontWeight: '700' }]}>{item}</Text>
                {active ? (
                  <Ionicons name="checkmark" size={18} color={t.primary} />
                ) : (
                  !city && <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
                )}
              </PressableScale>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 14, borderRadius: radius.md, marginBottom: 12 },
  locText: { fontSize: 15, fontWeight: '600' },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 46, borderRadius: radius.sm, borderWidth: 1, marginBottom: 8 },
  inputText: { flex: 1, fontSize: 15 },
  city: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: radius.sm },
  cityText: { fontSize: 16 },
});
