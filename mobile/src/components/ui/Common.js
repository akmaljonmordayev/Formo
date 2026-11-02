import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, screenStyles, spacing } from '../../constants/theme';
import { HeaderCart } from './CartButton';
import { KeyboardAvoider, KeyboardAwareScrollView, useKeyboard } from './KeyboardAware';

export function Screen({ children, scroll = true, contentStyle, footer, footerStyle }) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboard();
  const Content = scroll ? KeyboardAwareScrollView : View;
  // Birinchi bola Header bo'lsa — skroll ustida qotib turadi (savat tugmasi doim ko'rinadi)
  const items = React.Children.toArray(children);
  const lead = scroll && items[0]?.type === Header ? items.shift() : null;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={screenStyles.safe}>
      <KeyboardAvoider>
        {lead ? <View style={styles.stickyHeader}>{React.cloneElement(lead, { sticky: true })}</View> : null}
        <Content
          contentContainerStyle={scroll ? [screenStyles.content, lead && styles.contentUnderHeader, contentStyle] : undefined}
          style={!scroll ? [screenStyles.content, contentStyle] : undefined}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {lead ? items : children}
        </Content>
      </KeyboardAvoider>
      {/* Yozish paytida pastki panel inputlarni yopmasin — klaviatura yopilganda qaytadi */}
      {footer && !kb.visible ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }, footerStyle]}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/** cart — o'ng burchakda savat tugmasi (soni bilan; CartContext orqali, har ekranga prop uzatmasdan) */
export function Header({ title, subtitle, overline, onBack, right, logo, cart = false, sticky = false }) {
  const hasLead = Boolean(onBack || logo);
  const actions = cart ? (
    <>
      {right}
      <HeaderCart />
    </>
  ) : (
    right
  );
  return (
    <View style={[styles.header, sticky && styles.headerSticky]}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.iconButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </Pressable>
      ) : logo ? (
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>FORMO</Text>
        </View>
      ) : null}
      <View style={[styles.headerCopy, hasLead && styles.headerCopyLead]}>
        {overline ? <Text style={styles.headerOverline}>{overline}</Text> : null}
        <Text style={[styles.title, onBack && styles.titleSmall]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {actions ? <View style={styles.headerRight}>{actions}</View> : null}
    </View>
  );
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'regular',
  small = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) {
  const isSmall = small || size === 'small';
  const isLarge = size === 'large';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'outline' && styles.outlineButton,
        variant === 'danger' && styles.dangerButton,
        variant === 'ghost' && styles.ghostButton,
        isSmall && styles.buttonSmall,
        isLarge && styles.buttonLarge,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
        <Text
          style={[
            styles.buttonText,
            variant === 'primary' && styles.primaryText,
            variant === 'secondary' && styles.secondaryText,
            variant === 'outline' && styles.outlineText,
            variant === 'danger' && styles.dangerText,
            variant === 'ghost' && styles.ghostText,
            isSmall && styles.buttonSmallText,
            isLarge && styles.buttonLargeText,
            textStyle,
          ]}
        >
          {children}
        </Text>
      </View>
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
            style={[
              styles.segmentItem,
              wide && styles.segmentItemWide,
              active && styles.segmentItemActive,
            ]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {option}
            </Text>
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
        <Pressable onPress={onAction} hitSlop={10} style={styles.actionWrap}>
          <Text style={styles.action}>{action}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, raised = false, style }) {
  return <View style={[styles.card, raised && styles.cardRaised, style]}>{children}</View>;
}

export function Badge({ label, variant = 'teal', style }) {
  const isTeal = variant === 'teal';
  const isOrange = variant === 'orange';
  const isRed = variant === 'red';

  return (
    <View
      style={[
        styles.badge,
        isTeal && styles.badgeTeal,
        isOrange && styles.badgeOrange,
        isRed && styles.badgeRed,
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          isTeal && styles.badgeTextTeal,
          isOrange && styles.badgeTextOrange,
          isRed && styles.badgeTextRed,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon = 'tshirt-crew-outline',
  title,
  description,
  actionLabel,
  onAction,
  style,
}) {
  return (
    <View style={[styles.emptyContainer, style]}>
      <View style={styles.emptyIconCircle}>
        <MaterialCommunityIcons name={icon} size={36} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button small onPress={onAction} style={styles.emptyAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

export function formatMoney(value) {
  if (value == null || Number.isNaN(Number(value))) return '0 so‘m';
  return `${Number(value).toLocaleString('uz-UZ')} so‘m`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerSticky: { marginBottom: 0 },
  stickyHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarBorder,
    zIndex: 5,
  },
  contentUnderHeader: { paddingTop: spacing.md },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headerCopy: {
    flex: 1,
  },
  headerCopyLead: {
    marginLeft: spacing.md,
  },
  headerRight: {
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerOverline: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  titleSmall: {
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  overline: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  button: {
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.4,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  outlineText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 14,
  },
  // Xavfli amal (akkauntdan chiqish va h.k.) — qizil, darrov ko'zga tashlanadi
  dangerButton: {
    backgroundColor: 'rgba(232, 84, 63, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 84, 63, 0.75)',
  },
  dangerText: {
    color: '#FF6B57',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  buttonSmall: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
  },
  buttonLarge: {
    paddingVertical: 17,
    paddingHorizontal: 24,
    borderRadius: radii.lg,
  },
  buttonText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonSmallText: {
    fontSize: 12,
  },
  buttonLargeText: {
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    alignSelf: 'flex-start',
  },
  segmentItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.sm,
  },
  segmentItemWide: {
    flex: 1,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.accent,
    fontWeight: '800',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  actionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  action: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRaised: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderLight,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    alignSelf: 'flex-start',
  },
  badgeTeal: {
    backgroundColor: 'rgba(25, 167, 161, 0.16)',
    borderColor: 'rgba(25, 167, 161, 0.4)',
    borderWidth: 1,
  },
  badgeTextTeal: {
    color: colors.tealLight,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  badgeOrange: {
    backgroundColor: 'rgba(242, 163, 58, 0.16)',
    borderColor: 'rgba(242, 163, 58, 0.4)',
    borderWidth: 1,
  },
  badgeTextOrange: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  badgeRed: {
    backgroundColor: 'rgba(232, 84, 63, 0.16)',
    borderColor: 'rgba(232, 84, 63, 0.4)',
    borderWidth: 1,
  },
  badgeTextRed: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 12,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 18,
  },
  emptyAction: {
    alignSelf: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
  },
});
