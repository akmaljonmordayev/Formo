<<<<<<< HEAD
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ConfirmModal, LanguageModal } from '../components/ui/Modals';
import { useToast } from '../components/ui/Toast';
import { colors, radii } from '../constants/theme';
=======
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import { languageOptions } from '../i18n';
import { Button, Header, Overline, Screen } from '../components/ui/Common';
import { getItem, setItem } from '../utils/storage';
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5

export default function SettingsScreen({
  store,
  auth,
  t,
  onBack,
}) {
  const toast = useToast();
  const [pushNotifs, setPushNotifs] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promos, setPromos] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

<<<<<<< HEAD
  const currentLang = store?.language || 'uz';
  const langLabel = currentLang === 'ru' ? 'Русский' : currentLang === 'en' ? 'English' : 'O‘zbekcha';
=======
export default function SettingsScreen({ language, setLanguage, t, onBack, auth, general, onNotifications }) {
  const [notif, setNotif] = useState(DEFAULT_NOTIF);
  const [loaded, setLoaded] = useState(false);
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5

  const handleDeleteAccount = () => {
    setDeleteModalVisible(false);
    toast.show('Hisob o‘chirildi', 'info');
    auth?.logout?.();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>Sozlamalar</Text>
          <Text style={styles.sub}>Ilova va hisob sozlamalari</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Section: Language */}
        <Text style={styles.sectionHeader}>Til va mintaqa</Text>
        <View style={styles.card}>
          <Pressable
            onPress={() => setLangModalVisible(true)}
            style={styles.settingRow}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="translate" size={22} color={colors.accent} />
              <View>
                <Text style={styles.rowTitle}>Ilova tili</Text>
                <Text style={styles.rowSub}>{langLabel}</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#6F77A0" />
          </Pressable>
        </View>

        {/* Section: Notifications */}
        <Text style={styles.sectionHeader}>Bildirishnomalar</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="bell-ring-outline" size={22} color={colors.teal} />
              <View>
                <Text style={styles.rowTitle}>Push-xabarnomalar</Text>
                <Text style={styles.rowSub}>Asosiy yangiliklar va eslatmalar</Text>
              </View>
            </View>
            <Switch
              value={pushNotifs}
              onValueChange={setPushNotifs}
              trackColor={{ false: '#1B2456', true: colors.teal }}
              thumbColor={pushNotifs ? '#F3F5F9' : '#8D95BD'}
            />
          </View>

<<<<<<< HEAD
          <View style={styles.divider} />
=======
      <Pressable style={[styles.option, styles.sectionGap]} onPress={onNotifications}>
        <Text style={styles.optionTitle}>{t('notifications')}</Text>
        <Text style={styles.optionSub}>{t('notificationsSub')}</Text>
      </Pressable>

      {/* Aloqa — GET /api/app/config -> general (Superadmin "Umumiy" sozlamasi) */}
      {general && (general.supportPhone || general.supportTelegram || general.supportEmail) ? (
        <>
          <Overline style={styles.sectionGap}>{t('support')}</Overline>
          <View style={styles.notifCard}>
            {[
              ['phone', general.supportPhone, `tel:${String(general.supportPhone).replace(/[^\d+]/g, '')}`],
              ['Telegram', general.supportTelegram, `https://t.me/${String(general.supportTelegram).replace(/^@/, '')}`],
              ['Email', general.supportEmail, `mailto:${general.supportEmail}`],
            ]
              .filter(([, value]) => value)
              .map(([label, value, url]) => (
                <Pressable key={label} style={[styles.notifRow, styles.notifRowBorder]} onPress={() => Linking.openURL(url).catch(() => {})}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>{label === 'phone' ? t('phone') : label}</Text>
                    <Text style={styles.notifSub}>{value}</Text>
                  </View>
                </Pressable>
              ))}
            <View style={styles.notifRow}>
              <Text style={styles.notifSub}>
                {t('workHours')}: {general.workHoursFrom}–{general.workHoursTo}
              </Text>
            </View>
          </View>
        </>
      ) : null}

      <Button variant="secondary" style={styles.logoutButton} onPress={() => auth?.logout?.()}>
        {t('logout')}
      </Button>
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5

          <View style={styles.switchRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="truck-fast-outline" size={22} color={colors.accent} />
              <View>
                <Text style={styles.rowTitle}>Buyurtma holati</Text>
                <Text style={styles.rowSub}>Bosma va yetkazish haqida xabarlar</Text>
              </View>
            </View>
            <Switch
              value={orderUpdates}
              onValueChange={setOrderUpdates}
              trackColor={{ false: '#1B2456', true: colors.accent }}
              thumbColor={orderUpdates ? '#F3F5F9' : '#8D95BD'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="tag-outline" size={22} color="#8D95BD" />
              <View>
                <Text style={styles.rowTitle}>Aksiyalar va chegirmalar</Text>
                <Text style={styles.rowSub}>Yangi aksiyalar haqida xabardor bo‘lish</Text>
              </View>
            </View>
            <Switch
              value={promos}
              onValueChange={setPromos}
              trackColor={{ false: '#1B2456', true: colors.teal }}
              thumbColor={promos ? '#F3F5F9' : '#8D95BD'}
            />
          </View>
        </View>

        {/* Section: App Settings */}
        <Text style={styles.sectionHeader}>Ovoz va animatsiya</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="volume-high" size={22} color={colors.accent} />
              <View>
                <Text style={styles.rowTitle}>Ovoz effektlari</Text>
                <Text style={styles.rowSub}>Dizayn studiyasida chertish ovozlari</Text>
              </View>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#1B2456', true: colors.accent }}
              thumbColor={soundEnabled ? '#F3F5F9' : '#8D95BD'}
            />
          </View>
        </View>

        {/* Account Deletion */}
        <Pressable
          onPress={() => setDeleteModalVisible(true)}
          style={styles.deleteBtn}
        >
          <MaterialCommunityIcons name="account-remove-outline" size={20} color="#E8543F" />
          <Text style={styles.deleteBtnText}>Hisobni butunlay o‘chirish</Text>
        </Pressable>
      </ScrollView>

      {/* Language Selector Modal */}
      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
        current={currentLang}
        onSelect={(code) => {
          store?.setLanguage?.(code);
          toast.show('Til o‘zgartirildi', 'success');
        }}
      />

      {/* Delete Account Modal */}
      <ConfirmModal
        visible={deleteModalVisible}
        title="Hisobni o‘chirish"
        message="Diqqat! Hisobingiz va barcha buyurtmalar tarixi qaytarib bo‘lmas tarzda o‘chiriladi."
        confirmText="O‘chirish"
        confirmColor="#E8543F"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteModalVisible(false)}
      />
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
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8D95BD',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  rowSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(243, 245, 249, 0.08)',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(232, 84, 63, 0.35)',
    backgroundColor: 'rgba(232, 84, 63, 0.08)',
    marginTop: 20,
    marginBottom: 20,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E8543F',
  },
});
