import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../../components/ui/Toast';
import { colors } from '../../constants/theme';

export default function Reg0PasswordScreen({ onNext, onBack, initial = {} }) {
  const toast = useToast();
  const passwordRef = React.useRef(null);
  const confirmPasswordRef = React.useRef(null);
  const [password, setPassword] = useState(initial.password || '');
  const [confirmPassword, setConfirmPassword] = useState(initial.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const strength =
    password.length >= 10 ? 'Strong' : password.length >= 6 ? 'Good' : 'Weak';
  const strengthColor =
    password.length >= 10 ? '#19A7A1' : password.length >= 6 ? '#F2A33A' : '#E8543F';

  const handleNext = () => {
    if (password.length < 6) {
      toast.show('Password must be at least 6 characters long', 'error');
      return;
    }

    if (password !== confirmPassword) {
      toast.show('Passwords do not match', 'error');
      return;
    }

    onNext({ password });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
          </Pressable>

          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>STEP 1 OF 5</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Create your password</Text>
            <Text style={styles.subtitle}>Set a secure password to protect your Formo account.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Password</Text>
            {/* `collapsable={false}`: `fieldFocused` adds
                shadowColor/elevation, and the trait flip would drop native focus. */}
            <View
              collapsable={false}
              style={[styles.passwordRow, passwordFocused && styles.fieldFocused]}
            >
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.caption}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                returnKeyType="next"
                blurOnSubmit={false}
                style={styles.input}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} style={styles.eyeBtn}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.muted}
                />
              </Pressable>
            </View>

            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <Text style={styles.strengthLabel}>Password strength</Text>
                <Text style={[styles.strengthValue, { color: strengthColor }]}>{strength}</Text>
              </View>
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>Confirm password</Text>
            <TextInput
              ref={confirmPasswordRef}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              placeholderTextColor={colors.caption}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleNext}
              returnKeyType="done"
              style={styles.secondaryInput}
            />

            <Pressable
              disabled={!password || !confirmPassword}
              onPress={handleNext}
              style={[styles.nextBtn, (!password || !confirmPassword) && { opacity: 0.5 }]}
            >
              <Text style={styles.nextBtnText}>Continue</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#080C24" />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#121A42',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 14,
  },
  stepText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  header: {
    marginBottom: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#F3F5F9',
  },
  subtitle: {
    fontSize: 14,
    color: '#A9B0D0',
    marginTop: 8,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A9B0D0',
    marginBottom: 8,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A42',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    paddingRight: 12,
  },
  fieldFocused: {
    borderColor: 'rgba(242, 163, 58, 0.8)',
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  input: {
    flex: 1,
    color: '#F3F5F9',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryInput: {
    backgroundColor: '#121A42',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    color: '#F3F5F9',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 4,
  },
  strengthLabel: {
    color: '#A9B0D0',
    fontSize: 11,
    fontWeight: '700',
  },
  strengthValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  nextBtn: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  nextBtnText: {
    color: '#080C24',
    fontSize: 15,
    fontWeight: '800',
  },
});
