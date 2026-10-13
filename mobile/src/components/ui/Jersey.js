import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Pattern,
  ClipPath,
  G,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

// Login sahifasidagi forma: orqa tomonida ism + raqam, old tomonida Formo gerbi.
// `flipped` bo'lsa forma old tomoniga "buriladi" (parol kiritilayotganda raqam yashirinadi).
// Burilish 3D rotateY emas, crossfade + gorizontal siqilish bilan qilinadi — Android'da
// backfaceVisibility ishonchsiz ishlaydi va matn oynada teskari ko'rinib qoladi.
// Ported from frontend/src/pages/Login/Jersey.jsx (SVG -> react-native-svg).

const SHIRT =
  'M96 22 Q150 46 204 22 L268 50 L294 122 L248 140 L240 112 L240 318 Q150 334 60 318 L60 112 L52 140 L6 122 L32 50 Z';

export const KITS = [
  { id: 'tun', name: 'Tun', from: '#0E1A3F', to: '#1D2F8C', trim: '#F2A33A', ink: '#F3F5F9' },
  { id: 'afrosiyob', name: 'Afrosiyob', from: '#19A7A1', to: '#9184D9', trim: '#F3F5F9', ink: '#080C24' },
  { id: 'anor', name: 'Anor', from: '#B8323F', to: '#5B1530', trim: '#F2A33A', ink: '#F3F5F9' },
  { id: 'qum', name: 'Qum', from: '#F2A33A', to: '#E0662E', trim: '#0E1A3F', ink: '#0E1A3F' },
];

function Side({ kit, id, children }) {
  return (
    <Svg viewBox="0 0 300 340" style={styles.svg}>
      <Defs>
        <SvgLinearGradient id={`kit-${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={kit.from} />
          <Stop offset="1" stopColor={kit.to} />
        </SvgLinearGradient>
        <Pattern id={`weave-${id}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <Path d="M0 6 L6 0" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        </Pattern>
        <ClipPath id={`clip-${id}`}>
          <Path d={SHIRT} />
        </ClipPath>
      </Defs>

      <Path d={SHIRT} fill={`url(#kit-${id})`} />
      <Path d={SHIRT} fill={`url(#weave-${id})`} />

      <G clipPath={`url(#clip-${id})`}>
        {/* yeng manjetlari */}
        <Path d="M6 122 L52 140 L56 126 L11 108 Z" fill={kit.trim} />
        <Path d="M294 122 L248 140 L244 126 L289 108 Z" fill={kit.trim} />
        {/* yon chiziqlar */}
        <Rect x="60" y="112" width="7" height="220" fill={kit.trim} opacity="0.85" />
        <Rect x="233" y="112" width="7" height="220" fill={kit.trim} opacity="0.85" />
        {children}
      </G>

      {/* tikuv choklari */}
      <G fill="none" stroke={kit.ink} strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="4 4">
        <Path d="M66 304 Q150 318 234 304" />
        <Path d="M60 112 L68 60" />
        <Path d="M240 112 L232 60" />
        <Path d="M16 112 L54 128" />
        <Path d="M284 112 L246 128" />
      </G>
      <Path d={SHIRT} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
    </Svg>
  );
}

export default function Jersey({ kit, name, number, flipped, error, size = 240 }) {
  const shown = error ? '!!' : number;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: flipped ? 1 : 0,
      duration: 420,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [flipped, progress]);

  const cardStyle = {
    transform: [
      {
        scaleX: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.12, 1] }),
      },
    ],
  };
  const backStyle = {
    opacity: progress.interpolate({ inputRange: [0, 0.4, 0.6, 1], outputRange: [1, 1, 0, 0] }),
  };
  const frontStyle = {
    opacity: progress.interpolate({ inputRange: [0, 0.4, 0.6, 1], outputRange: [0, 0, 1, 1] }),
  };

  const hangerWidth = Math.round(size * 0.46);

  return (
    <View style={[styles.jersey, { width: size }]}>
      <View style={[styles.hanger, { width: hangerWidth, marginLeft: -hangerWidth / 2 }]} />
      <View style={styles.hook} />
      <Animated.View style={[styles.card, cardStyle]}>
        <Animated.View style={[styles.face, backStyle]}>
          <Side kit={kit} id="back">
            <Path d="M96 22 Q150 46 204 22 Q150 58 96 22 Z" fill={kit.trim} />
            <SvgText x="150" y="104" textAnchor="middle" fill={kit.ink} fontSize="30" fontWeight="800">
              {name}
            </SvgText>
            <SvgText
              x="150"
              y="250"
              textAnchor="middle"
              fill={error ? '#FF5A67' : kit.ink}
              fontSize="150"
              fontWeight="800"
            >
              {shown}
            </SvgText>
          </Side>
        </Animated.View>

        <Animated.View style={[styles.face, frontStyle]}>
          <Side kit={kit} id="front">
            <Path d="M118 22 L150 70 L182 22 Q150 40 118 22 Z" fill={kit.trim} />
            {/* gerb */}
            <G transform="translate(196 92)">
              <Path d="M0 0 H30 V22 Q30 36 15 42 Q0 36 0 22 Z" fill={kit.trim} />
              <SvgText x="15" y="27" textAnchor="middle" fill={kit.from} fontSize="18" fontWeight="800">
                F
              </SvgText>
            </G>
            <SvgText x="150" y="196" textAnchor="middle" fill={kit.ink} fontSize="34" fontWeight="800">
              FORMO
            </SvgText>
            <SvgText x="150" y="222" textAnchor="middle" fill={kit.ink} fontSize="9" fontWeight="600">
              JAMOANGIZ RANGIDA
            </SvgText>
          </Side>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  jersey: {
    aspectRatio: 300 / 360,
    alignSelf: 'center',
  },
  svg: { width: '100%', height: '100%' },
  hanger: {
    position: 'absolute',
    top: -6,
    left: '50%',
    height: 30,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: 'rgba(243,245,249,0.5)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  hook: {
    position: 'absolute',
    top: -22,
    left: '50%',
    width: 14,
    height: 20,
    marginLeft: -7,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: 'rgba(243,245,249,0.5)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  card: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    bottom: 0,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});