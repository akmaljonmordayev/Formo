import React, { useRef, useState } from 'react';
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

export default function Reg1NameScreen({ onNext, onBack, initial = {}, initialData = {} }) {
  const source = Object.keys(initialData).length ? initialData : initial;
  const toast = useToast();

  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);

  const [firstName, setFirstName] = useState(source.firstName || '');
  const [lastName, setLastName] = useState(source.lastName || '');
  const [firstFocused, setFirstFocused] = useState(false);
  const [lastFocused, setLastFocused] = useState(false);

  const handleNext = () => {
    // Validatsiya xatosi faqat xabar ko'rsatadi — fokus KO'CHIRILMAYDI.
    if (!firstName.trim()) {
      toast.show('Ismingizni kiriting', 'error');
      return;
    }
    onNext({ firstName: firstName.trim(), lastName: lastName.trim() });
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
            <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
          </Pressable>

          {/* Step */}
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>2 / 4-BOSQICH</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '50%' }]} />
            </View>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Ismingizni kiriting</Text>
            <Text style={styles.subtitle}>
              Bu ism Formo akkauntingizda va forma etiketida ko'rsatiladi
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <View style={styles.heroRow}>
              <View style={styles.heroBubble}>
                <MaterialCommunityIcons name="account-outline" size={22} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.heroTitle}>Profil</Text>
                <Text style={styles.heroSub}>Shaxsiy ma'lumotlar</Text>
              </View>
            </View>

            {/* Ism */}
            <Text style={styles.label}>
              Ism <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              ref={firstNameRef}
              // Fabric: the focus style below adds shadowColor/elevation; without
              // pinning the stacking-context trait the differ would remove+insert
              // this node on focus and native focus would be lost immediately.
              collapsable={false}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Masalan: Aziz"
              placeholderTextColor={colors.caption}
              autoCapitalize="words"
              autoCorrect={false}
              importantForAutofill="no"
              onFocus={() => setFirstFocused(true)}
              onBlur={() => setFirstFocused(false)}
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
              blurOnSubmit={false}
              style={[styles.input, firstFocused && styles.inputFocused]}
            />

            {/* Familiya */}
            <Text style={[styles.label, { marginTop: 18 }]}>Familiya</Text>
            <TextInput
              ref={lastNameRef}
              collapsable={false}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Masalan: Karimov"
              placeholderTextColor={colors.caption}
              autoCapitalize="words"
              autoCorrect={false}
              importantForAutofill="no"
              onFocus={() => setLastFocused(true)}
              onBlur={() => setLastFocused(false)}
              returnKeyType="done"
              onSubmitEditing={handleNext}
              blurOnSubmit
              style={[styles.input, lastFocused && styles.inputFocused]}
            />

            {/* Ko'rinish preview */}
            {firstName.trim().length > 0 && (
              <View style={styles.previewRow}>
                <MaterialCommunityIcons name="eye-outline" size={13} color={colors.teal} />
                <Text style={styles.previewText}>
                  Ko'rinishi:{' '}
                  <Text style={styles.previewName}>
                    {firstName.trim()}
                    {lastName.trim() ? ` ${lastName.trim()}` : ''}
                  </Text>
                </Text>
              </View>
            )}

            {/* Davom etish */}
            <Pressable
              onPress={handleNext}
              disabled={!firstName.trim()}
              style={[styles.nextBtn, !firstName.trim() && { opacity: 0.45 }]}
            >
              <Text style={styles.nextBtnText}>Davom etish</Text>
              <View style={styles.nextArrow}>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#080C24" />
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050818' },
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
    borderColor: 'rgba(243,245,249,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  stepBadge: {
    backgroundColor: 'rgba(242,163,58,0.12)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  stepText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#1B2560',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  header: { marginBottom: 22 },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#F3F5F9',
  },
  subtitle: {
    fontSize: 14,
    color: '#A9B0D0',
    marginTop: 8,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(243,245,249,0.12)',
    elevation: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243,245,249,0.07)',
  },
  heroBubble: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(242,163,58,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#F3F5F9',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroSub: {
    color: '#A9B0D0',
    fontSize: 12,
    marginTop: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A9B0D0',
    marginBottom: 8,
  },
  required: { color: '#E8543F' },
  input: {
    backgroundColor: '#121A42',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(243,245,249,0.12)',
    color: '#F3F5F9',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputFocused: {
    borderColor: 'rgba(242,163,58,0.75)',
    shadowColor: colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  previewText: {
    color: '#A9B0D0',
    fontSize: 12,
  },
  previewName: {
    color: '#F3F5F9',
    fontWeight: '700',
  },
  nextBtn: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  nextBtnText: {
    color: '#080C24',
    fontSize: 15,
    fontWeight: '800',
  },
  nextArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(8,12,36,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
