import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../../constants/theme';

const LOGO = require('../../../assets/formologo.png'); // 687×472, shaffof fon
const MIN_VISIBLE_MS = 1100;

/**
 * Ishga tushish ekrani: native splash (app.json — xuddi shu fon va logo) shu komponent chizilgach yashiriladi,
 * shuning uchun "miltillash" yo'q. Logo yumshoq paydo bo'ladi, ostida oltin chiziq yuguradi, orqada nur.
 * `ready` (shriftlar + sessiya tiklandi) va kamida MIN_VISIBLE_MS o'tgach so'nadi va o'zini olib tashlaydi.
 */
export default function BrandSplash({ ready }) {
  const { width } = useWindowDimensions();
  const logoW = Math.min(220, width * 0.52);
  const [gone, setGone] = useState(false);
  const shown = useRef(Date.now());
  const intro = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const loops = [
      Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true })),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [intro, sweep, glow]);

  useEffect(() => {
    if (!ready) return undefined;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shown.current));
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => setGone(true));
    }, wait);
    return () => clearTimeout(timer);
  }, [ready, fade]);

  if (gone) return null;

  const barW = logoW * 0.7;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}
      pointerEvents={ready ? 'none' : 'auto'}
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}
      accessibilityLabel="Formo"
    >
      <Animated.View
        style={[
          styles.glow,
          {
            width: logoW * 1.9,
            height: logoW * 1.9,
            borderRadius: logoW,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] }),
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }) }],
          },
        ]}
      />
      <Animated.View
        style={{
          opacity: intro,
          transform: [
            { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
            { translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          ],
        }}
      >
        <Image source={LOGO} style={{ width: logoW, height: (logoW * 472) / 687 }} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={[styles.track, { width: barW, opacity: intro }]}>
        <Animated.View
          style={[
            styles.bar,
            {
              width: barW * 0.35,
              transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-barW * 0.35, barW] }) }],
            },
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', zIndex: 100, elevation: 100 },
  glow: { position: 'absolute', backgroundColor: 'rgba(29,47,140,0.35)' },
  track: { height: 2, marginTop: 34, borderRadius: 1, overflow: 'hidden', backgroundColor: 'rgba(242,163,58,0.14)' },
  bar: { height: 2, borderRadius: 1, backgroundColor: colors.accent },
});
