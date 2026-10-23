import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Badge, Button, Card, EmptyState, Header, Screen, SectionTitle } from '../components/ui/Common';
import CartButton from '../components/ui/CartButton';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ProductCard } from '../components/ui/ProductCard';
import { statusText, useActiveOrder } from '../features/orders';
import { useCategories, usePopularClubs, usePopularProducts } from '../features/products';
import { displayName, nameInitial } from '../utils/userName';

export default function HomeScreen({
  t,
  onNavigate,
  onClub,
  onOrder,
  onNotifications,
  rules,
  auth,
  cartCount = 0,
  onCart,
}) {
  // GET /api/orders/active — latest active order if any
  const { order, isLoading: orderLoading } = useActiveOrder();
  // GET /api/catalog/clubs/popular
  const { clubs, isLoading: clubsLoading, error: clubsError } = usePopularClubs(8);
  // GET /api/catalog/categories
  const { categories } = useCategories();
  // Popular products (home kit of popular clubs)
  const { products, isLoading: productsLoading } = usePopularProducts(4);

  // Server joy egasi ("Yangi mijoz") ism sifatida ko'rsatilmaydi
  const name = displayName(auth?.user, t('hello'));
  const avatarInitial = nameInitial(auth?.user);

  const heroClub = clubs[0] || {
    name: 'Formo Pro',
    color: '#0D2164',
    accent: '#F2A33A',
    gradient: ['#0A1A4E', '#1D3B8B'],
  };

  return (
    <Screen>
      {/* Top Header */}
      <Header
        overline={t('goodDay')}
        title={name}
        right={
          <View style={styles.headerRight}>
            <Pressable
              onPress={onNotifications}
              style={styles.iconCircle}
              hitSlop={6}
              accessibilityLabel={t('notifications')}
            >
              <MaterialCommunityIcons name="bell-outline" size={20} color={colors.text} />
            </Pressable>
            <CartButton count={cartCount} onPress={onCart} t={t} />
            <Pressable
              onPress={() => onNavigate('profile')}
              style={styles.avatar}
              accessibilityLabel={t('profile')}
            >
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </Pressable>
          </View>
        }
      />

      {/* Orders Paused Banner (if backend rules have paused orders) */}
      {rules && !rules.acceptOrders ? (
        <View style={styles.pausedBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={styles.pausedText}>{rules.pausedMessage || t('ordersPaused')}</Text>
        </View>
      ) : null}

      {/* Hero Campaign Banner — Premium Sportswear Vibe */}
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroCopy}>
          <Badge label="2026 COLLECTION" variant="orange" style={styles.heroBadge} />
          <Text style={styles.heroTitle}>{t('heroTitle')}</Text>
          <Text style={styles.heroSub}>{t('heroSub')}</Text>
          <View style={styles.heroButtons}>
            <Button
              small
              variant="primary"
              onPress={() => onNavigate('studio')}
              style={styles.heroPrimaryBtn}
            >
              {t('startShort')}
            </Button>
            <Button
              small
              variant="secondary"
              onPress={() => onNavigate('catalog')}
              style={styles.heroSecondaryBtn}
            >
              {t('catalog')}
            </Button>
          </View>
        </View>
        <View style={styles.heroJerseyWrap}>
          <JerseyPreview product={heroClub} number="10" large side="front" />
        </View>
      </View>

      {/* Active Order Tracker Card (when customer has an active in-flight order) */}
      {order ? (
        <Pressable
          style={styles.trackerCard}
          onPress={() => onOrder(order.id)}
          accessibilityRole="button"
        >
          <View style={styles.trackerIconBox}>
            <MaterialCommunityIcons name="truck-fast-outline" size={24} color={colors.accent} />
          </View>
          <View style={styles.trackerInfo}>
            <View style={styles.trackerRow}>
              <Text style={styles.trackerOverline}>{t('activeOrder')}</Text>
              <Text style={styles.trackerId}>{order.code}</Text>
            </View>
            <Text style={styles.trackerStatus}>
              {statusText(t, order.status, order.statusLabel)}
            </Text>
          </View>
          <View style={styles.trackerAction}>
            <Text style={styles.trackerActionText}>{t('track')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.accent} />
          </View>
        </Pressable>
      ) : null}

      {/* Quick Sportswear Categories Row */}
      <View style={styles.categoryRow}>
        <Pressable
          style={[styles.categoryTile, styles.categoryTileActive]}
          onPress={() => onNavigate('studio')}
        >
          <MaterialCommunityIcons name="pencil-ruler" size={20} color={colors.accent} />
          <Text style={styles.categoryTileTitle}>{t('customDesign')}</Text>
          <Text style={styles.categoryTileSub}>Studio</Text>
        </Pressable>

        <Pressable
          style={styles.categoryTile}
          onPress={() => onNavigate('catalog')}
        >
          <MaterialCommunityIcons name="shield-star-outline" size={20} color={colors.tealLight} />
          <Text style={styles.categoryTileTitle}>{t('clubKitTitle')}</Text>
          <Text style={styles.categoryTileSub}>{t('allClubs')}</Text>
        </Pressable>
      </View>

      {/* Popular Clubs Section */}
      <SectionTitle
        title={t('popular')}
        eyebrow={t('eyebrowClubs')}
        action={t('all')}
        onAction={() => onNavigate('catalog')}
      />

      {clubsLoading && clubs.length === 0 ? (
        <View style={styles.loadingRow}>
          <LoadingSpinner size="small" />
        </View>
      ) : clubs.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.clubsScroll}
        >
          {clubs.map((club) => (
            <Pressable
              key={club.id}
              style={styles.clubTile}
              onPress={() => onClub(club)}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.crest,
                  {
                    backgroundColor: club.color || colors.surfaceRaised,
                    borderColor: club.accent || colors.accent,
                  },
                ]}
              >
                <Text style={[styles.crestCode, { color: club.accent || colors.white }]}>
                  {club.code || club.name?.slice(0, 3).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.clubName} numberOfLines={1}>
                {club.name}
              </Text>
              <Text style={styles.clubLeague} numberOfLines={1}>
                {club.league || `${club.forms || 1} ${t('kitsWord')}`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <EmptyState
          icon="shield-outline"
          title={t('noPopularClubs')}
          description={t('catalogEmpty')}
          actionLabel={t('goStudio')}
          onAction={() => onNavigate('studio')}
        />
      )}

      {/* Featured Kits / Popular Models Section */}
      <SectionTitle
        title={t('popularModels')}
        eyebrow={t('eyebrowModels')}
        action={t('all')}
        onAction={() => onNavigate('catalog')}
      />

      {productsLoading && products.length === 0 ? (
        <View style={styles.loadingRow}>
          <LoadingSpinner size="small" />
        </View>
      ) : products.length > 0 ? (
        <View style={styles.productsGrid}>
          {products.map((item) => (
            <ProductCard
              key={item.kitId}
              product={item}
              onPress={() => onClub({ id: item.clubId, name: item.clubName }, item.kitId)}
            />
          ))}
        </View>
      ) : (
        <Card style={styles.studioBannerCard}>
          <View style={styles.studioBannerCopy}>
            <Badge label="FORMO STUDIO" variant="teal" />
            <Text style={styles.studioBannerTitle}>{t('designStudio')}</Text>
            <Text style={styles.studioBannerSub}>{t('description')}</Text>
            <Button
              small
              variant="primary"
              onPress={() => onNavigate('studio')}
              style={styles.studioBannerBtn}
            >
              {t('startShort')}
            </Button>
          </View>
          <View style={styles.studioBannerJersey}>
            <JerseyPreview
              product={{ color: '#09153D', accent: '#F2A33A', gradient: ['#080C24', '#152B75'] }}
              number="7"
              side="back"
              name="FORMO"
            />
          </View>
        </Card>
      )}

      {/* How it Works / Athletic Quality Value Props */}
      <View style={styles.valuePropsCard}>
        <SectionTitle title={t('howItWorks')} eyebrow={t('eyebrowQuality')} />
        <View style={styles.stepRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNumber}>1</Text>
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepHeading}>{t('step1')}</Text>
            <Text style={styles.stepSub}>100% yuqori sifatli sport poliesteri</Text>
          </View>
        </View>
        <View style={styles.stepDivider} />
        <View style={styles.stepRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNumber}>2</Text>
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepHeading}>{t('step2')}</Text>
            <Text style={styles.stepSub}>Individual raqam va ism tushirilgan holda</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent,
    fontWeight: '900',
    fontSize: 16,
  },
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 84, 63, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 84, 63, 0.4)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 10,
  },
  pausedText: {
    flex: 1,
    color: '#F5A398',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 195,
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(242, 163, 58, 0.15)',
  },
  heroCopy: {
    width: '60%',
    zIndex: 2,
  },
  heroBadge: {
    marginBottom: 8,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroSub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    marginBottom: 14,
  },
  heroButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroPrimaryBtn: {
    paddingHorizontal: 16,
  },
  heroSecondaryBtn: {
    paddingHorizontal: 14,
  },
  heroJerseyWrap: {
    position: 'absolute',
    right: -10,
    bottom: -15,
    transform: [{ rotate: '8deg' }],
    zIndex: 1,
  },
  trackerCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  trackerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(242, 163, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trackerInfo: {
    flex: 1,
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackerOverline: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  trackerId: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  trackerStatus: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  trackerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  trackerActionText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    marginRight: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.lg,
  },
  categoryTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  categoryTileActive: {
    backgroundColor: colors.surfaceRaised,
    borderColor: 'rgba(242, 163, 58, 0.4)',
  },
  categoryTileTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  categoryTileSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  clubsScroll: {
    paddingRight: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 12,
  },
  clubTile: {
    width: 82,
    alignItems: 'center',
  },
  crest: {
    width: 58,
    height: 68,
    borderRadius: 12,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  crestCode: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  clubName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
    width: 82,
  },
  clubLeague: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  studioBannerCard: {
    backgroundColor: colors.surfaceRaised,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 160,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  studioBannerCopy: {
    width: '62%',
    zIndex: 2,
  },
  studioBannerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  studioBannerSub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 12,
  },
  studioBannerBtn: {
    alignSelf: 'flex-start',
  },
  studioBannerJersey: {
    position: 'absolute',
    right: 5,
    bottom: -15,
    transform: [{ rotate: '-6deg' }],
    zIndex: 1,
  },
  valuePropsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(242, 163, 58, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  stepNumber: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '900',
  },
  stepInfo: {
    flex: 1,
  },
  stepHeading: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  stepSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  stepDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  loadingRow: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
