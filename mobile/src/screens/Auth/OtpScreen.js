import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { OTP_LENGTH, demoOtpHintText } from '../../features/auth/demoOtp';

// "90 123 45 67" ko'rinishida formatlash (faqat 9 ta raqam)
function formatPhone(digits) {
  const d = String(digits || '').slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Barqaror, unikal kalitlar — OTP katakchalari hech qachon qayta
// o'rnatilmaydi (remount) va fokus yo'qolmaydi. `key={index}` o'rniga shu.
const OTP_CELL_KEYS = Array.from({ length: OTP_LENGTH }, (_, i) => `otp-cell-${i}`);

/**
 * OTP kirish ekrani.
 *
 * FOCUS MUAMMOLARI VA YECHIMLAR:
 * - Bitta TextInput ishlatamiz (yashirin), ko'rinadigan "cell"lar ko'rsatamiz.
 * - Bu Android/iOS focus bug'larini to'liq bartaraf etadi.
 * - Foydalanuvchi istalgan cellga bosganida yashirin input focus oladi.
 */
export default function OtpScreen({ phone, auth, onBack, onVerified }) {
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
  // tekshiriladi.
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
      setErrorText(`${OTP_LENGTH} xonali tasdiqlash kodini to'liq kiriting`);
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
    setErrorText(null);
    setCode('');
    try {
      const res = await auth.requestOtp(phone);
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
            <MaterialCommunityIcons name="arrow-left" size={22} color="#F3F5F9" />
          </Pressable>

          {/* Header */}
          <Text style={styles.title}>Kodni kiriting</Text>
          <Text style={styles.subtitle}>
            +998 {formatPhone(phone)} raqamiga {OTP_LENGTH} xonali kod yuborildi
          </Text>
          <Pressable onPress={onBack} hitSlop={6}>
            <Text style={styles.changeNumberLink}>Raqamni o'zgartirish</Text>
          </Pressable>

          {/* OTP katakchalari (bosilganda yashirin inputga focus) */}
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
            maxLength={OTP_LENGTH}
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

          {loading && <Text style={styles.verifyingText}>Tekshirilmoqda…</Text>}

          {/* Qayta yuborish */}
          <View style={styles.resendRow}>
            {secondsLeft > 0 ? (
              <Text style={styles.timerText}>
                Qayta yuborish{'  '}
                <Text style={styles.timerHighlight}>{formatCountdown(secondsLeft)}</Text>
              </Text>
            ) : (
              <Pressable onPress={handleResend} hitSlop={10}>
                <Text style={styles.resendBtnText}>Yangi kod yuborish →</Text>
              </Pressable>
            )}
          </View>

          {/* Demo badge */}
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>{demoOtpHintText}</Text>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F3F5F9',
  },
  subtitle: {
    fontSize: 14,
    color: '#A9B0D0',
    lineHeight: 20,
    marginTop: 6,
  },
  changeNumberLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 24,
  },
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
  },
  errorText: {
    color: '#FFC5C0',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  verifyingText: {
    color: '#A9B0D0',
    fontSize: 13,
    marginTop: 14,
  },
  resendRow: {
    marginTop: 20,
  },
  timerText: {
    color: '#A9B0D0',
    fontSize: 13,
  },
  timerHighlight: {
    color: '#F3F5F9',
    fontWeight: '800',
  },
  resendBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  demoBadge: {
    marginTop: 18,
    backgroundColor: 'rgba(25, 167, 161, 0.14)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(25, 167, 161, 0.32)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  demoBadgeText: {
    color: colors.tealLight ?? colors.teal,
    fontSize: 13,
    fontWeight: '700',
  },
});
