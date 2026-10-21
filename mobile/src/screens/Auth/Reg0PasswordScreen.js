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

export default function Reg0PasswordScreen({ onNext, onBack, initial = {} }) {
  const toast = useToast();
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const [password, setPassword] = useState(initial.password || '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const strengthLevel =
    password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : 3;

  const strengthLabels = ['', 'Zaif', 'Yaxshi', 'Kuchli'];
  const strengthColors = ['', '#E8543F', '#F2A33A', '#19A7A1'];

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  const handleNext = () => {
    // Validatsiya xatosi faqat xabar ko'rsatadi — fokus KO'CHIRILMAYDI.
    // Fokus harakati faqat foydalanuvchi input'ni bosganda yoki "keyingi"
    // tugmasi bilan oldinga o'tishda (onSubmitEditing) bo'ladi.
    if (password.length < 6) {
      toast.show("Parol kamida 6 ta belgidan iborat bo'lishi kerak", 'error');
      return;
    }
    if (password !== confirmPassword) {
      toast.show("Parollar mos kelmadi", 'error');
      return;
    }
    onNext({ password });
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
              <Text style={styles.stepText}>1 / 4-BOSQICH</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '25%' }]} />
            </View>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Parol yarating</Text>
            <Text style={styles.subtitle}>
              Formo akkauntingizni himoya qilish uchun kuchli parol tanlang
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
<<<<<<< HEAD
            <View style={styles.heroRow}>
              <View style={styles.heroBubble}>
                <MaterialCommunityIcons name="lock-plus-outline" size={22} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.heroTitle}>Xavfsizlik</Text>
                <Text style={styles.heroSub}>Kamida 6 ta belgi</Text>
              </View>
            </View>

            {/* Parol */}
            <Text style={styles.label}>Parol</Text>
            {/* `collapsable={false}`: see PhoneScreen — the focus style adds
=======
            <Text style={styles.label}>Password</Text>
            {/* `collapsable={false}`: `fieldFocused` adds
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
                shadowColor/elevation, and the trait flip would drop native focus. */}
            <View
              collapsable={false}
              style={[styles.inputWrap, passwordFocused && styles.inputFocused]}
            >
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="Kamida 6 ta belgi"
                placeholderTextColor={colors.caption}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                importantForAutofill="no"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
                style={styles.input}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={12}
                style={styles.eyeBtn}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.muted}
                />
              </Pressable>
            </View>

            {/* Kuch ko'rsatkichi */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3].map((lvl) => (
                    <View
                      key={lvl}
                      style={[
                        styles.bar,
                        {
                          backgroundColor:
                            strengthLevel >= lvl
                              ? strengthColors[strengthLevel]
                              : '#1B2560',
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthText, { color: strengthColors[strengthLevel] }]}>
                  {strengthLabels[strengthLevel]}
                </Text>
              </View>
            )}

            {/* Parolni tasdiqlash */}
            <Text style={[styles.label, { marginTop: 18 }]}>Parolni tasdiqlang</Text>
            <View
              collapsable={false}
              style={[
                styles.inputWrap,
                confirmFocused && styles.inputFocused,
                passwordsMatch && styles.inputSuccess,
              ]}
            >
              <TextInput
                ref={confirmRef}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Parolni qayta kiriting"
                placeholderTextColor={colors.caption}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                importantForAutofill="no"
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handleNext}
                blurOnSubmit
                style={styles.input}
              />
              {passwordsMatch && (
                <View style={styles.checkDot}>
                  <MaterialCommunityIcons name="check" size={13} color="#080C24" />
                </View>
              )}
            </View>

            {/* Davom etish */}
            <Pressable
              onPress={handleNext}
              disabled={!password || !confirmPassword}
              style={[
                styles.nextBtn,
                (!password || !confirmPassword) && { opacity: 0.45 },
              ]}
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A42',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(243,245,249,0.12)',
  },
  inputFocused: {
    borderColor: 'rgba(242,163,58,0.75)',
    shadowColor: colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  inputSuccess: {
    borderColor: colors.teal,
  },
  input: {
    flex: 1,
    color: '#F3F5F9',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeBtn: {
    padding: 10,
    marginRight: 2,
  },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 2,
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '800',
    minWidth: 42,
    textAlign: 'right',
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
