import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import { profile } from '../data/mockData';
import { Button, Card, Header, Screen } from '../components/ui/Common';

export default function ProfileScreen({ t, onSettings, onOrders, auth }) {
  // Prefer authenticated user data; fall back to mock profile
  const name = auth?.user?.fullName || profile.name;
  const phone = auth?.user?.phone || profile.phone;
  const avatarInitial = (auth?.user?.fullName || 'A')[0].toUpperCase();

  const handleLogout = () => {
    if (auth?.logout) {
      auth.logout();
    }
  };

  return (
    <Screen>
      <Header title={t('myProfile')} right={<View style={styles.avatarSquare} />} />

      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarInitial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.phone}>{phone}</Text>
        </View>
      </Card>

      <View style={styles.stats}>
        {profile.stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.group}>
        <Row title={t('personalData')} sub={t('personalDataSub')} />
        <Row title={t('addresses')} sub={t('addressesSub')} />
        <Row title={t('myOrders')} onPress={onOrders} last />
      </View>

      <View style={styles.group}>
        <Row title={t('settings')} sub={t('languageSub')} onPress={onSettings} />
        <Row title={t('help')} sub={t('helpSub')} />
        <Row title={t('language')} right={t('languageName')} onPress={onSettings} last />
      </View>

      <Button
        variant="secondary"
        style={styles.logout}
        onPress={handleLogout}
      >
        {t('logout')}
      </Button>
    </Screen>
  );
}

function Row({ title, sub, right, onPress, last }) {
  const content = (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right ? <Text style={styles.rowRight}>{right}</Text> : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

const styles = StyleSheet.create({
  avatarSquare: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#141A3E',
    borderWidth: 1,
    borderColor: '#232A57',
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, backgroundColor: 'transparent', borderColor: 'transparent', padding: 0 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#151B42',
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontWeight: '900', fontSize: 22 },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  phone: { color: colors.muted, fontSize: 12, marginTop: 4 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#1B2150',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statValue: { color: colors.text, fontSize: 15, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 9, marginTop: 3, textAlign: 'center' },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#1B2150',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#171C3F',
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#171E4B', borderWidth: 1, borderColor: '#232A57' },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  rowSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  rowRight: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  logout: { marginTop: spacing.sm },
});
