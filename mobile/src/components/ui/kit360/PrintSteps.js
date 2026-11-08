import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '../../../constants/theme';
import { formatMoney } from '../Common';

/**
 * Forma 360° o'lcham bosqichi: sotuvdagi o'lchamlar tugmalari.
 *
 * Props: t, sizes, value, onChange(size), hint
 */
export function SizeStep({ sizes, value, onChange, hint }) {
  return (
    <>
      <View style={styles.sizesGrid}>
        {sizes.map((size) => (
          <Pressable
            key={size}
            onPress={() => onChange(size)}
            style={[styles.sizeChip, value === size && styles.sizeChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: value === size }}
          >
            <Text style={[styles.sizeText, value === size && styles.sizeTextActive]}>{size}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </>
  );
}

/**
 * Forma 360° ism va raqam bosqichi (ixtiyoriy). Maydonga bosilsa forma orqasiga buriladi (onFocus).
 *
 * Props: t, name, number, onName, onNumber, onFocus, nameMaxLength, printPrice
 */
export function PrintStep({ t, name, number, onName, onNumber, onFocus, nameMaxLength = 30, printPrice }) {
  return (
    <View>
      <Text style={styles.optionSub}>{t('kitStepPrintSub')}</Text>
      <View style={styles.inputsRow}>
        <TextInput
          value={name}
          onChangeText={onName}
          placeholder={t('namePlaceholder')}
          placeholderTextColor={colors.dim}
          autoCapitalize="characters"
          maxLength={nameMaxLength}
          onFocus={onFocus}
          style={[styles.textInput, { flex: 1 }]}
        />
        <TextInput
          value={number}
          onChangeText={onNumber}
          placeholder="10"
          placeholderTextColor={colors.dim}
          keyboardType="number-pad"
          maxLength={2}
          onFocus={onFocus}
          style={[styles.textInput, styles.numberInput]}
        />
      </View>
      <Text style={styles.hint}>
        {t('printHint')} · +{formatMoney(printPrice)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sizesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm, marginTop: spacing.xs },
  sizeChip: {
    width: '31.5%',
    paddingVertical: 13,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sizeChipActive: { borderColor: colors.accent, backgroundColor: colors.accentGlow },
  sizeText: { color: colors.muted, fontSize: 15, fontWeight: '800' },
  sizeTextActive: { color: colors.accent, fontWeight: '900' },
  inputsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  textInput: {
    height: 50,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '800',
  },
  numberInput: { width: 84, textAlign: 'center', fontSize: 18 },
  hint: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
  optionSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
