import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { radii } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

/** Yuklanish joy egasi: yumshoq "nafas oluvchi" blok (native driver — JS oqimi band bo'lmaydi) */
export default function Skeleton({ width, height, radius = radii.md, style }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={[
        { backgroundColor: colors.surfaceRaised },
        { width, height, borderRadius: radius, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }) },
        style,
      ]}
    />
  );
}
