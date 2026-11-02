import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoider, KeyboardAwareScrollView } from '../components/ui/KeyboardAware';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../components/ui/Toast';
import { colors, radii } from '../constants/theme';

export default function EditProfileScreen({
  auth,
  t,
  onBack,
}) {
  const toast = useToast();
  const user = auth?.user || {};

  const [fullName, setFullName] = useState(user.fullName || '');
  const [gender, setGender] = useState(user.gender || 'MALE');
  const [age, setAge] = useState(user.age ? String(user.age) : '24');
  const [height, setHeight] = useState(user.height ? String(user.height) : '178');
  const [weight, setWeight] = useState(user.weight ? String(user.weight) : '74');
  const [saving, setSaving] = useState(false);

  // Stepper helper
  const adjust = (setter, val, delta, min, max) => {
    const curr = parseInt(val, 10) || min;
    const next = Math.max(min, Math.min(max, curr + delta));
    setter(String(next));
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.show('Ismingizni kiriting', 'error');
      return;
    }

    setSaving(true);
    try {
      if (auth?.updateUser) {
        await auth.updateUser({
          fullName: fullName.trim(),
          gender,
          age: parseInt(age, 10) || null,
          height: parseInt(height, 10) || null,
          weight: parseInt(weight, 10) || null,
        });
      }
      setSaving(false);
      toast.show('Profil ma‘lumotlari saqlandi', 'success');
      setTimeout(() => onBack?.(), 400);
    } catch {
      setSaving(false);
      toast.show('Saqlashda xatolik yuz berdi', 'error');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <KeyboardAvoider style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.title}>Ma‘lumotlarni tahrirlash</Text>
            <Text style={styles.sub}>Shaxsiy parametrlar</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Full Name */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>To‘liq ism sharifingiz</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Masalan: Jasur Rahimov"
              placeholderTextColor={colors.caption}
              style={styles.input}
            />
          </View>

          {/* Gender Selector */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Jinsi</Text>
            <View style={styles.genderRow}>
              <Pressable
                onPress={() => setGender('MALE')}
                style={[styles.genderBtn, gender === 'MALE' && styles.genderBtnActive]}
              >
                <MaterialCommunityIcons
                  name="gender-male"
                  size={20}
                  color={gender === 'MALE' ? colors.accent : '#8D95BD'}
                />
                <Text style={[styles.genderText, gender === 'MALE' && styles.genderTextActive]}>
                  Erkak
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setGender('FEMALE')}
                style={[styles.genderBtn, gender === 'FEMALE' && styles.genderBtnActive]}
              >
                <MaterialCommunityIcons
                  name="gender-female"
                  size={20}
                  color={gender === 'FEMALE' ? colors.teal : '#8D95BD'}
                />
                <Text style={[styles.genderText, gender === 'FEMALE' && styles.genderTextActive]}>
                  Ayol
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Age Stepper */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.stepperTitle}>Yoshingiz</Text>
                <Text style={styles.stepperSub}>Tavsiya etilgan o‘lcham uchun</Text>
              </View>
              <View style={styles.stepperControls}>
                <Pressable
                  onPress={() => adjust(setAge, age, -1, 5, 100)}
                  style={styles.stepBtn}
                >
                  <MaterialCommunityIcons name="minus" size={20} color="#F3F5F9" />
                </Pressable>
                <Text style={styles.stepVal}>{age}</Text>
                <Pressable
                  onPress={() => adjust(setAge, age, 1, 5, 100)}
                  style={styles.stepBtn}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#F3F5F9" />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Height Stepper */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.stepperTitle}>Bo‘yingiz (sm)</Text>
                <Text style={styles.stepperSub}>Futbolka uzunligi uchun</Text>
              </View>
              <View style={styles.stepperControls}>
                <Pressable
                  onPress={() => adjust(setHeight, height, -1, 100, 230)}
                  style={styles.stepBtn}
                >
                  <MaterialCommunityIcons name="minus" size={20} color="#F3F5F9" />
                </Pressable>
                <Text style={styles.stepVal}>{height}</Text>
                <Pressable
                  onPress={() => adjust(setHeight, height, 1, 100, 230)}
                  style={styles.stepBtn}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#F3F5F9" />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Weight Stepper */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.stepperTitle}>Vazningiz (kg)</Text>
                <Text style={styles.stepperSub}>Futbolka kengligi uchun</Text>
              </View>
              <View style={styles.stepperControls}>
                <Pressable
                  onPress={() => adjust(setWeight, weight, -1, 20, 180)}
                  style={styles.stepBtn}
                >
                  <MaterialCommunityIcons name="minus" size={20} color="#F3F5F9" />
                </Pressable>
                <Text style={styles.stepVal}>{weight}</Text>
                <Pressable
                  onPress={() => adjust(setWeight, weight, 1, 20, 180)}
                  style={styles.stepBtn}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#F3F5F9" />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            disabled={saving}
            onPress={handleSave}
            style={[styles.saveBtn, saving && { opacity: 0.5 }]}
          >
            {saving ? (
              <ActivityIndicator color="#080C24" />
            ) : (
              <>
                <Text style={styles.saveBtnText}>Saqlash</Text>
                <MaterialCommunityIcons name="check-circle-outline" size={20} color="#080C24" />
              </>
            )}
          </Pressable>
        </KeyboardAwareScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#0E1A3F',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  sub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8D95BD',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#F3F5F9',
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.14)',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
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
    borderColor: 'rgba(243, 245, 249, 0.12)',
  },
  genderBtnActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
  },
  genderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8D95BD',
  },
  genderTextActive: {
    color: '#F3F5F9',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  stepperSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    overflow: 'hidden',
  },
  stepBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: {
    width: 44,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: colors.accent,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#080C24',
  },
});
