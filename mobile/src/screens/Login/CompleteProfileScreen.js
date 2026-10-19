import React, { useState } from 'react';
import {
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
import { errorText as apiErrorText } from '../../utils/errors';
import LanguageSwitch from './LanguageSwitch';

/**
 * CompleteProfileScreen — login/parol bilan kirgan, lekin o'lchovlari
 * (gender/age/height/weight) bo'sh qolgan foydalanuvchilar uchun qisqa so'rovnoma.
 * RegisterScreen step 2 bilan bir xil uslubda. Saqlash auth.updateUser orqali
 * (PATCH /auth/me); so'rov o'tmasa xato matni ko'rsatiladi.
 *
 * Props:
 *   auth       — useAuth() object { user, updateUser }
 *   t          — translation function
 *   language   — current language code
 *   onLanguage — change language
 *   onSkip     — foydalanuvchi o'tkazib yubordi (boshqa so'ramaymiz)
 */

const palette = {
  ink: '#080C24',
  navy: '#0E1A3F',
  paper: '#F3F5F9',
  muted: '#A9B0D0',
  orange: '#F2A33A',
  red: '#B8323F',
  line: '#D5DAE8',
};

const GENDERS = [
  { key: 'MALE', icon: 'human-male', labelKey: 'male' },
  { key: 'FEMALE', icon: 'human-female', labelKey: 'female' },
];

function parseBoundedInt(raw, min, max) {
  if (!String(raw).trim()) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) return NaN;
  return value;
}

export default function CompleteProfileScreen({ auth, t, language, onLanguage, onSkip }) {
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const insets = useSafeAreaInsets();

  const [gender, setGender] = useState(auth.user?.gender || null);
  const [age, setAge] = useState(auth.user?.age != null ? String(auth.user.age) : '');
  const [heightValue, setHeightValue] = useState(auth.user?.height != null ? String(auth.user.height) : '');
  const [weight, setWeight] = useState(auth.user?.weight != null ? String(auth.user.weight) : '');
  const [validationError, setValidationError] = useState(null);
  const [saving, setSaving] = useState(false);

  const errorText = validationError;

  async function handleSave() {
    setValidationError(null);

    const ageValue = parseBoundedInt(age, 3, 100);
    const heightParsed = parseBoundedInt(heightValue, 50, 250);
    const weightParsed = parseBoundedInt(weight, 10, 250);
    if ([ageValue, heightParsed, weightParsed].some(Number.isNaN)) {
      setValidationError(t('invalidValue'));
      return;
    }

    const fields = {};
    if (gender) fields.gender = gender;
    if (ageValue != null) fields.age = ageValue;
    if (heightParsed != null) fields.height = heightParsed;
    if (weightParsed != null) fields.weight = weightParsed;

    if (Object.keys(fields).length === 0) {
      onSkip();
      return;
    }

    setSaving(true);
    try {
      await auth.updateUser(fields);
    } catch (err) {
      setValidationError(apiErrorText(err, t));
    } finally {
      setSaving(false);
    }
  }

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

              <Text style={styles.tagTitleLine}>{t('regAboutTitle')}</Text>
              <Text style={styles.tagSubtitle}>{t('regAboutSub')}</Text>

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
                  <View style={styles.inputRow}>
                    <TextInput
                      value={age}
                      onChangeText={setAge}
                      placeholder="25"
                      placeholderTextColor="rgba(14,26,63,0.28)"
                      keyboardType="number-pad"
                      maxLength={3}
                      selectionColor={palette.orange}
                      style={styles.input}
                    />
                  </View>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.fieldLabel}>{`${t('height')}, sm`}</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      value={heightValue}
                      onChangeText={setHeightValue}
                      placeholder="178"
                      placeholderTextColor="rgba(14,26,63,0.28)"
                      keyboardType="number-pad"
                      maxLength={3}
                      selectionColor={palette.orange}
                      style={styles.input}
                    />
                  </View>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.fieldLabel}>{`${t('weight')}, kg`}</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      value={weight}
                      onChangeText={setWeight}
                      placeholder="76"
                      placeholderTextColor="rgba(14,26,63,0.28)"
                      keyboardType="number-pad"
                      maxLength={3}
                      selectionColor={palette.orange}
                      style={styles.input}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.optionalNote}>{t('optionalNote')}</Text>
              <Text style={styles.error}>{errorText || ''}</Text>

              <View style={styles.actions}>
                <Pressable onPress={onSkip} style={styles.secondary}>
                  <Text style={styles.secondaryText}>{t('skip')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={[styles.submit, styles.submitFlex, saving && styles.submitDisabled]}
                >
                  <Text style={styles.submitText}>{saving ? t('saving') : t('save')}</Text>
                  <View style={styles.arrow}>
                    <MaterialCommunityIcons name="arrow-right" size={20} color={palette.navy} />
                  </View>
                </Pressable>
              </View>
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
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  input: { flex: 1, height: '100%', color: palette.navy, fontSize: 16, fontWeight: '600' },

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
});