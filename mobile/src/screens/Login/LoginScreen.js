import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthInput,
  AuthLink,
  AuthPasswordInput,
  AuthPhoneInput,
  AuthShell,
  AuthTitle,
  authColors,
} from './authShared';
import { isValidUzPhone } from '../../utils/phone';

/**
 * LoginScreen — light card design ported from frontend/src/pages/Login.
 *
 * Props:
 *   auth       — useAuth() object { login, isLoading, error }
 *   t          — translation function
 *   onLogin    — called after successful login (no-op; navigator reacts to auth.isAuthenticated)
 *   onRegister — called to navigate to RegisterScreen
 */
export default function LoginScreen({ auth, t, onLogin, onRegister }) {
  const [phoneDigits, setPhoneDigits] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState(null);

  const errorText = validationError || (auth.error ? auth.error.message || t(auth.error.key) : null);
  const canSubmit = phoneDigits.length === 9 && password.length > 0;

  async function handleLogin() {
    setValidationError(null);

    if (!isValidUzPhone(phoneDigits)) {
      setValidationError(t('phoneInvalid'));
      return;
    }

    const success = await auth.login(`+998${phoneDigits}`, password);
    if (success && onLogin) onLogin();
  }

  return (
    <AuthShell>
      <AuthTitle title="FORMO" subtitle={t('welcome')} />

      <AuthField label={t('phone')} icon="cellphone">
        {({ focused, setFocused }) => (
          <AuthPhoneInput
            digits={phoneDigits}
            onChangeDigits={setPhoneDigits}
            placeholder="+998 XX XXX XX XX"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        )}
      </AuthField>

      <AuthField label={t('password')} icon="lock-outline">
        {({ focused, setFocused }) => (
          <AuthPasswordInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        )}
      </AuthField>

      <AuthError message={errorText} />

      <AuthButton onPress={handleLogin} loading={auth.isLoading} disabled={!canSubmit}>
        {auth.isLoading ? t('loggingIn') : t('loginButton')}
      </AuthButton>

      <AuthLink onPress={onRegister}>
        <Text>{t('noAccount')} </Text>
        <Text style={styles.linkAccent}>{t('register')}</Text>
      </AuthLink>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  linkAccent: { color: authColors.primary, fontWeight: '700', fontSize: 14 },
});
