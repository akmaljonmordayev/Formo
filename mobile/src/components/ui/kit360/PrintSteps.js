import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, themedStyles } from '../../../constants/theme';
import { formatMoney } from '../Common';

/**
 * Forma 360° o'lcham bosqichi: sotuvdagi o'lchamlar tugmalari. O'lcham tanlangach shu o'lchamdagi komplekt
 * narxi chiqadi (har o'lchamning o'z narxi bo'lishi mumkin) — tanlanmaguncha narx ko'rsatilmaydi.
 *
 * Omborda tugagan o'lcham (soldOut) tanlanmaydi: tugma o'chiq, ostida qizil "Tugagan"; hammasi tugagan bo'lsa —
 * qizil "Bu forma tugagan".
 *
 * Tugagan o'lcham bosilsa — onSoldOut(size) (ekran katta toast ko'rsatadi).
 *
 * Props: t, sizes ([{ size, soldOut }]), value, onChange(size), onSoldOut(size), hint, price (tanlangan o'lcham narxi | null), priceLabel
 */
export function SizeStep({ t, sizes, value, onChange, onSoldOut, hint, price, priceLabel }) {
  const allSoldOut = sizes.length > 0 && sizes.every((s) => s.soldOut);
  const someSoldOut = sizes.some((s) => s.soldOut);
  return (
    <>
      <View style={styles.sizesGrid}>
        {sizes.map(({ size, soldOut }) => (
          <Pressable
            key={size}
            onPress={() => (soldOut ? onSoldOut?.(size) : onChange(size))}
            style={[styles.sizeChip, value === size && styles.sizeChipActive, soldOut && styles.sizeChipSoldOut]}
            accessibilityRole="button"
            accessibilityLabel={soldOut ? `${size} · ${t('sizeSoldOut')}` : size}
            accessibilityState={{ selected: value === size, disabled: soldOut }}
          >
            <Text style={[styles.sizeText, value === size && styles.sizeTextActive, soldOut && styles.sizeTextSoldOut]}>{size}</Text>
            {soldOut ? <Text style={styles.soldOutText}>{t('sizeSoldOut')}</Text> : null}
          </Pressable>
        ))}
      </View>
      {allSoldOut ? (
        <Text style={styles.soldOutNote}>{t('kitSoldOut')}</Text>
      ) : someSoldOut ? (
        <Text style={styles.soldOutNote}>{t('sizeSoldOutHint')}</Text>
      ) : null}
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
  // Qaysi maydon faol — faol maydon to'liq sariq ramka va yengil nur bilan ajralib turadi
  const [focused, setFocused] = useState(null);
  const focus = (field) => () => {
    setFocused(field);
    onFocus?.();
  };
  const blur = () => setFocused(null);
  return (
    <View>
      <Text style={styles.optionSub}>{t('kitStepPrintSub')}</Text>
      <View style={styles.inputsRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>{t('printNameLabel')}</Text>
          <TextInput
            value={name}
            onChangeText={onName}
            placeholder={t('namePlaceholder')}
            placeholderTextColor={PLACEHOLDER}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            autoCapitalize="characters"
            maxLength={nameMaxLength}
            onFocus={focus('name')}
            onBlur={blur}
            accessibilityLabel={t('printNameLabel')}
            style={[styles.textInput, focused === 'name' && styles.textInputFocused]}
          />
        </View>
        <View>
          <Text style={styles.inputLabel}>{t('printNumberLabel')}</Text>
          <TextInput
            value={number}
            onChangeText={onNumber}
            placeholder="10"
            placeholderTextColor={PLACEHOLDER}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            keyboardType="number-pad"
            maxLength={2}
            onFocus={focus('number')}
            onBlur={blur}
            accessibilityLabel={t('printNumberLabel')}
            style={[styles.textInput, styles.numberInput, focused === 'number' && styles.textInputFocused]}
          />
        </View>
      </View>
      <Text style={styles.hint}>
        {t('printHint')} · +{formatMoney(printPrice)}
      </Text>
    </View>
  );
}

// Sariq placeholder — kiritilgan (oq) matndan farqlanishi uchun biroz shaffof
const PLACEHOLDER = 'rgba(242, 163, 58, 0.6)';

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
  sizeChipSoldOut: { paddingVertical: 6, borderColor: colors.danger, borderStyle: 'dashed', opacity: 0.85 },
  sizeTextSoldOut: { color: colors.dim, textDecorationLine: 'line-through' },
  soldOutText: { color: colors.danger, fontSize: 11, fontWeight: '800', marginTop: 1 },
  soldOutNote: { color: colors.danger, fontSize: 12, fontWeight: '700', marginTop: spacing.sm },
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
  inputLabel: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' },
  // Sariq ramka: maydon fonda ham aniq ko'rinadi (avval kulrang ramka deyarli ko'rinmasdi)
  textInput: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: 'rgba(242, 163, 58, 0.65)',
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '800',
  },
  textInputFocused: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  numberInput: { width: 84, textAlign: 'center', fontSize: 18 },
  hint: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
  optionSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
}));
