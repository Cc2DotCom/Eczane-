import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { radius, useTheme } from '../theme';
import { FadeIn, PressableScale, Shimmer } from './motion';

export function LoadingSkeleton() {
  const t = useTheme();
  const block = { backgroundColor: t.border, borderRadius: radius.md };
  return (
    <View style={{ gap: 12 }}>
      <Shimmer style={[block, { height: 260, borderRadius: radius.lg }]} />
      <Shimmer style={[block, { height: 18, width: 140, marginTop: 12 }]} />
      {[0, 1, 2].map((i) => (
        <Shimmer key={i} style={[block, { height: 70 }]} />
      ))}
    </View>
  );
}

export function Message({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  return (
    <FadeIn style={[styles.box, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: t.primarySoft }]}>
        <Ionicons name={icon} size={26} color={t.primary} />
      </View>
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      <Text style={[styles.body, { color: t.textMuted }]}>{body}</Text>
      {action && onAction && (
        <PressableScale onPress={onAction} style={[styles.btn, { backgroundColor: t.primary }]}>
          <Text style={[styles.btnText, { color: t.onPrimary }]}>{action}</Text>
        </PressableScale>
      )}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', padding: 28, borderRadius: radius.lg, borderWidth: 1 },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  btn: { marginTop: 18, paddingHorizontal: 22, height: 46, borderRadius: radius.md, justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '600' },
});
