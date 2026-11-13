import React from 'react';
import { Pressable, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, themedStyles } from '../../../constants/theme';
import Kit360Thumb from '../Kit360Thumb';

const OPTIONS = [
  { sleeve: 'LONG', variant: 'l', title: 'sleeveLong', sub: 'sleeveLongSub', icon: 'snowflake' },
  { sleeve: 'SHORT', variant: 'f', title: 'sleeveShort', sub: 'sleeveShortSub', icon: 'white-balance-sunny' },
];

/**
 * 1-bosqich (jamoaning ikkala turi bo'lsa): qishki — uzun yeng + shalvar, yozgi — kalta yeng + shortik.
 * Har kartada shu jamoaning o'sha turdagi surati. Narx bu yerda ko'rsatilmaydi — o'lcham tanlangach chiqadi.
 *
 * Props: t, team (kit360Id), value ('SHORT' | 'LONG' | null), onChange(sleeve)
 */
export default function KitTypeStep({ t, team, value, onChange }) {
  return (
    <View>
      <Text style={styles.sub}>{t('kitStepTypeSub')}</Text>
      <View style={styles.row}>
        {OPTIONS.map((o) => {
          const active = value === o.sleeve;
          return (
            <Pressable
              key={o.sleeve}
              onPress={() => onChange(o.sleeve)}
              style={[styles.card, active && styles.cardActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(o.title)}
            >
              <View style={styles.photo}>
                <Kit360Thumb team={team} variant={o.variant} zoom={1.25} />
                {active ? (
                  <View style={styles.check}>
                    <MaterialCommunityIcons name="check" size={14} color={colors.primaryDark} />
                  </View>
                ) : null}
              </View>
              <View style={styles.titleRow}>
                <MaterialCommunityIcons name={o.icon} size={15} color={active ? colors.accent : colors.muted} />
                <Text style={[styles.title, active && styles.titleActive]} numberOfLines={1}>
                  {t(o.title)}
                </Text>
              </View>
              <Text style={styles.cardSub} numberOfLines={2}>
                {t(o.sub)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  card: {
    flex: 1,
    padding: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardActive: { borderColor: colors.accent, backgroundColor: colors.accentGlow },
  photo: { height: 150, borderRadius: radii.md, overflow: 'hidden' },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  title: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '900' },
  titleActive: { color: colors.accent },
  cardSub: { color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 15 },
}));
