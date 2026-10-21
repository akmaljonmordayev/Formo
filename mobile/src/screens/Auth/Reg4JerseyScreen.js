import React, { useState } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JerseyVisualizer from '../../components/ui/JerseyVisualizer';
import { useToast } from '../../components/ui/Toast';
import { colors, radii } from '../../constants/theme';
import { CLUBS_DATA } from './Reg3ClubScreen';

export default function Reg4JerseyScreen({
  registrationData = {},
  initialData = {},
  auth,
  t,
  onBack,
  onComplete,
}) {
  const data = Object.keys(registrationData).length ? registrationData : initialData;
  const toast = useToast();
  const defaultName = (data.firstName || 'AZIZ').toUpperCase();
  const [jerseyName, setJerseyName] = useState(defaultName);
  const [jerseyNumber, setJerseyNumber] = useState('10');
  const [loading, setLoading] = useState(false);

  const club = CLUBS_DATA.find((c) => c.id === data.favoriteClub) || CLUBS_DATA[0];
  const kit = club.kits[0];

  const handleFinish = async () => {
    setLoading(true);
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Foydalanuvchi';
    const password = data.password?.trim();

    if (!password || password.length < 6) {
      toast.show('Parol kamida 6 ta belgidan iborat bo‘lishi kerak', 'error');
      setLoading(false);
      return;
    }

    const payload = {
      phone: data.phone,
      password,
      fullName,
      gender: data.gender || 'MALE',
      age: data.age || 25,
      height: data.height || 175,
      weight: data.weight || 72,
    };

    try {
      const res = await auth.register(payload);
      setLoading(false);
      if (res.success) {
        toast.show('Xush kelibsiz! Profilingiz muvaffaqiyatli yaratildi', 'success');
        onComplete?.(res.user);
      } else {
        toast.show(res.error?.message || 'Ro‘yxatdan o‘tishda xatolik', 'error');
      }
    } catch (err) {
      setLoading(false);
      toast.show(err.message || 'Xatolik yuz berdi', 'error');
    }
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

          <View style={styles.stepRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>4 / 4-BOSQICH</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Formangizdagi ism va raqam</Text>
            <Text style={styles.subtitle}>
              {club.name} formasi asosida maxsus formangizni tayyorladik
            </Text>
          </View>

          <View style={styles.previewCard}>
            <JerseyVisualizer
              color={kit.color}
              trim={kit.trim}
              ink={kit.ink}
              pattern={kit.pattern || 'none'}
              player={jerseyName || 'FORMO'}
              number={jerseyNumber || '10'}
              side="back"
              size={180}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Formadagi ism (max 10 belgi)</Text>
            <TextInput
              value={jerseyName}
              onChangeText={(t) =>
                setJerseyName(t.replace(/[^A-Za-z' ]/g, '').toUpperCase().slice(0, 10))
              }
              placeholder="AZIZ"
              placeholderTextColor={colors.caption}
              autoCapitalize="characters"
              maxLength={10}
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Raqam (1–99)</Text>
            <TextInput
              value={jerseyNumber}
              onChangeText={(t) => setJerseyNumber(t.replace(/\D/g, '').slice(0, 2))}
              placeholder="10"
              placeholderTextColor={colors.caption}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.input}
            />

            <View style={styles.quickRow}>
              {['7', '9', '10', '11', '23'].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setJerseyNumber(n)}
                  style={[styles.quickChip, jerseyNumber === n && styles.quickChipActive]}
                >
                  <Text style={[styles.quickText, jerseyNumber === n && styles.quickTextActive]}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              disabled={loading}
              onPress={handleFinish}
              style={[styles.finishBtn, loading && { opacity: 0.5 }]}
            >
              {loading ? (
                <ActivityIndicator color="#080C24" />
              ) : (
                <>
                  <Text style={styles.finishBtnText}>Boshlash</Text>
                  <MaterialCommunityIcons name="rocket-launch-outline" size={20} color="#080C24" />
                </>
              )}
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  stepIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  stepText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
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
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#F3F5F9',
  },
  subtitle: {
    fontSize: 13,
    color: '#A9B0D0',
    marginTop: 6,
    lineHeight: 18,
  },
  previewCard: {
    backgroundColor: '#0E1A3F',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 4,
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
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 20,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 9,
    backgroundColor: '#121A42',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  quickText: {
    color: '#A9B0D0',
    fontSize: 14,
    fontWeight: '700',
  },
  quickTextActive: {
    color: colors.accent,
  },
  finishBtn: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  finishBtnText: {
    color: '#080C24',
    fontSize: 15,
    fontWeight: '800',
  },
});
