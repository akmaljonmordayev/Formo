import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Jersey, { KITS } from '../../components/ui/Jersey';
import useCompactLayout from '../../utils/useCompactLayout';
import LanguageSwitch from './LanguageSwitch';

/**
 * LoginScreen — dressing-room design ported from the NEW frontend login
 * (frontend/src/pages/Login). Dark scene + SVG kit that flips on password
 * focus + a white "hang-tag" form card.
 *
 * Props:
 *   auth       — useAuth() object { login, isSubmitting, error }
 *   t          — translation function
 *   language   — current language code (uz/ru/en)
 *   onLanguage — change language
 *   onLogin    — called after successful login (navigator reacts to auth state)
 *   onRegister — navigate to RegisterScreen
 */

const palette = {
  ink: '#080C24',
  navy: '#0E1A3F',
  paper: '#F3F5F9',
  muted: '#A9B0D0',
  orange: '#F2A33A',
  teal: '#19A7A1',
  red: '#B8323F',
  line: '#D5DAE8',
};

// "90 123 45 67" ko'rinishida formatlash (faqat 9 ta raqam)
function formatPhone(digits) {
  const d = digits.slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

export default function LoginScreen({ auth, t, language, onLanguage, onLogin, onRegister }) {
  const compact = useCompactLayout();
  const insets = useSafeAreaInsets();

  const [digits, setDigits] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [kitIndex, setKitIndex] = useState(0);
  const [autoKit, setAutoKit] = useState(true);
  const shake = useRef(new Animated.Value(0)).current;

  // Formalar o'z-o'zidan almashib turadi, foydalanuvchi tanlasa to'xtaydi
  useEffect(() => {
    if (!autoKit) return undefined;
    const id = setInterval(() => setKitIndex((i) => (i + 1) % KITS.length), 3600);
    return () => clearInterval(id);
  }, [autoKit]);

  const kit = KITS[kitIndex];
  const phoneComplete = digits.length === 9;
  const number = digits.length >= 2 ? digits.slice(-2) : '10';

  const errorText = validationError || (auth.error ? auth.error.message || t(auth.error.key) : null);
  const canSubmit = phoneComplete && password.length > 0 && !auth.isSubmitting;

  function handleDigitsChange(text) {
    let d = text.replace(/\D/g, '');
    // to'liq raqam joylashtirilsa (+998 bilan) prefiksni olib tashlaymiz
    if (d.length > 9 && d.startsWith('998')) d = d.slice(3);
    setDigits(d.slice(0, 9));
    setValidationError(null);
  }

  function runShake() {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleLogin() {
    setValidationError(null);
    if (!phoneComplete) {
      setValidationError(t('phoneInvalid'));
      runShake();
      return;
    }
    if (!password) return;

    const success = await auth.login(`+998${digits}`, password);
    if (success) {
      if (onLogin) onLogin();
    } else {
      runShake();
    }
  }

  const shakeStyle = {
    transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] }) }],
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[palette.ink, palette.navy]} style={StyleSheet.absoluteFill} />
      <View style={[styles.glow, { backgroundColor: kit.to, top: -90, left: -70 }]} />
      <View style={[styles.glow, { backgroundColor: palette.orange, bottom: -80, right: -70, opacity: 0.1 }]} />

      <View style={[styles.topBar, { paddingTop: insets.top + (compact ? 12 : 20) }]}>
        <View style={styles.brand}>
          <Text style={styles.logo}>FORMO</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('loginBrandBadge')}</Text>
          </View>
        </View>
        <LanguageSwitch language={language} onChange={onLanguage} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.jerseyWrap, compact && styles.jerseyWrapCompact, shakeStyle]}>
            <Jersey
              kit={kit}
              name="FORMO"
              number={number}
              flipped={passwordFocused && !showPassword}
              error={!!errorText}
              size={compact ? 154 : 202}
            />
          </Animated.View>

          <View style={styles.kits}>
            {KITS.map((k, i) => (
              <Pressable
                key={k.id}
                accessibilityRole="button"
                accessibilityLabel={k.name}
                onPress={() => {
                  setAutoKit(false);
                  setKitIndex(i);
                }}
                style={[
                  styles.swatch,
                  { backgroundColor: k.from, borderColor: k.trim },
                  i === kitIndex && styles.swatchActive,
                ]}
              />
            ))}
            <Text style={styles.kitName}>{kit.name}</Text>
          </View>

          {compact ? null : <Text style={styles.tagline}>{t('loginTagline')}</Text>}

          <Animated.View style={[styles.tagWrap, compact && styles.tagWrapCompact, shakeStyle]}>
            <View style={styles.string} />
            {/*
              Fabric/Android: this View is an ancestor of both TextInputs. Every
              style that feeds `ViewShadowNode`'s FormsStackingContext trait
              (transform, shadow, elevation) must stay constant — a trait flip
              makes the differ remove+insert the subtree and the focused native
              EditText loses focus. The tag is therefore always tilted; the
              previous `fieldFocused && styles.tagFlat` toggled `transform` on
              focus and was the remaining source of the jump.
            */}
            <View style={[styles.tag, compact && styles.tagCompact]}>
              <View style={styles.tagHole} />
              <View style={styles.tagInner} pointerEvents="none" />

              <View style={styles.tagMeta}>
                <Text style={styles.tagMetaText}>FORMO · PANEL</Text>
                <Text style={styles.tagMetaText}>№ 0001</Text>
              </View>

              <Text style={styles.tagTitleLine}>{t('loginTitleTop')}</Text>
              <Text style={styles.tagTitleLine}>
                <Text style={[styles.tagTitleAccent, { color: kit.to }]}>{t('loginTitleAccent')}</Text>
                {t('loginTitleRest') ? ` ${t('loginTitleRest')}` : ''}
              </Text>
              <Text style={styles.tagSubtitle}>{t('loginSubtitle')}</Text>

              <Text style={styles.fieldLabel}>{t('phone')}</Text>
              <View style={[styles.inputRow, phoneComplete && styles.inputRowComplete]}>
                <Text style={styles.prefix}>+998</Text>
                <TextInput
                  value={formatPhone(digits)}
                  onChangeText={handleDigitsChange}
                  placeholder="90 123 45 67"
                  placeholderTextColor="rgba(14,26,63,0.28)"
                  keyboardType="phone-pad"
                  selectionColor={palette.orange}
                  style={styles.input}
                />
                {phoneComplete && (
                  <View style={styles.check}>
                    <MaterialCommunityIcons name="check" size={16} color="#fff" />
                  </View>
                )}
              </View>

              <Text style={styles.fieldLabel}>{t('password')}</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setValidationError(null);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(14,26,63,0.28)"
                  secureTextEntry={!showPassword}
                  selectionColor={palette.orange}
                  style={styles.input}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eye} hitSlop={6}>
                  <Text style={styles.eyeText}>{showPassword ? t('hidePassword') : t('showPassword')}</Text>
                </Pressable>
              </View>

              <Text style={styles.error}>{errorText || ''}</Text>

              <Pressable
                onPress={handleLogin}
                disabled={!canSubmit}
                style={[styles.submit, !canSubmit && styles.submitDisabled]}
              >
                <Text style={styles.submitText}>{auth.isSubmitting ? t('loggingIn') : t('loginButton')}</Text>
                <View style={styles.arrow}>
                  <MaterialCommunityIcons name="arrow-right" size={20} color={palette.navy} />
                </View>
              </Pressable>

              <View style={styles.care}>
                <View style={styles.careIcons}>
                  <MaterialCommunityIcons name="tshirt-crew-outline" size={18} color="rgba(14,26,63,0.5)" />
                  <MaterialCommunityIcons name="triangle-outline" size={18} color="rgba(14,26,63,0.5)" />
                  <MaterialCommunityIcons name="hanger" size={18} color="rgba(14,26,63,0.5)" />
                </View>
                <Pressable onPress={onRegister} hitSlop={8}>
                  <Text style={styles.careText}>
                    {t('noAccount')} <Text style={styles.careLink}>{t('register')}</Text>
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  flex: { flex: 1 },
  glow: { position: 'absolute', width: 380, height: 380, borderRadius: 190, opacity: 0.16 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 140,
  },
  scrollCompact: { paddingTop: 4, paddingBottom: 130 },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 },
  logo: { color: palette.paper, fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  badge: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(169,176,208,0.45)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: palette.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },

  jerseyWrap: { alignItems: 'center', marginTop: 14, marginBottom: 8 },
  jerseyWrapCompact: { marginTop: 6, marginBottom: 4 },

  kits: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2 },
  swatchActive: { transform: [{ scale: 1.15 }], borderColor: palette.paper },
  kitName: {
    marginLeft: 8,
    minWidth: 92,
    color: palette.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  tagline: {
    marginTop: 16,
    color: 'rgba(243,245,249,0.86)',
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'center',
  },

  tagWrap: { marginTop: 24, alignItems: 'center', alignSelf: 'stretch' },
  tagWrapCompact: { marginTop: 16 },
  string: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 46,
    borderRadius: 2,
    backgroundColor: palette.orange,
  },
  tag: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.paper,
    borderRadius: 26,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 22,
    paddingTop: 42,
    paddingBottom: 22,
    transform: [{ rotate: '1.5deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },
  tagCompact: { paddingTop: 38, paddingBottom: 18 },
  tagHole: {
    position: 'absolute',
    top: 16,
    left: '50%',
    marginLeft: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.ink,
    borderWidth: 3,
    borderColor: '#E3E7F0',
  },
  tagInner: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(14,26,63,0.22)',
    borderRadius: 18,
  },
  tagMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    paddingBottom: 12,
    marginBottom: 18,
  },
  tagMetaText: { color: 'rgba(14,26,63,0.5)', fontSize: 10.5, fontWeight: '700', letterSpacing: 1.8 },
  tagTitleLine: { color: palette.navy, fontSize: 26, fontWeight: '700', lineHeight: 30 },
  tagTitleAccent: {},
  tagSubtitle: { color: 'rgba(14,26,63,0.6)', fontSize: 14, marginTop: 6, marginBottom: 20 },

  fieldLabel: {
    color: 'rgba(14,26,63,0.62)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: palette.line,
    borderRadius: 14,
    paddingLeft: 16,
    paddingRight: 6,
    marginBottom: 16,
  },
  inputRowComplete: { borderColor: palette.teal },
  prefix: {
    color: 'rgba(14,26,63,0.55)',
    fontWeight: '700',
    marginRight: 10,
    paddingRight: 10,
    borderRightWidth: 1.5,
    borderRightColor: palette.line,
  },
  input: { flex: 1, height: '100%', color: palette.navy, fontSize: 16, fontWeight: '600' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  eye: { height: 38, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center' },
  eyeText: { color: 'rgba(14,26,63,0.6)', fontSize: 12.5, fontWeight: '600' },
  error: { minHeight: 20, color: palette.red, fontSize: 13.5, fontWeight: '500', marginTop: -6, marginBottom: 10 },

  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderRadius: 16,
    backgroundColor: palette.navy,
    paddingLeft: 22,
    paddingRight: 10,
  },
  submitDisabled: { backgroundColor: '#8B93B3' },
  submitText: { color: palette.paper, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  arrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: palette.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },

  care: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    borderStyle: 'dashed',
  },
  careIcons: { flexDirection: 'row', gap: 6 },
  careText: { color: 'rgba(14,26,63,0.55)', fontSize: 12 },
  careLink: { color: palette.navy, fontWeight: '700' },
});
