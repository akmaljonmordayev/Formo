import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, themedStyles } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const TRACK_W = 64;
const TRACK_H = 34;
const KNOB = 28;

/**
 * Ko'rinish almashtirgich (profil sahifasida, ko'zga tashlanadigan joyda): chapda belgi va joriy mavzu nomi,
 * o'ngda oy/quyosh tugmachali animatsion toggle. Butun qator bosiladi.
 *
 * Props: t
 */
export default function ThemeToggle({ t }) {
  const { theme, toggleTheme } = useTheme();
  const light = theme === 'light';
  const anim = useRef(new Animated.Value(light ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: light ? 1 : 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [anim, light]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [3, TRACK_W - KNOB - 3] });

  return (
    <Pressable
      onPress={toggleTheme}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="switch"
      accessibilityState={{ checked: light }}
      accessibilityLabel={t('themeSection')}
    >
      <View style={styles.icon}>
        <MaterialCommunityIcons name={light ? 'white-balance-sunny' : 'weather-night'} size={20} color={colors.accent} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.title}>{t(light ? 'themeLight' : 'themeDark')}</Text>
        <Text style={styles.sub}>{t('themeToggleSub')}</Text>
      </View>
      <View style={[styles.track, light && styles.trackOn]}>
        <MaterialCommunityIcons name="weather-night" size={14} color={colors.muted} style={styles.trackIconLeft} />
        <MaterialCommunityIcons name="white-balance-sunny" size={14} color={colors.muted} style={styles.trackIconRight} />
        <Animated.View style={[styles.knob, { transform: [{ translateX }] }]}>
          <MaterialCommunityIcons name={light ? 'white-balance-sunny' : 'weather-night'} size={16} color={colors.primaryDark} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentGlow,
  },
  title: { color: colors.text, fontSize: 14, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: colors.accentGlow, borderColor: colors.accent },
  trackIconLeft: { position: 'absolute', left: 9 },
  trackIconRight: { position: 'absolute', right: 9 },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
