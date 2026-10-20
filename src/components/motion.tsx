import { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** İçeriği hafifçe aşağıdan, yumuşakça belirtir. */
export function FadeIn({
  children,
  delay = 0,
  offset = 14,
  style,
}: PropsWithChildren<{ delay?: number; offset?: number; style?: StyleProp<ViewStyle> }>) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 520, delay, easing: ease, useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Basınca hafifçe küçülen, bırakınca yaylanarak dönen dokunmatik alan. */
export function PressableScale({
  children,
  style,
  containerStyle,
  scaleTo = 0.97,
  ...rest
}: PropsWithChildren<
  PressableProps & { style?: StyleProp<ViewStyle>; containerStyle?: StyleProp<ViewStyle>; scaleTo?: number }
>) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (toValue: number) =>
    Animated.spring(s, { toValue, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable onPressIn={() => to(scaleTo)} onPressOut={() => to(1)} style={containerStyle} {...rest}>
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Sakin, nefes alır gibi yanıp sönen nokta ("canlı" göstergesi). */
export function Pulse({ color, size = 8 }: { color: string; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
        }}
      />
      <Animated.View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </Animated.View>
  );
}

/** Yüklenirken kullanılan yumuşak iskelet blok. */
export function Shimmer({ style }: { style: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.5, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[style, { opacity: v }]} />;
}
