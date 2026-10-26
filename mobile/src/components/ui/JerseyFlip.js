import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';
import { Shirt, Shorts } from './Shirt';

/**
 * 2D zaxira ko'rinish (WebGL bo'lmasa): old va orqa SVG yuzi perspektiva bilan Y o'qi atrofida aylanadi.
 *
 * Haqiqiy 3D model — Jersey3D (expo-gl + three.js). Bu ko'rinish faqat GL/WebGL2 bo'lmaganda yoki ismda 3D
 * shriftida yo'q harf (masalan, kirill) bo'lganda ishlatiladi: xuddi shu SVG ikki yuzga qo'yiladi va
 * native-driver transformlari bilan aylantiriladi. `flat` yoki "harakatni kamaytirish" — animatsiyasiz.
 *
 * Props:
 *   kit       — { color, ink, trim?, grad?, textStyle?, glow?, crest?, patches? }
 *   name, number            — orqadagi ism va raqam (oldida kichik raqam)
 *   shorts    — null | { number } — shortik ko'rsatiladi (raqam oldi tomonda, chap pochada)
 *   side      — 'front' | 'back' (tashqi boshqaruv), onSideChange — foydalanuvchi aylantirib to'xtatganda
 *   width     — futbolka kengligi; flat — animatsiyasiz
 */
const PERSPECTIVE = 900;
const DRAG_DEG_PER_PX = 0.7;

export default function JerseyFlip({ kit, name = '', number = '', shorts = null, side = 'back', onSideChange, width = 190, flat = false }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const still = flat || reduceMotion;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => active && setReduceMotion(Boolean(v)))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduceMotion(Boolean(v)));
    return () => {
      active = false;
      sub?.remove?.();
    };
  }, []);

  const angle = useRef(new Animated.Value(side === 'back' ? 180 : 0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const angleNow = useRef(side === 'back' ? 180 : 0);
  const swayLoop = useRef(null);
  const dragging = useRef(false);
  const sideRef = useRef(side);
  const onSideRef = useRef(onSideChange);
  onSideRef.current = onSideChange;

  useEffect(() => {
    const id = angle.addListener(({ value }) => {
      angleNow.current = value;
    });
    return () => angle.removeListener(id);
  }, [angle]);

  // Kutish holatida yengil chayqalish va "suzish"
  const startIdle = () => {
    if (still || dragging.current) return;
    swayLoop.current?.stop();
    swayLoop.current = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(sway, { toValue: 16, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(sway, { toValue: -16, duration: 4800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(sway, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(bob, { toValue: -6, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(bob, { toValue: -6, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
    );
    swayLoop.current.start();
  };

  const stopIdle = () => {
    swayLoop.current?.stop();
    swayLoop.current = null;
    sway.setValue(0);
    bob.setValue(0);
  };

  useEffect(() => {
    if (still) stopIdle();
    else startIdle();
    return stopIdle;
  }, [still]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Joriy burchakka eng yaqin, kerakli tomonga qaragan burchak (0 — old, 180 — orqa, mod 360) */
  const nearest = (target) => {
    const cur = angleNow.current;
    const base = target === 'back' ? 180 : 0;
    return base + Math.round((cur - base) / 360) * 360;
  };

  const settle = (toValue, velocity = 0) => {
    if (still) {
      angle.setValue(toValue);
      return;
    }
    Animated.spring(angle, { toValue, velocity, friction: 7, tension: 40, useNativeDriver: true }).start(({ finished }) => {
      if (finished) startIdle();
    });
  };

  // Tashqaridan tomon almashtirilsa (Old / Orqa tugmasi) — aylanib boradi
  useEffect(() => {
    if (sideRef.current === side) return;
    sideRef.current = side;
    if (!dragging.current) settle(nearest(side));
  }, [side]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Faqat gorizontal surish — vertikal skroll ekranda ishlayveradi
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragging.current = true;
          stopIdle();
          angle.stopAnimation();
          angle.setOffset(angleNow.current);
          angle.setValue(0);
        },
        onPanResponderMove: (_, g) => angle.setValue(g.dx * DRAG_DEG_PER_PX),
        onPanResponderRelease: (_, g) => {
          angle.flattenOffset();
          dragging.current = false;
          // Tezlik bo'yicha "inersiya", keyin yaqin tomonga (0/180) o'tiradi
          const projected = angleNow.current + g.vx * 160;
          const target = Math.round(projected / 180) * 180;
          const nextSide = ((target / 180) % 2 + 2) % 2 === 0 ? 'front' : 'back';
          sideRef.current = nextSide;
          settle(target, g.vx);
          if (nextSide !== side) onSideRef.current?.(nextSide);
        },
        onPanResponderTerminate: () => {
          angle.flattenOffset();
          dragging.current = false;
          settle(nearest(sideRef.current));
        },
      }),
    [side], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const total = Animated.add(angle, sway);
  const deg = (v) => v.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'], extrapolate: 'extend' });
  const mod = Animated.modulo(total, 360);
  // Yuz chegarasidan o'tganda (90°/270°) almashadi — backfaceVisibility Android'da ishonchsiz
  const frontOpacity = mod.interpolate({ inputRange: [0, 89.9, 90.1, 269.9, 270.1, 360], outputRange: [1, 1, 0, 0, 1, 1] });
  const backOpacity = mod.interpolate({ inputRange: [0, 89.9, 90.1, 269.9, 270.1, 360], outputRange: [0, 0, 1, 1, 0, 0] });
  const shadowScale = mod.interpolate({ inputRange: [0, 90, 180, 270, 360], outputRange: [1, 0.62, 1, 0.62, 1] });

  const face = (faceSide) => (
    <View style={styles.faceInner}>
      <Shirt
        width={shorts ? width * 0.88 : width}
        color={kit.color}
        ink={kit.ink}
        trim={kit.trim}
        grad={kit.grad}
        side={faceSide}
        player={faceSide === 'back' ? name : ''}
        number={number}
        crest={kit.crest}
        patches={kit.patches || []}
        textStyle={kit.textStyle}
        glow={kit.glow}
      />
      {shorts ? (
        <View style={styles.shorts}>
          <Shorts
            width={width * 0.56}
            color={kit.color}
            trim={kit.trim || kit.ink}
            ink={kit.ink}
            number={faceSide === 'front' ? shorts.number : ''}
            glow={kit.glow}
            textStyle={kit.textStyle}
          />
        </View>
      ) : null}
    </View>
  );

  if (still) {
    return (
      <View style={styles.wrap} {...pan.panHandlers}>
        {face(side)}
      </View>
    );
  }

  return (
    <View style={styles.wrap} {...pan.panHandlers} accessibilityRole="adjustable" accessibilityHint="Swipe left or right to rotate">
      <Animated.View style={[styles.shadow, { width: width * 0.62, transform: [{ scaleX: shadowScale }] }]} />
      <Animated.View style={{ transform: [{ translateY: bob }] }}>
        <Animated.View style={[styles.face, { opacity: frontOpacity, transform: [{ perspective: PERSPECTIVE }, { rotateY: deg(total) }] }]}>
          {face('front')}
        </Animated.View>
        <Animated.View
          style={[styles.face, styles.back, { opacity: backOpacity, transform: [{ perspective: PERSPECTIVE }, { rotateY: deg(Animated.add(total, 180)) }] }]}
        >
          {face('back')}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  face: { backfaceVisibility: 'hidden' },
  back: { ...StyleSheet.absoluteFillObject },
  faceInner: { alignItems: 'center' },
  shorts: { marginTop: -10 },
  shadow: {
    position: 'absolute',
    bottom: 2,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
