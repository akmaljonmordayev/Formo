import React from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { EmptyState, Header, Screen, SectionTitle } from '../components/ui/Common';
import Kit360Thumb from '../components/ui/Kit360Thumb';
import KitCarousel from '../components/ui/KitCarousel';
import { ProductCard } from '../components/ui/ProductCard';
import PromoCarousel from '../components/ui/PromoCarousel';
import Skeleton from '../components/ui/Skeleton';
import StatusPill, { statusTone } from '../components/ui/StatusPill';
import { statusText, useActiveOrder } from '../features/orders';
import { useCategories, usePopularClubs, usePopularProducts } from '../features/products';
import { displayName, nameInitial } from '../utils/userName';

const FEATURED = 4;

/** Aksiya kartasidagi Forma 360° surati (biroz qiyshaytirilgan) */
const promoArt = (team) => (
  <View style={styles.artTilt}>
    <Kit360Thumb team={team} width={112} height={140} zoom={1.7} style={styles.artPhoto} />
  </View>
);

/**
 * Bosh sahifa: qotib turadigan sarlavha (savat bilan), qidiruv, aksiya swiper'i, faol buyurtma,
 * ligalar (kategoriyalar) lentasi, tavsiya formalar karuseli, mashhur klublar va modellar.
 * Formalar — Forma 360° suratlari (faqat kit360Id bog'langan klublar).
 * Ma'lumotlar: /orders/active, /catalog/categories, /catalog/clubs/popular (kit360=true).
 */
export default function HomeScreen({ t, onNavigate, onClub, onOrder, onNotifications, onCategory, onSearch, rules, auth }) {
  const { order } = useActiveOrder();
  const { clubs, isLoading: clubsLoading } = usePopularClubs(8);
  const { categories } = useCategories();
  const { products, isLoading: productsLoading } = usePopularProducts(8);

  const name = displayName(auth?.user, t('hello'));
  const avatarInitial = nameInitial(auth?.user);
  const featured = products.slice(0, FEATURED);
  // Karuselda bo'lmaganlari; mahsulot kam bo'lsa hammasi
  const popular = products.length > FEATURED ? products.slice(FEATURED) : products;

  const slides = [
    {
      key: 'studio',
      overline: t('promoStudioOver'),
      title: t('promo360Title'),
      sub: t('promo360Sub'),
      cta: t('startShort'),
      colors: ['#1D2F8C', '#0B1535'],
      onPress: () => onNavigate('studio'),
      art: promoArt('rm'),
    },
    {
      key: 'clubs',
      overline: t('promoClubsOver'),
      title: t('clubKitTitle'),
      sub: t('clubKitSub'),
      cta: t('catalog'),
      colors: ['#0E7C66', '#08102C'],
      onPress: () => onNavigate('catalog'),
      art: promoArt(featured[0]?.kit360Id || 'ar'),
    },
    {
      key: 'shorts',
      overline: t('promoKitOver'),
      title: t('promoKitTitle'),
      sub: t('promoKitSub'),
      cta: t('startShort'),
      colors: ['#8E1F3F', '#0B1535'],
      onPress: () => onNavigate('studio'),
      art: promoArt('fcb'),
    },
  ];

  return (
    <Screen contentStyle={styles.content}>
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

      <Pressable style={[styles.search, styles.padded]} onPress={onSearch} accessibilityRole="search">
        <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
        <Text style={styles.searchText}>{t('searchClub')}</Text>
        <View style={styles.searchKbd}>
          <MaterialCommunityIcons name="tune-variant" size={16} color={colors.accent} />
        </View>
      </Pressable>

      <PromoCarousel slides={slides} />

      {order ? (
        <Pressable
          style={[styles.trackerCard, styles.padded, { borderColor: statusTone(order.status).border }]}
          onPress={() => onOrder(order.id)}
          accessibilityRole="button"
        >
          <View style={[styles.trackerIconBox, { backgroundColor: statusTone(order.status).bg }]}>
            <MaterialCommunityIcons name={statusTone(order.status).icon} size={22} color={statusTone(order.status).color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trackerOverline}>
              {t('activeOrder')} · {order.code}
            </Text>
            <StatusPill status={order.status} label={statusText(t, order.status, order.statusLabel)} style={styles.trackerPill} />
          </View>
          <Text style={styles.trackerAction}>{t('track')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.accent} />
        </Pressable>
      ) : null}

      {/* Ligalar: katalogni shu filtr bilan ochadi */}
      <View style={styles.padded}>
        <SectionTitle title={t('categoriesTitle')} eyebrow={t('eyebrowLeagues')} action={t('all')} onAction={() => onNavigate('catalog')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        <Pressable style={[styles.catTile, styles.catTileAccent]} onPress={() => onNavigate('studio')}>
          <MaterialCommunityIcons name="rotate-3d-variant" size={22} color={colors.primaryDark} />
          <Text style={[styles.catTitle, styles.catTitleAccent]} numberOfLines={1}>
            {t('promo360Title')}
          </Text>
        </Pressable>
        {categories.map((cat) => (
          <Pressable key={cat.id} style={styles.catTile} onPress={() => onCategory(cat.id)}>
            <MaterialCommunityIcons name="trophy-outline" size={22} color={colors.accent} />
            <Text style={styles.catTitle} numberOfLines={1}>
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.padded}>
        <SectionTitle title={t('featuredKits')} eyebrow={t('eyebrowModels')} action={t('all')} onAction={() => onNavigate('catalog')} />
      </View>
      {productsLoading && !products.length ? (
        <View style={styles.padded}>
          <Skeleton height={300} radius={radii.xl} />
        </View>
      ) : featured.length ? (
        <KitCarousel t={t} items={featured} onPress={(item) => onClub({ id: item.clubId, name: item.clubName }, item.kitId)} />
      ) : (
        <View style={styles.padded}>
          <EmptyState icon="tshirt-crew-outline" title={t('catalogEmpty')} actionLabel={t('goStudio')} onAction={() => onNavigate('studio')} />
        </View>
      )}

      <View style={[styles.padded, styles.sectionGap]}>
        <SectionTitle title={t('popular')} eyebrow={t('eyebrowClubs')} action={t('all')} onAction={() => onNavigate('catalog')} />
      </View>
      {clubsLoading && !clubs.length ? (
        <View style={styles.rail}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width={92} height={118} />
          ))}
        </View>
      ) : (
        <FlatList
          horizontal
          data={clubs}
          keyExtractor={(c) => String(c.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
          renderItem={({ item: club }) => (
            <Pressable style={({ pressed }) => [styles.clubTile, pressed && styles.pressed]} onPress={() => onClub(club)} accessibilityRole="button">
              <Kit360Thumb team={club.kit360Id} width={92} height={78} zoom={1.7} />
              <Text style={styles.clubName} numberOfLines={1}>
                {club.name}
              </Text>
              <Text style={styles.clubLeague} numberOfLines={1}>
                {club.league || `${club.forms || 1} ${t('kitsWord')}`}
              </Text>
            </Pressable>
          )}
        />
      )}

      {popular.length ? (
        <>
          <View style={[styles.padded, styles.sectionGap]}>
            <SectionTitle title={t('popularModels')} eyebrow={t('eyebrowTrending')} action={t('all')} onAction={() => onNavigate('catalog')} />
          </View>
          <FlatList
            horizontal
            data={popular}
            keyExtractor={(p) => String(p.kitId)}
            showsHorizontalScrollIndicator={false}
            snapToInterval={162}
            decelerationRate="fast"
            contentContainerStyle={styles.rail}
            renderItem={({ item }) => (
              <ProductCard product={item} style={styles.railCard} onPress={() => onClub({ id: item.clubId, name: item.clubName }, item.kitId)} />
            )}
          />
        </>
      ) : null}

      <View style={[styles.padded, styles.values]}>
        {[
          ['shield-check-outline', 'step1Sub'],
          ['truck-fast-outline', 'step2'],
          ['tshirt-crew-outline', 'step2Sub'],
        ].map(([icon, key]) => (
          <View key={key} style={styles.value}>
            <MaterialCommunityIcons name={icon} size={18} color={colors.accent} />
            <Text style={styles.valueText} numberOfLines={2}>
              {t(key)}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Lentalar ekran chetigacha; matnli bloklar `padded`
  content: { paddingHorizontal: 0 },
  padded: { marginHorizontal: spacing.lg },
  sectionGap: { marginTop: spacing.xl },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
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
  pausedText: { flex: 1, color: '#F5A398', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  searchText: { flex: 1, color: colors.dim, fontSize: 14, fontFamily: fonts.body },
  searchKbd: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  artTilt: { transform: [{ rotate: '8deg' }] },
  artPhoto: { borderRadius: radii.lg, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  trackerCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(242,163,58,0.5)',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trackerIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.accentGlow, alignItems: 'center', justifyContent: 'center' },
  trackerOverline: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  trackerStatus: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 2 },
  trackerPill: { marginTop: 6 },
  trackerAction: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  rail: { paddingHorizontal: spacing.lg, gap: 10, flexDirection: 'row' },
  catTile: {
    minWidth: 104,
    height: 74,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    gap: 6,
  },
  catTileAccent: { backgroundColor: colors.accent, borderColor: colors.accent },
  catTitle: { color: colors.text, fontSize: 12, fontFamily: fonts.bodySemi, maxWidth: 140 },
  catTitleAccent: { color: colors.primaryDark },
  clubTile: {
    width: 92,
    height: 118,
    overflow: 'hidden',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  clubName: { color: colors.text, fontSize: 11, fontFamily: fonts.bodySemi, marginTop: 6, paddingHorizontal: 6, textAlign: 'center' },
  clubLeague: { color: colors.muted, fontSize: 10, marginTop: 1, paddingHorizontal: 6, textAlign: 'center' },
  railCard: { width: 152, marginBottom: 0 },
  values: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  value: {
    flex: 1,
    padding: spacing.md,
    gap: 6,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  valueText: { color: colors.textSecondary, fontSize: 11, lineHeight: 15 },
});
