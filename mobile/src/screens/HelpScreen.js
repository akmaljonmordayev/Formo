import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../components/ui/Toast';
import { colors, radii } from '../constants/theme';

const FAQS = [
  {
    q: 'Futbolka qancha vaqtda tayyor bo‘ladi va yetkaziladi?',
    a: 'Buyurtmangiz 24–48 soat ichida mutaxassislarimiz tomonidan bosmadan chiqariladi va kuryer orqali eshigingizgacha yetkazib beriladi.',
  },
  {
    q: 'Mato va bosma sifati qanday?',
    a: 'Biz nafas oluvchi yuqori sifatli sport poliesteri (Dri-FIT analogi) va yuvilganda o‘chib ketmaydigan sublimatsiya hamda premium termotransfer texnologiyasidan foydalanamiz.',
  },
  {
    q: 'O‘lcham to‘g‘ri kelmasa nima qilish kerak?',
    a: 'Ilova ichidagi o‘lchamlar jadvalidan foydalanishingiz mumkin. Agar o‘lchamda xatolik bo‘lsa, 7 kun ichida bepul almashtirib berish kafolatimiz mavjud.',
  },
  {
    q: 'To‘lov qanday amalga oshiriladi?',
    a: 'Siz Click, Payme orqali onlayn yoki buyurtmani qo‘lingizga olgach kuryerga naqd pul shaklida to‘lashingiz mumkin.',
  },
  {
    q: 'Jamoaviy buyurtmalar uchun chegirmalar bormi?',
    a: 'Ha! 10 tadan ortiq forma buyurtma qilgan jamoalar uchun 15% gacha maxsus chegirma va bepul logotip dizayni taqdim etiladi.',
  },
];

export default function HelpScreen({
  t,
  onBack,
}) {
  const toast = useToast();
  const [expandedIndex, setExpandedIndex] = useState(0);

  const handleOpenTelegram = () => {
    Linking.openURL('https://t.me/formo_support').catch(() => {
      toast.show('Telegram: @formo_support', 'info');
    });
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+998712000000').catch(() => {
      toast.show('Tel: +998 71 200-00-00', 'info');
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>Yordam va qo‘llab-quvvatlash</Text>
          <Text style={styles.sub}>Ko‘p beriladigan savollar</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Support Contact Cards */}
        <View style={styles.contactRow}>
          <Pressable onPress={handleOpenTelegram} style={styles.contactCard}>
            <View style={[styles.contactIconCircle, { backgroundColor: 'rgba(25, 167, 161, 0.15)' }]}>
              <MaterialCommunityIcons name="send" size={24} color={colors.teal} />
            </View>
            <Text style={styles.contactTitle}>Telegram</Text>
            <Text style={styles.contactSub}>@formo_support</Text>
          </Pressable>

          <Pressable onPress={handleCallSupport} style={styles.contactCard}>
            <View style={[styles.contactIconCircle, { backgroundColor: 'rgba(242, 163, 58, 0.15)' }]}>
              <MaterialCommunityIcons name="phone" size={24} color={colors.accent} />
            </View>
            <Text style={styles.contactTitle}>Qo‘ng‘iroq markazi</Text>
            <Text style={styles.contactSub}>+998 71 200-00-00</Text>
          </Pressable>
        </View>

        {/* FAQ Accordion */}
        <Text style={styles.faqHeader}>Ko‘p beriladigan savollar</Text>

        <View style={styles.faqList}>
          {FAQS.map((faq, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <View key={i} style={styles.faqCard}>
                <Pressable
                  onPress={() => setExpandedIndex(isExpanded ? null : i)}
                  style={styles.faqQuestionRow}
                >
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={colors.accent}
                  />
                </Pressable>

                {isExpanded && (
                  <View style={styles.faqAnswerWrap}>
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  </View>
                )}
              </View>
            );
          })}
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
    fontSize: 17,
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
    paddingTop: 12,
    paddingBottom: 40,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
  },
  contactIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  contactSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 3,
  },
  faqHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F3F5F9',
    marginBottom: 12,
  },
  faqList: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
    lineHeight: 18,
  },
  faqAnswerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(243, 245, 249, 0.08)',
    paddingTop: 12,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#A9B0D0',
    lineHeight: 18,
  },
});
