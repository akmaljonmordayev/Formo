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
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthTitle, BackButton, ErrorNote, OutlineButton, authColors } from '../../components/ui/AuthUi';
import { useToast } from '../../components/ui/Toast';
import { fonts } from '../../constants/theme';

// "90 123 45 67" ko'rinishida formatlash (faqat 9 ta raqam)
function formatPhone(digits) {
  const d = digits.slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

/** "+998 90 123 45 67", "998901234567", "8 90..." paste'larini 9 raqamga keltiradi */
function toLocalDigits(text) {
  let d = text.replace(/\D/g, '');
  if (d.length > 9 && d.startsWith('998')) d = d.slice(3);
  if (d.length > 9 && d.startsWith('8')) d = d.slice(1);
  return d.slice(0, 9);
}

/**
 * Telefon raqam bosqichi — faqat SMS/OTP orqali kirish (parol yo'q).
 * Mavjud hisob bo'lsa `auth.verifyOtp` kiradi, bo'lmasa server avtomatik
 * ro'yxatdan o'tkazadi — shuning uchun bu yerda "kirish/ro'yxat" farqi yo'q.
 *
 * Fokus: maydon uslubi fokusda faqat `borderColor`ni almashtiradi (soya/
 * elevation yo'q), ota Pressable `collapsable={false}` — Fabric TextInput'ni
 * qayta yaratmaydi va fokus yo'qolmaydi.
 */
export default function PhoneScreen({ auth, t, initialPhone = '', onBack, onRequestOtp }) {
  const toast = useToast();
  const [digits, setDigits] = useState(() => toLocalDigits(initialPhone));
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState(null);

  const phoneRef = useRef(null);
  const isComplete = digits.length === 9;
  const canSubmit = isComplete && agree && !loading;

  const handleDigitsChange = useCallback((text) => {
    setDigits(toLocalDigits(text));
    setErrorText(null);
  }, []);

  const handleProceed = useCallback(async () => {
    if (loading) return;
    if (!isComplete) {
      setErrorText(t('phoneInvalid'));
      return;
    }
    if (!agree) {
      setErrorText(t('agreeRequired'));
      return;
    }

    setLoading(true);
    setErrorText(null);
    try {
      const res = await auth.requestOtp(digits);
      onRequestOtp?.({ phone: digits, isDemo: Boolean(res?.isDemo) });
    } catch {
      setErrorText(t('otpUnavailable'));
    } finally {
      setLoading(false);
    }
  }, [loading, isComplete, agree, auth, digits, onRequestOtp, t]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Android: app.json softwareKeyboardLayoutMode=resize oynani o'zi kichraytiradi */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            {Boolean(onBack) && <BackButton onPress={onBack} label={t('back')} />}
          </View>

          <View style={styles.head}>
            <AuthTitle title={t('phoneTitle')} subtitle={t('phoneSub')} />
          </View>

          <View style={styles.form}>
            <Pressable
              collapsable={false}
              onPress={() => phoneRef.current?.focus()}
              style={styles.phoneRow}
            >
              <Text style={styles.code}>+998</Text>
              <View style={styles.divider} />
              <TextInput
                ref={phoneRef}
                value={formatPhone(digits)}
                onChangeText={handleDigitsChange}
                placeholder="90 123 45 67"
                placeholderTextColor={authColors.placeholder}
                keyboardType="phone-pad"
                // Formatlangan 12 belgi + "+998 ..." paste uchun zaxira
                maxLength={17}
                autoCorrect={false}
                autoComplete="tel"
                textContentType="telephoneNumber"
                importantForAutofill="yes"
                selectionColor={authColors.accent}
                returnKeyType="done"
                onSubmitEditing={handleProceed}
                accessibilityLabel={t('phone')}
                style={styles.phoneInput}
              />
            </Pressable>

            <Pressable
              onPress={() => {
                setAgree((v) => !v);
                setErrorText(null);
              }}
              style={styles.agreeRow}
              hitSlop={6}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agree }}
            >
              <View style={[styles.checkbox, agree && styles.checkboxOn]}>
                {agree && <MaterialCommunityIcons name="check-bold" size={14} color={authColors.bg} />}
              </View>
              <Text style={styles.agreeText}>
                <Text style={styles.agreeLink}>{t('agreeOffer')}</Text>
                {t('agreeRest')}
              </Text>
            </Pressable>

            {Boolean(errorText) && <ErrorNote>{errorText}</ErrorNote>}
          </View>

          <View style={styles.spacer} />

          <View style={styles.actions}>
            <OutlineButton
              label={t('getCode')}
              onPress={handleProceed}
              loading={loading}
              style={!canSubmit && !loading && styles.dimmed}
            />
            <Pressable
              onPress={() => toast.show(t('comingSoon'), 'info')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.telegram, !canSubmit && styles.dimmed, pressed && styles.pressed]}
            >
              <FontAwesome name="telegram" size={22} color={authColors.teal} />
              <Text style={styles.telegramText}>{t('telegramLogin')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: authColors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 16 },
  topBar: { paddingHorizontal: 20, paddingTop: 8, minHeight: 52 },
  head: { paddingHorizontal: 24, paddingTop: 20 },
  form: { paddingHorizontal: 24, paddingTop: 28, gap: 18 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 16,
    backgroundColor: authColors.field,
    borderWidth: 1.5,
    // Dizayn: doimiy 1.5px to'q sariq chegara (fokusga qarab uslub o'zgarmaydi)
    borderColor: authColors.accent,
    paddingHorizontal: 18,
    gap: 14,
  },
  code: { color: authColors.muted, fontFamily: fonts.bodyMedium, fontSize: 20 },
  divider: { width: 1, height: 26, backgroundColor: authColors.lineStrong },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingVertical: 0,
    color: authColors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 20,
    letterSpacing: 0.8,
  },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(243,245,249,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: authColors.accent, borderColor: authColors.accent },
  agreeText: { flex: 1, color: authColors.soft, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  agreeLink: { color: authColors.accent, textDecorationLine: 'underline' },
  spacer: { flex: 1, minHeight: 32 },
  actions: { paddingHorizontal: 24, gap: 12 },
  dimmed: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  telegram: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: authColors.lineStrong,
  },
  telegramText: { color: authColors.text, fontFamily: fonts.bodyMedium, fontSize: 16 },
});
