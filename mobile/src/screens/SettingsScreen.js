import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import { languageOptions } from '../i18n';
import { Button, Header, Overline, Screen } from '../components/ui/Common';
import { getItem, setItem } from '../utils/storage';

const LANGUAGE_SUBS = {
  uz: { uz: 'Lotin alifbosi', ru: 'Kirill yozuvi', en: 'Lotin alifbosi' },
  ru: { uz: 'Узбекский · латиница', ru: 'Русский · кириллица', en: 'Английский · латиница' },
  en: { uz: 'Uzbek · Latin', ru: 'Russian · Cyrillic', en: 'English · Latin' },
};

const NOTIF_KEY = 'formo_notif_prefs';
const DEFAULT_NOTIF = { orders: true, sms: true, promo: false };

export default function SettingsScreen({ language, setLanguage, t, onBack, auth }) {
  const [notif, setNotif] = useState(DEFAULT_NOTIF);
  const [loaded, setLoaded] = useState(false);

  // Persist notification preferences locally
  useEffect(() => {
    getItem(NOTIF_KEY).then((raw) => {
      if (raw) {
        try {
          setNotif({ ...DEFAULT_NOTIF, ...JSON.parse(raw) });
        } catch {
          // corrupted storage — keep defaults
        }
      }
      setLoaded(true);
    });
  }, []);

  const toggle = (key) => {
    setNotif((current) => {
      const next = { ...current, [key]: !current[key] };
      if (loaded) setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  };

  const rows = [
    ['orders', t('notifOrders'), t('notifOrdersSub')],
    ['sms', t('notifSms'), t('notifSmsSub')],
    ['promo', t('notifPromo'), t('notifPromoSub')],
  ];

  return (
    <Screen>
      <Header title={t('settings')} onBack={onBack} />

      <Overline>{t('langShort')}</Overline>
      <View style={styles.languageList}>
        {languageOptions.map((option) => (
          <Pressable
            key={option.code}
            onPress={() => setLanguage(option.code)}
            style={[styles.option, language === option.code && styles.selected]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, language === option.code && styles.selectedTitle]}>
                {option.label}
              </Text>
              <Text style={styles.optionSub}>{(LANGUAGE_SUBS[language] || LANGUAGE_SUBS.uz)[option.code]}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Overline style={styles.sectionGap}>{t('notifSection')}</Overline>
      <View style={styles.notifCard}>
        {rows.map(([key, title, sub], index) => (
          <View key={key} style={[styles.notifRow, index < rows.length - 1 && styles.notifRowBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>{title}</Text>
              <Text style={styles.notifSub}>{sub}</Text>
            </View>
            <Switch
              value={notif[key]}
              onValueChange={() => toggle(key)}
              trackColor={{ false: '#2A3160', true: colors.teal }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </View>

      <Button variant="secondary" style={styles.logoutButton} onPress={() => auth?.logout?.()}>
        {t('logout')}
      </Button>

      <Text style={styles.version}>{t('version')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  languageList: { gap: spacing.sm },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  selected: { borderColor: colors.accent, backgroundColor: '#141A3E' },
  optionTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  selectedTitle: { color: colors.accent },
  optionSub: { color: colors.muted, fontSize: 11, marginTop: 4 },
  sectionGap: { marginTop: spacing.xl },
  notifCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#1B2150',
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14 },
  notifRowBorder: { borderBottomWidth: 1, borderBottomColor: '#171C3F' },
  notifTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  notifSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  logoutButton: { marginTop: spacing.xl },
  version: { color: '#59618D', textAlign: 'center', fontSize: 10, marginTop: spacing.lg, marginBottom: spacing.sm },
});
