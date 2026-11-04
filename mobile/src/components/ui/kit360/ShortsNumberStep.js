import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../../../constants/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'erase'];

/**
 * 3-bosqich: shortikka raqam. Yonida toggle — yoqilgan bo'lsa raqam (odatda formaning orqasidagi raqam,
 * oldindan qo'yiladi) shortikka ham bosiladi; o'chirilsa shortik raqamsiz.
 * Raqam o'z paneli bilan kiritiladi (tizim klaviaturasi 360° ko'rinishni yopmasin).
 *
 * Props: t, enabled, onToggle(bool), value, onDigit(d), onErase(), onClear(), backNumber, onUseBack()
 */
export default function ShortsNumberStep({ t, enabled, onToggle, value, onDigit, onErase, onClear, backNumber, onUseBack }) {
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
        <>
          <View style={styles.displayRow}>
            <View style={[styles.display, !value && styles.displayEmpty]} accessibilityLabel={t('shortsNumberToggle')}>
              <Text style={[styles.displayText, !value && styles.displayPlaceholder]}>{value || '—'}</Text>
            </View>
            <View style={styles.displaySide}>
              <Text style={styles.free}>{t('free')}</Text>
              {backNumber && backNumber !== value ? (
                <Pressable onPress={onUseBack} style={styles.sameChip} accessibilityRole="button">
                  <MaterialCommunityIcons name="tshirt-crew-outline" size={14} color={colors.accent} />
                  <Text style={styles.sameChipText}>{t('shortsNumberSame').replace('{n}', backNumber)}</Text>
                </Pressable>
              ) : backNumber ? (
                <Text style={styles.sameNote}>{t('shortsNumberSame').replace('{n}', backNumber)}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.numpad}>
            {KEYS.map((k) => (
              <Pressable
                key={k}
                onPress={() => (k === 'erase' ? onErase() : k === 'clear' ? onClear() : onDigit(k))}
                style={({ pressed }) => [styles.numKey, pressed && styles.numKeyPressed]}
                accessibilityRole="button"
                accessibilityLabel={k === 'erase' ? '⌫' : k === 'clear' ? t('clear') : k}
              >
                {k === 'erase' ? (
                  <MaterialCommunityIcons name="backspace-outline" size={20} color={colors.text} />
                ) : k === 'clear' ? (
                  <Text style={styles.numKeySmall}>{t('clear')}</Text>
                ) : (
                  <Text style={styles.numKeyText}>{k}</Text>
                )}
              </Pressable>
            ))}
          </View>
        </>
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
  sameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  sameChipText: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  sameNote: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
    marginTop: spacing.md,
  },
  numKey: {
    width: '31.5%',
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numKeyPressed: { backgroundColor: colors.surfaceSubtle, borderColor: colors.accent },
  numKeyText: { color: colors.text, fontSize: 20, fontWeight: '800' },
  numKeySmall: { color: colors.muted, fontSize: 12, fontWeight: '800' },
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
