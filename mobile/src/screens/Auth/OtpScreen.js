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
import { AuthTitle, BackButton, ErrorNote, InfoNote, authColors } from '../../components/ui/AuthUi';
import { useToast } from '../../components/ui/Toast';
import { fonts } from '../../constants/theme';
import { OTP_LENGTH, demoOtpHintCode, isDemoOtpEnabled } from '../../features/auth/demoOtp';
import { ApiError } from '../../services/api';

const RESEND_SECONDS = 60;

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

/** POST /auth/otp-login xatosini lokalizatsiyalangan matnga aylantiradi. */
function otpErrorText(err, t) {
  if (err instanceof ApiError) {
    if (err.status === 401) return t('otpCodeWrong');
    if (err.status === 429) return t('tooManyAttempts');
    if (err.status === 0) return t('networkError');
    // 400 (validatsiya) / 403 (bloklangan yoki xodim hisobi) — serverning o'z sababi
    return err.message || t('authError');
  }
  if (err instanceof TypeError) return t('networkError');
  return t('otpUnavailable');
}

// Barqaror kalitlar — katakchalar hech qachon qayta o'rnatilmaydi
const OTP_CELL_KEYS = Array.from({ length: OTP_LENGTH }, (_, i) => `otp-cell-${i}`);

/**
 * OTP kirish ekrani.
 *
 * Fokus: bitta haqiqiy TextInput katakchalar ustida shaffof qatlam bo'lib
 * turadi — teginish uni to'g'ridan-to'g'ri (native) fokuslaydi, JS'dan
 * `focus()` chaqirish va taymerlar kerak emas. Tekshirish paytida ham input
 * blur/disabled qilinmaydi (Android fokusni boshqa joyga sakratmasin).
 */
export default function OtpScreen({ phone, auth, t, onBack }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [isFocused, setIsFocused] = useState(false);

  const loadingRef = useRef(false);
  // Oxirgi avtomatik tekshirilgan kod: Android IME tozalangan inputga eski
  // matnni qayta yuborsa, aynan shu kod qayta yuborilmaydi. Foydalanuvchi
  // qaytadan yoza boshlaganda (qisqaroq matn) tiklanadi.
  const lastAutoVerifyRef = useRef(null);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const verifyCode = useCallback(async (finalCode) => {
    loadingRef.current = true;
    setLoading(true);
    setErrorText(null);
    try {
      await auth.verifyOtp(phone, finalCode);
      // Muvaffaqiyat: auth.isAuthenticated o'zgaradi va AppNavigator keyingi
      // ekranga o'tkazadi — bu komponent o'chadi.
      toast.show(t('phoneVerified'), 'success');
    } catch (err) {
      setErrorText(otpErrorText(err, t));
      setCode('');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [auth, phone, t, toast]);

  const handleCodeChange = useCallback((text) => {
    if (loadingRef.current) return;
    const clean = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(clean);
    setErrorText(null);

    if (clean.length < OTP_LENGTH) {
      lastAutoVerifyRef.current = null;
    } else if (clean !== lastAutoVerifyRef.current) {
      lastAutoVerifyRef.current = clean;
      verifyCode(clean);
    }
  }, [verifyCode]);

  const handleResend = async () => {
    if (secondsLeft > 0) return;
    setErrorText(null);
    setCode('');
    lastAutoVerifyRef.current = null;
    try {
      const res = await auth.requestOtp(phone);
      setSecondsLeft(RESEND_SECONDS);
      toast.show(res?.isDemo ? `${t('otpDemoCode')} ${demoOtpHintCode}` : t('resendNow'), res?.isDemo ? 'demo' : 'success');
    } catch (err) {
      setErrorText(otpErrorText(err, t));
    }
  };

  const activeIndex = Math.min(code.length, OTP_LENGTH - 1);
  const subtitle = t('otpSentTo').replace('{phone}', formatPhone(phone)).replace('{n}', String(OTP_LENGTH));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <BackButton onPress={onBack} label={t('back')} />
          </View>

          <View style={styles.head}>
            <AuthTitle title={t('otpEnterTitle')} subtitle={subtitle}>
              <Pressable onPress={onBack} hitSlop={6} style={styles.changeLink}>
                <Text style={styles.changeText}>{t('changeNumber')}</Text>
              </Pressable>
            </AuthTitle>
          </View>

          <View style={styles.cellsWrap}>
            <View style={styles.cellsRow} pointerEvents="none">
              {OTP_CELL_KEYS.map((cellKey, i) => {
                const char = code[i] || '';
                const active = isFocused && !loading && i === activeIndex && !char;
                return (
                  <View
                    key={cellKey}
                    style={[styles.cell, active && styles.cellActive, Boolean(errorText) && styles.cellError]}
                  >
                    <Text style={styles.cellText}>{char}</Text>
                  </View>
                );
              })}
            </View>
            <TextInput
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              autoFocus
              caretHidden
              contextMenuHidden
              autoCorrect={false}
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              importantForAutofill="yes"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              accessibilityLabel={t('otpLabel')}
              style={styles.overlayInput}
            />
          </View>

          <View style={styles.below}>
            {Boolean(errorText) && <ErrorNote>{errorText}</ErrorNote>}
            {loading && <Text style={styles.verifying}>{t('verifying')}</Text>}

            <View style={styles.resendRow}>
              <MaterialCommunityIcons name="timer-outline" size={18} color={authColors.muted} />
              {secondsLeft > 0 ? (
                <Text style={styles.timerText}>
                  {`${t('resendIn')} `}
                  <Text style={styles.timerValue}>{formatCountdown(secondsLeft)}</Text>
                </Text>
              ) : (
                <Pressable onPress={handleResend} hitSlop={10} accessibilityRole="button">
                  <Text style={styles.resendNow}>{t('resendNow')}</Text>
                </Pressable>
              )}
            </View>

            {/* Faqat dev demo: server shu kodni qabul qiladi (haqiqiy SMS yo'q) */}
            {isDemoOtpEnabled() && (
              <InfoNote icon="auto-fix" compact>
                {`${t('otpDemoCode')} ${demoOtpHintCode}`}
              </InfoNote>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: authColors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 24 },
  topBar: { paddingHorizontal: 20, paddingTop: 8 },
  head: { paddingHorizontal: 24, paddingTop: 20 },
  changeLink: { alignSelf: 'flex-start' },
  changeText: { color: authColors.accent, fontFamily: fonts.bodyMedium, fontSize: 15 },
  cellsWrap: { marginTop: 32, marginHorizontal: 24 },
  cellsRow: { flexDirection: 'row', gap: 10 },
  cell: {
    flex: 1,
    height: 68,
    borderRadius: 16,
    backgroundColor: authColors.field,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderColor: authColors.accent },
  cellError: { borderColor: 'rgba(232,84,63,0.6)' },
  cellText: { color: authColors.text, fontFamily: fonts.numericBold, fontSize: 34 },
  // Katakchalar ustidagi shaffof haqiqiy input — teginish shu yerga tushadi
  overlayInput: {
    // RN 0.88: `absoluteFillObject` olib tashlangan — `absoluteFill` oddiy obyekt
    ...StyleSheet.absoluteFill,
    opacity: 0.011,
    color: 'transparent',
    fontSize: 1,
  },
  below: { paddingHorizontal: 24, paddingTop: 18, gap: 14 },
  verifying: { color: authColors.muted, fontFamily: fonts.body, fontSize: 14 },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  timerText: { color: authColors.muted, fontFamily: fonts.body, fontSize: 15 },
  timerValue: { color: authColors.text, fontFamily: fonts.bodySemi },
  resendNow: { color: authColors.accent, fontFamily: fonts.bodySemi, fontSize: 15 },
});
