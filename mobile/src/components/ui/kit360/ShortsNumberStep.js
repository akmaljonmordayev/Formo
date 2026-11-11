import React from 'react';
import { Switch, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, themedStyles } from '../../../constants/theme';

/**
 * 3-bosqich: shortikka raqam. Toggle yoqilgan bo'lsa formaning orqasidagi raqam (2-bosqich) shortikka ham
 * bosiladi; o'chirilsa shortik raqamsiz. Raqam alohida kiritilmaydi — 2-bosqichdagi raqamning o'zi.
 *
 * pants — uzun yengli forma: shortik o'rniga shalvar (matnlar shunga mos).
 *
 * Props: t, enabled, onToggle(bool), number (formaning orqasidagi raqam), pants?
 */
export default function ShortsNumberStep({ t, enabled, onToggle, number, pants = false }) {
  const toggleLabel = t(pants ? 'pantsNumberToggle' : 'shortsNumberToggle');
  const offHint = t(pants ? 'pantsNumberOffHint' : 'shortsNumberOffHint');
  return (
    <View>
      <View style={styles.toggleRow}>
        <View style={[styles.toggleIcon, enabled && styles.toggleIconOn]}>
          <MaterialCommunityIcons name="numeric" size={20} color={enabled ? colors.primaryDark : colors.muted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>{toggleLabel}</Text>
          <Text style={styles.toggleSub}>{enabled ? t('shortsNumberOnHint') : offHint}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.switchOff, true: colors.accent }}
          thumbColor="#FFFFFF"
          accessibilityLabel={toggleLabel}
        />
      </View>

      {enabled ? (
        <View style={styles.displayRow}>
          <View style={[styles.display, !number && styles.displayEmpty]} accessibilityLabel={t(pants ? 'pantsNumber' : 'shortsNumber')}>
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
          <Text style={styles.offText}>{offHint}</Text>
        </View>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
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
}));
