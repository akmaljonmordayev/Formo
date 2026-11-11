import React from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ErrorNote } from '../ui/AuthUi';
import { Button } from '../ui/Common';
import { KeyboardAwareScrollView } from '../ui/KeyboardAware';
import { colors, fonts, radii, spacing, themedStyles } from '../../constants/theme';
import { ADDRESS_LIMITS, formatFullAddress } from '../../features/location';

const LABEL_KEYS = ['addrLabelHome', 'addrLabelWork'];

/**
 * Manzil qo'shishning oxirgi bosqichi — aniq manzil: mahalla/ko'cha, uy raqami (majburiy), xonadon,
 * manzil nomi (Uy/Ish) va "asosiy" belgisi. Tepada kuryer/admin ko'radigan to'liq manzil ko'rinishi.
 *
 * Props: t, form ({ region, district, address, house, apartment, label, isDefault, coords }),
 *        onChange(patch), errors ({ field: i18nKey }), saveError, saving, onEditPoint(), onSave()
 */
export default function DetailsStep({ t, form, onChange, errors, saveError, saving, onEditPoint, onSave, bottomInset = 0 }) {
  const preview = formatFullAddress(form, t);
  const customLabel = LABEL_KEYS.some((k) => t(k) === form.label) ? '' : form.label;

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Kuryer/admin ko'radigan manzil + xaritadagi nuqta */}
        <View style={styles.preview}>
          <View style={styles.previewIcon}>
            <MaterialCommunityIcons name="map-marker-check" size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.previewLabel}>{t('addrPreview')}</Text>
            <Text style={styles.previewText}>{preview || t('locationNoAddress')}</Text>
            <Pressable onPress={onEditPoint} hitSlop={8} style={styles.previewLink} accessibilityRole="button">
              <MaterialCommunityIcons name="map-outline" size={14} color={colors.accent} />
              <Text style={styles.previewLinkText}>{t('addrChangePoint')}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.label}>{t('addrStreet')}</Text>
        <TextInput
          value={form.address}
          onChangeText={(v) => onChange({ address: v, addressEdited: true })}
          placeholder={t('addrStreetPlaceholder')}
          placeholderTextColor={colors.dim}
          maxLength={ADDRESS_LIMITS.address}
          multiline
          selectionColor={colors.accent}
          style={[styles.input, styles.inputMulti, errors.address && styles.inputError]}
        />
        {errors.address ? <Text style={styles.fieldError}>{t(errors.address)}</Text> : null}

        <View style={styles.pair}>
          <View style={styles.flex}>
            <Text style={styles.label}>{t('addrHouse')}</Text>
            <TextInput
              value={form.house}
              onChangeText={(v) => onChange({ house: v, houseEdited: true })}
              placeholder={t('addrHousePlaceholder')}
              placeholderTextColor={colors.dim}
              maxLength={ADDRESS_LIMITS.house}
              autoCapitalize="characters"
              selectionColor={colors.accent}
              style={[styles.input, errors.house && styles.inputError]}
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.label}>{t('addrApartment')}</Text>
            <TextInput
              value={form.apartment}
              onChangeText={(v) => onChange({ apartment: v })}
              placeholder={t('addrApartmentPlaceholder')}
              placeholderTextColor={colors.dim}
              maxLength={ADDRESS_LIMITS.apartment}
              selectionColor={colors.accent}
              style={[styles.input, errors.apartment && styles.inputError]}
            />
          </View>
        </View>
        {errors.house ? <Text style={styles.fieldError}>{t(errors.house)}</Text> : null}
        {errors.apartment ? <Text style={styles.fieldError}>{t(errors.apartment)}</Text> : null}
        <Text style={styles.hint}>{t('addrExactHint')}</Text>

        <Text style={styles.label}>{t('addrLabel')}</Text>
        <View style={styles.chips}>
          {LABEL_KEYS.map((key) => {
            const value = t(key);
            const on = form.label === value;
            return (
              <Pressable key={key} onPress={() => onChange({ label: value })} style={[styles.chip, on && styles.chipOn]}>
                <MaterialCommunityIcons
                  name={key === 'addrLabelHome' ? 'home-outline' : 'briefcase-outline'}
                  size={16}
                  color={on ? colors.primaryDark : colors.muted}
                />
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{value}</Text>
              </Pressable>
            );
          })}
          <TextInput
            value={customLabel}
            onChangeText={(v) => onChange({ label: v })}
            placeholder={t('addrLabelOther')}
            placeholderTextColor={colors.dim}
            maxLength={ADDRESS_LIMITS.label}
            selectionColor={colors.accent}
            style={[styles.chip, styles.chipInput, errors.label && styles.inputError]}
          />
        </View>
        {errors.label ? <Text style={styles.fieldError}>{t(errors.label)}</Text> : null}

        <View style={styles.defaultRow}>
          <Text style={styles.defaultText}>{t('addrMakeDefault')}</Text>
          <Switch
            value={form.isDefault}
            onValueChange={(v) => onChange({ isDefault: v })}
            trackColor={{ false: colors.border, true: colors.accentGlow }}
            thumbColor={form.isDefault ? colors.accent : colors.dim}
          />
        </View>

        {errors.coords ? <Text style={styles.fieldError}>{t(errors.coords)}</Text> : null}
        {saveError ? <ErrorNote>{saveError}</ErrorNote> : null}
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, 14) }]}>
        <Button size="large" onPress={onSave} disabled={saving} style={styles.save}>
          {saving ? t('saving') : t('addressConfirm')}
        </Button>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 24 },
  preview: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.accentGlow,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  previewIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  previewLabel: { color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  previewText: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 21, marginTop: 4 },
  previewLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, alignSelf: 'flex-start' },
  previewLinkText: { color: colors.accent, fontFamily: fonts.bodySemi, fontSize: 13 },
  label: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: spacing.lg, marginBottom: 6 },
  input: {
    minHeight: 50,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  inputMulti: { minHeight: 64, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  pair: { flexDirection: 'row', gap: spacing.md },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 8 },
  fieldError: { color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  chipText: { color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 14 },
  chipTextOn: { color: colors.primaryDark },
  chipInput: { flex: 1, minWidth: 110, paddingVertical: 0, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  defaultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  defaultText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 14 },
  footer: { paddingHorizontal: spacing.xl, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  save: { alignSelf: 'stretch' },
}));
