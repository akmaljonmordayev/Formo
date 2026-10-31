import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoider, KeyboardAwareScrollView } from '../../components/ui/KeyboardAware';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthTitle, ErrorNote, InfoNote, OutlineButton, StepHeader, authColors } from '../../components/ui/AuthUi';
import RangeSlider from '../../components/ui/RangeSlider';
import { fonts } from '../../constants/theme';
import { errorText as apiErrorText } from '../../utils/errors';
import { isNameUnsupportedError, joinFullName, realFullName, splitFullName, validateName } from '../../utils/userName';

/**
 * Ro'yxatdan o'tish qadamlari (dizayn: Reg 1/3 → 2/3 → 3/3 → "Xush kelibsiz").
 * Telegram orqali kirgan, ismi yoki o'lchovlari bo'sh foydalanuvchiga bir marta
 * ko'rsatiladi. Saqlash — bitta PATCH /auth/me (auth.updateUser):
 * fullName + gender/age/height/weight (UpdateProfileDto).
 *
 * Yangilanmagan server `fullName`ni rad etsa (400), o'lchamlar ismsiz qayta
 * saqlanadi va yakuniy ekranda ism saqlanmagani ochiq aytiladi.
 *
 * Props:
 *   auth     — useAuth() { user, updateUser }
 *   t        — tarjima funksiyasi
 *   onSkip   — 1–2 qadamda o'tkazib yuborildi (boshqa so'ramaymiz)
 *   onFinish — "Asosiyga o'tish" bosildi
 */

// Chegaralar backend UpdateProfileDto bilan bir xil (bo'y/vazn — dizayn oralig'i, server oralig'ining ichida)
const AGE = { min: 3, max: 100 };
const HEIGHT = { min: 80, max: 210 };
const WEIGHT = { min: 12, max: 150 };
const KIDS_AGE = 14;

const GENDERS = [
  { key: 'MALE', icon: 'gender-male', labelKey: 'male' },
  { key: 'FEMALE', icon: 'gender-female', labelKey: 'female' },
];

const STEP_ORDER = ['gender', 'age', 'body'];

const kidRec = (a) => (a <= 3 ? '98' : a <= 5 ? '110' : a <= 7 ? '122' : a <= 9 ? '134' : a <= 11 ? '146' : '158');
const adultRec = (w) => (w < 62 ? 'S' : w < 72 ? 'M' : w < 84 ? 'L' : w < 96 ? 'XL' : w < 108 ? 'XXL' : '3XL');

const within = (value, range, fallback) =>
  Number.isInteger(value) && value >= range.min && value <= range.max ? value : fallback;

const fill = (template, values) =>
  Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);

export default function CompleteProfileScreen({ auth, t, onSkip, onFinish }) {
  const user = auth.user || {};
  const [step, setStep] = useState('gender');
  const [firstName, setFirstName] = useState(() => splitFullName(realFullName(user)).first);
  const [lastName, setLastName] = useState(() => splitFullName(realFullName(user)).last);
  const [focusedField, setFocusedField] = useState(null);
  const [nameSaved, setNameSaved] = useState(true);
  const lastNameRef = useRef(null);
  const [gender, setGender] = useState(user.gender || 'MALE');
  const [age, setAge] = useState(within(user.age, AGE, 25));
  const [height, setHeight] = useState(within(user.height, HEIGHT, 175));
  const [weight, setWeight] = useState(within(user.weight, WEIGHT, 72));
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const kids = age < KIDS_AGE;
  const rec = kids ? kidRec(age) : adultRec(weight);
  const stepIndex = STEP_ORDER.indexOf(step);

  const goBack = () => {
    setError(null);
    setStep(STEP_ORDER[stepIndex - 1]);
  };

  // Android "orqaga": 2/3 → 1/3, 3/3 → 2/3 (1/3 va yakunda — tizim odatiy xatti-harakati)
  useEffect(() => {
    if (stepIndex <= 0) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!saving) {
        setError(null);
        setStep(STEP_ORDER[stepIndex - 1]);
      }
      return true;
    });
    return () => subscription.remove();
  }, [stepIndex, saving]);

  function goNext() {
    setError(null);
    if (step === 'gender') {
      const nameError = validateName(firstName, lastName, { requireLast: true });
      if (nameError) {
        setError(t(nameError));
        return;
      }
    }
    setStep(STEP_ORDER[stepIndex + 1]);
  }

  async function save(withBody) {
    if (saving) return;
    const fields = { gender, age };
    const fullName = joinFullName(firstName, lastName);
    if (fullName && fullName !== realFullName(user)) fields.fullName = fullName;
    if (withBody) {
      fields.height = height;
      fields.weight = weight;
    }
    setSaving(true);
    setError(null);
    try {
      try {
        await auth.updateUser(fields);
        setNameSaved(true);
      } catch (err) {
        // Eski backend: ismsiz qayta saqlaymiz va buni yashirmaymiz
        if (!fields.fullName || !isNameUnsupportedError(err)) throw err;
        delete fields.fullName;
        await auth.updateUser(fields);
        setNameSaved(false);
      }
      setSaved(fields);
      setStep('done');
    } catch (err) {
      setError(apiErrorText(err, t));
    } finally {
      setSaving(false);
    }
  }

  if (step === 'done') {
    const chips = [
      [t('chipAge'), saved?.age],
      [t('chipHeight'), saved?.height],
      [t('chipWeight'), saved?.weight],
      [t('chipSize'), saved?.weight != null || kids ? rec : null],
    ];
    const savedName = realFullName(auth.user);
    const greetName = savedName ? splitFullName(savedName).first : null;
    const initial = (savedName || 'F').charAt(0).toUpperCase();
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.doneBody}>
          <View style={styles.doneGlow} />
          <View style={styles.ring}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>
          <Text style={styles.doneTitle}>{greetName ? `${t('welcome')}, ${greetName}!` : `${t('welcome')}!`}</Text>
          <Text style={styles.doneSub}>{t('regDoneSub')}</Text>
          {!nameSaved && <ErrorNote>{t('nameNotSupported')}</ErrorNote>}
          <View style={styles.chips}>
            {chips.map(([label, value]) => (
              <View key={label} style={styles.chip}>
                <Text style={styles.chipValue}>{value ?? '—'}</Text>
                <Text style={styles.chipLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.footer}>
          <OutlineButton label={t('goHome')} onPress={onFinish} arrow glow />
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <StepHeader
      label={t('register')}
      step={stepIndex + 1}
      total={STEP_ORDER.length}
      onBack={stepIndex > 0 && !saving ? goBack : null}
      backLabel={t('back')}
      // Yangi hisob (ism hali "Yangi mijoz"): ism, jins va yosh majburiy — faqat bo'y/vazn o'tkazib yuboriladi.
      // Ismi bor (faqat o'lchovlari bo'sh) foydalanuvchi birinchi qadamdan ham chiqib keta oladi.
      onSkip={step === 'body' ? () => save(false) : step === 'gender' && realFullName(user) && user.gender && user.age ? onSkip : null}
      skipLabel={t('skip')}
    />
  );

  return (
    <SafeAreaView style={styles.safe}>
      {header}
      {/* Android: app.json softwareKeyboardLayoutMode=resize oynani o'zi kichraytiradi */}
      <KeyboardAvoider style={styles.flex}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 'gender' && (
          <>
            <View style={styles.head}>
              <AuthTitle title={t('regIntroTitle')} subtitle={t('regIntroSub')} size={26} />
            </View>
            <View style={styles.fields}>
              <View>
                <Text style={styles.label}>{t('firstName')}</Text>
                <TextInput
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    setError(null);
                  }}
                  placeholder={t('firstNamePlaceholder')}
                  placeholderTextColor={authColors.placeholder}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="given-name"
                  textContentType="givenName"
                  maxLength={50}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  onFocus={() => setFocusedField('first')}
                  onBlur={() => setFocusedField((f) => (f === 'first' ? null : f))}
                  selectionColor={authColors.accent}
                  style={[styles.input, focusedField === 'first' && styles.inputFocused]}
                />
              </View>
              <View>
                <Text style={styles.label}>{t('lastName')}</Text>
                <TextInput
                  ref={lastNameRef}
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    setError(null);
                  }}
                  placeholder={t('lastNamePlaceholder')}
                  placeholderTextColor={authColors.placeholder}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="family-name"
                  textContentType="familyName"
                  maxLength={50}
                  returnKeyType="done"
                  onFocus={() => setFocusedField('last')}
                  onBlur={() => setFocusedField((f) => (f === 'last' ? null : f))}
                  selectionColor={authColors.accent}
                  style={[styles.input, focusedField === 'last' && styles.inputFocused]}
                />
              </View>
              <View>
              <Text style={styles.label}>{t('gender')}</Text>
              <View style={styles.segment} accessibilityRole="radiogroup">
                {GENDERS.map(({ key, icon, labelKey }) => {
                  const selected = gender === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setGender(key)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[styles.option, selected && styles.optionOn]}
                    >
                      <MaterialCommunityIcons name={icon} size={18} color={selected ? authColors.accent : authColors.muted} />
                      <Text style={[styles.optionText, selected && styles.optionTextOn]}>{t(labelKey)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              </View>
            </View>
          </>
        )}

        {step === 'age' && (
          <>
            <View style={styles.head}>
              <AuthTitle title={t('regAgeTitle')} subtitle={t('regAgeSub')} size={26} />
            </View>
            <View style={styles.ageCard}>
              <View style={styles.ageRow}>
                <Pressable
                  onPress={() => setAge((a) => Math.max(AGE.min, a - 1))}
                  accessibilityRole="button"
                  accessibilityLabel={t('decrease')}
                  style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="minus" size={22} color={authColors.text} />
                </Pressable>
                <View style={styles.ageValueBox}>
                  <Text style={styles.ageValue}>{age}</Text>
                  <Text style={styles.ageUnit}>{t('ageUnit')}</Text>
                </View>
                <Pressable
                  onPress={() => setAge((a) => Math.min(AGE.max, a + 1))}
                  accessibilityRole="button"
                  accessibilityLabel={t('increase')}
                  style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="plus" size={22} color={authColors.text} />
                </Pressable>
              </View>
              <View style={styles.sliderWide}>
                <RangeSlider value={age} min={AGE.min} max={AGE.max} onChange={setAge} accessibilityLabel={t('age')} />
              </View>
            </View>
            <InfoNote icon={kids ? 'baby-face-outline' : 'tshirt-crew-outline'} style={styles.ageNote}>
              {kids ? t('kidsSizesInfo') : t('adultSizesInfo')}
            </InfoNote>
          </>
        )}

        {step === 'body' && (
          <>
            <View style={styles.head}>
              <AuthTitle title={t('regBodyTitle')} subtitle={t('regBodySub')} size={26} />
            </View>
            <View style={styles.bodyList}>
              {[
                [t('height'), height, HEIGHT, setHeight, t('cmUnit')],
                [t('weight'), weight, WEIGHT, setWeight, t('kgUnit')],
              ].map(([label, value, range, setter, unit]) => (
                <View key={label} style={styles.metricCard}>
                  <View style={styles.metricTop}>
                    <Text style={styles.metricLabel}>{label}</Text>
                    <Text>
                      <Text style={styles.metricValue}>{value}</Text>
                      <Text style={styles.metricUnit}>{` ${unit}`}</Text>
                    </Text>
                  </View>
                  <RangeSlider value={value} min={range.min} max={range.max} onChange={setter} accessibilityLabel={label} />
                </View>
              ))}
              <LinearGradient colors={['#1B2560', '#121A42']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.recCard}>
                <View style={styles.recBadge}>
                  <Text style={styles.recBadgeText}>{rec}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.recTitle}>{t('recommendedSize')}</Text>
                  <Text style={styles.recNote}>
                    {kids ? fill(t('recNoteKids'), { age, height }) : fill(t('recNoteAdult'), { weight, height })}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </>
        )}
      </KeyboardAwareScrollView>

      <View style={styles.footer}>
        {Boolean(error) && <ErrorNote>{error}</ErrorNote>}
        {step === 'body' ? (
          <OutlineButton label={t('save')} onPress={() => save(true)} loading={saving} />
        ) : (
          <OutlineButton
            label={t('nextStep')}
            onPress={goNext}
            arrow
            style={step === 'gender' && !firstName.trim() && styles.dimmed}
          />
        )}
      </View>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: authColors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 16 },
  pressed: { opacity: 0.7 },
  head: { paddingHorizontal: 24, paddingTop: 24 },
  dimmed: { opacity: 0.45 },
  // Dizayn Reg 1/3: padding 26 24 0, maydonlar orasida 16
  fields: { paddingHorizontal: 24, paddingTop: 26, gap: 16 },
  label: { color: authColors.muted, fontFamily: fonts.bodyMedium, fontSize: 13, marginBottom: 6 },
  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: authColors.field,
    borderWidth: 1,
    borderColor: authColors.line,
    paddingHorizontal: 16,
    paddingVertical: 0,
    color: authColors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
  },
  // Fokusda faqat chegara rangi/qalinligi o'zgaradi (soya/elevation yo'q — Android fokusni yo'qotmaydi)
  inputFocused: { borderWidth: 1.5, borderColor: authColors.accent, paddingHorizontal: 15.5 },
  segment: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 14, backgroundColor: authColors.field },
  option: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  optionOn: { backgroundColor: authColors.track, borderColor: authColors.accent },
  optionText: { color: authColors.muted, fontFamily: fonts.bodySemi, fontSize: 14 },
  optionTextOn: { color: authColors.accent },

  ageCard: {
    marginTop: 36,
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 24,
    backgroundColor: authColors.field,
    alignItems: 'center',
    gap: 18,
  },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: authColors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageValueBox: { minWidth: 110, alignItems: 'center' },
  ageValue: { color: authColors.accent, fontFamily: fonts.numeric, fontSize: 76, lineHeight: 80 },
  ageUnit: { color: authColors.muted, fontFamily: fonts.bodyMedium, fontSize: 14 },
  sliderWide: { alignSelf: 'stretch' },
  ageNote: { marginTop: 16, marginHorizontal: 24 },

  bodyList: { paddingHorizontal: 20, paddingTop: 22, gap: 12 },
  metricCard: { borderRadius: 20, backgroundColor: authColors.field, padding: 16, gap: 10 },
  metricTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  metricLabel: { color: authColors.muted, fontFamily: fonts.bodyMedium, fontSize: 14, paddingBottom: 4 },
  metricValue: { color: authColors.text, fontFamily: fonts.numeric, fontSize: 40 },
  metricUnit: { color: authColors.muted, fontFamily: fonts.bodyMedium, fontSize: 15 },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(242,163,58,0.4)',
  },
  recBadge: {
    minWidth: 56,
    height: 56,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: authColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recBadgeText: { color: authColors.accent, fontFamily: fonts.numeric, fontSize: 28 },
  recTitle: { color: authColors.text, fontFamily: fonts.bodySemi, fontSize: 15 },
  recNote: { color: authColors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },

  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, gap: 12 },

  doneBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 18 },
  doneGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: '22%',
    backgroundColor: 'rgba(29,47,140,0.35)',
  },
  // Dizayndagi conic-gradient (70% to'q sariq / 30% firuza) halqasi taxminan
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: authColors.accent,
    borderRightColor: authColors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: authColors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: authColors.accent, fontFamily: fonts.display, fontSize: 44 },
  doneTitle: { color: authColors.text, fontFamily: fonts.display, fontSize: 26, lineHeight: 31, textAlign: 'center' },
  doneSub: { color: authColors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  chip: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 14, backgroundColor: authColors.field },
  chipValue: { color: authColors.text, fontFamily: fonts.numeric, fontSize: 24 },
  chipLabel: { color: '#8D95BD', fontFamily: fonts.bodyMedium, fontSize: 11, textAlign: 'center' },
});
