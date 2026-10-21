import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii } from '../../constants/theme';

export default function Reg2MeasurementsScreen({ onNext, onBack, initial = {}, initialData = {} }) {
  const source = Object.keys(initialData).length ? initialData : initial;
  const [gender, setGender] = useState(source.gender || 'MALE');
  const [age, setAge] = useState(source.age || 25);
  const [height, setHeight] = useState(source.height || 175);
  const [weight, setWeight] = useState(source.weight || 72);

  const isKids = age < 14;

  const getRecommendedSize = () => {
    if (isKids) {
      if (age <= 3) return '98';
      if (age <= 5) return '110';
      if (age <= 7) return '122';
      if (age <= 9) return '134';
      if (age <= 11) return '146';
      return '158';
    }
    if (weight < 62) return 'S';
    if (weight < 72) return 'M';
    if (weight < 84) return 'L';
    if (weight < 96) return 'XL';
    if (weight < 108) return 'XXL';
    return '3XL';
  };

  const recSize = getRecommendedSize();

  const handleNext = () => {
    onNext({
      gender,
      age: Number(age),
      height: Number(height),
      weight: Number(weight),
      recSize,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
        </Pressable>

        <View style={styles.stepRow}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>3 / 4-BOSQICH</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '75%' }]} />
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>O'lchamlaringiz</Text>
          <Text style={styles.subtitle}>
            Bu ma'lumotlar formangiz o'lchamini to'g'ri aniqlashga yordam beradi.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Jinsi</Text>
          <View style={styles.genderRow}>
            <Pressable
              onPress={() => setGender('MALE')}
              style={[styles.genderBtn, gender === 'MALE' && styles.genderBtnActive]}
            >
              <MaterialCommunityIcons
                name="gender-male"
                size={20}
                color={gender === 'MALE' ? colors.accent : colors.muted}
              />
              <Text style={[styles.genderText, gender === 'MALE' && styles.genderTextActive]}>Erkak</Text>
            </Pressable>
            <Pressable
              onPress={() => setGender('FEMALE')}
              style={[styles.genderBtn, gender === 'FEMALE' && styles.genderBtnActive]}
            >
              <MaterialCommunityIcons
                name="gender-female"
                size={20}
                color={gender === 'FEMALE' ? colors.accent : colors.muted}
              />
              <Text style={[styles.genderText, gender === 'FEMALE' && styles.genderTextActive]}>Ayol</Text>
            </Pressable>
          </View>

          <View style={styles.stepperSection}>
            <Text style={styles.label}>Yoshi: {age}</Text>
            <View style={styles.stepperRow}>
              <Pressable onPress={() => setAge(Math.max(3, age - 1))} style={styles.stepBtn}>
                <MaterialCommunityIcons name="minus" size={20} color="#F3F5F9" />
              </Pressable>
              <Text style={styles.stepperValue}>{age} yosh</Text>
              <Pressable onPress={() => setAge(Math.min(90, age + 1))} style={styles.stepBtn}>
                <MaterialCommunityIcons name="plus" size={20} color="#F3F5F9" />
              </Pressable>
            </View>
          </View>

          <View style={styles.stepperSection}>
            <Text style={styles.label}>Bo'yi: {height} sm</Text>
            <View style={styles.stepperRow}>
              <Pressable onPress={() => setHeight(Math.max(60, height - 1))} style={styles.stepBtn}>
                <MaterialCommunityIcons name="minus" size={20} color="#F3F5F9" />
              </Pressable>
              <Text style={styles.stepperValue}>{height} sm</Text>
              <Pressable onPress={() => setHeight(Math.min(220, height + 1))} style={styles.stepBtn}>
                <MaterialCommunityIcons name="plus" size={20} color="#F3F5F9" />
              </Pressable>
            </View>
          </View>

          <View style={styles.stepperSection}>
            <Text style={styles.label}>Vazni: {weight} kg</Text>
            <View style={styles.stepperRow}>
              <Pressable onPress={() => setWeight(Math.max(15, weight - 1))} style={styles.stepBtn}>
                <MaterialCommunityIcons name="minus" size={20} color="#F3F5F9" />
              </Pressable>
              <Text style={styles.stepperValue}>{weight} kg</Text>
              <Pressable onPress={() => setWeight(Math.min(180, weight + 1))} style={styles.stepBtn}>
                <MaterialCommunityIcons name="plus" size={20} color="#F3F5F9" />
              </Pressable>
            </View>
          </View>

          <View style={styles.recCard}>
            <MaterialCommunityIcons
              name={isKids ? 'baby-face-outline' : 'tshirt-crew-outline'}
              size={24}
              color={colors.accent}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.recTitle}>
                Tavsiya etilgan o'lcham: <Text style={styles.recHighlight}>{recSize}</Text>
              </Text>
              <Text style={styles.recSub}>
                {isKids
                  ? `Bolalar o'lchami (${recSize} sm uzunlik)`
                  : `Katta o'lcham`}
              </Text>
            </View>
          </View>

          <Pressable onPress={handleNext} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>Davom etish</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#080C24" />
          </Pressable>
        </View>
      </ScrollView>
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
    marginBottom: 16,
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
    marginBottom: 20,
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
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A9B0D0',
    marginBottom: 8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  genderBtnActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
  },
  genderTextActive: {
    color: colors.accent,
  },
  stepperSection: {
    marginBottom: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    padding: 6,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: '#1B2560',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(242, 163, 58, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.3)',
    borderRadius: radii.lg,
    padding: 14,
    marginVertical: 16,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  recHighlight: {
    color: colors.accent,
    fontWeight: '900',
    fontSize: 16,
  },
  recSub: {
    fontSize: 12,
    color: '#A9B0D0',
    marginTop: 2,
  },
  nextBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  nextBtnText: {
    color: '#080C24',
    fontSize: 15,
    fontWeight: '800',
  },
});
