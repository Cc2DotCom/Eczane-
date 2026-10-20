import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, useTheme } from '../theme';
import { PressableScale } from './motion';
import { Text } from './Text';

const KEY = 'emergency:card';
const BLOOD = ['A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-'];

type Card = {
  name: string;
  blood: string;
  allergies: string;
  conditions: string;
  medications: string;
  contactName: string;
  contactPhone: string;
};

const EMPTY: Card = { name: '', blood: '', allergies: '', conditions: '', medications: '', contactName: '', contactPhone: '' };

const isEmpty = (c: Card) => Object.values(c).every((v) => !v.trim());

/**
 * Acil bilgi kartı: kan grubu, alerjiler, ilaçlar ve yakınının telefonu.
 * Bilgiler yalnızca bu telefonda saklanır, hiçbir yere gönderilmez.
 */
export function EmergencyCardButton() {
  const t = useTheme();
  const [card, setCard] = useState<Card>(EMPTY);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setCard({ ...EMPTY, ...JSON.parse(v) }))
      .catch(() => {});
  }, []);

  const summary = isEmpty(card)
    ? 'Kan grubun, alerjilerin ve yakınının numarası. Sadece bu telefonda saklanır.'
    : [card.blood && `Kan grubu ${card.blood}`, card.contactName && `Yakını: ${card.contactName}`].filter(Boolean).join(' · ') ||
      'Kartını görmek için dokun';

  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={[styles.button, { backgroundColor: t.card, borderColor: t.border }]}
      >
        <View style={[styles.icon, { backgroundColor: t.dangerSoft }]}>
          <Ionicons name="id-card-outline" size={20} color={t.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.btnTitle, { color: t.text }]}>Acil bilgi kartım</Text>
          <Text style={[styles.btnSub, { color: t.textMuted }]} numberOfLines={2}>
            {summary}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
      </PressableScale>
      <CardModal
        visible={open}
        card={card}
        onClose={() => setOpen(false)}
        onSave={(c) => {
          setCard(c);
          AsyncStorage.setItem(KEY, JSON.stringify(c)).catch(() => {});
        }}
      />
    </>
  );
}

function CardModal({ visible, card, onClose, onSave }: { visible: boolean; card: Card; onClose: () => void; onSave: (c: Card) => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card);

  useEffect(() => {
    if (visible) {
      setDraft(card);
      setEditing(isEmpty(card));
    }
  }, [visible, card]);

  const set = (k: keyof Card) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSave(draft);
    setEditing(false);
  };

  const field = (label: string, k: keyof Card, placeholder: string, opts: { multiline?: boolean; phone?: boolean } = {}) => (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: t.textMuted }]}>{label}</Text>
      <TextInput
        value={draft[k]}
        onChangeText={set(k)}
        placeholder={placeholder}
        placeholderTextColor={t.textMuted}
        multiline={opts.multiline}
        keyboardType={opts.phone ? 'phone-pad' : 'default'}
        style={[styles.input, { backgroundColor: t.card, borderColor: t.border, color: t.text }, opts.multiline && { minHeight: 64 }]}
      />
    </View>
  );

  const row = (label: string, value: string) =>
    !!value.trim() && (
      <View style={[styles.viewRow, { borderColor: t.border }]}>
        <Text style={[styles.label, { color: t.textMuted }]}>{label}</Text>
        <Text style={[styles.value, { color: t.text }]}>{value}</Text>
      </View>
    );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 12 : 20 }]}>
          <Text style={[styles.title, { color: t.text }]}>Acil bilgi kartım</Text>
          <PressableScale onPress={onClose} hitSlop={12} accessibilityLabel="Kapat">
            <Ionicons name="close" size={24} color={t.textMuted} />
          </PressableScale>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
          {editing ? (
            <>
              <Text style={[styles.note, { color: t.textMuted }]}>
                Acil bir durumda bu ekranı sağlık ekibine gösterebilirsin. Bilgilerin sadece bu telefonda kalır.
              </Text>
              {field('Adın soyadın', 'name', 'Örn. Ayşe Yılmaz')}
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: t.textMuted }]}>Kan grubu</Text>
                <View style={styles.chips}>
                  {BLOOD.map((b) => {
                    const active = draft.blood === b;
                    return (
                      <PressableScale
                        key={b}
                        onPress={() => set('blood')(active ? '' : b)}
                        style={[styles.chip, { backgroundColor: active ? t.danger : t.card, borderColor: active ? t.danger : t.border }]}
                      >
                        <Text style={[styles.chipText, { color: active ? '#FFFFFF' : t.text }]}>{b}</Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
              {field('Alerjiler', 'allergies', 'Örn. Penisilin, fıstık', { multiline: true })}
              {field('Kronik hastalıklar', 'conditions', 'Örn. Diyabet, astım', { multiline: true })}
              {field('Kullandığın ilaçlar', 'medications', 'Örn. İnsülin', { multiline: true })}
              {field('Yakınının adı', 'contactName', 'Örn. Annem')}
              {field('Yakınının telefonu', 'contactPhone', '05xx xxx xx xx', { phone: true })}
              <PressableScale onPress={save} style={[styles.primary, { backgroundColor: t.primary }]}>
                <Text style={[styles.primaryText, { color: t.onPrimary }]}>Kaydet</Text>
              </PressableScale>
            </>
          ) : (
            <>
              {!!card.blood && (
                <View style={[styles.bloodBox, { backgroundColor: t.dangerSoft }]}>
                  <Text style={[styles.label, { color: t.danger }]}>Kan grubu</Text>
                  <Text style={[styles.blood, { color: t.danger }]}>{card.blood}</Text>
                </View>
              )}
              <View style={[styles.viewCard, { backgroundColor: t.card, borderColor: t.border }]}>
                {row('Ad soyad', card.name)}
                {row('Alerjiler', card.allergies)}
                {row('Kronik hastalıklar', card.conditions)}
                {row('Kullandığı ilaçlar', card.medications)}
                {row('Yakını', card.contactName)}
              </View>
              {!!card.contactPhone.trim() && (
                <PressableScale
                  onPress={() => Linking.openURL(`tel:${card.contactPhone.replace(/[^\d+]/g, '')}`)}
                  style={[styles.primary, { backgroundColor: t.primary }]}
                >
                  <Ionicons name="call" size={18} color={t.onPrimary} />
                  <Text style={[styles.primaryText, { color: t.onPrimary }]}>
                    {card.contactName ? `${card.contactName} kişisini ara` : 'Yakınımı ara'}
                  </Text>
                </PressableScale>
              )}
              <PressableScale onPress={() => setEditing(true)} style={[styles.secondary, { borderColor: t.border }]}>
                <Ionicons name="create-outline" size={18} color={t.primary} />
                <Text style={[styles.secondaryText, { color: t.primary }]}>Düzenle</Text>
              </PressableScale>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnTitle: { fontSize: 16, fontWeight: '700' },
  btnSub: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  note: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, height: 36, justifyContent: 'center', borderRadius: 99, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '700' },
  primary: { flexDirection: 'row', gap: 8, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryText: { fontSize: 16, fontWeight: '700' },
  secondary: { flexDirection: 'row', gap: 8, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryText: { fontSize: 15, fontWeight: '600' },
  bloodBox: { borderRadius: radius.md, padding: 18, alignItems: 'center' },
  blood: { fontSize: 44, fontWeight: '800', marginTop: 4 },
  viewCard: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 16 },
  viewRow: { paddingVertical: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  value: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
});
