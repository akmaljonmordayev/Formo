import React, { useCallback, useRef, useState } from 'react';
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
import { formatPhone } from '../../services/api';

export default function PhoneScreen({
  auth,
  t,
  onBack,
  onRequestOtp,
  onPasswordLogin,
  onRegister,
}) {
  const toast = useToast();
  const [rawDigits, setRawDigits] = useState('');
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Focus state — faqat style uchun, focus management uchun emas
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const phoneRef = useRef(null);
  const passwordRef = useRef(null);

  // 9 ta raqam (998 prefikssiz)
  const cleanDigits = rawDigits.replace(/\D/g, '').slice(0, 9);
  const isComplete = cleanDigits.length === 9;

  const handleDigitsChange = useCallback((text) => {
    // +998... formatidagi paste ni ham qabul qilish
    let d = text.replace(/\D/g, '');
    if (d.length > 9 && d.startsWith('998')) d = d.slice(3);
    if (d.length > 9 && d.startsWith('8')) d = d.slice(1);
    setRawDigits(d.slice(0, 9));
  }, []);

  // SMS/OTP yuborish — parol rejimidan qat'i nazar bir xil yo'l.
  const sendOtp = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auth.requestOtp(cleanDigits);
      if (res?.isDemo) {
        toast.show(res.message || "Demo rejim: kod 123456", 'demo', 4000);
      }
      onRequestOtp?.({ phone: cleanDigits, isDemo: Boolean(res?.isDemo) });
    } catch (err) {
      toast.show(err.message || 'SMS yuborishda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  }, [auth, cleanDigits, onRequestOtp, toast]);

  const handleProceed = useCallback(async () => {
    if (loading) return;

    if (!isComplete) {
      toast.show('9 ta raqamli telefon raqamni kiriting', 'error');
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
        if (!res?.success) {
          toast.show(res?.error?.message || "Telefon raqam yoki parol noto'g'ri", 'error');
        } else {
          onPasswordLogin?.({ phone: `+998${cleanDigits}`, password });
        }
      } catch (err) {
        toast.show(err.message || 'Kirishda xatolik', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // SMS OTP yo'li
    await sendOtp();
  }, [loading, isComplete, agree, usePassword, password, cleanDigits, auth, onPasswordLogin, sendOtp, toast]);

  const handleRegisterPress = useCallback(() => {
    if (!isComplete) {
      toast.show('Avval telefon raqamingizni kiriting', 'error');
      return;
    }
    // Ro'yxatdan o'tish har doim SMS/OTP yo'lidan boradi — joriy rejimga
    // qarab emas (aks holda parol rejimida noto'g'ri tarmoqqa tushib qolardi).
    setUsePassword(false);
    setPassword('');
    sendOtp();
  }, [isComplete, sendOtp, toast]);

  const togglePasswordMode = useCallback(() => {
    // Rejim almashganda fokus KO'CHIRILMAYDI. Fokus faqat foydalanuvchi
    // input'ni o'zi bosganda yoki aniq "keyingi/tasdiqlash" bosqichida
    // o'zgaradi. Aks holda rejim almashtirishda berilgan `focus()` chaqiruvi
    // Android'ning o'z fokus boshqaruvi (input mount/unmount bo'lganda)
    // bilan "poyga"ga tushib, fokus kutilmaganda boshqa maydonga sakraydi.
    setUsePassword((v) => !v);
    setPassword('');
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back tugmasi */}
          {Boolean(onBack) && (
            <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
            </Pressable>
          )}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="cellphone-check" size={32} color={colors.accent} />
            </View>
            <Text style={styles.eyebrow}>FORMO · KIRISH</Text>
            <Text style={styles.title}>Xush kelibsiz</Text>
            <Text style={styles.subtitle}>
              Telefon raqamingizni kiriting — kirish yoki ro'yxatdan o'tish
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* --- Telefon raqam --- */}
            <Text style={styles.inputLabel}>Telefon raqam</Text>
            <Pressable
              // Fabric: `fieldFocused` adds shadowColor/elevation, which flips the
              // FormsStackingContext trait on focus and makes the differ emit
              // remove+insert for this subtree — the TextInput inside would lose
              // native focus right after gaining it. Pinning the trait prevents it.
              collapsable={false}
              onPress={() => phoneRef.current?.focus()}
              style={[styles.phoneRow, phoneFocused && styles.fieldFocused]}
            >
              <View style={styles.flagBox}>
                <Text style={styles.flagEmoji}>🇺🇿</Text>
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
                importantForAutofill="no"
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                returnKeyType={usePassword ? 'next' : 'done'}
                onSubmitEditing={() => {
                  if (usePassword && isComplete) {
                    passwordRef.current?.focus();
                  } else {
                    handleProceed();
                  }
                }}
                blurOnSubmit={false}
                style={styles.phoneInput}
              />
              {isComplete && (
                <View style={styles.checkDot}>
                  <MaterialCommunityIcons name="check" size={13} color="#080C24" />
                </View>
              )}
            </Pressable>

            {/* --- Parol (faqat parol rejimida) --- */}
            {usePassword && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.inputLabel}>Parol</Text>
                <View
                  collapsable={false}
                  style={[styles.passwordRow, passwordFocused && styles.fieldFocused]}
                >
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Parolingizni kiriting"
                    placeholderTextColor={colors.caption}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    importantForAutofill="no"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    onSubmitEditing={handleProceed}
                    returnKeyType="done"
                    blurOnSubmit
                    style={styles.passwordInput}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={12}
                    style={styles.eyeBtn}
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

            {/* --- Rozilik --- */}
            <Pressable
              onPress={() => setAgree((v) => !v)}
              style={styles.agreeRow}
              hitSlop={6}
            >
              <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
                {agree && (
                  <MaterialCommunityIcons name="check" size={13} color="#080C24" />
                )}
              </View>
              <Text style={styles.agreeText}>
                Foydalanish shartlari va maxfiylik siyosatiga roziman
              </Text>
            </Pressable>

            {/* --- Asosiy tugma --- */}
            <Pressable
              onPress={handleProceed}
              disabled={!isComplete || loading}
              style={[
                styles.submitBtn,
                (!isComplete || loading) && styles.submitBtnDisabled,
              ]}
            >
              {loading ? (
                <Text style={styles.submitBtnText}>Iltimos kuting…</Text>
              ) : (
                <>
                  <Text style={styles.submitBtnText}>
                    {usePassword ? 'Kirish' : 'SMS kod yuborish'}
                  </Text>
                  <View style={styles.submitArrow}>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#080C24" />
                  </View>
                </>
              )}
            </Pressable>

            {/* --- Rejim almashtirish --- */}
            <Pressable
              onPress={togglePasswordMode}
              style={styles.toggleRow}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name={usePassword ? 'message-text-outline' : 'lock-outline'}
                size={15}
                color={colors.teal}
              />
              <Text style={styles.toggleText}>
                {usePassword ? 'SMS tasdiqlash orqali kirish' : 'Parol orqali kirish'}
              </Text>
            </Pressable>

            {/* --- Separator --- */}
            <View style={styles.divider} />

            {/* --- Ro'yxatdan o'tish havolasi --- */}
            <Pressable onPress={handleRegisterPress} hitSlop={6} style={styles.registerRow}>
              <Text style={styles.registerText}>
                Akkauntingiz yo'qmi?{'  '}
                <Text style={styles.registerLink}>SMS orqali ro'yxatdan o'ting →</Text>
              </Text>
            </Pressable>
          </View>

          {/* Demo info */}
          <View style={styles.demoCard}>
            <MaterialCommunityIcons name="information-outline" size={15} color={colors.accent} />
            <Text style={styles.demoText}>
              Demo rejim: SMS kodi{' '}
              <Text style={styles.demoCode}>123456</Text>
            </Text>
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
    paddingBottom: 48,
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
    marginBottom: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
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
    elevation: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A9B0D0',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A42',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    overflow: 'hidden',
  },
  fieldFocused: {
    borderColor: 'rgba(242, 163, 58, 0.75)',
    shadowColor: colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  flagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#1B2560',
    borderRightWidth: 1,
    borderRightColor: 'rgba(243, 245, 249, 0.12)',
    gap: 5,
  },
  flagEmoji: { fontSize: 16 },
  codeText: {
    color: '#F3F5F9',
    fontSize: 14,
    fontWeight: '800',
  },
  phoneInput: {
    flex: 1,
    color: '#F3F5F9',
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 14,
    letterSpacing: 1.2,
  },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A42',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    paddingRight: 4,
  },
  passwordInput: {
    flex: 1,
    color: '#F3F5F9',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeBtn: {
    padding: 10,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 18,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#121A42',
    borderWidth: 1.5,
    borderColor: 'rgba(243, 245, 249, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    color: '#080C24',
    fontSize: 15,
    fontWeight: '800',
  },
  submitArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(8,12,36,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 4,
  },
  toggleText: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(243, 245, 249, 0.07)',
    marginTop: 18,
    marginBottom: 4,
  },
  registerRow: {
    marginTop: 14,
    alignItems: 'center',
    paddingBottom: 2,
  },
  registerText: {
    color: '#A9B0D0',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  registerLink: {
    color: colors.teal,
    fontWeight: '800',
  },
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(242, 163, 58, 0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.18)',
  },
  demoText: {
    color: '#A9B0D0',
    fontSize: 12,
    fontWeight: '600',
  },
  demoCode: {
    color: colors.accent,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
