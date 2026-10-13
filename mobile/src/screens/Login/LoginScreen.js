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

/**
 * LoginScreen
 *
 * Props:
 *   auth       — useAuth() object { login, isLoading, error }
 *   t          — translation function
 *   onLogin    — called after successful login (no-op; navigator reacts to auth.isAuthenticated)
 *   onRegister — called to navigate to RegisterScreen
 */
// Normalise +998 XX XXX XX XX (with spaces) or plain 9-digit string to +998XXXXXXXXX
function normalisePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return raw.trim();
}

const PHONE_RE = /^\+998\d{9}$/;

export default function LoginScreen({ auth, t, onLogin, onRegister }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState(null);

  async function handleLogin() {
    setValidationError(null);

    if (!phone.trim() || !password.trim()) return;

    const normPhone = normalisePhone(phone);
    if (!PHONE_RE.test(normPhone)) {
      setValidationError(t('phone') + ': +998XXXXXXXXX');
      return;
    }

    const success = await auth.login(normPhone, password);
    if (success && onLogin) onLogin();
  }

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
          <Text style={styles.title}>{t('welcome')}</Text>
          <Text style={styles.subtitle}>{t('welcomeSub')}</Text>

          {/* ─── Phone field ─────────────────────────────────────────────────── */}
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

          {/* ─── Password field ──────────────────────────────────────────────── */}
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
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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

          {/* ─── Error message ───────────────────────────────────────────────── */}
          {(validationError || auth.error) ? (
            <Text style={styles.errorText}>{validationError || t(auth.error)}</Text>
          ) : null}

          {/* ─── Login button ─────────────────────────────────────────────────── */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              (auth.isLoading || !phone.trim() || !password.trim()) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleLogin}
            disabled={auth.isLoading || !phone.trim() || !password.trim()}
          >
            {auth.isLoading ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Text style={styles.buttonText}>{t('loginButton')}</Text>
            )}
          </Pressable>

          {/* ─── Register link ────────────────────────────────────────────────── */}
          <Pressable onPress={onRegister} style={styles.linkButton} hitSlop={8}>
            <Text style={styles.linkText}>{t('noAccount')}</Text>
            <Text style={styles.linkAccent}> {t('register')}</Text>
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
    justifyContent: 'center',
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
    marginBottom: spacing.xxxl,
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
