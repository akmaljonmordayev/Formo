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
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LanguageSwitch from './LanguageSwitch';

/**
 * LoginScreen — dressing-room design ported from the NEW frontend login
 * (frontend/src/pages/Login). Dark scene + SVG kit that flips on password
 * focus + a white "hang-tag" form card.
 *
 * Props:
 *   auth       — useAuth() object { login, isLoading, error }
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
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const insets = useSafeAreaInsets();

  const [digits, setDigits] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldFocused, setFieldFocused] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);
  const shake = useRef(new Animated.Value(0)).current;

  const phoneComplete = digits.length === 9;

  const errorText = validationError || (auth.error ? auth.error.message || t(auth.error.key) : null);
  const canSubmit = phoneComplete && password.length > 0 && !auth.isLoading;

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

    // auth.login resolves to { success, user } or { success: false, error }.
    // The object itself is always truthy, so check `.success` explicitly.
    const result = await auth.login(`+998${digits}`, password);
    if (result?.success) {
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
      <View style={styles.backdrop} />

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
          <Animated.View style={[styles.cardWrap, shakeStyle]}>
            <View style={[styles.card, fieldFocused && styles.cardFocused]}>
              <View style={styles.cardHeader}>
                <Text style={styles.tagMetaText}>FORMO · PANEL</Text>
                <Text style={styles.tagMetaText}>№ 0001</Text>
              </View>

              <Text style={styles.titleLine}>{t('loginTitleTop')}</Text>
              <Text style={styles.titleLine}>
                <Text style={styles.titleAccent}>{t('loginTitleAccent')}</Text>
                {t('loginTitleRest') ? ` ${t('loginTitleRest')}` : ''}
              </Text>
              <Text style={styles.tagSubtitle}>{t('loginSubtitle')}</Text>

              <Text style={styles.fieldLabel}>{t('phone')}</Text>
              <View style={[styles.inputRow, phoneComplete && styles.inputRowComplete]}>
                <Text style={styles.prefix}>+998</Text>
                <TextInput
                  ref={phoneRef}
                  value={formatPhone(digits)}
                  onChangeText={handleDigitsChange}
                  placeholder="90 123 45 67"
                  placeholderTextColor="rgba(14,26,63,0.28)"
                  keyboardType="phone-pad"
                  selectionColor={palette.orange}
                  style={styles.input}
                  onFocus={() => setFieldFocused(true)}
                  onBlur={() => setFieldFocused(false)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  returnKeyType="next"
                  blurOnSubmit={false}
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
                  ref={passwordRef}
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
                  onFocus={() => setFieldFocused(true)}
                  onBlur={() => setFieldFocused(false)}
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={() => {
                    setShowPassword((v) => !v);
                    passwordRef.current?.focus();
                  }}
                  style={styles.eye}
                  hitSlop={8}
                >
                  <Text style={styles.eyeText}>{showPassword ? t('hidePassword') : t('showPassword')}</Text>
                </Pressable>
              </View>

              <Text style={styles.error}>{errorText || ''}</Text>

              <Pressable
                onPress={handleLogin}
                disabled={!canSubmit}
                style={[styles.submit, !canSubmit && styles.submitDisabled]}
              >
                <Text style={styles.submitText}>{auth.isLoading ? t('loggingIn') : t('loginButton')}</Text>
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
  backdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: palette.ink,
    borderWidth: 0,
  },
  flex: { flex: 1 },
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

  cardWrap: { marginTop: 24, alignItems: 'center', alignSelf: 'stretch' },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.paper,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardFocused: { shadowOpacity: 0.28 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    paddingBottom: 12,
    marginBottom: 18,
  },
  tagMetaText: { color: 'rgba(14,26,63,0.5)', fontSize: 10.5, fontWeight: '700', letterSpacing: 1.8 },
  titleLine: { color: palette.navy, fontSize: 26, fontWeight: '700', lineHeight: 30 },
  titleAccent: { color: palette.orange },
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
