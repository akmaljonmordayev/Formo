import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, screenStyles, spacing } from '../../constants/theme';

export function Screen({ children, scroll = true, contentStyle, footer, footerStyle }) {
  const Content = scroll ? ScrollView : View;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={screenStyles.safe}>
      <Content
        contentContainerStyle={scroll ? [screenStyles.content, contentStyle] : undefined}
        style={!scroll ? [screenStyles.content, contentStyle] : undefined}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Content>
      {footer ? <View style={[styles.footer, footerStyle]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, overline, onBack, right, logo }) {
  const hasLead = Boolean(onBack || logo);
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.iconButton} hitSlop={8}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </Pressable>
      ) : logo ? (
        <View style={styles.iconButton} />
      ) : null}
      <View style={[styles.headerCopy, hasLead && styles.headerCopyLead]}>
        {overline ? <Text style={styles.headerOverline}>{overline}</Text> : null}
        <Text style={[styles.title, onBack && styles.titleSmall]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export function Button({ children, onPress, variant = 'primary', small = false, disabled = false, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'danger' && styles.dangerButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          small && styles.buttonSmallText,
          variant === 'secondary' && styles.secondaryText,
          variant === 'danger' && styles.dangerText,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function Segment({ options, value, onChange, wide = false, style }) {
  return (
    <View style={[styles.segment, style]}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.segmentItem, wide && styles.segmentItemWide, active && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Overline({ children, style }) {
  return <Text style={[styles.overline, style]}>{children}</Text>;
}

export function SectionTitle({ eyebrow, title, action, onAction }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function formatMoney(value) {
  return `${Number(value).toLocaleString('uz-UZ')} so‘m`;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#141A3E',
    borderWidth: 1,
    borderColor: '#232A57',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  headerCopyLead: { marginLeft: spacing.md },
  headerRight: { marginLeft: 10 },
  headerOverline: { color: '#7C86AE', fontSize: 12, fontWeight: '600', marginBottom: 3 },
  title: { color: colors.text, fontSize: 27, fontWeight: '800', letterSpacing: -0.4 },
  titleSmall: { fontSize: 18, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  overline: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.sm },
  button: {
    backgroundColor: '#0E1330',
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  buttonSmall: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  buttonText: { color: colors.accent, fontWeight: '800', fontSize: 14 },
  buttonSmallText: { fontSize: 12 },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text },
  dangerButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E8543F' },
  dangerText: { color: '#E8543F' },
  buttonDisabled: { opacity: 0.55 },
  pressed: { opacity: 0.72 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#12173A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1D2350',
    padding: 3,
    alignSelf: 'flex-start',
  },
  segmentItem: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  segmentItemWide: { flex: 1, alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#0E1330', borderWidth: 1, borderColor: colors.accent },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  segmentTextActive: { color: colors.accent },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionCopy: { flex: 1 },
  eyebrow: { color: colors.info, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  action: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: '#1B2150' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0E2A',
    borderTopWidth: 1,
    borderTopColor: '#1C2148',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 14,
    paddingBottom: 18,
  },
});
