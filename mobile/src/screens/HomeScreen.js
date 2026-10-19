import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Button, Header, Screen, SectionTitle } from '../components/ui/Common';
import CartButton from '../components/ui/CartButton';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { statusText, useActiveOrder } from '../features/orders';
import { usePopularClubs } from '../features/products';

export default function HomeScreen({ t, onNavigate, onClub, onOrder, onNotifications, rules, auth, cartCount = 0, onCart }) {
  // GET /api/orders/active — oxirgi yakunlanmagan buyurtma (20 s da yangilanadi)
  const { order, isLoading: orderLoading } = useActiveOrder();
  // GET /api/catalog/clubs/popular
  const { clubs, isLoading: clubsLoading, error: clubsError } = usePopularClubs(8);

  // Greeting uses the authenticated user's real name
  const name = auth?.user?.fullName || t('hello');
  const avatarInitial = (auth?.user?.fullName || 'F')[0].toUpperCase();

  const heroClub = clubs[0] || null;

  return (
    <Screen>
      <Header
        overline={t('goodDay')}
        title={name}
        right={
          <View style={styles.headerRight}>
            <Pressable onPress={onNotifications} style={styles.bell} hitSlop={6} accessibilityLabel={t('notifications')}>
              <MaterialCommunityIcons name="bell-outline" size={20} color={colors.text} />
            </Pressable>
            <CartButton count={cartCount} onPress={onCart} t={t} />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </View>
          </View>
        }
      />

      {rules && !rules.acceptOrders ? (
        <View style={styles.paused}>
          <Text style={styles.pausedText}>{rules.pausedMessage || t('ordersPaused')}</Text>
        </View>
      ) : null}

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{t('heroTitle')}</Text>
          <Text style={styles.heroText}>{t('heroSub')}</Text>
          <Button small onPress={() => onNavigate('studio')} style={styles.heroButton}>{t('startShort')}</Button>
        </View>
        <View style={styles.heroJersey}>
          {heroClub ? <JerseyPreview product={heroClub} number="10" /> : null}
        </View>
      </View>

      <Pressable style={styles.track} onPress={() => (order ? onOrder(order.id) : onNavigate('orders'))}>
        <View style={styles.trackCopy}>
          {orderLoading ? (
            <LoadingSpinner size="small" />
          ) : order ? (
            <>
              <Text style={styles.trackId}>{order.code}</Text>
              <Text style={styles.trackStatus}>{statusText(t, order.status, order.statusLabel)}</Text>
            </>
          ) : (
            <Text style={styles.trackStatus}>{t('noOrders')}</Text>
          )}
        </View>
        <Text style={styles.trackAction}>{t('track')}</Text>
      </Pressable>

      <Pressable style={styles.kitCard} onPress={() => onNavigate('catalog')}>
        <Text style={styles.kitTitle}>{t('clubKitTitle')}</Text>
        <Text style={styles.kitSub}>{t('clubKitSub')}</Text>
      </Pressable>

      <SectionTitle title={t('popular')} action={t('all')} onAction={() => onNavigate('catalog')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.clubRow}
      >
        {clubsLoading && clubs.length === 0 ? <LoadingSpinner size="small" /> : null}
        {clubs.map((club) => (
          <Pressable key={club.id} style={styles.clubTile} onPress={() => onClub(club)}>
            <View style={[styles.crest, { backgroundColor: club.color, borderColor: club.accent }]}>
              <Text style={[styles.crestCode, { color: club.accent }]}>{club.code}</Text>
            </View>
            <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {clubsError ? <Text style={styles.clubsError}>{t('loadError')}</Text> : null}

      <View style={styles.stepsBlock}>
        <SectionTitle title={t('howItWorks')} />
        {[t('step1'), t('step2')].map((step, index) => (
          <View key={step} style={styles.step}>
            <Text style={styles.stepNum}>{index + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#141A3E',
    borderWidth: 1,
    borderColor: '#232A57',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paused: {
    backgroundColor: 'rgba(232, 84, 63, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232, 84, 63, 0.35)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: 14,
  },
  pausedText: { color: '#F2A49A', fontSize: 12, lineHeight: 18 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#151B42',
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontWeight: '900', fontSize: 15 },
  hero: {
    backgroundColor: '#141A40',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#1E2452',
    padding: spacing.lg,
    marginBottom: 14,
    overflow: 'hidden',
    minHeight: 156,
  },
  heroCopy: { width: 190 },
  heroTitle: { color: colors.text, fontSize: 19, lineHeight: 24, fontWeight: '800' },
  heroText: { color: '#9AA2C6', fontSize: 11, lineHeight: 16, marginTop: spacing.sm },
  heroButton: { alignSelf: 'flex-start', marginTop: spacing.md },
  heroJersey: { position: 'absolute', right: -6, bottom: 6, transform: [{ rotate: '6deg' }] },
  track: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#1B2150',
    padding: spacing.lg,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackCopy: { flex: 1 },
  trackId: { color: colors.text, fontSize: 13, fontWeight: '800' },
  trackStatus: { color: colors.muted, fontSize: 11, marginTop: 4 },
  trackAction: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  kitCard: {
    backgroundColor: '#141A40',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#1E2452',
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  kitTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  kitSub: { color: colors.muted, fontSize: 11, marginTop: 4 },
  clubRow: { gap: 14, paddingRight: spacing.sm, paddingBottom: spacing.xs },
  clubTile: { width: 74, alignItems: 'center' },
  crest: {
    width: 52,
    height: 62,
    borderRadius: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  crestCode: { fontSize: 14, fontWeight: '900' },
  clubName: { color: '#B9C0E0', fontSize: 10, marginTop: 6, textAlign: 'center', width: 74 },
  clubsError: { color: colors.muted, fontSize: 11, marginTop: spacing.xs },
  stepsBlock: { marginTop: spacing.xl },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 7 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#171E4B',
    color: colors.accent,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 26,
    overflow: 'hidden',
  },
  stepText: { flex: 1, color: '#D5DAF2', fontSize: 13 },
});
