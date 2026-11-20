import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, spacing, themedStyles } from '../../constants/theme';
import { OrderStepper, STAGE_COUNT, stageOf, statusTone } from './StatusPill';

// Holat → mijozga tushuntirish matni (i18n kaliti)
const DESC = {
  PENDING_PAYMENT: 'stageDescPay',
  NEW: 'stageDescSent',
  SENT_TO_WORKSHOP: 'stageDescAccepted',
  ACCEPTED: 'stageDescInProgress',
  PRINTING: 'stageDescInProgress',
  QUALITY_CHECK: 'stageDescInProgress',
  READY: 'stageDescInProgress',
  DELIVERING: 'stageDescDelivering',
  DELIVERED: 'stageDescDelivered',
  CANCELLED: 'stageDescCancelled',
  RETURNED: 'stageDescCancelled',
};

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
// Bugun bo'lsa — faqat soat; oldingi kunlarda sana bilan (aks holda 3 kun oldingisi "bugun ertalab" bo'lib ko'rinadi)
const isToday = (d) => d.toDateString() === new Date().toDateString();

/** Doimiy "nafas oluvchi" halqa — buyurtma hali harakatda ekani bilinib tursin */
function usePulse(enabled) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) return undefined;
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, value]);
  return value;
}

/**
 * Buyurtma tafsilotining premium holat kartasi: rangli gradient fon, jonli halqali katta belgi,
 * holat nomi + tushuntirish, bosqich progressi va 4 bosqichli kuzatish.
 * `flashKey` o'zgarganda (holat yangilanganda) karta bir marta "sakraydi" — o'zgarish ko'zga tashlansin.
 *
 * Props: t, status, label, updatedAt (Date | null), flashKey
 */
export default function OrderStatusHero({ t, status, label, updatedAt, updatedText, flashKey }) {
  const tone = statusTone(status);
  const stage = stageOf(status);
  const stopped = stage < 0;
  const delivered = stage >= STAGE_COUNT;
  const live = !stopped && !delivered;
  const pulse = usePulse(live);

  const progress = stopped ? 0 : Math.min(1, (stage + 1) / STAGE_COUNT);
  const bar = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    Animated.timing(bar, { toValue: progress, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [bar, progress]);

  const bump = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    Animated.sequence([
      Animated.timing(bump, { toValue: 1.04, duration: 160, useNativeDriver: true }),
      Animated.spring(bump, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [flashKey, bump]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <Animated.View style={[styles.wrap, { borderColor: tone.border, shadowColor: tone.color, transform: [{ scale: bump }] }]}>
      <LinearGradient
        colors={[`${tone.color}38`, `${tone.color}0D`, colors.surfaceRaised]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.topRow}>
          {live ? (
            <View style={[styles.livePill, { borderColor: tone.border }]}>
              <View style={[styles.liveDot, { backgroundColor: tone.color }]} />
              <Text style={[styles.liveText, { color: tone.color }]}>{t('liveTracking')}</Text>
            </View>
          ) : (
            <View />
          )}
          {updatedAt ? (
            <Text style={styles.updated}>
              {t('updatedAt')} · {isToday(updatedAt) ? hhmm(updatedAt) : updatedText || hhmm(updatedAt)}
            </Text>
          ) : null}
        </View>

        <View style={styles.head}>
          <View style={styles.iconWrap}>
            {live ? (
              <Animated.View
                style={[styles.ring, { borderColor: tone.color, opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
              />
            ) : null}
            <View style={[styles.icon, { backgroundColor: tone.color, shadowColor: tone.color }]}>
              <MaterialCommunityIcons name={tone.icon} size={30} color={colors.primaryDark} />
            </View>
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: tone.color }]} numberOfLines={2}>
              {label}
            </Text>
            <Text style={styles.desc}>{t(DESC[status] || 'stageDescSent')}</Text>
          </View>
        </View>

        {stopped ? null : (
          <>
            <View style={styles.progressHead}>
              <Text style={styles.progressText}>
                {t('stageProgress').replace('{n}', Math.min(stage + 1, STAGE_COUNT)).replace('{total}', STAGE_COUNT)}
              </Text>
              <Text style={[styles.progressPct, { color: tone.color }]}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.track}>
              <Animated.View
                style={[
                  styles.fill,
                  { backgroundColor: tone.color, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                ]}
              />
            </View>
            <View style={styles.stepper}>
              <OrderStepper t={t} status={status} />
            </View>
          </>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    marginBottom: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surfaceRaised,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  gradient: { borderRadius: radii.lg, padding: spacing.lg, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  updated: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  iconWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 2 },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  copy: { flex: 1 },
  title: { fontSize: 22, fontFamily: fonts.bodySemi, fontWeight: '900', letterSpacing: 0.2 },
  desc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: 6 },
  progressText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  progressPct: { fontSize: 12, fontWeight: '900' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  stepper: { marginTop: spacing.lg },
}));
