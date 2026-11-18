import React from 'react';
import { Pressable, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, themedStyles } from '../../constants/theme';
import { languageOptions } from '../../i18n';

// Tugmadagi qisqa kod va nom (ro'yxatdagi to'liq nom — "Ōzbekça (yangi alifbo)" — tugmaga sig'maydi)
const SHORT = { uz: 'UZ', uzn: 'ŌZ', uzc: 'ЎЗ', ru: 'RU', en: 'EN' };
const NAMES = { uzn: 'Ōzbekça', uzc: 'Ўзбекча' };

/**
 * Ilova tili (profil sahifasida, ko'rinish almashtirgich ostida): ro'yxat emas — har bir til alohida
 * to'rtburchak tugma; bosilgan tugma tiliga darhol o'tiladi.
 *
 * Props: t, language, setLanguage
 */
export default function LanguagePicker({ t, language, setLanguage }) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="translate" size={20} color={colors.accent} />
        </View>
        <Text style={styles.title}>{t('language')}</Text>
      </View>
      <View style={styles.buttons} accessibilityRole="radiogroup">
        {languageOptions.map((option) => {
          const on = option.code === language;
          return (
            <Pressable
              key={option.code}
              onPress={() => setLanguage(option.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={option.label}
              style={({ pressed }) => [styles.btn, on && styles.btnOn, pressed && styles.pressed]}
            >
              <Text style={[styles.code, on && styles.codeOn]}>{SHORT[option.code]}</Text>
              <Text style={[styles.name, on && styles.nameOn]} numberOfLines={1}>
                {NAMES[option.code] || option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  pressed: { opacity: 0.8 },
  card: {
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentGlow,
  },
  title: { color: colors.text, fontSize: 14, fontWeight: '800' },
  // 2 × 2: tor ekranda ham til nomi to'liq sig'adi
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  btn: {
    flexGrow: 1,
    flexBasis: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  btnOn: { backgroundColor: colors.accentGlow, borderColor: colors.accent },
  code: { color: colors.muted, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  codeOn: { color: colors.accent },
  name: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' },
  nameOn: { color: colors.accent, fontWeight: '900' },
}));
