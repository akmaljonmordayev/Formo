import React, { useState } from 'react';
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
  const firstNameRef = React.useRef(null);
  const lastNameRef = React.useRef(null);
  const [firstName, setFirstName] = useState(source.firstName || '');
  const [lastName, setLastName] = useState(source.lastName || '');
  const [firstFocused, setFirstFocused] = useState(false);
  const [lastFocused, setLastFocused] = useState(false);

  const handleNext = () => {
    if (!firstName.trim()) {
      toast.show('Please enter your first name', 'error');
      return;
    }
    onNext({ firstName: firstName.trim(), lastName: lastName.trim() });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
          </Pressable>

          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>STEP 2 OF 5</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Tell us who you are</Text>
            <Text style={styles.subtitle}>We’ll use this name across your Formo account and kit details.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.heroRow}>
              <View style={styles.avatarBubble}>
                <MaterialCommunityIcons name="account-outline" size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.helperText}>Profile</Text>
                <Text style={styles.helperHint}>Personal details</Text>
              </View>
            </View>

            <Text style={styles.label}>First name *</Text>
            <TextInput
              ref={firstNameRef}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="e.g. Aziz"
              placeholderTextColor={colors.caption}
              autoCapitalize="words"
              onFocus={() => setFirstFocused(true)}
              onBlur={() => setFirstFocused(false)}
              onSubmitEditing={() => lastNameRef.current?.focus()}
              returnKeyType="next"
              blurOnSubmit={false}
              style={[styles.input, firstFocused && styles.inputFocused]}
            />

            <Text style={[styles.label, { marginTop: 18 }]}>Last name</Text>
            <TextInput
              ref={lastNameRef}
              value={lastName}
              onChangeText={setLastName}
              placeholder="e.g. Karimov"
              placeholderTextColor={colors.caption}
              autoCapitalize="words"
              onFocus={() => setLastFocused(true)}
              onBlur={() => setLastFocused(false)}
              onSubmitEditing={handleNext}
              returnKeyType="done"
              style={[styles.input, lastFocused && styles.inputFocused]}
            />

            <Pressable
              disabled={!firstName.trim()}
              onPress={handleNext}
              style={[styles.nextBtn, !firstName.trim() && { opacity: 0.5 }]}
            >
              <Text style={styles.nextBtnText}>Continue</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#080C24" />
            </Pressable>
          </View>
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
    paddingBottom: 36,
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
    marginBottom: 16,
  },
  stepIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 14,
  },
  stepText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  header: {
    marginBottom: 22,
  },
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
    borderColor: 'rgba(243, 245, 249, 0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 245, 249, 0.08)',
  },
  avatarBubble: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    color: '#F3F5F9',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  helperHint: {
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
  input: {
    backgroundColor: '#121A42',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    color: '#F3F5F9',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputFocused: {
    borderColor: 'rgba(242, 163, 58, 0.8)',
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  nextBtn: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
});
