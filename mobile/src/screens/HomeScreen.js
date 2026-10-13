import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import { clubs } from '../data/mockData';
import { Button, Header, Screen, SectionTitle } from '../components/ui/Common';
import CartButton from '../components/ui/CartButton';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import useOrders from '../features/orders';
import useProducts from '../features/products';

export default function HomeScreen({ t, onNavigate, onProduct, auth, cartCount = 0, onCart }) {
  const { orders, isLoading: ordersLoading } = useOrders();
  const { products: apiProducts, isLoading: productsLoading } = useProducts();

  // Most recent real order from the API (empty until the orders endpoint is live)
  const order = orders[0] || null;
  const orderStatus = order?.status === 'delivered' ? t('delivered') : t('production');

  // Greeting uses the authenticated user's real name
  const name = auth?.user?.fullName || t('hello');
  const avatarInitial = (auth?.user?.fullName || 'F')[0].toUpperCase();

  // Products with fallback
  const heroProduct = (apiProducts && apiProducts.length > 0) ? apiProducts[0] : null;

  const openClub = (club) => {
    const product = apiProducts.find((item) => item.id === club.product);
    if (product) onProduct(product);
  };

  return (
    <Screen>
      <Header
        overline={t('goodDay')}
        title={name}
        right={
          <View style={styles.headerRight}>
            <CartButton count={cartCount} onPress={onCart} t={t} />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </View>
          </View>
        }
      />

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{t('heroTitle')}</Text>
          <Text style={styles.heroText}>{t('heroSub')}</Text>
          <Button small onPress={() => onNavigate('studio')} style={styles.heroButton}>{t('startShort')}</Button>
        </View>
        <View style={styles.heroJersey}>
          {heroProduct ? (
            <JerseyPreview product={heroProduct} number="10" />
          ) : null}
        </View>
      </View>

      <Pressable style={styles.track} onPress={() => onNavigate('orders')}>
        <View style={styles.trackCopy}>
          {ordersLoading ? (
            <LoadingSpinner size="small" />
          ) : order ? (
            <>
              <Text style={styles.trackId}>{order.id}</Text>
              <Text style={styles.trackStatus}>{orderStatus}</Text>
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
        {clubs.slice(0, 6).map((club) => (
          <Pressable key={club.id} style={styles.clubTile} onPress={() => openClub(club)}>
            <View style={[styles.crest, { backgroundColor: club.color, borderColor: club.accent }]}>
              <Text style={[styles.crestCode, { color: club.accent }]}>{club.code}</Text>
            </View>
            <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

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
