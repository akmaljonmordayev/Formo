import React, { useCallback, useRef, useState } from 'react';
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
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthTitle, BackButton, ErrorNote, authColors } from '../../components/ui/AuthUi';
import { fonts } from '../../constants/theme';
import { telegramErrorText } from '../../features/auth/telegram';

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

const HOW_STEPS = [
  { icon: 'cellphone', key: 'loginHow1' },
  { icon: 'send-circle-outline', key: 'loginHow2' },
  { icon: 'shield-key-outline', key: 'loginHow3' },
];

/**
 * Kirish: telefon raqam → Telegram bot (`auth.startTelegram`). Parol va SMS yo'q.
 * Mavjud hisob bo'lsa server kiritadi, bo'lmasa ro'yxatdan o'tkazadi — shuning uchun
 * bu yerda "kirish/ro'yxat" farqi yo'q.
 *
 * Fokus: maydon uslubi fokusda faqat `borderColor`ni almashtiradi (soya/elevation yo'q),
 * ota Pressable `collapsable={false}` — Fabric TextInput'ni qayta yaratmaydi va fokus yo'qolmaydi.
 */
export default function PhoneScreen({ auth, t, initialPhone = '', onBack, onTelegramStarted }) {
  const [digits, setDigits] = useState(() => toLocalDigits(initialPhone));
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [errorText, setErrorText] = useState(null);

  const phoneRef = useRef(null);
  const isComplete = digits.length === 9;
  const canSubmit = isComplete && agree && !loading;

  const handleDigitsChange = useCallback((text) => {
    setDigits(toLocalDigits(text));
    setErrorText(null);
  }, []);

  const handleContinue = useCallback(async () => {
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
      const challenge = await auth.startTelegram(digits);
      onTelegramStarted?.({ phone: digits, challenge });
    } catch (err) {
      setErrorText(telegramErrorText(err, t));
    } finally {
      setLoading(false);
    }
  }, [loading, isComplete, agree, auth, digits, onTelegramStarted, t]);

  const helper = digits.length > 0 && !isComplete ? t('phoneDigitsLeft').replace('{n}', String(9 - digits.length)) : null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Android: app.json softwareKeyboardLayoutMode=resize oynani o'zi kichraytiradi */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>{Boolean(onBack) && <BackButton onPress={onBack} label={t('back')} />}</View>

          <View style={styles.head}>
            <View style={styles.badge}>
              <FontAwesome name="telegram" size={26} color={authColors.teal} />
            </View>
            <AuthTitle title={t('phoneTitle')} subtitle={t('phoneSubTelegram')} />
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>{t('phone')}</Text>
            <Pressable
              collapsable={false}
              onPress={() => phoneRef.current?.focus()}
              style={[styles.phoneRow, focused && styles.phoneRowFocused, Boolean(errorText) && styles.phoneRowError]}
            >
              <Text style={styles.code}>+998</Text>
              <View style={styles.divider} />
              <TextInput
                ref={phoneRef}
                value={formatPhone(digits)}
                onChangeText={handleDigitsChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
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
                onSubmitEditing={handleContinue}
                accessibilityLabel={t('phone')}
                style={styles.phoneInput}
              />
              {isComplete && <MaterialCommunityIcons name="check-circle" size={20} color={authColors.teal} />}
            </Pressable>
            {Boolean(helper) && !errorText && <Text style={styles.helper}>{helper}</Text>}
            {Boolean(errorText) && <ErrorNote>{errorText}</ErrorNote>}

            <View style={styles.how}>
              {HOW_STEPS.map((step, i) => (
                <React.Fragment key={step.key}>
                  {i > 0 && <MaterialCommunityIcons name="chevron-right" size={16} color={authColors.placeholder} />}
                  <View style={styles.howItem}>
                    <MaterialCommunityIcons name={step.icon} size={20} color={authColors.tealText} />
                    <Text style={styles.howText} numberOfLines={2}>{t(step.key)}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>

          <View style={styles.spacer} />

          <View style={styles.actions}>
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

            <Pressable
              onPress={handleContinue}
              disabled={loading}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit, busy: loading }}
              style={({ pressed }) => [styles.cta, !canSubmit && !loading && styles.ctaDisabled, pressed && canSubmit && styles.ctaPressed]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="telegram" size={22} color="#FFFFFF" />
                  <Text style={styles.ctaText}>{t('telegramContinue')}</Text>
                </>
              )}
            </Pressable>

            <View style={styles.privacy}>
              <MaterialCommunityIcons name="lock-outline" size={14} color={authColors.placeholder} />
              <Text style={styles.privacyText}>{t('loginPrivacy')}</Text>
            </View>
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
  head: { paddingHorizontal: 24, paddingTop: 16, gap: 18 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: authColors.tealSoft,
    borderWidth: 1,
    borderColor: 'rgba(25,167,161,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { paddingHorizontal: 24, paddingTop: 28, gap: 10 },
  label: { color: authColors.soft, fontFamily: fonts.bodyMedium, fontSize: 14 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 16,
    backgroundColor: authColors.field,
    borderWidth: 1.5,
    borderColor: authColors.lineStrong,
    paddingHorizontal: 18,
    gap: 14,
  },
  phoneRowFocused: { borderColor: authColors.accent },
  phoneRowError: { borderColor: 'rgba(232,84,63,0.7)' },
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
  helper: { color: authColors.muted, fontFamily: fonts.body, fontSize: 13, paddingLeft: 4 },
  how: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: authColors.line,
  },
  howItem: { flex: 1, alignItems: 'center', gap: 6 },
  howText: { color: authColors.soft, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  spacer: { flex: 1, minHeight: 28 },
  actions: { paddingHorizontal: 24, gap: 16 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(243,245,249,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: authColors.accent, borderColor: authColors.accent },
  agreeText: { flex: 1, color: authColors.soft, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  agreeLink: { color: authColors.accent, textDecorationLine: 'underline' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
    borderRadius: 16,
    backgroundColor: authColors.teal,
  },
  ctaDisabled: { opacity: 0.45 },
  ctaPressed: { backgroundColor: '#14908B' },
  ctaText: { color: '#FFFFFF', fontFamily: fonts.bodySemi, fontSize: 16 },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 4 },
  privacyText: { flex: 1, color: authColors.placeholder, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
});
