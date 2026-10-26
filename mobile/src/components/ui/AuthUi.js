import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fonts } from '../../constants/theme';

/**
 * Kirish / ro'yxatdan o'tish ekranlari uchun umumiy bloklar — "Formo Prototip"
 * dizaynidagi o'lchamlar: orqaga 44×44 r14, tugma 56 r16, sarlavha 28/26 Unbounded.
 */
export const authColors = {
  // Asosiy ilova palitrasi bilan bir xil (constants/theme.js)
  bg: '#050818',
  field: '#0E1A3F',
  track: '#1B2560',
  line: 'rgba(243,245,249,0.12)',
  lineStrong: 'rgba(243,245,249,0.16)',
  text: '#F3F5F9',
  soft: '#CDD2E8',
  muted: '#A9B0D0',
  placeholder: '#6F77A0',
  accent: '#F2A33A',
  accentSoft: 'rgba(242,163,58,0.1)',
  teal: '#19A7A1',
  tealSoft: 'rgba(25,167,161,0.12)',
  tealText: '#9BE3DF',
  danger: '#E8543F',
  dangerSoft: 'rgba(232,84,63,0.1)',
  dangerText: '#FFC5C0',
};

export function BackButton({ onPress, label }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name="arrow-left" size={20} color={authColors.text} />
    </Pressable>
  );
}

/** Asosiy (to'q sariq konturli) tugma. `loading` paytida bosilmaydi. */
export function OutlineButton({ label, onPress, disabled, loading, arrow, glow, style }) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.primary,
        glow && styles.glow,
        pressed && !inactive && styles.primaryPressed,
        inactive && styles.dimmed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={authColors.accent} />
      ) : (
        <>
          <Text style={styles.primaryText}>{label}</Text>
          {arrow && <MaterialCommunityIcons name="arrow-right" size={18} color={authColors.accent} />}
        </>
      )}
    </Pressable>
  );
}

export function AuthTitle({ title, subtitle, size = 28, children }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={[styles.title, { fontSize: size, lineHeight: Math.round(size * 1.2) }]}>{title}</Text>
      {Boolean(subtitle) && <Text style={[styles.subtitle, size < 28 && styles.subtitleSmall]}>{subtitle}</Text>}
      {children}
    </View>
  );
}

/** `compact` — OTP demo eslatmasi (dizayn: ikonka 18, 13px, padding 12×14, r14). */
export function InfoNote({ icon, children, style, compact }) {
  return (
    <View style={[styles.note, compact && styles.noteCompact, style]}>
      <MaterialCommunityIcons name={icon} size={compact ? 18 : 22} color={authColors.tealText} />
      <Text style={[styles.noteText, compact && styles.noteTextCompact]}>{children}</Text>
    </View>
  );
}

export function ErrorNote({ children }) {
  return (
    <View style={styles.error} accessibilityLiveRegion="polite">
      <MaterialCommunityIcons name="alert-circle-outline" size={16} color={authColors.danger} />
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

/** "Ro'yxatdan o'tish · 1/3" sarlavhasi va 3 bo'lakli progress. */
export function StepHeader({ label, step, total, onBack, backLabel, onSkip, skipLabel }) {
  return (
    <View>
      <View style={styles.stepRow}>
        {Boolean(onBack) && <BackButton onPress={onBack} label={backLabel} />}
        <Text style={styles.stepLabel} numberOfLines={1}>{`${label} · ${step}/${total}`}</Text>
        {onSkip && (
          <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button">
            <Text style={styles.skip}>{skipLabel}</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.progress}>
        {Array.from({ length: total }, (_, i) => (
          <View key={`step-${i}`} style={[styles.bar, i < step && styles.barDone]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: authColors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: authColors.accent,
    backgroundColor: authColors.accentSoft,
  },
  // Soyani doimiy beramiz (holatga qarab yoqib-o'chirmaymiz) — Android'da
  // elevation almashsa native ko'rinish qayta yaratiladi.
  glow: {
    shadowColor: authColors.accent,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  primaryPressed: { backgroundColor: 'rgba(242,163,58,0.2)' },
  dimmed: { opacity: 0.45 },
  primaryText: { color: authColors.accent, fontFamily: fonts.bodySemi, fontSize: 16 },
  titleBlock: { gap: 10 },
  title: { color: authColors.text, fontFamily: fonts.display, letterSpacing: -0.28 },
  subtitle: { color: authColors.muted, fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  subtitleSmall: { fontSize: 15, lineHeight: 22 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: authColors.tealSoft,
  },
  noteCompact: { gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14 },
  noteText: { flex: 1, color: authColors.tealText, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  noteTextCompact: { fontSize: 13, lineHeight: 18 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,84,63,0.4)',
    backgroundColor: authColors.dangerSoft,
  },
  errorText: { flex: 1, color: authColors.dangerText, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 62,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  stepLabel: { flex: 1, color: authColors.muted, fontFamily: fonts.bodySemi, fontSize: 14 },
  skip: { color: authColors.muted, fontFamily: fonts.bodyMedium, fontSize: 14, paddingVertical: 12 },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: 20 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: authColors.track },
  barDone: { backgroundColor: authColors.accent },
});
