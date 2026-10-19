import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

// Barqaror, unikal kalitlar — OTP katakchalari hech qachon qayta
// o'rnatilmaydi (remount) va fokus yo'qolmaydi. `key={index}` o'rniga shu.
const OTP_LENGTH = 6;
const OTP_CELL_KEYS = Array.from({ length: OTP_LENGTH }, (_, i) => `otp-cell-${i}`);

/**
 * OTP kirish ekrani.
 *
 * FOCUS MUAMMOLARI VA YECHIMLAR:
 * - Bitta TextInput ishlatamiz (yashirin), 6 ta ko'rinadigan "cell" ko'rsatamiz.
 * - Bu Android/iOS focus bug'larini to'liq bartaraf etadi.
 * - Foydalanuvchi istalgan cellga bosganida yashirin input focus oladi.
 */
export default function OtpScreen({
  phone,
  auth,
  t,
  onBack,
  onVerified,
  isDemo = true,
}) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isFocused, setIsFocused] = useState(false);

  // Yagona yashirin input ref
  const inputRef = useRef(null);

  // Oxirgi avtomatik tekshirilgan kod. Android IME/sms-autofill tozalangan
  // inputga eski matnni qayta yuborsa (RN controlled-input re-commit), shu
  // sabab bilan aynan shu kodni yana-qayta tekshirib, FOCUS↔BLUR tsiklini
  // yaratmaslik uchun — har bir unikal kod faqat bir marta avtomatik
  // tekshiriladi. Foydalanuvchi "Tasdiqlash" tugmasi bilan qayta urinish qila
  // oladi (o'zgartirilmagan UX).
  const lastAutoVerifyRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  // Ekran ochilganda focus. Foydalanuvchi allaqachon input'ni bosgan bo'lsa,
  // kechiktirilgan fokus uni boshqa joyga "tortib" olmaydi (race yo'q).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!inputRef.current?.isFocused?.()) inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const verifyCode = useCallback(async (codeToVerify) => {
    const finalCode = codeToVerify || code;
    if (finalCode.length !== OTP_LENGTH) {
      setErrorText("6 xonali tasdiqlash kodini to'liq kiriting");
      return;
    }

    // Fokus ATAYLAB saqlanadi: tekshirish paytida blur qilinsa, Android
    // navigatsiya/fokus boshqaruvini o'zi boshlab yuboradi va fokus boshqa
    // maydonga sakraydi. Xato bo'lsa kod tozalanadi-yu, fokus joyida qoladi.
    setLoading(true);
    setErrorText(null);

    try {
      await auth.verifyOtp(phone, finalCode);
      setLoading(false);
      toast.show('✓ Telefon raqam tasdiqlandi', 'success');
      onVerified?.({ phone, code: finalCode });
    } catch (err) {
      setLoading(false);
      const msg = err.message || "Tasdiqlash kodi noto'g'ri";
      setErrorText(msg);
      // Kodni tozalaymiz — input allaqachon fokusda, qayta focus chaqirilmaydi.
      setCode('');
    }
  }, [code, phone, auth, onVerified, toast]);

  const handleCodeChange = useCallback((text) => {
    const clean = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(clean);
    setErrorText(null);

    // OTP_LENGTH ta raqam to'ldirilganda avtomatik tekshirish —
    // aynan shu kodni avval avtomatik tekshirgan bo'lsak, qayta yuborilmaydi
    // (Android IME/autofill re-commit tsiklini o'chiradi).
    if (clean.length === OTP_LENGTH && clean !== lastAutoVerifyRef.current) {
      lastAutoVerifyRef.current = clean;
      verifyCode(clean);
    }
  }, [verifyCode]);

  const handleResend = async () => {
    if (secondsLeft > 0) return;
    setLoading(true);
    setErrorText(null);
    setCode('');
    try {
      const res = await auth.requestOtp(phone);
      setLoading(false);
      setSecondsLeft(60);
      if (res.isDemo) {
        toast.show(res.message, 'demo', 4000);
      } else {
        toast.show('Yangi kod yuborildi', 'success');
      }
      setTimeout(() => {
        if (!inputRef.current?.isFocused?.()) inputRef.current?.focus();
      }, 200);
    } catch (err) {
      setLoading(false);
      toast.show(err.message || 'Kodni yuborishda xatolik', 'error');
    }
  };

  // Cell bosganida input ga focus
  const focusInput = () => {
    inputRef.current?.focus();
  };

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
          {/* Back */}
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="shield-key-outline" size={32} color={colors.accent} />
            </View>
            <Text style={styles.eyebrow}>FORMO · TASDIQLASH</Text>
            <Text style={styles.title}>Kodni kiriting</Text>
            <Text style={styles.subtitle}>
              +998 {formatPhone(phone)} raqamiga 6 xonali kod yuborildi
            </Text>

            {/* Demo badge */}
            <Pressable onPress={focusInput} style={styles.demoBadge}>
              <MaterialCommunityIcons name="information-outline" size={14} color={colors.accent} />
              <Text style={styles.demoBadgeText}>
                Demo rejim — kod:{' '}
                <Text style={styles.demoCode}>123456</Text>
              </Text>
            </Pressable>
          </View>

          {/* OTP Card */}
          <View style={styles.card}>
            {/* 6 ta ko'rinadigan cell (bosilganda yashirin inputga focus) */}
            <Pressable onPress={focusInput} style={styles.cellsRow}>
              {OTP_CELL_KEYS.map((cellKey, i) => {
                const char = code[i] || '';
                const isActive = isFocused && i === Math.min(code.length, OTP_LENGTH - 1);
                const isFilled = Boolean(char);
                const hasError = Boolean(errorText);

                return (
                  <View
                    key={cellKey}
                    style={[
                      styles.cell,
                      isFilled && styles.cellFilled,
                      isActive && styles.cellFocused,
                      hasError && styles.cellError,
                    ]}
                  >
                    {char ? (
                      <Text style={styles.cellText}>{char}</Text>
                    ) : (
                      isActive && <View style={styles.cursor} />
                    )}
                  </View>
                );
              })}
            </Pressable>

            {/* Yashirin haqiqiy TextInput */}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              caretHidden
              autoCorrect={false}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={styles.hiddenInput}
            />

            {/* Xato */}
            {Boolean(errorText) && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#E8543F" />
                <Text style={styles.errorText}>{errorText}</Text>
              </View>
            )}

            {/* Qayta yuborish */}
            <View style={styles.resendRow}>
              {secondsLeft > 0 ? (
                <Text style={styles.timerText}>
                  Qayta yuborish:{' '}
                  <Text style={styles.timerHighlight}>{secondsLeft} soniya</Text>
                </Text>
              ) : (
                <Pressable onPress={handleResend} hitSlop={10}>
                  <Text style={styles.resendBtnText}>Yangi kod yuborish →</Text>
                </Pressable>
              )}
            </View>

            {/* Tasdiqlash tugmasi */}
            <Pressable
              disabled={code.length !== OTP_LENGTH || loading}
              onPress={() => verifyCode()}
              style={[styles.submitBtn, (code.length !== OTP_LENGTH || loading) && styles.submitBtnDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#080C24" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Tasdiqlash</Text>
                  <View style={styles.submitIcon}>
                    <MaterialCommunityIcons name="check" size={18} color="#080C24" />
                  </View>
                </>
              )}
            </Pressable>

            <Text style={styles.helpText}>
              Ekranga bosing — klaviatura ochiladi
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
    paddingBottom: 40,
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
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
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
    paddingHorizontal: 20,
  },
  demoBadge: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  demoBadgeText: {
    color: '#A9B0D0',
    fontSize: 12,
    fontWeight: '600',
  },
  demoCode: {
    color: colors.accent,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    elevation: 4,
  },
  // 6 ta cell ko'rinishi
  cellsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#121A42',
    borderWidth: 1.5,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.08)',
  },
  cellFocused: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.06)',
    // iOS shadow
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cellError: {
    borderColor: '#E8543F',
    backgroundColor: 'rgba(232, 84, 63, 0.08)',
  },
  cellText: {
    color: '#F3F5F9',
    fontSize: 26,
    fontWeight: '900',
  },
  cursor: {
    width: 2,
    height: 26,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  // Yashirin input — foydalanuvchi ko'rmaydi lekin klaviatura uchun kerak
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
    pointerEvents: 'none',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(232, 84, 63, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 84, 63, 0.4)',
    marginTop: 14,
    marginBottom: 4,
  },
  errorText: {
    color: '#FFC5C0',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 18,
  },
  timerText: {
    color: '#A9B0D0',
    fontSize: 13,
  },
  timerHighlight: {
    color: colors.accent,
    fontWeight: '800',
  },
  resendBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
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
    shadowOpacity: 0.3,
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
  submitIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(8, 12, 36, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6F77A0',
    marginTop: 14,
    lineHeight: 18,
  },
});
