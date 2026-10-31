import React, { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { legalTexts } from '../../content/legal';
import { fonts } from '../../constants/theme';
import useAppConfig from '../../features/config';
import { BackButton, OutlineButton, authColors } from './AuthUi';

/**
 * Ommaviy oferta va maxfiylik siyosati — ro'yxatdan o'tishdagi havoladan ochiladi.
 * Modal sifatida: ostidagi kirish ekrani (kiritilgan telefon raqami) o'zgarmay qoladi.
 * Raqamlar (tayyorlash muddati, qaytarish kunlari, naqd to'lov) va Superadmin'dagi
 * "shartlar" matni GET /app/config dan (ochiq endpoint, kirishsiz ishlaydi).
 *
 * Props: visible, initialTab ('offer' | 'privacy'), language, t, onClose, onAccept
 */
export default function LegalModal({ visible, initialTab = 'offer', language, t, onClose, onAccept }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {visible ? <LegalContent initialTab={initialTab} language={language} t={t} onClose={onClose} onAccept={onAccept} /> : null}
    </Modal>
  );
}

function LegalContent({ initialTab, language, t, onClose, onAccept }) {
  const [tab, setTab] = useState(initialTab);
  const { rules, general } = useAppConfig();
  const texts = useMemo(() => legalTexts(language, rules, general), [language, rules, general]);
  const doc = tab === 'privacy' ? texts.privacy : texts.offer;
  const extra = tab === 'offer' ? rules.terms?.trim() : '';

  const contacts = [
    general.supportPhone && { icon: 'phone-outline', label: general.supportPhone, url: `tel:${general.supportPhone.replace(/[^\d+]/g, '')}` },
    general.supportTelegram && {
      icon: 'send-outline',
      label: general.supportTelegram,
      url: `https://t.me/${general.supportTelegram.replace(/^@|^https?:\/\/t\.me\//, '')}`,
    },
    general.supportEmail && { icon: 'email-outline', label: general.supportEmail, url: `mailto:${general.supportEmail}` },
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <BackButton onPress={onClose} label={t('back')} />
        <View style={styles.tabs}>
          {[
            ['offer', texts.offer.title],
            ['privacy', texts.privacy.title],
          ].map(([key, label]) => (
            <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabOn]} accessibilityRole="tab">
              <Text style={[styles.tabText, tab === key && styles.tabTextOn]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.intro}>{doc.intro}</Text>

        {doc.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <View key={item} style={styles.item}>
                <View style={styles.bullet} />
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Superadmin → Sozlamalar → "Shartlar" matni (bo'lsa) */}
        {extra ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{texts.extraTitle}</Text>
            <Text style={styles.itemText}>{extra}</Text>
          </View>
        ) : null}

        {contacts.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{texts.contactsTitle}</Text>
            {contacts.map((c) => (
              <Pressable key={c.url} onPress={() => Linking.openURL(c.url).catch(() => {})} style={styles.contact}>
                <MaterialCommunityIcons name={c.icon} size={18} color={authColors.accent} />
                <Text style={styles.contactText}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {onAccept ? (
        <View style={styles.footer}>
          <OutlineButton label={t('legalAccept')} onPress={onAccept} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: authColors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    backgroundColor: authColors.field,
    borderWidth: 1,
    borderColor: authColors.line,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabOn: { backgroundColor: authColors.accentSoft, borderWidth: 1, borderColor: authColors.accent },
  tabText: { color: authColors.muted, fontFamily: fonts.bodyMedium, fontSize: 12 },
  tabTextOn: { color: authColors.accent, fontFamily: fonts.bodySemi },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  title: { color: authColors.text, fontFamily: fonts.display, fontSize: 22, marginTop: 8 },
  intro: { color: authColors.soft, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, marginTop: 12 },
  section: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: authColors.field,
    borderWidth: 1,
    borderColor: authColors.line,
  },
  sectionTitle: { color: authColors.accent, fontFamily: fonts.bodySemi, fontSize: 15, marginBottom: 10 },
  item: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: authColors.teal, marginTop: 9 },
  itemText: { flex: 1, color: authColors.soft, fontFamily: fonts.body, fontSize: 13, lineHeight: 21 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  contactText: { color: authColors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: authColors.line },
});
