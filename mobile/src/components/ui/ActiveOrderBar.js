import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../../constants/theme';
import { STAGE_COUNT, stageOf, statusTone } from './StatusPill';

/**
 * Bosh sahifa pastida (tab paneli ustida) qotib turadigan faol buyurtma kartasi: holat, 4 bosqichli
 * progress va "kuzatish". Pastdan sirpanib chiqadi; joriy bosqich nuqtasi "nafas oladi".
 *
 * Props: t, order ({ id, code, status }), label (joriy tildagi holat nomi), bottom, onPress
 */
export default function ActiveOrderBar({ t, order, label, bottom = 0, onPress }) {
  const enter = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enter, pulse]);

  const tone = statusTone(order.status);
  const current = stageOf(order.status);
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [120, 0] });

  return (
    <Animated.View style={[styles.wrap, { bottom, opacity: enter, transform: [{ translateY }] }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${t('orderBarTitle')} ${order.code}: ${label}`}
        style={({ pressed }) => [styles.card, { borderColor: tone.border }, pressed && styles.pressed]}
      >
        <View style={[styles.iconBox, { backgroundColor: tone.bg }]}>
          <Animated.View
            style={[
              styles.halo,
              {
                borderColor: tone.color,
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
              },
            ]}
          />
          <MaterialCommunityIcons name={tone.icon} size={22} color={tone.color} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.overline} numberOfLines={1}>
            {t('orderBarTitle')} · {order.code}
          </Text>
          <Text style={[styles.status, { color: tone.color }]} numberOfLines={1}>
            {label}
          </Text>
          <View style={styles.progress}>
            {Array.from({ length: STAGE_COUNT }, (_, i) => (
              <View
                key={i}
                style={[styles.segment, i <= current && { backgroundColor: tone.color }, i === current && styles.segmentCurrent]}
              />
            ))}
          </View>
        </View>

        <View style={styles.track}>
          <Text style={styles.trackText}>{t('track')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.accent} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surfaceRaised,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 46, height: 46, borderRadius: 14, borderWidth: 2 },
  copy: { flex: 1 },
  overline: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  status: { fontSize: 15, fontWeight: '900', marginTop: 2 },
  progress: { flexDirection: 'row', gap: 4, marginTop: 8 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  segmentCurrent: { opacity: 0.85 },
  track: { flexDirection: 'row', alignItems: 'center' },
  trackText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
});
