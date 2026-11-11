import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, spacing, themedStyles } from '../constants/theme';
import { Badge, Button, Card, Header, Screen, SectionTitle } from '../components/ui/Common';
import Kit360Thumb from '../components/ui/Kit360Thumb';
import KitTile from '../components/ui/KitTile';
import Skeleton from '../components/ui/Skeleton';
import ActiveOrderBar from '../components/ui/ActiveOrderBar';
import { useTabBarSpace } from '../components/ui/BottomTabs';
import { statusText, useActiveOrder } from '../features/orders';
import { useBestSellingKits } from '../features/products/kits';
import { displayName, nameInitial } from '../utils/userName';

const BEST_ON_HOME = 8;

/**
 * Bosh sahifa (26-oktabrgacha bo'lgan tuzilma, Forma 360° suratlari bilan): katta banner, faol buyurtma,
 * tezkor bo'limlar, eng ko'p sotilgan formalar (buyurtmalardagi soni bo'yicha), yoqtirilgan formalar,
 * Studio banneri va "Qanday ishlaydi".
 *
 * Props: t, onNavigate(route), onOrder(id), onNotifications, onOpenKit(kit), favorites (useFavoriteKits), rules, auth
 */
export default function HomeScreen({ t, onNavigate, onOrder, onNotifications, onOpenKit, favorites, rules, auth }) {
  const { order } = useActiveOrder();
  const tabSpace = useTabBarSpace();
  const { kits, isLoading } = useBestSellingKits();
  const best = kits.slice(0, BEST_ON_HOME);
  const heroTeam = best[0]?.kit360Id || 'rm';

  const name = displayName(auth?.user, t('hello'));
  const avatarInitial = nameInitial(auth?.user);

  const kitRail = (items, ranked) => (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(k) => k.key}
      showsHorizontalScrollIndicator={false}
      snapToInterval={162}
      decelerationRate="fast"
      contentContainerStyle={styles.rail}
      renderItem={({ item, index }) => (
        <KitTile
          kit={item}
          t={t}
          rank={ranked && item.soldCount > 0 ? index + 1 : undefined}
          favorite={favorites.has(item)}
          onFavorite={favorites.toggle}
          onPress={onOpenKit}
          style={styles.railCard}
        />
      )}
    />
  );

  return (
    <View style={styles.root}>
    {/* Faol buyurtma pastda qotib turadi — kontent uning ostida qolmasin */}
    <Screen contentStyle={[styles.content, order && styles.contentWithOrder]}>
      <Header
        cart
        overline={t('goodDay')}
        title={name}
        right={
          <>
            <Pressable onPress={onNotifications} style={styles.iconCircle} hitSlop={6} accessibilityLabel={t('notifications')}>
              <MaterialCommunityIcons name="bell-outline" size={20} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => onNavigate('profile')} style={styles.avatar} accessibilityLabel={t('profile')}>
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </Pressable>
          </>
        }
      />

      {rules && !rules.acceptOrders ? (
        <View style={[styles.pausedBanner, styles.padded]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={styles.pausedText}>{rules.pausedMessage || t('ordersPaused')}</Text>
        </View>
      ) : null}

      {/* Katta banner: eng ko'p sotilgan forma surati bilan */}
      <View style={[styles.heroCard, styles.padded]}>
        <View style={styles.heroGlow} />
        <View style={styles.heroCopy}>
          <Badge label={t('promoClubsOver')} variant="orange" style={styles.heroBadge} />
          <Text style={styles.heroTitle}>{t('heroTitle')}</Text>
          <Text style={styles.heroSub}>{t('heroSub')}</Text>
          <View style={styles.heroButtons}>
            <Button small variant="primary" onPress={() => onNavigate('studio')}>
              {t('startShort')}
            </Button>
            <Button small variant="secondary" onPress={() => onNavigate('studio')}>
              {t('catalog')}
            </Button>
          </View>
        </View>
        <View style={styles.heroArt} pointerEvents="none">
          <Kit360Thumb team={heroTeam} width={128} height={164} zoom={1.6} style={styles.heroPhoto} />
        </View>
      </View>

      {/* Tezkor bo'limlar */}
      <View style={[styles.categoryRow, styles.padded]}>
        <Pressable style={[styles.categoryTile, styles.categoryTileActive]} onPress={() => onNavigate('studio')}>
          <MaterialCommunityIcons name="rotate-3d-variant" size={20} color={colors.accent} />
          <Text style={styles.categoryTileTitle}>{t('customDesign')}</Text>
          <Text style={styles.categoryTileSub}>{t('catalog')}</Text>
        </Pressable>
        <Pressable style={styles.categoryTile} onPress={() => onNavigate('studio')}>
          <MaterialCommunityIcons name="shield-star-outline" size={20} color={colors.tealLight} />
          <Text style={styles.categoryTileTitle}>{t('clubKitTitle')}</Text>
          <Text style={styles.categoryTileSub}>{t('allClubs')}</Text>
        </Pressable>
      </View>

      {/* Eng ko'p sotilganlar — buyurtmalardagi soni bo'yicha, birinchisi eng ko'p */}
      <View style={styles.padded}>
        <SectionTitle title={t('bestSellers')} eyebrow={t('eyebrowBestSellers')} action={t('all')} onAction={() => onNavigate('studio')} />
      </View>
      {isLoading ? (
        <View style={styles.rail}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width={152} height={240} radius={radii.lg} />
          ))}
        </View>
      ) : (
        kitRail(best, true)
      )}

      {/* Yoqtirilgan formalar (yurakcha) — bo'lsa */}
      {favorites.items.length ? (
        <>
          <View style={[styles.padded, styles.sectionGap]}>
            <SectionTitle title={t('favorites')} eyebrow={t('eyebrowFavorites')} action={t('all')} onAction={() => onNavigate('studio')} />
          </View>
          {kitRail(favorites.items, false)}
        </>
      ) : null}

      {/* Studio banneri */}
      <Card style={[styles.studioBanner, styles.padded]}>
        <View style={styles.studioCopy}>
          <Badge label="FORMO STUDIO" variant="teal" />
          <Text style={styles.studioTitle}>{t('designStudio')}</Text>
          <Text style={styles.studioSub}>{t('description')}</Text>
          <Button small variant="primary" onPress={() => onNavigate('studio')} style={styles.studioBtn}>
            {t('startShort')}
          </Button>
        </View>
        <View style={styles.studioArt} pointerEvents="none">
          <Kit360Thumb team={best[1]?.kit360Id || 'fcb'} width={104} height={132} zoom={1.6} style={styles.heroPhoto} />
        </View>
      </Card>

      {/* Qanday ishlaydi */}
      <View style={[styles.valueCard, styles.padded]}>
        <SectionTitle title={t('howItWorks')} eyebrow={t('eyebrowQuality')} />
        {[
          ['1', 'step1', 'step1Sub'],
          ['2', 'step2', 'step2Sub'],
        ].map(([n, title, sub], i) => (
          <View key={n}>
            {i ? <View style={styles.stepDivider} /> : null}
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>{n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepHeading}>{t(title)}</Text>
                <Text style={styles.stepSub}>{t(sub)}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </Screen>
    {order ? (
      <ActiveOrderBar
        t={t}
        order={order}
        label={statusText(t, order.status, order.statusLabel)}
        bottom={tabSpace + spacing.sm}
        onPress={() => onOrder(order.id)}
      />
    ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  // Lentalar ekran chetigacha; matnli bloklar `padded`
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 0 },
  contentWithOrder: { paddingBottom: 220 },
  padded: { marginHorizontal: spacing.lg },
  sectionGap: { marginTop: spacing.lg },
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
  avatarText: { color: colors.accent, fontWeight: '900', fontSize: 16 },
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerGlow,
    borderWidth: 1,
    borderColor: 'rgba(232, 84, 63, 0.4)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 10,
  },
  pausedText: { flex: 1, color: colors.dangerText, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    minHeight: 205,
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(242, 163, 58, 0.15)',
  },
  heroCopy: { width: '60%', zIndex: 2 },
  heroBadge: { marginBottom: 8, alignSelf: 'flex-start' },
  heroTitle: { color: colors.text, fontSize: 21, lineHeight: 26, fontFamily: fonts.display, letterSpacing: -0.3 },
  heroSub: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 6, marginBottom: 14 },
  heroButtons: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroArt: { position: 'absolute', right: -8, bottom: -14, transform: [{ rotate: '8deg' }], zIndex: 1 },
  heroPhoto: { borderRadius: radii.lg, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  trackerCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trackerIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trackerOverline: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  trackerPill: { marginTop: 6 },
  trackerAction: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  categoryRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.lg },
  categoryTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  categoryTileActive: { backgroundColor: colors.surfaceRaised, borderColor: 'rgba(242, 163, 58, 0.4)' },
  categoryTileTitle: { color: colors.text, fontSize: 13, fontFamily: fonts.bodySemi, marginTop: 8 },
  categoryTileSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  rail: { paddingHorizontal: spacing.lg, gap: 10, flexDirection: 'row' },
  railCard: { width: 152, marginBottom: 0 },
  studioBanner: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 170,
  },
  studioCopy: { width: '62%', gap: 6 },
  studioTitle: { color: colors.text, fontSize: 18, fontFamily: fonts.display, marginTop: 4 },
  studioSub: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  studioBtn: { alignSelf: 'flex-start', marginTop: 6 },
  studioArt: { position: 'absolute', right: 6, bottom: -10, transform: [{ rotate: '-7deg' }] },
  valueCard: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: { color: colors.accent, fontFamily: fonts.numeric, fontSize: 18 },
  stepHeading: { color: colors.text, fontSize: 13, fontFamily: fonts.bodySemi },
  stepSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  stepDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md, marginLeft: 46 },
}));
