import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthTitle, BackButton, ErrorNote, InfoNote, OutlineButton, authColors } from '../../components/ui/AuthUi';
import { useToast } from '../../components/ui/Toast';
import { fonts } from '../../constants/theme';
import {
  NEW_REQUEST_COOLDOWN_SEC,
  TELEGRAM_CODE_LENGTH,
  cleanCode,
  formatCountdown,
  secondsUntil,
  telegramErrorText,
} from '../../features/auth/telegram';

// "90 123 45 67" ko'rinishida formatlash (faqat 9 ta raqam)
function formatPhone(digits) {
  const d = String(digits || '').slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

const CELL_KEYS = Array.from({ length: TELEGRAM_CODE_LENGTH }, (_, i) => `tg-cell-${i}`);

/**
 * Telegram bot orqali tasdiqlash:
 *   1. "Telegram'da ochish" — deep-link botni ochadi (Start → raqamni yuborish → bot kod beradi)
 *   2. ilovaga qaytilganda kod maydoni fokuslanadi
 *   3. 5 xonali kod → POST /auth/telegram/verify
 *
 * So'rov 10 daqiqa amal qiladi (expiresAt). Muddati tugasa yoki kerak bo'lsa — "Yangi so'rov"
 * (yangi deep-link; 30 soniya cooldown). Botdagi kodni qayta olish — botning o'z tugmasi.
 *
 * Props:
 *   phone        — 9 raqam (+998 siz)
 *   challenge    — { challengeId, deepLink, expiresAt }
 *   auth         — useAuth() { verifyTelegram }
 *   onNewRequest — () => Promise — yangi so'rov ochadi (ota komponent challenge'ni almashtiradi)
 *   onBack       — raqamni o'zgartirish
 */
export default function TelegramScreen({ phone, challenge, auth, t, onNewRequest, onBack }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [errorText, setErrorText] = useState(null);
  const [openedBot, setOpenedBot] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [startedAt, setStartedAt] = useState(Date.now());

  const inputRef = useRef(null);
  const verifyingRef = useRef(false);
  const lastAutoVerifyRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const secondsLeft = secondsUntil(challenge.expiresAt, now);
  const expired = secondsLeft <= 0;
  const cooldownLeft = Math.max(0, NEW_REQUEST_COOLDOWN_SEC - Math.floor((now - startedAt) / 1000));

  // Yangi so'rov kelganda holat boshidan
  useEffect(() => {
    setCode('');
    setErrorText(null);
    setOpenedBot(false);
    setStartedAt(Date.now());
    lastAutoVerifyRef.current = null;
  }, [challenge.challengeId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Telegram'dan qaytganda: vaqtni yangilaymiz va kod maydonini fokuslaymiz
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const cameBack = /inactive|background/.test(appStateRef.current) && next === 'active';
      appStateRef.current = next;
      if (cameBack) {
        setNow(Date.now());
        if (openedBot) setTimeout(() => inputRef.current?.focus(), 250);
      }
    });
    return () => subscription.remove();
  }, [openedBot]);

  const openBot = useCallback(async () => {
    setErrorText(null);
    try {
      await Linking.openURL(challenge.deepLink);
      setOpenedBot(true);
    } catch {
      setErrorText(t('tgOpenFailed'));
    }
  }, [challenge.deepLink, t]);

  const verify = useCallback(async (finalCode) => {
    if (secondsUntil(challenge.expiresAt) <= 0) {
      setErrorText(t('tgExpired'));
      return;
    }
    verifyingRef.current = true;
    setVerifying(true);
    setErrorText(null);
    try {
      await auth.verifyTelegram(challenge.challengeId, finalCode);
      // auth.isAuthenticated o'zgaradi — AppNavigator keyingi ekranga o'tkazadi, bu komponent o'chadi
      toast.show(t('tgSignedIn'), 'success');
    } catch (err) {
      setErrorText(telegramErrorText(err, t));
      setCode('');
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  }, [auth, challenge.challengeId, challenge.expiresAt, t, toast]);

  const handleCodeChange = useCallback((text) => {
    if (verifyingRef.current) return;
    const clean = cleanCode(text);
    setCode(clean);
    setErrorText(null);
    if (clean.length < TELEGRAM_CODE_LENGTH) {
      lastAutoVerifyRef.current = null;
    } else if (clean !== lastAutoVerifyRef.current) {
      lastAutoVerifyRef.current = clean;
      verify(clean);
    }
  }, [verify]);

  const newRequest = useCallback(async () => {
    if (requesting || (cooldownLeft > 0 && !expired)) return;
    setRequesting(true);
    setErrorText(null);
    try {
      await onNewRequest();
    } catch (err) {
      setErrorText(telegramErrorText(err, t));
    } finally {
      setRequesting(false);
    }
  }, [requesting, cooldownLeft, expired, onNewRequest, t]);

  const activeIndex = Math.min(code.length, TELEGRAM_CODE_LENGTH - 1);
  const steps = [t('tgStep1'), t('tgStep2'), t('tgStep3')];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <BackButton onPress={onBack} label={t('back')} />
          </View>

          <View style={styles.head}>
            <AuthTitle title={t('tgTitle')} subtitle={t('tgSub').replace('{phone}', formatPhone(phone))}>
              <Pressable onPress={onBack} hitSlop={6} style={styles.changeLink}>
                <Text style={styles.changeText}>{t('changeNumber')}</Text>
              </Pressable>
            </AuthTitle>
          </View>

          <View style={styles.steps}>
            {steps.map((label, i) => (
              <View key={label} style={styles.stepRow}>
                <View style={[styles.stepDot, (i === 0 ? openedBot : i === 2 && code.length > 0) && styles.stepDotDone]}>
                  <Text style={styles.stepNum}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.openWrap}>
            <Pressable
              onPress={openBot}
              disabled={expired}
              accessibilityRole="button"
              style={({ pressed }) => [styles.telegram, !openedBot && styles.telegramPrimary, expired && styles.dimmed, pressed && styles.pressed]}
            >
              <FontAwesome name="telegram" size={22} color={openedBot ? authColors.teal : '#FFFFFF'} />
              <Text style={[styles.telegramText, !openedBot && styles.telegramPrimaryText]}>
                {openedBot ? t('tgReopenBot') : t('tgOpenBot')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.cellsWrap}>
            <View style={styles.cellsRow} pointerEvents="none">
              {CELL_KEYS.map((cellKey, i) => {
                const char = code[i] || '';
                const active = isFocused && !verifying && i === activeIndex && !char;
                return (
                  <View key={cellKey} style={[styles.cell, active && styles.cellActive, Boolean(errorText) && styles.cellError]}>
                    <Text style={styles.cellText}>{char}</Text>
                  </View>
                );
              })}
            </View>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleCodeChange}
              editable={!expired}
              keyboardType="number-pad"
              maxLength={TELEGRAM_CODE_LENGTH}
              caretHidden
              contextMenuHidden
              autoCorrect={false}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              accessibilityLabel={t('otpLabel')}
              style={styles.overlayInput}
            />
          </View>

          <View style={styles.below}>
            {Boolean(errorText) && <ErrorNote>{errorText}</ErrorNote>}
            {verifying && <Text style={styles.muted}>{t('verifying')}</Text>}
            {!verifying && openedBot && !expired && !code && <Text style={styles.muted}>{t('tgWaiting')}</Text>}
            {expired && !errorText && <ErrorNote>{t('tgExpired')}</ErrorNote>}

            <View style={styles.row}>
              <MaterialCommunityIcons name="timer-outline" size={18} color={authColors.muted} />
              {!expired && (
                <Text style={styles.muted}>
                  {`${t('tgExpiresIn')} `}
                  <Text style={styles.value}>{formatCountdown(secondsLeft)}</Text>
                </Text>
              )}
              <View style={styles.flex} />
              {cooldownLeft > 0 && !expired ? (
                <Text style={styles.muted}>{`${t('tgNewRequestIn')} ${formatCountdown(cooldownLeft)}`}</Text>
              ) : (
                <Pressable onPress={newRequest} disabled={requesting} hitSlop={10} accessibilityRole="button">
                  <Text style={[styles.link, requesting && styles.dimmed]}>{t('tgNewRequest')}</Text>
                </Pressable>
              )}
            </View>

            <InfoNote icon="information-outline" compact>
              {t('tgResendHint')}
            </InfoNote>
          </View>

          {expired && (
            <View style={styles.actions}>
              <OutlineButton label={t('tgNewRequest')} onPress={newRequest} loading={requesting} />
            </View>
          )}
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
  steps: { paddingHorizontal: 24, paddingTop: 22, gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: authColors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { borderColor: authColors.accent },
  stepNum: { color: authColors.soft, fontFamily: fonts.bodySemi, fontSize: 12 },
  stepText: { flex: 1, color: authColors.soft, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  openWrap: { paddingHorizontal: 24, paddingTop: 20 },
  telegram: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: authColors.teal,
  },
  telegramText: { color: authColors.text, fontFamily: fonts.bodyMedium, fontSize: 16 },
  telegramPrimary: { backgroundColor: authColors.teal, borderColor: authColors.teal },
  telegramPrimaryText: { color: '#FFFFFF', fontFamily: fonts.bodySemi },
  cellsWrap: { marginTop: 24, marginHorizontal: 24 },
  cellsRow: { flexDirection: 'row', gap: 10 },
  cell: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    backgroundColor: authColors.field,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderColor: authColors.accent },
  cellError: { borderColor: 'rgba(232,84,63,0.6)' },
  cellText: { color: authColors.text, fontFamily: fonts.numericBold, fontSize: 32 },
  // Katakchalar ustidagi shaffof haqiqiy input — teginish to'g'ridan-to'g'ri (native) fokuslaydi
  overlayInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.011,
    color: 'transparent',
    fontSize: 1,
  },
  below: { paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muted: { color: authColors.muted, fontFamily: fonts.body, fontSize: 14 },
  value: { color: authColors.text, fontFamily: fonts.bodySemi },
  link: { color: authColors.accent, fontFamily: fonts.bodySemi, fontSize: 15 },
  actions: { paddingHorizontal: 24, paddingTop: 20 },
  dimmed: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
