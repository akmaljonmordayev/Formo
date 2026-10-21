import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

export default function SplashScreen({ onFinish }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1600,
      useNativeDriver: false,
    }).start(() => {
      onFinish?.();
    });
  }, [onFinish, progress]);

  const widthInterpolation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['15%', '100%'],
  });

  return (
    <Pressable style={styles.container} onPress={onFinish}>
      <View style={styles.glow} />

      {/* Logo container */}
      <View style={styles.logoWrap}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="tshirt-crew" size={48} color={colors.accent} />
        </View>
        <Text style={styles.brandTitle}>Formo</Text>
      </View>

      <Text style={styles.subtitle}>O‘z formangni yarat</Text>

      {/* Loading bar */}
      <View style={styles.barBackground}>
        <Animated.View style={[styles.barFill, { width: widthInterpolation }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050818',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(29, 47, 140, 0.45)',
    shadowColor: '#1D2F8C',
    shadowOpacity: 0.9,
    shadowRadius: 80,
    elevation: 20,
  },
  logoWrap: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: 24,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#F3F5F9',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#A9B0D0',
    marginTop: 12,
    fontWeight: '500',
  },
  barBackground: {
    position: 'absolute',
    bottom: 48,
    width: 140,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1B2560',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
});
