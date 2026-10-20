import { Text as RNText, StyleSheet, type TextProps } from 'react-native';
import { useLargeText } from '../state/settings';

const SCALE = 1.22;

/** React Native Text'in yerine geçer; "Büyük yazı" açıkken yazı boyutunu ve satır aralığını büyütür. */
export function Text({ style, ...rest }: TextProps) {
  const large = useLargeText();
  if (!large) return <RNText style={style} {...rest} />;
  const f = StyleSheet.flatten(style) ?? {};
  const fontSize = (f.fontSize ?? 14) * SCALE;
  return <RNText style={[style, { fontSize, lineHeight: f.lineHeight ? f.lineHeight * SCALE : undefined }]} {...rest} />;
}
