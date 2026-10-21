import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isValidUzPhone } from '../../utils/phone';
import LanguageSwitch from './LanguageSwitch';

/**
 * RegisterScreen — two-step flow in the same dressing-room / hang-tag design
 * as LoginScreen (dark scene + white tag card).
 *   Step 1 — account basics (name, phone, password)
 *   Step 2 — "about you" questions (gender, age, height, weight), all optional.
 *
 * Props:
 *   auth       — useAuth() object { register, isLoading, error }
 *   t          — translation function
 *   language   — current language code (uz/ru/en)
 *   onLanguage — change language
 *   onLogin    — called on "have account" link / after successful register
 */

const palette = {
  ink: '#080C24',
  navy: '#0E1A3F',
  paper: '#F3F5F9',
  muted: '#A9B0D0',
  orange: '#F2A33A',
  teal: '#19A7A1',
  red: '#B8323F',
  line: '#D5DAE8',
};

const GENDERS = [
  { key: 'MALE', icon: 'human-male', labelKey: 'male' },
  { key: 'FEMALE', icon: 'human-female', labelKey: 'female' },
];

// "90 123 45 67" ko'rinishida formatlash (faqat 9 ta raqam)
function formatPhone(digits) {
  const d = digits.slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

function FieldInput({ t, secure, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.inputRow}>
      <TextInput
        {...props}
        secureTextEntry={secure && !show}
        placeholderTextColor="rgba(14,26,63,0.28)"
        selectionColor={palette.orange}
        style={styles.input}
      />
      {secure ? (
        <Pressable onPress={() => setShow((v) => !v)} style={styles.eye} hitSlop={6}>
          <Text style={styles.eyeText}>{show ? t('hidePassword') : t('showPassword')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function RegisterScreen({ auth, t, language, onLanguage, onLogin }) {
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < 760;
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const slide = useRef(new Animated.Value(0)).current;
  const prevStep = useRef(1);

  const [fullName, setFullName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState(null);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    if (step === prevStep.current) return;
    const direction = step > prevStep.current ? 1 : -1;
    prevStep.current = step;
    slide.setValue(direction * 48);
    Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  }, [step, slide]);

  const errorText = validationError || (auth.error ? auth.error.message || t(auth.error.key) : null);
  const phoneComplete = phoneDigits.length === 9;

  const parseBoundedInt = (raw, min, max) => {
    if (!raw.trim()) return null; // optional
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) return NaN;
    return value;
  };

  function handleDigitsChange(text) {
    let d = text.replace(/\D/g, '');
    if (d.length > 9 && d.startsWith('998')) d = d.slice(3);
    setPhoneDigits(d.slice(0, 9));
    setValidationError(null);
  }

  function validateStep1() {
    if (!fullName.trim()) return t('fullName') + ': ?';
    if (!isValidUzPhone(phoneDigits)) return t('phoneInvalid');
    if (password.length < 6) return t('passwordShort');
    if (password !== confirmPassword) return t('confirmPassword');
    return null;
  }

  function handleNext() {
    setValidationError(null);
    const error = validateStep1();
    if (error) return setValidationError(error);
    setStep(2);
  }

  async function handleRegister(skipMeasurements = false) {
    setValidationError(null);

    let ageValue = null;
    let heightValue = null;
    let weightValue = null;

    if (!skipMeasurements) {
      ageValue = parseBoundedInt(age, 1, 120);
      heightValue = parseBoundedInt(height, 50, 250);
      weightValue = parseBoundedInt(weight, 20, 300);
      if ([ageValue, heightValue, weightValue].some(Number.isNaN)) {
        return setValidationError(t('invalidValue'));
      }
    }

    const success = await auth.register({
      fullName: fullName.trim(),
      phone: `+998${phoneDigits}`,
      password,
      ...(gender ? { gender } : {}),
      ...(ageValue != null ? { age: ageValue } : {}),
      ...(heightValue != null ? { height: heightValue } : {}),
      ...(weightValue != null ? { weight: weightValue } : {}),
    });
    if (success && onLogin) onLogin();
  }

  const metaRight = step === 1 ? t('regStepAccount') : t('regStepAbout');

  return (
    <View style={styles.root}>
      <LinearGradient colors={[palette.ink, palette.navy]} style={StyleSheet.absoluteFill} />
      <View style={[styles.glow, { backgroundColor: palette.orange, top: -90, right: -70, opacity: 0.12 }]} />
      <View style={[styles.glow, { backgroundColor: '#1D2F8C', bottom: -80, left: -70 }]} />

      <View style={[styles.topBar, { paddingTop: insets.top + (compact ? 12 : 20) }]}>
        <View style={styles.brand}>
          <Text style={styles.logo}>FORMO</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('loginBrandBadge')}</Text>
          </View>
        </View>
        <LanguageSwitch language={language} onChange={onLanguage} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.tagWrap, compact && styles.tagWrapCompact]}>
            <View style={styles.string} />
            <View style={styles.tag}>
              <View style={styles.tagHole} />
              <View style={styles.tagInner} pointerEvents="none" />

              <View style={styles.tagMeta}>
                <Text style={styles.tagMetaText}>FORMO · PANEL</Text>
                <Text style={styles.tagMetaText}>№ 0001</Text>
              </View>

              <Animated.View
                style={{
                  opacity: slide.interpolate({ inputRange: [-48, 0, 48], outputRange: [0, 1, 0] }),
                  transform: [{ translateX: slide }],
                }}
              >
                <Text style={styles.tagTitleLine}>
                  {step === 1 ? t('register') : t('regAboutTitle')}
                </Text>
                <Text style={styles.tagSubtitle}>
                  {step === 1 ? t('regSubtitle') : t('regAboutSub')}
                </Text>

                <View style={styles.progress}>
                  <View style={[styles.progressSeg, step === 1 && styles.progressActive]} />
                  <View style={[styles.progressSeg, step === 2 && styles.progressActive]} />
                </View>
                <Text style={styles.stepLabel}>{metaRight}</Text>

                {step === 1 ? (
                  <>
                    <Text style={styles.fieldLabel}>{t('fullName')}</Text>
                    <FieldInput
                      t={t}
                      value={fullName}
                      onChangeText={(v) => {
                        setFullName(v);
                        setValidationError(null);
                      }}
                      placeholder={t('fullNamePlaceholder')}
                      autoComplete="name"
                      returnKeyType="next"
                    />

                    <Text style={styles.fieldLabel}>{t('phone')}</Text>
                    <View style={[styles.inputRow, phoneComplete && styles.inputRowComplete]}>
                      <Text style={styles.prefix}>+998</Text>
                      <TextInput
                        value={formatPhone(phoneDigits)}
                        onChangeText={handleDigitsChange}
                        placeholder="90 123 45 67"
                        placeholderTextColor="rgba(14,26,63,0.28)"
                        keyboardType="phone-pad"
                        selectionColor={palette.orange}
                        style={styles.input}
                      />
                      {phoneComplete && (
                        <View style={styles.check}>
                          <MaterialCommunityIcons name="check" size={16} color="#fff" />
                        </View>
                      )}
                    </View>

                    <Text style={styles.fieldLabel}>{t('password')}</Text>
                    <FieldInput
                      t={t}
                      secure
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v);
                        setValidationError(null);
                      }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      returnKeyType="next"
                    />

                    <Text style={styles.fieldLabel}>{t('confirmPassword')}</Text>
                    <FieldInput
                      t={t}
                      secure
                      value={confirmPassword}
                      onChangeText={(v) => {
                        setConfirmPassword(v);
                        setValidationError(null);
                      }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      returnKeyType="done"
                      onSubmitEditing={handleNext}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>{t('gender')}</Text>
                    <View style={styles.genderRow}>
                      {GENDERS.map(({ key, icon, labelKey }) => {
                        const selected = gender === key;
                        return (
                          <Pressable
                            key={key}
                            onPress={() => setGender(selected ? null : key)}
                            style={[styles.genderCard, selected && styles.genderCardActive]}
                          >
                            <MaterialCommunityIcons
                              name={icon}
                              size={24}
                              color={selected ? palette.orange : 'rgba(14,26,63,0.5)'}
                            />
                            <Text style={[styles.genderText, selected && styles.genderTextActive]}>
                              {t(labelKey)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <View style={styles.metricsRow}>
                      <View style={styles.metric}>
                        <Text style={styles.fieldLabel}>{t('age')}</Text>
                        <FieldInput
                          t={t}
                          value={age}
                          onChangeText={setAge}
                          placeholder="25"
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                      <View style={styles.metric}>
                        <Text style={styles.fieldLabel}>{`${t('height')}, sm`}</Text>
                        <FieldInput
                          t={t}
                          value={height}
                          onChangeText={setHeight}
                          placeholder="178"
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                      <View style={styles.metric}>
                        <Text style={styles.fieldLabel}>{`${t('weight')}, kg`}</Text>
                        <FieldInput
                          t={t}
                          value={weight}
                          onChangeText={setWeight}
                          placeholder="76"
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                    </View>

                    <Text style={styles.optionalNote}>{t('optionalNote')}</Text>
                  </>
                )}

                <Text style={styles.error}>{errorText || ''}</Text>

                {step === 1 ? (
                  <Pressable onPress={handleNext} style={styles.submit}>
                    <Text style={styles.submitText}>{t('next')}</Text>
                    <View style={styles.arrow}>
                      <MaterialCommunityIcons name="arrow-right" size={20} color={palette.navy} />
                    </View>
                  </Pressable>
                ) : (
                  <View style={styles.actions}>
                    <Pressable onPress={() => setStep(1)} style={styles.secondary}>
                      <Text style={styles.secondaryText}>{t('back')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRegister(false)}
                      disabled={auth.isLoading}
                      style={[styles.submit, styles.submitFlex, auth.isLoading && styles.submitDisabled]}
                    >
                      <Text style={styles.submitText}>
                        {auth.isLoading ? t('registering') : t('registerButton')}
                      </Text>
                      <View style={styles.arrow}>
                        <MaterialCommunityIcons name="arrow-right" size={20} color={palette.navy} />
                      </View>
                    </Pressable>
                  </View>
                )}

                <View style={styles.care}>
                  <View style={styles.careIcons}>
                    <MaterialCommunityIcons name="tshirt-crew-outline" size={18} color="rgba(14,26,63,0.5)" />
                    <MaterialCommunityIcons name="triangle-outline" size={18} color="rgba(14,26,63,0.5)" />
                    <MaterialCommunityIcons name="hanger" size={18} color="rgba(14,26,63,0.5)" />
                  </View>
                  {step === 1 ? (
                    <Pressable onPress={onLogin} hitSlop={8}>
                      <Text style={styles.careText}>
                        {t('haveAccount')} <Text style={styles.careLink}>{t('login')}</Text>
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => handleRegister(true)} hitSlop={8}>
                      <Text style={styles.careLink}>{t('skip')}</Text>
                    </Pressable>
                  )}
                </View>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  flex: { flex: 1 },
  glow: { position: 'absolute', width: 380, height: 380, borderRadius: 190, opacity: 0.16 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 140,
  },
  scrollCompact: { paddingTop: 4, paddingBottom: 130 },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 },
  logo: { color: palette.paper, fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  badge: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(169,176,208,0.45)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: palette.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },

  tagWrap: { marginTop: 32, alignItems: 'center', alignSelf: 'stretch' },
  tagWrapCompact: { marginTop: 18 },
  string: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 46,
    borderRadius: 2,
    backgroundColor: palette.orange,
  },
  tag: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.paper,
    borderRadius: 26,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 22,
    paddingTop: 42,
    paddingBottom: 22,
    transform: [{ rotate: '1.5deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },
  tagHole: {
    position: 'absolute',
    top: 16,
    left: '50%',
    marginLeft: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.ink,
    borderWidth: 3,
    borderColor: '#E3E7F0',
  },
  tagInner: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(14,26,63,0.22)',
    borderRadius: 18,
  },
  tagMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    paddingBottom: 12,
    marginBottom: 18,
  },
  tagMetaText: { color: 'rgba(14,26,63,0.5)', fontSize: 10.5, fontWeight: '700', letterSpacing: 1.8 },
  tagTitleLine: { color: palette.navy, fontSize: 26, fontWeight: '700', lineHeight: 30 },
  tagSubtitle: { color: 'rgba(14,26,63,0.6)', fontSize: 14, marginTop: 6, marginBottom: 18 },

  progress: { flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  progressActive: { backgroundColor: palette.orange },
  stepLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(14,26,63,0.55)', marginTop: 8, marginBottom: 18 },

  fieldLabel: {
    color: 'rgba(14,26,63,0.62)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: palette.line,
    borderRadius: 14,
    paddingLeft: 16,
    paddingRight: 6,
    marginBottom: 16,
  },
  inputRowComplete: { borderColor: palette.teal },
  prefix: {
    color: 'rgba(14,26,63,0.55)',
    fontWeight: '700',
    marginRight: 10,
    paddingRight: 10,
    borderRightWidth: 1.5,
    borderRightColor: palette.line,
  },
  input: { flex: 1, height: '100%', color: palette.navy, fontSize: 16, fontWeight: '600' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  eye: { height: 38, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center' },
  eyeText: { color: 'rgba(14,26,63,0.6)', fontSize: 12.5, fontWeight: '600' },

  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  genderCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: palette.line,
    backgroundColor: '#fff',
  },
  genderCardActive: { borderColor: palette.orange, backgroundColor: '#FFF3E0' },
  genderText: { fontSize: 13, fontWeight: '600', color: 'rgba(14,26,63,0.6)' },
  genderTextActive: { color: palette.navy },

  metricsRow: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1 },
  optionalNote: {
    fontSize: 12,
    color: 'rgba(14,26,63,0.5)',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
  },

  error: { minHeight: 20, color: palette.red, fontSize: 13.5, fontWeight: '500', marginTop: 8, marginBottom: 10 },

  actions: { flexDirection: 'row', gap: 10 },
  secondary: {
    width: 104,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: palette.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: palette.navy, fontSize: 15, fontWeight: '700' },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderRadius: 16,
    backgroundColor: palette.navy,
    paddingLeft: 22,
    paddingRight: 10,
  },
  submitFlex: { flex: 1 },
  submitDisabled: { backgroundColor: '#8B93B3' },
  submitText: { color: palette.paper, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  arrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: palette.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },

  care: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    borderStyle: 'dashed',
  },
  careIcons: { flexDirection: 'row', gap: 6 },
  careText: { color: 'rgba(14,26,63,0.55)', fontSize: 12 },
  careLink: { color: palette.navy, fontWeight: '700', fontSize: 12 },
});
