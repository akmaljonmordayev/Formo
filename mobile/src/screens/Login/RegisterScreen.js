import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthInput,
  AuthLink,
  AuthPasswordInput,
  AuthPhoneInput,
  AuthSecondaryButton,
  AuthShell,
  AuthTitle,
  authColors,
} from './authShared';
import { isValidUzPhone } from '../../utils/phone';

const GENDERS = [
  { key: 'MALE', icon: 'human-male', labelKey: 'male' },
  { key: 'FEMALE', icon: 'human-female', labelKey: 'female' },
];

/**
 * RegisterScreen — two-step flow in the light card design:
 *   Step 1 — account basics (name, phone, password)
 *   Step 2 — "about you" questions (gender, age, height, weight) shown as
 *            a slide-in modal-style step; all fields optional and editable later.
 *
 * Props:
 *   auth      — useAuth() object { register, isLoading, error }
 *   t         — translation function
 *   onLogin   — called on "have account" link (successful register flips auth state)
 */
export default function RegisterScreen({ auth, t, onLogin }) {
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

  const parseBoundedInt = (raw, min, max) => {
    if (!raw.trim()) return null; // optional
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) return NaN;
    return value;
  };

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

  const stepContent =
    step === 1 ? (
      <View>
        <AuthTitle title="FORMO" subtitle={t('register')} />

        <View style={styles.progress}>
          <View style={[styles.progressSeg, styles.progressActive]} />
          <View style={styles.progressSeg} />
        </View>
        <Text style={styles.stepLabel}>{t('regStepAccount')}</Text>

        <AuthField label={t('fullName')} icon="account-outline">
          {({ focused, setFocused }) => (
            <AuthInput
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('fullNamePlaceholder')}
              autoComplete="name"
              returnKeyType="next"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          )}
        </AuthField>

        <AuthField label={t('phone')} icon="cellphone">
          {({ focused, setFocused }) => (
            <AuthPhoneInput
              digits={phoneDigits}
              onChangeDigits={setPhoneDigits}
              placeholder="+998 XX XXX XX XX"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          )}
        </AuthField>

        <AuthField label={t('password')} icon="lock-outline">
          {({ focused, setFocused }) => (
            <AuthPasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              autoComplete="new-password"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          )}
        </AuthField>

        <AuthField label={t('confirmPassword')} icon="lock-check-outline">
          {({ focused, setFocused }) => (
            <AuthPasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleNext}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          )}
        </AuthField>

        <AuthError message={errorText} />

        <AuthButton onPress={handleNext}>{t('next')}</AuthButton>

        <AuthLink onPress={onLogin}>
          <Text>{t('haveAccount')} </Text>
          <Text style={styles.linkAccent}>{t('login')}</Text>
        </AuthLink>
      </View>
    ) : (
      <View>
        <Text style={styles.aboutTitle}>{t('regAboutTitle')}</Text>
        <Text style={styles.aboutSub}>{t('regAboutSub')}</Text>

        <View style={styles.progress}>
          <View style={styles.progressSeg} />
          <View style={[styles.progressSeg, styles.progressActive]} />
        </View>
        <Text style={styles.stepLabel}>{t('regStepAbout')}</Text>

        <Text style={styles.questionLabel}>{t('gender')}</Text>
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
                  color={selected ? authColors.primary : authColors.muted}
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
            <AuthField label={t('age')} icon="calendar-outline">
              {({ focused, setFocused }) => (
                <AuthInput
                  value={age}
                  onChangeText={setAge}
                  placeholder="25"
                  keyboardType="number-pad"
                  maxLength={3}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
              )}
            </AuthField>
          </View>
          <View style={styles.metric}>
            <AuthField label={`${t('height')}, sm`} icon="ruler-height">
              {({ focused, setFocused }) => (
                <AuthInput
                  value={height}
                  onChangeText={setHeight}
                  placeholder="178"
                  keyboardType="number-pad"
                  maxLength={3}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
              )}
            </AuthField>
          </View>
          <View style={styles.metric}>
            <AuthField label={`${t('weight')}, kg`} icon="scale-bathroom">
              {({ focused, setFocused }) => (
                <AuthInput
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="76"
                  keyboardType="number-pad"
                  maxLength={3}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
              )}
            </AuthField>
          </View>
        </View>

        <Text style={styles.optionalNote}>{t('optionalNote')}</Text>

        <AuthError message={errorText} />

        <View style={styles.actions}>
          <View style={styles.backSlot}>
            <AuthSecondaryButton onPress={() => setStep(1)}>{t('back')}</AuthSecondaryButton>
          </View>
          <View style={styles.nextSlot}>
            <AuthButton onPress={() => handleRegister(false)} loading={auth.isLoading}>
              {t('registerButton')}
            </AuthButton>
          </View>
        </View>

        <Pressable onPress={() => handleRegister(true)} style={styles.skip} hitSlop={8}>
          <Text style={styles.skipText}>{t('skip')}</Text>
        </Pressable>
      </View>
    );

  return (
    <AuthShell>
      <Animated.View
        style={{
          opacity: slide.interpolate({ inputRange: [-48, 0, 48], outputRange: [0, 1, 0] }),
          transform: [{ translateX: slide }],
        }}
      >
        {stepContent}
      </Animated.View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' },
  progressActive: { backgroundColor: authColors.primary },
  stepLabel: { fontSize: 12, fontWeight: '600', color: authColors.muted, marginBottom: 18 },
  aboutTitle: { fontSize: 22, fontWeight: '800', color: authColors.text, textAlign: 'center' },
  aboutSub: {
    fontSize: 13,
    color: authColors.muted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 18,
  },
  questionLabel: { fontSize: 13, fontWeight: '600', color: authColors.muted, marginBottom: 8 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  genderCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: '#fff',
  },
  genderCardActive: { borderColor: authColors.primary, backgroundColor: '#eff6ff' },
  genderText: { fontSize: 13, fontWeight: '600', color: authColors.muted },
  genderTextActive: { color: authColors.primary },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1 },
  optionalNote: {
    fontSize: 12,
    color: authColors.icon,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  actions: { flexDirection: 'row', gap: 10 },
  backSlot: { width: 110 },
  nextSlot: { flex: 1 },
  skip: { alignItems: 'center', marginTop: 10, paddingVertical: 6 },
  skipText: { color: authColors.muted, fontSize: 13, fontWeight: '600' },
  linkAccent: { color: authColors.primary, fontWeight: '700', fontSize: 14 },
});
