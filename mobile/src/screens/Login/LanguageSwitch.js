import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { languageOptions } from '../../i18n';

// Tillar ro'yxati (uz/ru/en) — auth ekranlarining yuqori o'ng burchagida.
export default function LanguageSwitch({ language, onChange }) {
  return (
    <View style={styles.row}>
      {languageOptions.map(({ code }) => {
        const active = code === language;
        return (
          <Pressable
            key={code}
            onPress={() => onChange(code)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={6}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{code.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  pill: {
    minWidth: 34,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(169,176,208,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: '#F2A33A', borderColor: '#F2A33A' },
  text: { color: '#A9B0D0', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  textActive: { color: '#0E1A3F' },
});