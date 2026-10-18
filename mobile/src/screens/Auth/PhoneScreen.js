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
import { colors, radii } from '../../constants/theme';
import { formatPhone } from '../../services/api';

export default function PhoneScreen({
  auth,
  t,
  onBack,
  onRequestOtp,
  onPasswordLogin,
}) {
  const toast = useToast();
  const [digits, setDigits] = useState('');
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const phoneRef = React.useRef(null);
  const passwordRef = React.useRef(null);

  const focusNextField = () => {
    if (usePassword) passwordRef.current?.focus();
  };

  const cleanDigits = digits.replace(/\D/g, '').slice(0, 9);
  const isComplete = cleanDigits.length === 9;

  const handleDigitsChange = (text) => {
    let d = text.replace(/\D/g, '');
    if (d.startsWith('998')) d = d.slice(3);
    setDigits(d.slice(0, 9));
  };

  const handleProceed = async () => {
    if (loading) return;
    if (!isComplete) {
      toast.show('9 xonali telefon raqamni to‘liq kiriting', 'error');
      return;
    }
    if (!agree) {
      toast.show('Foydalanish shartlariga rozilik bildiring', 'error');
      return;
    }

    if (usePassword) {
      if (!password.trim()) {
        toast.show('Parolingizni kiriting', 'error');
        return;
      }
      setLoading(true);
      try {
        const res = await auth.login(cleanDigits, password);
        if (!res.success) {
          toast.show(res.error?.message || 'Telefon raqam yoki parol noto‘g‘ri', 'error');
          return;
        }
        onPasswordLogin?.({ phone: `+998${cleanDigits}`, password });
      } catch (err) {
        toast.show(err.message || 'Kirishda xatolik yuz berdi', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await auth.requestOtp(cleanDigits);
      if (res.isDemo) {
        toast.show(res.message, 'demo', 4000);
      } else {
        toast.show('SMS tasdiqlash kodi yuborildi', 'success');
      }
      onRequestOtp?.({ phone: cleanDigits, isDemo: res.isDemo });
    } catch (err) {
      toast.show(err.message || 'SMS kod yuborishda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {Boolean(onBack) && (
            <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
            </Pressable>
          )}

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="cellphone-check" size={32} color={colors.accent} />
            </View>
            <Text style={styles.eyebrow}>FORMO · SIGN IN</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Use your phone number to continue or create a new account in seconds.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>Phone number</Text>
            {/* `collapsable={false}`: `fieldFocused` adds shadowColor/elevation, which
                flips the Fabric FormsStackingContext trait on focus. The differ then
                removes+inserts this subtree, so the TextInput inside loses native
                focus the moment it gains it (focus jumps / keyboard bounce). Pinning
                the trait keeps the native view tree stable. */}
            <View
              collapsable={false}
              style={[styles.phoneInputRow, phoneFocused && styles.fieldFocused]}
            >
              <View style={styles.flagBox}>
                <Text style={styles.flagText}>🇺🇿</Text>
                <Text style={styles.codeText}>+998</Text>
              </View>
              <TextInput
                ref={phoneRef}
                value={formatPhone(cleanDigits)}
                onChangeText={handleDigitsChange}
                placeholder="90 123 45 67"
                placeholderTextColor={colors.caption}
                keyboardType="phone-pad"
                maxLength={12}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                onSubmitEditing={focusNextField}
                returnKeyType={usePassword ? 'next' : 'done'}
                blurOnSubmit={false}
                style={styles.phoneInput}
              />
            </View>

            {usePassword && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.inputLabel}>Password</Text>
                <View
                  collapsable={false}
                  style={[styles.passwordRow, passwordFocused && styles.fieldFocused]}
                >
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.caption}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    onSubmitEditing={handleProceed}
                    returnKeyType="done"
                    style={styles.passwordInput}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
              </View>
            )}

            <Pressable onPress={() => setAgree(!agree)} style={styles.agreeRow}>
              <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
                {agree && <MaterialCommunityIcons name="check" size={14} color="#080C24" />}
              </View>
              <Text style={styles.agreeText}>I agree to the terms and privacy policy.</Text>
            </Pressable>

            <Pressable
              disabled={!isComplete || loading}
              onPress={handleProceed}
              style={[
                styles.submitBtn,
                (!isComplete || loading) && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.submitBtnText}>
                {loading ? 'Please wait…' : usePassword ? 'Sign in' : 'Send code'}
              </Text>
              {!loading && (
                <MaterialCommunityIcons name="arrow-right" size={20} color="#080C24" />
              )}
            </Pressable>

            <Pressable onPress={() => setUsePassword(!usePassword)} style={styles.toggleRow}>
              <Text style={styles.toggleText}>
                {usePassword ? 'Use SMS verification instead' : 'Use password to sign in'}
              </Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F3F5F9',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#A9B0D0',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 24,
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A9B0D0',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A42',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    overflow: 'hidden',
  },
  fieldFocused: {
    borderColor: 'rgba(242, 163, 58, 0.8)',
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  flagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#1B2560',
    borderRightWidth: 1,
    borderRightColor: 'rgba(243, 245, 249, 0.14)',
    gap: 6,
  },
  flagText: {
    fontSize: 16,
  },
  codeText: {
    color: '#F3F5F9',
    fontSize: 14,
    fontWeight: '800',
  },
  phoneInput: {
    flex: 1,
    color: '#F3F5F9',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 13,
    letterSpacing: 1,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A42',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    color: '#F3F5F9',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 12,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 18,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: '#121A42',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  agreeText: {
    color: '#A9B0D0',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnText: {
    color: '#080C24',
    fontSize: 15,
    fontWeight: '800',
  },
  toggleRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleText: {
    color: '#D7DBF2',
    fontSize: 13,
    fontWeight: '700',
  },
});
