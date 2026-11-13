import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, themedStyles } from '../../constants/theme';
import { languageOptions } from '../../i18n';

// Sarlavhadagi tugmada qisqa kod
const SHORT = { uz: 'UZ', uzn: 'ŌZ', ru: 'RU', en: 'EN' };

/**
 * Sarlavhadagi til tanlagich (savat tugmasi yonida): "UZ ▾" — bosilsa tepadan kichik ro'yxat ochiladi.
 *
 * Props: t, language, setLanguage
 */
export default function LanguagePicker({ t, language, setLanguage }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={t('language')}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="translate" size={16} color={colors.accent} />
        <Text style={styles.code}>{SHORT[language] || 'UZ'}</Text>
        <MaterialCommunityIcons name="chevron-down" size={14} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>{t('language')}</Text>
            {languageOptions.map((option) => {
              const on = option.code === language;
              return (
                <Pressable
                  key={option.code}
                  onPress={() => {
                    setLanguage(option.code);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.item, on && styles.itemOn, pressed && styles.pressed]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.itemCode, on && styles.itemTextOn]}>{SHORT[option.code]}</Text>
                  <Text style={[styles.itemText, on && styles.itemTextOn]} numberOfLines={1}>{option.label}</Text>
                  {on ? <MaterialCommunityIcons name="check" size={18} color={colors.accent} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = themedStyles(() => ({
  pressed: { opacity: 0.75 },
  btn: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  code: { color: colors.text, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  backdrop: { flex: 1, backgroundColor: 'rgba(5, 8, 24, 0.45)', alignItems: 'flex-end', paddingTop: 100, paddingHorizontal: spacing.lg },
  menu: {
    width: 240,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  menuTitle: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', padding: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 11, paddingHorizontal: spacing.md, borderRadius: radii.md },
  itemOn: { backgroundColor: colors.accentGlow },
  itemCode: { width: 26, color: colors.muted, fontSize: 12, fontWeight: '900' },
  itemText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  itemTextOn: { color: colors.accent },
}));
