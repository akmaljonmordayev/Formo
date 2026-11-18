import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { darkColors as colors, fonts, radii, spacing } from '../../constants/theme';
import { languageOptions, languageTitle, useTranslation } from '../../i18n';

// Har til o'z yozuvida: belgisi va qisqa izohi (ro'yxatda tanlangan tildan qat'i nazar shunday ko'rinadi)
const META = {
  uz: { badge: 'UZ', hint: 'Lotin yozuvi' },
  uzn: { badge: 'ŌZ', hint: 'Yangi alifbo · Ō, Ḡ, Ş, Ç' },
  uzc: { badge: 'ЎЗ', hint: 'Кирилл ёзуви' },
  ru: { badge: 'RU', hint: 'Русский язык' },
  en: { badge: 'EN', hint: 'English' },
};

/**
 * Birinchi ochilishda — kirishdan ham oldin — ilova tilini tanlash. Tanlov darhol butun ilovaga qo'llanadi
 * (sarlavha va tugma ham shu zahoti tanlangan tilga o'tadi); "Davom etish" bosilgach boshqa ko'rinmaydi.
 * Keyin tilni Profil → "Ilova tili" orqali o'zgartirish mumkin.
 *
 * Props: initial (joriy til), onDone(code)
 */
export default function LanguageSelectScreen({ initial = 'uz', onDone }) {
  const [selected, setSelected] = useState(initial);
  const { t } = useTranslation(selected);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <Image source={require('../../../assets/formologo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="translate" size={26} color={colors.accent} />
        </View>
        <Text style={styles.title}>{languageTitle(selected)}</Text>
        <Text style={styles.sub}>{t('chooseLanguageSub')}</Text>

        <View style={styles.list} accessibilityRole="radiogroup">
          {languageOptions.map((option) => {
            const on = option.code === selected;
            const meta = META[option.code] || { badge: option.code.toUpperCase(), hint: '' };
            return (
              <Pressable
                key={option.code}
                onPress={() => setSelected(option.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={option.label}
                style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && styles.pressed]}
              >
                <View style={[styles.badge, on && styles.badgeOn]}>
                  <Text style={[styles.badgeText, on && styles.badgeTextOn]}>{meta.badge}</Text>
                </View>
                <View style={styles.optionBody}>
                  <Text style={styles.optionName} numberOfLines={1}>{option.label}</Text>
                  {meta.hint ? <Text style={styles.optionHint} numberOfLines={1}>{meta.hint}</Text> : null}
                </View>
                <View style={[styles.radio, on && styles.radioOn]}>
                  {on ? <MaterialCommunityIcons name="check" size={16} color={colors.primaryDark} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => onDone?.(selected)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{t('continueBtn')}</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color={colors.primaryDark} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.lg },
  pressed: { opacity: 0.85 },
  logo: { width: 120, height: 40, alignSelf: 'center', marginBottom: spacing.xxl },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentGlow,
    marginBottom: spacing.lg,
  },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 24, lineHeight: 32, marginBottom: spacing.sm },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginBottom: spacing.xxl },
  list: { gap: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionOn: { borderColor: colors.accent, backgroundColor: colors.surfaceRaised },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chip,
  },
  badgeOn: { backgroundColor: colors.accent },
  badgeText: { color: colors.textSecondary, fontFamily: fonts.bodySemi, fontSize: 14 },
  badgeTextOn: { color: colors.primaryDark },
  optionBody: { flex: 1, gap: 2 },
  optionName: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 16 },
  optionHint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg },
  cta: {
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaText: { color: colors.primaryDark, fontFamily: fonts.bodySemi, fontSize: 16 },
});
