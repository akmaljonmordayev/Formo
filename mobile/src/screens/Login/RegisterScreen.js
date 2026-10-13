import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../constants/theme';

// Normalise +998 XX XXX XX XX (with spaces) or plain 9-digit string to +998XXXXXXXXX
function normalisePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return raw.trim();
}

const PHONE_RE = /^\+998\d{9}$/;

/**
 * RegisterScreen
 *
 * Props:
 *   auth      — useAuth() object { register, isLoading, error }
 *   t         — translation function
 *   onLogin   — called on successful register OR on "have account" link
 *   onRegister — unused (kept for API symmetry)
 */
export default function RegisterScreen({ auth, t, onLogin }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState(null);

  async function handleRegister() {
    setValidationError(null);

    if (!fullName.trim()) {
      setValidationError(t('fullName') + ' ' + t('confirmQuestion'));
      return;
    }

    const normPhone = normalisePhone(phone);
    if (!PHONE_RE.test(normPhone)) {
      setValidationError(t('phone') + ': +998XXXXXXXXX');
      return;
    }

    if (password.length < 6) {
      setValidationError(t('password') + ' min 6');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError(t('confirmPassword'));
      return;
    }

    const success = await auth.register(fullName.trim(), normPhone, password);
    if (success && onLogin) onLogin();
  }

  const displayError = validationError || (auth.error ? t(auth.error) : null);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Logo ───────────────────────────────────────────────────────── */}
          <View style={styles.logoBlock}>
            <Text style={styles.logoText}>FORMO</Text>
          </View>

          {/* ─── Heading ─────────────────────────────────────────────────────── */}
          <Text style={styles.title}>{t('register')}</Text>
          <Text style={styles.subtitle}>{t('welcomeSub')}</Text>

          {/* ─── Full name ───────────────────────────────────────────────────── */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{t('fullName')}</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('fullName')}
              placeholderTextColor={colors.muted}
              autoComplete="name"
              returnKeyType="next"
              selectionColor={colors.accent}
            />
          </View>

          {/* ─── Phone ───────────────────────────────────────────────────────── */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{t('phone')}</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+998 XX XXX XX XX"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              autoComplete="tel"
              returnKeyType="next"
              selectionColor={colors.accent}
            />
          </View>

          {/* ─── Password ────────────────────────────────────────────────────── */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{t('password')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                returnKeyType="next"
                selectionColor={colors.accent}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                hitSlop={8}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁' : '🔒'}</Text>
              </Pressable>
            </View>
          </View>

          {/* ─── Confirm password ────────────────────────────────────────────── */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{t('confirmPassword')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showConfirm}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                selectionColor={colors.accent}
              />
              <Pressable
                onPress={() => setShowConfirm((v) => !v)}
                style={styles.eyeButton}
                hitSlop={8}
              >
                <Text style={styles.eyeIcon}>{showConfirm ? '👁' : '🔒'}</Text>
              </Pressable>
            </View>
          </View>

          {/* ─── Validation / API error ──────────────────────────────────────── */}
          {displayError ? (
            <Text style={styles.errorText}>{displayError}</Text>
          ) : null}

          {/* ─── Register button ─────────────────────────────────────────────── */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              auth.isLoading && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRegister}
            disabled={auth.isLoading}
          >
            {auth.isLoading ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Text style={styles.buttonText}>{t('registerButton')}</Text>
            )}
          </Pressable>

          {/* ─── Login link ──────────────────────────────────────────────────── */}
          <Pressable onPress={onLogin} style={styles.linkButton} hitSlop={8}>
            <Text style={styles.linkText}>{t('haveAccount')}</Text>
            <Text style={styles.linkAccent}> {t('login')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },

  // Logo
  logoBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 6,
    color: colors.accent,
  },

  // Heading
  title: {
    fontSize: typography.h1,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },

  // Fields
  fieldBlock: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: typography.body,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputFlex: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  eyeButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderTopRightRadius: radii.md,
    borderBottomRightRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 16,
  },

  // Error
  errorText: {
    color: '#E8543F',
    fontSize: typography.small,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  // Button
  button: {
    backgroundColor: '#0E1330',
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: typography.body,
    letterSpacing: 0.5,
  },

  // Link
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  linkText: {
    color: colors.muted,
    fontSize: typography.body,
  },
  linkAccent: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: typography.body,
  },
});
