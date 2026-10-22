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

// "90 123 45 67" ko'rinishida formatlash (faqat 9 ta raqam)
function formatPhone(digits) {
  const d = digits.slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

/**
 * Telefon raqam bosqichi — faqat SMS/OTP orqali kirish (parol yo'q).
 * Mavjud hisob bo'lsa `auth.verifyOtp` kiradi, bo'lmasa avtomatik ro'yxatdan
 * o'tkazadi — shuning uchun bu yerda "kirish/ro'yxatdan o'tish" farqi yo'q.
 */
export default function PhoneScreen({ auth, t, onBack, onRequestOtp }) {
  const toast = useToast();
  const [rawDigits, setRawDigits] = useState('');
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  const phoneRef = useRef(null);

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

  const handleProceed = useCallback(async () => {
    if (loading) return;

    if (!isComplete) {
      toast.show('9 ta raqamli telefon raqamni kiriting', 'error');
      return;
    }
    if (!agree) {
      toast.show('Ommaviy oferta va maxfiylik siyosatiga rozilik bildiring', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await auth.requestOtp(cleanDigits);
      if (res?.isDemo) {
        toast.show(res.message || 'Demo rejim', 'demo', 4000);
      }
      onRequestOtp?.({ phone: cleanDigits, isDemo: Boolean(res?.isDemo) });
    } catch (err) {
      toast.show(err.message || 'SMS yuborishda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  }, [loading, isComplete, agree, auth, cleanDigits, onRequestOtp, toast]);

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
              <MaterialCommunityIcons name="arrow-left" size={22} color="#F3F5F9" />
            </Pressable>
          )}

          {/* Header */}
          <Text style={styles.title}>Telefon raqamingiz</Text>
          <Text style={styles.subtitle}>Kirish uchun SMS kod yuboramiz</Text>

          {/* --- Telefon raqam --- */}
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
              returnKeyType="done"
              onSubmitEditing={handleProceed}
              blurOnSubmit={false}
              style={styles.phoneInput}
            />
            {isComplete && (
              <View style={styles.checkDot}>
                <MaterialCommunityIcons name="check" size={13} color="#080C24" />
              </View>
            )}
          </Pressable>

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
              <Text style={styles.agreeLink}>Ommaviy oferta</Text>
              {' '}va maxfiylik siyosati shartlariga roziman
            </Text>
          </Pressable>

          <View style={styles.spacer} />

          {/* --- Asosiy tugma --- */}
          <Pressable
            onPress={handleProceed}
            disabled={!isComplete || loading}
            style={[
              styles.submitBtn,
              (!isComplete || loading) && styles.submitBtnDisabled,
            ]}
          >
            <Text style={styles.submitBtnText}>
              {loading ? 'Iltimos kuting…' : 'Kodni olish'}
            </Text>
          </Pressable>

          {/* --- Telegram orqali kirish (hozircha mavjud emas) --- */}
          <Pressable
            onPress={() => toast.show('Tez orada qo‘shiladi', 'info')}
            style={styles.telegramBtn}
          >
            <Text style={styles.telegramBtnText}>Telegram orqali kirish</Text>
          </Pressable>
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
    marginTop: 6,
    marginBottom: 22,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A42',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.accent,
    overflow: 'hidden',
  },
  fieldFocused: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  flagBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: 'rgba(243, 245, 249, 0.12)',
  },
  codeText: {
    color: '#F3F5F9',
    fontSize: 16,
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
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#121A42',
    borderWidth: 1.5,
    borderColor: 'rgba(243, 245, 249, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  agreeText: {
    color: '#A9B0D0',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  agreeLink: {
    color: colors.accent,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  submitBtn: {
    borderRadius: 16,
    height: 54,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  telegramBtn: {
    marginTop: 12,
    borderRadius: 16,
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telegramBtnText: {
    color: '#F3F5F9',
    fontSize: 15,
    fontWeight: '700',
  },
});
