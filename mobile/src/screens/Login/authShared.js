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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { formatUzPhone, pickPhoneDigits } from '../../utils/phone';

// Design tokens ported from frontend/src/pages/Login (light card design)
export const authColors = {
  page: '#f3f4f6',
  card: '#ffffff',
  border: '#d1d5db',
  text: '#111827',
  muted: '#6b7280',
  primary: '#2563eb',
  error: '#dc2626',
  icon: '#9ca3af',
};

/** Light page shell: centered white card on a soft gray background. */
export function AuthShell({ children }) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthTitle({ title, subtitle }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function AuthField({ label, icon, children, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused, error && styles.inputWrapError]}>
        {icon ? <MaterialCommunityIcons name={icon} size={18} color={authColors.icon} style={styles.inputIcon} /> : null}
        <View style={styles.inputSlot}>{children({ focused, setFocused })}</View>
      </View>
    </View>
  );
}

export function AuthInput({ onFocus, onBlur, style, ...props }) {
  return (
    <TextInput
      placeholderTextColor={authColors.icon}
      selectionColor={authColors.primary}
      style={[styles.input, style]}
      onFocus={(e) => {
        onFocus?.();
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        onBlur?.();
        props.onBlur?.(e);
      }}
      {...props}
    />
  );
}

/** Uzbek phone input: value is always shown as "+998 XX XXX XX XX". */
export function AuthPhoneInput({ digits, onChangeDigits, ...props }) {
  return (
    <AuthInput
      value={formatUzPhone(digits)}
      onChangeText={(text) => onChangeDigits(pickPhoneDigits(text, digits))}
      keyboardType="phone-pad"
      autoComplete="tel"
      maxLength={17}
      {...props}
    />
  );
}

/** Password input with a proper eye toggle icon (replaces emoji icons). */
export function AuthPasswordInput({ style, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.passwordRow}>
      <AuthInput
        secureTextEntry={!visible}
        autoComplete="password"
        style={[styles.flex, style]}
        {...props}
      />
      <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10} style={styles.eyeButton}>
        <MaterialCommunityIcons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={authColors.muted}
        />
      </Pressable>
    </View>
  );
}

export function AuthError({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <MaterialCommunityIcons name="alert-circle-outline" size={16} color={authColors.error} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function AuthButton({ children, onPress, loading, disabled }) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [styles.button, inactive && styles.buttonDisabled, pressed && !inactive && styles.buttonPressed]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.buttonText}>{children}</Text>
      )}
    </Pressable>
  );
}

export function AuthSecondaryButton({ children, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.buttonSecondary, disabled && styles.buttonDisabled, pressed && !disabled && styles.buttonPressed]}
    >
      <Text style={styles.buttonSecondaryText}>{children}</Text>
    </Pressable>
  );
}

export function AuthLink({ onPress, children }) {
  return (
    <Pressable onPress={onPress} style={styles.link} hitSlop={8}>
      <Text style={styles.linkText}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: authColors.page },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: authColors.card,
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 6,
  },
  heading: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: authColors.text, letterSpacing: 4 },
  subtitle: { fontSize: 14, color: authColors.muted, marginTop: 6 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: authColors.muted, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  inputWrapFocused: { borderColor: authColors.primary },
  inputWrapError: { borderColor: authColors.error },
  inputIcon: { marginLeft: 12 },
  inputSlot: { flex: 1 },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: authColors.text,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeButton: { paddingHorizontal: 12, paddingVertical: 12 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  errorText: { color: authColors.error, fontSize: 13, flex: 1 },
  button: {
    backgroundColor: authColors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  buttonSecondary: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: '#fff',
  },
  buttonSecondaryText: { color: authColors.text, fontSize: 15, fontWeight: '600' },
  link: { alignItems: 'center', marginTop: 14, paddingVertical: 6 },
  linkText: { color: authColors.muted, fontSize: 14 },
});
