import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, themedStyles } from '../../../constants/theme';
import { formatMoney } from '../Common';

/**
 * Forma 360° o'lcham bosqichi: sotuvdagi o'lchamlar tugmalari. O'lcham tanlangach shu o'lchamdagi komplekt
 * narxi chiqadi (har o'lchamning o'z narxi bo'lishi mumkin) — tanlanmaguncha narx ko'rsatilmaydi.
 *
 * Props: sizes, value, onChange(size), hint, price (tanlangan o'lcham narxi | null), priceLabel
 */
export function SizeStep({ sizes, value, onChange, hint, price, priceLabel }) {
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
      {value && price != null ? (
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel} numberOfLines={1}>{`${value} · ${priceLabel}`}</Text>
          <Text style={styles.priceValue}>{formatMoney(price)}</Text>
        </View>
      ) : null}
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

const styles = themedStyles(() => ({
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  priceLabel: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '800' },
  priceValue: { color: colors.accent, fontSize: 18, fontWeight: '900' },
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
}));
