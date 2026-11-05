import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../../../constants/theme';

/**
 * 3-bosqich: shortikka raqam. Toggle yoqilgan bo'lsa formaning orqasidagi raqam (2-bosqich) shortikka ham
 * bosiladi; o'chirilsa shortik raqamsiz. Raqam alohida kiritilmaydi — 2-bosqichdagi raqamning o'zi.
 *
 * Props: t, enabled, onToggle(bool), number (formaning orqasidagi raqam)
 */
export default function ShortsNumberStep({ t, enabled, onToggle, number }) {
  return (
    <View>
      <View style={styles.toggleRow}>
        <View style={[styles.toggleIcon, enabled && styles.toggleIconOn]}>
          <MaterialCommunityIcons name="numeric" size={20} color={enabled ? colors.primaryDark : colors.muted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>{t('shortsNumberToggle')}</Text>
          <Text style={styles.toggleSub}>{enabled ? t('shortsNumberOnHint') : t('shortsNumberOffHint')}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: '#2A3160', true: colors.accent }}
          thumbColor="#FFFFFF"
          accessibilityLabel={t('shortsNumberToggle')}
        />
      </View>

      {enabled ? (
        <View style={styles.displayRow}>
          <View style={[styles.display, !number && styles.displayEmpty]} accessibilityLabel={t('shortsNumber')}>
            <Text style={[styles.displayText, !number && styles.displayPlaceholder]}>{number || '—'}</Text>
          </View>
          <View style={styles.displaySide}>
            <Text style={styles.free}>{t('free')}</Text>
            <Text style={styles.sameNote}>{number ? t('shortsNumberSame').replace('{n}', number) : t('shortsNumberEmpty')}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.offCard}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.tealLight} />
          <Text style={styles.offText}>{t('shortsNumberOffHint')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleIconOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  toggleSub: { color: colors.muted, fontSize: 11, marginTop: 2, lineHeight: 15 },
  displayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  display: {
    width: 96,
    height: 64,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayEmpty: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  displayText: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  displayPlaceholder: { color: colors.dim },
  displaySide: { flex: 1, gap: 6 },
  free: { color: colors.tealLight, fontSize: 12, fontWeight: '800' },
  sameNote: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  offCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  offText: { flex: 1, color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
});
